-- This role belonged to a user in the original Supabase project. Keep the
-- historical seed when that auth user exists, but allow clean deployments.
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE id = 'efcfc03e-cd1e-47bf-95da-f98326336747'
ON CONFLICT (user_id, role) DO NOTHING;
