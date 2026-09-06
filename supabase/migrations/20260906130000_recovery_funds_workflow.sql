-- Replace the investment-portfolio concept with case-linked located funds.
CREATE TABLE public.recovery_funds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(18, 2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL CHECK (currency IN ('EUR', 'USD', 'CAD')),
  source_type text NOT NULL DEFAULT 'other' CHECK (source_type IN ('bank', 'crypto', 'other')),
  source_name text,
  reference text,
  status text NOT NULL DEFAULT 'located'
    CHECK (status IN ('located', 'verification_pending', 'recovery_pending', 'available')),
  notes text,
  visible_to_client boolean NOT NULL DEFAULT true,
  origin_key text NOT NULL DEFAULT gen_random_uuid()::text,
  balance_credited_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, origin_key)
);

CREATE INDEX recovery_funds_customer_status_idx
  ON public.recovery_funds (customer_id, status, created_at DESC);

ALTER TABLE public.recovery_funds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view their located funds"
ON public.recovery_funds
FOR SELECT
TO authenticated
USING (auth.uid() = customer_id AND visible_to_client);

CREATE POLICY "Admins can manage all located funds"
ON public.recovery_funds
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Group admins can manage group located funds"
ON public.recovery_funds
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'group_admin'::public.app_role)
  AND public.is_same_group(auth.uid(), customer_id)
)
WITH CHECK (
  public.has_role(auth.uid(), 'group_admin'::public.app_role)
  AND public.is_same_group(auth.uid(), customer_id)
);

CREATE POLICY "Supervisors can manage group located funds"
ON public.recovery_funds
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'supervisor'::public.app_role)
  AND public.is_same_group(auth.uid(), customer_id)
)
WITH CHECK (
  public.has_role(auth.uid(), 'supervisor'::public.app_role)
  AND public.is_same_group(auth.uid(), customer_id)
);

CREATE POLICY "Agents can manage assigned located funds"
ON public.recovery_funds
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'agent'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = recovery_funds.customer_id
      AND profiles.assigned_to = auth.uid()
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'agent'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = recovery_funds.customer_id
      AND profiles.assigned_to = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION public.protect_credited_recovery_fund()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.balance_credited_at IS NOT NULL THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Available funds cannot be deleted after being credited';
    END IF;

    IF NEW.customer_id IS DISTINCT FROM OLD.customer_id
      OR NEW.amount IS DISTINCT FROM OLD.amount
      OR NEW.currency IS DISTINCT FROM OLD.currency
      OR NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Credited fund amount, currency, customer, and status are locked';
    END IF;
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$function$;

CREATE TRIGGER protect_credited_recovery_fund_trg
BEFORE UPDATE OR DELETE ON public.recovery_funds
FOR EACH ROW
EXECUTE FUNCTION public.protect_credited_recovery_fund();

CREATE TRIGGER update_recovery_funds_updated_at
BEFORE UPDATE ON public.recovery_funds
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.credit_available_recovery_fund()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_claimed integer;
BEGIN
  IF NEW.status <> 'available' OR NEW.balance_credited_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.recovery_funds
  SET balance_credited_at = now()
  WHERE id = NEW.id
    AND balance_credited_at IS NULL;

  GET DIAGNOSTICS v_claimed = ROW_COUNT;
  IF v_claimed = 0 THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.customer_balances (
    customer_id, currency, balance, updated_by, updated_at
  ) VALUES (
    NEW.customer_id, NEW.currency, NEW.amount, NEW.updated_by, now()
  )
  ON CONFLICT (customer_id, currency)
  DO UPDATE SET
    balance = public.customer_balances.balance + EXCLUDED.balance,
    updated_by = EXCLUDED.updated_by,
    updated_at = now();

  RETURN NEW;
END;
$function$;

CREATE TRIGGER credit_available_recovery_fund_trg
AFTER INSERT OR UPDATE OF status ON public.recovery_funds
FOR EACH ROW
EXECUTE FUNCTION public.credit_available_recovery_fund();

-- Completing the globe investigation automatically publishes its primary
-- finding into the Located Funds workflow.
CREATE OR REPLACE FUNCTION public.sync_case_finding_to_recovery_funds()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_amount_text text := NEW.recovery_result_details->>'amount';
  v_currency text := upper(NEW.recovery_result_details->>'currency');
  v_source_type text;
  v_source_name text;
  v_reference text;
BEGIN
  IF NEW.case_phase <> 'completed'
    OR v_amount_text IS NULL
    OR v_amount_text !~ '^\s*[0-9]+(\.[0-9]+)?\s*$'
    OR v_currency NOT IN ('EUR', 'USD', 'CAD') THEN
    RETURN NEW;
  END IF;

  v_source_type := CASE
    WHEN NEW.recovery_result_type = 'bank_transaction' THEN 'bank'
    WHEN NEW.recovery_result_type = 'crypto_transaction' THEN 'crypto'
    ELSE 'other'
  END;
  v_source_name := COALESCE(
    NEW.recovery_result_details->>'bank_name',
    NEW.recovery_result_details->>'exchange_name',
    NEW.recovery_result_details->>'asset',
    'Investigation finding'
  );
  v_reference := COALESCE(
    NEW.recovery_result_details->>'transaction_reference',
    NEW.recovery_result_details->>'transaction_hash',
    NEW.recovery_result_details->>'evidence_reference'
  );

  INSERT INTO public.recovery_funds (
    customer_id, amount, currency, source_type, source_name, reference,
    status, notes, origin_key, created_by, updated_by
  ) VALUES (
    NEW.id, trim(v_amount_text)::numeric, v_currency, v_source_type,
    v_source_name, v_reference, 'located',
    NEW.recovery_result_details->>'summary', 'case_finding', auth.uid(), auth.uid()
  )
  ON CONFLICT (customer_id, origin_key)
  DO UPDATE SET
    amount = EXCLUDED.amount,
    currency = EXCLUDED.currency,
    source_type = EXCLUDED.source_type,
    source_name = EXCLUDED.source_name,
    reference = EXCLUDED.reference,
    notes = EXCLUDED.notes,
    updated_by = EXCLUDED.updated_by,
    updated_at = now()
  WHERE recovery_funds.balance_credited_at IS NULL;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER sync_case_finding_to_recovery_funds_trg
AFTER UPDATE OF case_phase, recovery_result_details, recovery_result_type ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_case_finding_to_recovery_funds();

-- Backfill already-completed cases that have publishable monetary findings.
INSERT INTO public.recovery_funds (
  customer_id, amount, currency, source_type, source_name, reference,
  status, notes, origin_key
)
SELECT
  profile.id,
  trim(profile.recovery_result_details->>'amount')::numeric,
  upper(profile.recovery_result_details->>'currency'),
  CASE
    WHEN profile.recovery_result_type = 'bank_transaction' THEN 'bank'
    WHEN profile.recovery_result_type = 'crypto_transaction' THEN 'crypto'
    ELSE 'other'
  END,
  COALESCE(
    profile.recovery_result_details->>'bank_name',
    profile.recovery_result_details->>'exchange_name',
    profile.recovery_result_details->>'asset',
    'Investigation finding'
  ),
  COALESCE(
    profile.recovery_result_details->>'transaction_reference',
    profile.recovery_result_details->>'transaction_hash',
    profile.recovery_result_details->>'evidence_reference'
  ),
  'located',
  profile.recovery_result_details->>'summary',
  'case_finding'
FROM public.profiles AS profile
WHERE profile.case_phase = 'completed'
  AND profile.recovery_result_details->>'amount' ~ '^\s*[0-9]+(\.[0-9]+)?\s*$'
  AND upper(profile.recovery_result_details->>'currency') IN ('EUR', 'USD', 'CAD')
ON CONFLICT (customer_id, origin_key) DO NOTHING;

ALTER PUBLICATION supabase_realtime ADD TABLE public.recovery_funds;
