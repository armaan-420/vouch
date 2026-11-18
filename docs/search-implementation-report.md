# Global search implementation — November 17, 2026

**November 17 deployment update.** The search implementation described below is included in deployed Sites version 121. The publication blocker and test environment notes below document the earlier implementation session.

Implementation is local. Production publication is **blocked**, not complete.
Armaan authorized production on November 17. Current Sites version remains 108;
no new version was saved or deployed during this work.

## Implemented

- Single `/api/search` contract, separate Vouch/catalog phases, public inventory
  cache with invalidation, candidate-only personal evidence and alias deduplication.
- Global Channel3 profile, shared v3 query cache, coalescing, durable 250-call
  global share within the unchanged overall cap, lenient matching and bundle rules.
- Global header plus `/find`, shared keyboard-accessible picker, eight-row header,
  staged results and stale-request cancellation. `/search` stays a filter library.
- Outside product pages, canonical identity, community evidence, unavailable state,
  client noindex for new products, and on-demand disclosed retailer links.
- Inline email sign-in followed by profile vouch, identity-only storage, durable
  rate limiting, existing visibility preservation and idempotent saves.
- Deterministic eligible Edit matching, organizer-editable category aliases,
  explicit choice when ambiguous, shared append nomination mutation, stable linked
  browser identity, existing qualification threshold and retry after partial failure.

Main files: `lib/global-search.mjs`, `lib/search-matching.mjs`,
`lib/discovery-search.mjs`, `lib/catalog/*`, `lib/accounts.mjs`,
`lib/match-edits.mjs`, `lib/vouch-api.mjs`, `lib/application-api.mjs`,
`public/site-nav.js`, `public/find.js`, `public/product-picker.js`,
`public/accounts.js`, admin settings, `/find` route and page.

## Validation

- Targeted search, account, discovery and provider suite: **70 passed, 0 failed**.
- New search fixtures: **12 passed**, including an in-process application flow
  through search, email verification, profile vouch, product state and nominations.
- Full suite with a 15-second per-test timeout: **323 tests: 284 passed, 39 failed**.
  The 39 failures report `listen EPERM` on `127.0.0.1`; the worker test also reaches
  its timeout. These server/runtime tests are not verified, rather than passed.
- Production build: passed. Changed-file lint: zero errors; five existing warnings.
- `git diff --check`: passed.
- Benchmark: 1,000 synthetic products, 200 warm requests per phase. Vouch p50
  **2.28 ms**, p95 **2.76 ms**; cached catalog p50 **2.28 ms**, p95 **3.76 ms**.
  This uses the real resolver's memory query cache and endpoint logic, not D1,
  real network requests or cold isolates. Run `node scripts/search-latency-check.mjs`.

## Verification still required

- Browser smoke, mobile/keyboard visual QA, and HTTP/Worker integration checks on
  a host that permits loopback listeners. No successful browser smoke is claimed.
- Real Channel3 coverage: skipped; no verified working key/network in this session.
- Production latency, provider availability and production end-to-end behavior.
- Client-inserted noindex is not a server-rendered robots directive.

## Publication blocker and resume

Both normal `git ls-remote github refs/heads/main` and the Sites source helper fail
with **Could not resolve host**, for `github.com` and `git.chatgpt-team.site`
respectively. The native Sites connector can read project metadata, but it cannot
replace the required source push. The post-commit GitHub hook also fails for DNS.
No force push, replacement Site, production data changes, or release-note writes
were attempted.

On a host with working Git networking: inspect/fetch remote changes, push `main`
without force, run the outstanding integration/browser checks, then use the Sites
source helper to build/package the exact final commit and the native save/deploy
workflow for project `appgprj_6ae5468eccc88191ad1d6413c672392a`. Preserve D1/R2,
public access and the current domain. Verify the deployment result before calling
this live. The two implementation commits and this report remain in the local repo.
