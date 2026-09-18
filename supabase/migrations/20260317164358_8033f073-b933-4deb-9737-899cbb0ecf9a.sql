
-- This balance belonged to a user in the original Supabase project. Keep the
-- historical seed when that auth user exists, but allow clean deployments.
INSERT INTO public.customer_balances (customer_id, balance, currency)
SELECT id, 50614.51, 'EUR'
FROM auth.users
WHERE id = '73a435dc-335f-4cc9-9847-91b1ad543448';
