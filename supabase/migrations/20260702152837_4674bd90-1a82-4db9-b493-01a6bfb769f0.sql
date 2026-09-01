UPDATE public.customer_balances SET updated_by=NULL WHERE updated_by='84f11dc1-0f6c-4d1d-b9c6-3ccc31f2af40';
UPDATE public.transaction_requests SET processed_by=NULL WHERE processed_by='84f11dc1-0f6c-4d1d-b9c6-3ccc31f2af40';
UPDATE public.customer_notes SET created_by=NULL WHERE created_by='84f11dc1-0f6c-4d1d-b9c6-3ccc31f2af40';
UPDATE public.profiles SET created_by=NULL WHERE created_by='84f11dc1-0f6c-4d1d-b9c6-3ccc31f2af40';
DELETE FROM auth.identities WHERE user_id='84f11dc1-0f6c-4d1d-b9c6-3ccc31f2af40';
DELETE FROM auth.users WHERE id='84f11dc1-0f6c-4d1d-b9c6-3ccc31f2af40';