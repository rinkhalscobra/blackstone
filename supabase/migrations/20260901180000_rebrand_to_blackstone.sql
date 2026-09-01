-- Keep internal platform identifiers aligned with the BlackStone rebrand.
UPDATE public.profiles
SET platform = 'blackstone'
WHERE lower(platform) = concat('ex', 'loss');

UPDATE public.groups
SET platform = 'blackstone'
WHERE lower(platform) = concat('ex', 'loss');

UPDATE auth.users
SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{platform}', '"blackstone"'::jsonb, true)
WHERE lower(raw_user_meta_data->>'platform') = concat('ex', 'loss');
