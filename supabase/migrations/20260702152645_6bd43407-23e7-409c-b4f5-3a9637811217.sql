UPDATE public.profiles SET assigned_to=NULL WHERE assigned_to='84f11dc1-0f6c-4d1d-b9c6-3ccc31f2af40';
UPDATE public.case_timeline SET created_by=NULL WHERE created_by='84f11dc1-0f6c-4d1d-b9c6-3ccc31f2af40';
DELETE FROM public.user_roles WHERE user_id='84f11dc1-0f6c-4d1d-b9c6-3ccc31f2af40';
DELETE FROM public.profiles WHERE id='84f11dc1-0f6c-4d1d-b9c6-3ccc31f2af40';