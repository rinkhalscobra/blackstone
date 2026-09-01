-- Add group_id column to ip_whitelist to scope IP rules to groups
ALTER TABLE public.ip_whitelist ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_ip_whitelist_group_id ON public.ip_whitelist(group_id);

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view all IP rules" ON public.ip_whitelist;
DROP POLICY IF EXISTS "Admins can insert IP rules" ON public.ip_whitelist;
DROP POLICY IF EXISTS "Admins can delete IP rules" ON public.ip_whitelist;
DROP POLICY IF EXISTS "Group admins can view their group IP rules" ON public.ip_whitelist;
DROP POLICY IF EXISTS "Group admins can insert IP rules for their group" ON public.ip_whitelist;
DROP POLICY IF EXISTS "Group admins can delete their group IP rules" ON public.ip_whitelist;

-- RLS policies for ip_whitelist

-- Admins can do everything
CREATE POLICY "Admins can view all IP rules" ON public.ip_whitelist
FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert IP rules" ON public.ip_whitelist
FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete IP rules" ON public.ip_whitelist
FOR DELETE USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Group admins can manage IP rules for their own group
CREATE POLICY "Group admins can view their group IP rules" ON public.ip_whitelist
FOR SELECT USING (
  public.has_role(auth.uid(), 'group_admin'::app_role) AND 
  group_id = public.get_user_group(auth.uid())
);

CREATE POLICY "Group admins can insert IP rules for their group" ON public.ip_whitelist
FOR INSERT WITH CHECK (
  public.has_role(auth.uid(), 'group_admin'::app_role) AND 
  group_id = public.get_user_group(auth.uid())
);

CREATE POLICY "Group admins can delete their group IP rules" ON public.ip_whitelist
FOR DELETE USING (
  public.has_role(auth.uid(), 'group_admin'::app_role) AND 
  group_id = public.get_user_group(auth.uid())
);