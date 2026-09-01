ALTER TABLE public.password_reset_requests
  ADD COLUMN IF NOT EXISTS new_password_hash text;