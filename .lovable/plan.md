# Crest Financial production configuration

## Production

- Website: `https://brightfund-pearl.vercel.app`
- Supabase project: `gbbnsecjzppffphmduca`
- The frontend reads its Supabase URL and publishable key from Vite environment variables.
- Supabase Auth redirects allow the production URL and local development on port 8080.

## Market data

- Cryptocurrency quotes, candles, and currency lists use Coinbase Exchange public endpoints.
- Cryptocurrency and fiat exchange rates use the Coinbase public Data API.
- These endpoints do not require a custom API key.

## Branding

- Public branding uses Crest Financial; the legal operator is Maple Crest Financial Inc.
- Corporate registration: 1812368-3, business number 797436847. The public registration is not a financial-services licence.
- Official record: https://ised-isde.canada.ca/cc/lgcy/fdrlCrpDtls.html?corpId=18123683
- Shared legal identity and contact settings are in `src/config/company.ts`.
- The current deployment URL and support email remain in use until replacement destinations are confirmed. `VITE_SUPPORT_EMAIL` can configure the support mailbox.
- Existing `brightfund` tenant IDs, auth aliases, applied migration names, and the deployed `confiscate-brightfund-staff` endpoint are compatibility identifiers, not display branding. Do not rename them without a coordinated database and deployment migration.
- Deploy the updated `mfa-setup` function to use Crest Financial for newly enrolled authenticator accounts. Existing enrolments remain valid with their previous local labels.
