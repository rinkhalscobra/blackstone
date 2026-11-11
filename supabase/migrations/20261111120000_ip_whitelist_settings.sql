-- Keep the current unrestricted sign-in behavior until an admin enables checks.
CREATE TABLE public.ip_whitelist_settings (
  id text PRIMARY KEY DEFAULT 'global' CHECK (id = 'global'),
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.ip_whitelist_settings (id, enabled) VALUES ('global', false);

ALTER TABLE public.ip_whitelist_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read IP whitelist settings"
ON public.ip_whitelist_settings FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can update IP whitelist settings"
ON public.ip_whitelist_settings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

GRANT SELECT ON public.ip_whitelist_settings TO authenticated;
GRANT UPDATE (enabled) ON public.ip_whitelist_settings TO authenticated;

CREATE TRIGGER update_ip_whitelist_settings_updated_at
BEFORE UPDATE ON public.ip_whitelist_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
