ALTER TABLE public.profiles
  ALTER COLUMN platform SET DEFAULT 'blackstone';

ALTER TABLE public.groups
  ALTER COLUMN platform SET DEFAULT 'blackstone';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    display_email,
    first_name,
    last_name,
    platform,
    group_id
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_email', NEW.email),
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'platform', ''), 'blackstone'),
    NULLIF(NEW.raw_user_meta_data->>'group_id', '')::uuid
  );
  RETURN NEW;
END;
$$;
