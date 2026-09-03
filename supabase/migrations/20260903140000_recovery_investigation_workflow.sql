-- Simplify the recovery workflow and store the CRM-controlled investigation state.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS recovery_search_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS recovery_search_duration_minutes integer NOT NULL DEFAULT 4320,
  ADD COLUMN IF NOT EXISTS recovery_search_scope text NOT NULL DEFAULT 'both',
  ADD COLUMN IF NOT EXISTS recovery_result_type text,
  ADD COLUMN IF NOT EXISTS recovery_result_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS recovery_completed_at timestamptz;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_recovery_search_duration_check,
  ADD CONSTRAINT profiles_recovery_search_duration_check
    CHECK (recovery_search_duration_minutes BETWEEN 1 AND 525600),
  DROP CONSTRAINT IF EXISTS profiles_recovery_search_scope_check,
  ADD CONSTRAINT profiles_recovery_search_scope_check
    CHECK (recovery_search_scope IN ('bank', 'crypto', 'both')),
  DROP CONSTRAINT IF EXISTS profiles_recovery_result_type_check,
  ADD CONSTRAINT profiles_recovery_result_type_check
    CHECK (recovery_result_type IS NULL OR recovery_result_type IN ('bank_transaction', 'crypto_transaction'));

-- The existing protection trigger correctly blocks unprivileged profile changes,
-- but migration-time data normalization has no signed-in auth user.
ALTER TABLE public.profiles DISABLE TRIGGER prevent_profile_privilege_escalation_trg;

-- Retired phases move into the active investigation stage.
UPDATE public.profiles
SET case_phase = 'review',
    recovery_search_started_at = COALESCE(recovery_search_started_at, now())
WHERE case_phase IN ('bank_verification', 'exchange_commission', 'investigation', 'recovery');

UPDATE public.profiles
SET case_phase = 'submitted'
WHERE case_phase IS NULL OR case_phase NOT IN ('submitted', 'review', 'completed');

ALTER TABLE public.profiles ENABLE TRIGGER prevent_profile_privilege_escalation_trg;

UPDATE public.case_timeline
SET title = regexp_replace(
  title,
  'Bank Verification|Exchange Commission',
  'Under Review',
  'gi'
)
WHERE title ~* 'Bank Verification|Exchange Commission';

CREATE OR REPLACE FUNCTION public.normalize_recovery_workflow_state()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.case_phase = 'review' AND OLD.case_phase IS DISTINCT FROM 'review' THEN
    NEW.recovery_search_started_at := COALESCE(NEW.recovery_search_started_at, now());
    NEW.recovery_completed_at := NULL;
  ELSIF NEW.case_phase = 'completed' AND OLD.case_phase IS DISTINCT FROM 'completed' THEN
    IF NEW.recovery_result_type IS NULL OR NEW.recovery_result_details = '{}'::jsonb THEN
      RAISE EXCEPTION 'Recovery findings must be configured before completing the case';
    END IF;
    NEW.recovery_completed_at := COALESCE(NEW.recovery_completed_at, now());
  ELSIF NEW.case_phase = 'submitted' THEN
    NEW.recovery_search_started_at := NULL;
    NEW.recovery_completed_at := NULL;
    NEW.recovery_result_type := NULL;
    NEW.recovery_result_details := '{}'::jsonb;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS normalize_recovery_workflow_state_trg ON public.profiles;
CREATE TRIGGER normalize_recovery_workflow_state_trg
  BEFORE UPDATE OF case_phase ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_recovery_workflow_state();

COMMENT ON COLUMN public.profiles.recovery_search_duration_minutes IS
  'CRM-configured duration for the client investigation visualization.';
COMMENT ON COLUMN public.profiles.recovery_result_details IS
  'Analyst-entered evidence shown to the client when recovery findings are published.';
