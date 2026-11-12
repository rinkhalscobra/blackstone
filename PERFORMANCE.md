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


## Admin tab organization (2026-11-12)

The super-admin page opens on Customers. Pending transactions now have their own
Transactions tab instead of appearing above every management section. The active
tab is retained in the URL, and section loading/errors keep navigation available.

- Initial management reads drop from six to three (profiles, roles, and groups).
  Promocodes, IP rules, and audit logs load when opened; transactions and their
  realtime subscription mount only in their tab. Fresh section data is reused for
  30 seconds, and refresh invalidates inactive sections without fetching them.
- All admin tables render at most 25 rows per page. Pending transactions render
  10 per page, with customer search and deposit/withdrawal filtering. These are
  client-side pages; directory reads and the latest-100 audit-log limit remain.
- Background refresh preserves customer search, pagination, and the active tab.
  Query keys include the account, and transaction keys also include access scope.
  Transaction requests refresh on reopening the tab to cover subscription gaps.
- Agent client counts use one lookup map and now select the assignment field that
  was missing from the original directory query.
- Mobile tab navigation scrolls horizontally. Header actions and pagination wrap
  within small screens; icon actions have accessible labels.

Verification: the automated suite covers navigation, on-demand reads, search,
cache and access-scope isolation, refresh, retry, realtime removal, and pagination.
Browser checks with intercepted sample responses pass at 1440, 390, and 320 px,
including the type filter, approval-dialog opening, and control bounds. Typecheck
and production build pass. Live data and production timings were not measured;
the existing Vite shared-chunk size warning remains.


## Staff rendering effects (2026-11-12)

Staff dashboard headings now use a static text color. Staff navigation, the window
frame, cards, and tab bar use opaque backgrounds without backdrop filters or large
blurred shadows. The shared public/customer components keep their existing defaults.
Admin tables now create row elements only for the active tab, avoiding hidden-row
formatting and dialog element creation on every customer-search update.

A local browser audit with sample data and normal motion preferences measured:

| Idle admin page | Before | After |
| --- | --- | --- |
| Running animations | 1 infinite heading shimmer | 0 |
| Elements with backdrop filters | 4 (10?40 px blur) | 0 |
| Transform on the scrolling content wrapper | Identity matrix | None |

Pull-to-refresh now tracks gestures without updating React state at touch start,
checks the actual page and nested scroll positions, and ignores horizontal swipes.
Its content transform exists only during a pull or refresh. Cancelled and short
pulls reset normally. Tests cover these gestures plus the active-tab rendering
boundary. These are local rendering checks, not production response-time benchmarks.
