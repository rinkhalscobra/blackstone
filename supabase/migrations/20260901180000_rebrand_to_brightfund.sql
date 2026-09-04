-- Keep internal platform identifiers aligned with the BrightFund rebrand.
UPDATE public.profiles
SET platform = 'brightfund'
WHERE lower(platform) = concat('ex', 'loss');

UPDATE public.groups
SET platform = 'brightfund'
WHERE lower(platform) = concat('ex', 'loss');

UPDATE auth.users
SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{platform}', '"brightfund"'::jsonb, true)
WHERE lower(raw_user_meta_data->>'platform') = concat('ex', 'loss');
