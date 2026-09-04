-- Migrate existing deployed records and defaults from the former platform identifier.
UPDATE public.profiles
SET platform = 'brightfund'
WHERE lower(platform) = concat('black', 'stone');

UPDATE public.groups
SET platform = 'brightfund'
WHERE lower(platform) = concat('black', 'stone');

UPDATE auth.users
SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{platform}', '"brightfund"'::jsonb, true)
WHERE lower(raw_user_meta_data->>'platform') = concat('black', 'stone');

ALTER TABLE public.profiles
  ALTER COLUMN platform SET DEFAULT 'brightfund';

ALTER TABLE public.groups
  ALTER COLUMN platform SET DEFAULT 'brightfund';
