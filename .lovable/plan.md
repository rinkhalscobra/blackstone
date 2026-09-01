# BlackStone production configuration

## Production

- Website: `https://blackstone-pearl.vercel.app`
- Supabase project: `gbbnsecjzppffphmduca`
- The frontend reads its Supabase URL and publishable key from Vite environment variables.
- Supabase Auth redirects allow the production URL and local development on port 8080.

## Market data

- Cryptocurrency quotes, candles, and currency lists use Coinbase Exchange public endpoints.
- Cryptocurrency and fiat exchange rates use the Coinbase public Data API.
- These endpoints do not require a custom API key.

## Branding

- Public copy and internal platform identifiers use the BlackStone name.
- The staff confiscation function is deployed as `confiscate-blackstone-staff`.
