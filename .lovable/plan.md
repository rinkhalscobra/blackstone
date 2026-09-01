# Login on exloss.net — diagnosis first, no fix yet

## What I verified just now

I ran end-to-end checks against the live `https://exloss.net` deployment and login is **functional**:

- Published HTML at `exloss.net` loads (HTTP 200).
- The production JS bundle points at the correct Supabase project (`sdkaggmslkeowlruhdbl.supabase.co`) with the correct anon key.
- A raw `POST /auth/v1/token?grant_type=password` from `Origin: https://exloss.net` with `user@demo.com / Demo123!` returned **200** with a valid session (CORS header `access-control-allow-origin: https://exloss.net` present).
- A headless browser test hitting `https://exloss.net/auth`, filling the form, and submitting reached `https://exloss.net/dashboard` successfully. The `mfa-check` edge function returned 200.
- Supabase auth logs already show a real successful login today (`sonyhebert@gmail.com` at 16:50). The "Invalid login credentials" 400s in the logs are just wrong-password attempts from another IP.

So on the current build the "no one can log in" report doesn't reproduce.

## Why the answers you gave still leave the fix ambiguous

You said the failure is on the published `exloss.net` site, symptom is "don't know," and it affects everyone including demo accounts. But my automated test as a demo account on that exact URL succeeded. That means either:

1. The report is stale (from before this deployment / from users still hitting `exloss.com`), or
2. Users are hitting a specific sub-path/flow I haven't reproduced (e.g. staff MFA, a specific stored session, or a stale service worker/cache), or
3. There is a client-side error only some users see (browser, extension, cached bundle).

Blindly changing auth code without knowing which of these is real is likely to break the working path.

## Plan

1. Ask you (or capture from the affected user) one concrete data point: the exact error text or a screenshot from an affected user's browser console/network tab when they click Sign in on `https://exloss.net/auth`. Also confirm they are not still typing `exloss.com`.
2. If it turns out to be stale-cache users: add a small `<meta http-equiv="Cache-Control" content="no-cache">` on `index.html` and/or bump the build, and tell affected users to hard-refresh.
3. If it turns out to be `exloss.com` still resolving somewhere: verify DNS / redirect `exloss.com` → `exloss.net` in Project Settings → Domains.
4. If a real reproducible failure surfaces, patch the specific cause (I will not touch `useAuth` / `Auth.tsx` until then, since both currently work end-to-end).

## Technical notes

- Bundle: `/assets/index-DrSjORUm.js` on `exloss.net` contains the correct `sdkaggmslkeowlruhdbl` URL + anon key. No env drift.
- Supabase Auth CORS already allows `https://exloss.net`.
- `mfa-check` edge function responds 200 from that origin.
- The two `406` console errors after login are unrelated PostgREST `.single()` calls with no matching row — they don't block login (dashboard rendered).
