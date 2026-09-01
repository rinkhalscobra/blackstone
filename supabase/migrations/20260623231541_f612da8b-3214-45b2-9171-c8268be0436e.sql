
-- Wire trigger functions that exist but were never attached after the clone

-- 1) Auto-create profile on new auth user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2) Update balances when a transaction request is approved
DROP TRIGGER IF EXISTS update_balance_after_transaction ON public.transaction_requests;
CREATE TRIGGER update_balance_after_transaction
  AFTER UPDATE ON public.transaction_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_balance_on_transaction_approval();

-- 3) Prevent privileged column edits on profiles
DROP TRIGGER IF EXISTS prevent_profile_privilege_escalation_trg ON public.profiles;
CREATE TRIGGER prevent_profile_privilege_escalation_trg
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- 4) Keep updated_at fresh on every table that has the column
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.table_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.column_name = 'updated_at'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON public.%I', r.table_name);
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()',
      r.table_name
    );
  END LOOP;
END $$;

-- 5) Backfill the 1 auth user that has no profile (handle_new_user logic, applied once)
INSERT INTO public.profiles (id, email, display_email, first_name, last_name, platform, group_id)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'display_email', u.email),
  u.raw_user_meta_data->>'first_name',
  u.raw_user_meta_data->>'last_name',
  COALESCE(u.raw_user_meta_data->>'platform', 'chargeback'),
  NULLIF(u.raw_user_meta_data->>'group_id', '')::uuid
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;
