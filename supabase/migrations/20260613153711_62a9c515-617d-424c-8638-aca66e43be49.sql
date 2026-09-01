
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_is_archived ON public.profiles(is_archived);

UPDATE public.profiles
SET is_archived = true
WHERE platform = 'blackstone'
  AND lower(email) <> 'durdentylerdurden23@gmail.com';

CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF has_role(auth.uid(), 'admin'::app_role)
     OR has_role(auth.uid(), 'group_admin'::app_role)
     OR has_role(auth.uid(), 'supervisor'::app_role)
     OR has_role(auth.uid(), 'agent'::app_role) THEN
    RETURN NEW;
  END IF;

  IF auth.uid() = NEW.id THEN
    IF NEW.is_super IS DISTINCT FROM OLD.is_super
       OR NEW.group_id IS DISTINCT FROM OLD.group_id
       OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
       OR NEW.subscription IS DISTINCT FROM OLD.subscription
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.case_phase IS DISTINCT FROM OLD.case_phase
       OR NEW.case_number IS DISTINCT FROM OLD.case_number
       OR NEW.platform IS DISTINCT FROM OLD.platform
       OR NEW.is_archived IS DISTINCT FROM OLD.is_archived
       OR NEW.created_by IS DISTINCT FROM OLD.created_by
       OR NEW.id IS DISTINCT FROM OLD.id
       OR NEW.email IS DISTINCT FROM OLD.email THEN
      RAISE EXCEPTION 'Not allowed to modify privileged profile fields';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
