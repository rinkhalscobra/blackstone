
-- Drop the existing restrictive policies on groups
DROP POLICY IF EXISTS "Admins can manage all groups" ON public.groups;
DROP POLICY IF EXISTS "Group Admins can view their group" ON public.groups;
DROP POLICY IF EXISTS "Supervisors can view their group" ON public.groups;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Admins can manage all groups"
ON public.groups
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Group Admins can view their group"
ON public.groups
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'group_admin'::app_role) AND id = get_user_group(auth.uid()));

CREATE POLICY "Supervisors can view their group"
ON public.groups
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'supervisor'::app_role) AND id = get_user_group(auth.uid()));
