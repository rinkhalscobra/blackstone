# Performance changes

Implemented locally on 2026-11-05. The application and database migration have not
been deployed, and production response times have not been measured.

## Changes and evidence

| Area | Before | After |
| --- | --- | --- |
| Customer dashboard data | Each hook owned its own state and six realtime channels; seven reads were deduplicated only while in flight | One shared provider and one channel across all dashboard routes, layouts, and forms; no repeated reads on dashboard navigation |
| Notification badges | Separate count request and realtime channel in the dashboard layout | Uses the shared notification state; message counts still refresh independently |
| CRM role checks | Independent requests from the page, layout, and navigation | One user-scoped query, shared for 30 seconds and discarded when unused |
| Group administration load | Profile, group, users, roles, promocodes, and IP list loaded serially, followed by one session RPC per staff member | Independent group reads run together; session history loads on its tab, with at most four simultaneous RPCs |
| Group admin, supervisor, and agent customer tables | Every customer and its action dialogs rendered together | 50 rows per page; search covers all loaded customers and resets pagination |
| CRM customer details | Agent lookup delayed the other reads; routine saves and timeline events reloaded all customer tables and reset the active tab | Customer reads start independently of the agent picker; note/status/assignment saves use their returned rows; realtime changes update the affected list; background refresh preserves the tab |
| CRM timeline updates | Reloaded the customer record and remounted its timeline editor | The mounted timeline editor refreshes only its own events |
| Market widgets | Exact-batch caching repeated overlapping symbols across widgets; requests exceeding 16 symbols were truncated by the edge function | Same-turn requests combine, each symbol shares cached/in-flight data, and large batches split at the existing 16-symbol limit |
| Homepage shared JavaScript chunk | 135.41 KB minified / 44.27 KB gzip | 10.50 KB minified / 3.42 KB gzip after replacing one simple Framer Motion animation with equivalent CSS |

The chunk sizes are Vite build measurements, not page-load timings. The main entry
still measures approximately 729 KB minified and produces Vite's existing large
chunk warning.

Shared dashboard data resets when the account changes, refreshes after reconnects
and when returning to the tab, and retains visible content during background
refreshes. Timeline and notification updates now reach every consumer. Chat events
are filtered to the open conversation; notification audio contexts are released.
Repeated auth focus events no longer write the same user's last-login timestamp.
Font connections start in the HTML head, and hashed build assets receive immutable
cache headers on Vercel.

## Verification

- `npm test`: regression tests exercise shared data, real dashboard route navigation,
  account switching, reconnect refresh, balance/notification/timeline events, role
  query sharing and failure, customer pagination, staff session concurrency, customer
  detail loading and edits, and market batching/cache expiry/error recovery.
- `npm run typecheck`: passes.
- `npm run build`: passes.
- Existing repository lint debt remains: 81 errors and 20 warnings after this work,
  compared with 87 errors and 27 warnings before it.

Tests use mocked Supabase responses and a DOM environment. Real authentication,
payments, uploads, and database query plans still require a staging smoke test.

## Database and release

`supabase/migrations/20261105120000_dashboard_query_indexes.sql` adds indexes for
existing customer, transaction, notification, timeline, portfolio, and session
queries. It changes no rows, policies, functions, or balance calculations. Its SQL
has been checked against the repository schema; it has not run against a database.

Apply the migration to staging first and compare query plans and request timings.
Normal index creation can temporarily block writes on the indexed table; schedule
the production migration for a suitable low-traffic window, or have the database
operator create equivalent indexes concurrently outside a transaction for large
tables. The frontend works without the migration, so the two can be released
independently.

Before production release, check customer login and each dashboard route; staff
access for every role; CRM search, pagination, customer details, and session actions;
and one representative deposit/withdrawal review, notification, message, and upload
in staging. Confirm balance and notification changes appear in an already-open
customer dashboard, including after reconnecting. Deploy through the existing
hosting workflow and retain the previous application deployment for rollback.
