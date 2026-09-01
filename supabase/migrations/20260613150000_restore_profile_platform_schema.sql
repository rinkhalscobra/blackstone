-- Restore profile fields and helper present in the source project's generated types.
-- These objects were created directly in the source project and were missing from
-- its checked-in migration history.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS platform text DEFAULT 'chargeback',
  ADD COLUMN IF NOT EXISTS display_email text,
  ADD COLUMN IF NOT EXISTS display_currency text NOT NULL DEFAULT 'USD';

CREATE OR REPLACE FUNCTION public.get_user_platform(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT platform
  FROM public.profiles
  WHERE id = _user_id
  LIMIT 1
$$;
