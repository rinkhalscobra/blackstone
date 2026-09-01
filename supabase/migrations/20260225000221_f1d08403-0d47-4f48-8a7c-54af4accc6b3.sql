-- Downgrade demo admin to agent role (only durdentylerdurden23@gmail.com should be admin)
UPDATE public.user_roles 
SET role = 'agent' 
WHERE user_id = 'cea4e297-e2a6-4eab-86e9-717a2c9f5cf1' 
AND role = 'admin';

-- Also ensure the real admin has is_super = true
UPDATE public.profiles 
SET is_super = true 
WHERE id = 'efcfc03e-cd1e-47bf-95da-f98326336747';