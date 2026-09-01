
DROP POLICY IF EXISTS "Supervisors can view group members" ON public.profiles;
DROP POLICY IF EXISTS "Agents can view assigned customers" ON public.profiles;
DROP POLICY IF EXISTS "Group Admins can view group members" ON public.profiles;

CREATE POLICY "Group Admins can view group members"
ON public.profiles FOR SELECT
USING (
  has_role(auth.uid(), 'group_admin'::app_role)
  AND group_id = get_user_group(auth.uid())
  AND platform = get_user_platform_self()
);

CREATE POLICY "Supervisors can view group members"
ON public.profiles FOR SELECT
USING (
  has_role(auth.uid(), 'supervisor'::app_role)
  AND group_id = get_user_group(auth.uid())
  AND platform = get_user_platform_self()
);

CREATE POLICY "Agents can view assigned customers"
ON public.profiles FOR SELECT
USING (
  has_role(auth.uid(), 'agent'::app_role)
  AND assigned_to = auth.uid()
  AND platform = get_user_platform_self()
);
