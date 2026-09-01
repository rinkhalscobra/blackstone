INSERT INTO public.user_roles (user_id, role) 
VALUES ('efcfc03e-cd1e-47bf-95da-f98326336747', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;