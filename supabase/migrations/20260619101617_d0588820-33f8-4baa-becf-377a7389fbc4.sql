
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS platform text NOT NULL DEFAULT 'chargeback';

UPDATE public.groups g
SET platform = sub.platform
FROM (
  SELECT group_id, MODE() WITHIN GROUP (ORDER BY platform) AS platform
  FROM public.profiles
  WHERE group_id IS NOT NULL AND platform IS NOT NULL
  GROUP BY group_id
) sub
WHERE g.id = sub.group_id;

UPDATE public.groups SET platform = 'tk' WHERE name = 'GROUP TK';
UPDATE public.groups SET platform = 'brightfund' WHERE name ILIKE 'zyra%';

CREATE OR REPLACE FUNCTION public.get_user_platform_self()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT platform FROM public.profiles WHERE id = auth.uid() LIMIT 1
$$;

DROP POLICY IF EXISTS "Admins can manage all groups" ON public.groups;
DROP POLICY IF EXISTS "Group Admins can view their group" ON public.groups;
DROP POLICY IF EXISTS "Supervisors can view their group" ON public.groups;

CREATE POLICY "Admins manage all groups"
ON public.groups FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Group admins view own group"
ON public.groups FOR SELECT
USING (
  has_role(auth.uid(), 'group_admin'::app_role)
  AND id = get_user_group(auth.uid())
  AND platform = get_user_platform_self()
);

CREATE POLICY "Supervisors view own group"
ON public.groups FOR SELECT
USING (
  has_role(auth.uid(), 'supervisor'::app_role)
  AND id = get_user_group(auth.uid())
  AND platform = get_user_platform_self()
);

CREATE POLICY "Agents view own group"
ON public.groups FOR SELECT
USING (
  has_role(auth.uid(), 'agent'::app_role)
  AND id = get_user_group(auth.uid())
  AND platform = get_user_platform_self()
);

CREATE POLICY "Clients view own group"
ON public.groups FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND id = get_user_group(auth.uid())
  AND platform = get_user_platform_self()
);
