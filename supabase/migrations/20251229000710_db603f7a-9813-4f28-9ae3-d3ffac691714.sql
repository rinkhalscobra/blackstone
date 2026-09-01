-- Fix: Drop the security definer view and use a safer approach
-- Instead of a view, we'll rely on the column never being returned in queries
-- by removing the access_token column visibility from non-admin RLS

DROP VIEW IF EXISTS public.user_sessions_safe;

-- Alternative: Create a function that returns sessions without tokens for non-admins
CREATE OR REPLACE FUNCTION public.get_user_sessions_for_staff(target_user_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  login_time timestamptz,
  is_active boolean,
  login_ip text,
  user_agent text,
  access_token text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    s.id,
    s.user_id,
    s.login_time,
    s.is_active,
    s.login_ip,
    s.user_agent,
    CASE 
      WHEN has_role(auth.uid(), 'admin'::app_role) THEN s.access_token
      ELSE NULL
    END as access_token
  FROM public.user_sessions s
  WHERE s.user_id = target_user_id
    AND (
      has_role(auth.uid(), 'admin'::app_role) OR
      (has_role(auth.uid(), 'supervisor'::app_role) AND is_same_group(auth.uid(), target_user_id)) OR
      (has_role(auth.uid(), 'agent'::app_role) AND EXISTS (SELECT 1 FROM profiles WHERE id = target_user_id AND assigned_to = auth.uid())) OR
      auth.uid() = target_user_id
    )
$$;