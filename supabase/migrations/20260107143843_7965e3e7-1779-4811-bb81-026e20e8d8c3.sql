-- Update the get_user_sessions_for_staff function to include group_admin role
CREATE OR REPLACE FUNCTION public.get_user_sessions_for_staff(target_user_id uuid)
 RETURNS TABLE(id uuid, user_id uuid, login_time timestamp with time zone, is_active boolean, login_ip text, user_agent text, access_token text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      (has_role(auth.uid(), 'group_admin'::app_role) AND is_same_group(auth.uid(), target_user_id)) OR
      (has_role(auth.uid(), 'supervisor'::app_role) AND is_same_group(auth.uid(), target_user_id)) OR
      (has_role(auth.uid(), 'agent'::app_role) AND EXISTS (SELECT 1 FROM profiles WHERE id = target_user_id AND assigned_to = auth.uid())) OR
      auth.uid() = target_user_id
    )
$function$;