# Performance review — November 17, 2026

## Implemented

- `lib/discovery-search.mjs`: read registry and tags together; read public category states in batches of six instead of sequentially. Merge in registry order to preserve metadata and vote tie handling. Release each batch's raw state before loading the next. Discovery also loads preferences alongside inventory.
- `lib/catalog/resolver.mjs`: overlap up to six hydration tasks, share lookups for repeated product identities, and deduplicate missing Shopify IDs before batch requests. Preserve provider throttling, usage limits, image overrides, input order and cache-only behavior.
- `lib/request-store.mjs` / `lib/hosted-api.ts`: coalesce repeated account, registry and tag reads within one hosted request. Return independent copies, invalidate reads around mutations (including failures), retry failed reads, and start fresh for every request. Large experiment states bypass this cache. The long-lived catalog resolver retains an uncached store.

## Controlled comparison

Run `node scripts/performance-path-check.mjs`. Baseline: `9f17e86`; five trials per path; median timings; synthetic 10 ms storage/provider latency. The script asserts identical before/after outputs. These numbers are not production latency or whole-page speed measurements; real provider throttling and network conditions remain relevant.

| Path | Before | After |
| --- | ---: | ---: |
| Inventory, 18 public categories | 221 ms | 45 ms |
| Hydration, 18 unique products | 199 ms | 33 ms |
| Five sequential account reads in one request | 55 ms | 11 ms |
| Underlying reads for that account fixture | 5 | 1 |

## Validation and limits

- 72 targeted tests passed, including concurrency bounds, deterministic ordering, vote aggregation, duplicate hydration, mutation invalidation, failed reads, sign-in, vote synchronization and immediate session revocation.
- Production build passed.
- Full suite: 296 passed, 40 failed. The failing server tests report `listen EPERM` on loopback in this environment; server/browser verification remains incomplete.
- Standalone TypeScript checking remains failing: seven diagnostics in both the current tree and a compiler run that substitutes the original hosted API in memory; no additional diagnostics in the current run.
- Publication could not proceed: `git.chatgpt-team.site` and `github.com` fail DNS resolution from this environment. No claim of production improvement is supported until deployment and live measurement succeed.

## Remaining opportunities

1. **Indexed database records and precomputed public aggregates.** `lib/d1-store.ts` reads and rewrites whole JSON records. Product pages in `lib/accounts.mjs` scan all public accounts for contributors and rebuild public inventory for a single item. Split accounts, opinions and public product aggregates into indexed records after designing a migration and compatibility checks. This is the most substantial scaling improvement.
2. **Lightweight search preferences.** `lib/global-search.mjs` calls the full `/api/account/me` handler for personalization. `lib/accounts.mjs` adds tags and scores to the entire profile, although search primarily needs opinion IDs and verdicts. A dedicated internal preferences reader would reduce unnecessary work for large collections while preserving account authorization.
3. **Indexed personalization.** `personalFit` repeatedly searches the full products array for each opinion, for every candidate. Build product/opinion maps once per ranking request if profiling shows CPU time becomes significant at larger catalog sizes.

These structural changes were reviewed but are not included in this patch. Measure production API timing and database work before choosing the next one.
