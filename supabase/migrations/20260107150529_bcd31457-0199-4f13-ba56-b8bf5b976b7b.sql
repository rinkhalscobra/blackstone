-- Allow Group Admins to update sessions (to mark as inactive) for users in their group
CREATE POLICY "Group Admins can update group sessions"
ON public.user_sessions
FOR UPDATE
USING (has_role(auth.uid(), 'group_admin'::app_role) AND is_same_group(auth.uid(), user_id))
WITH CHECK (has_role(auth.uid(), 'group_admin'::app_role) AND is_same_group(auth.uid(), user_id));

-- Allow Admins to update any session
CREATE POLICY "Admins can update sessions"
ON public.user_sessions
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));