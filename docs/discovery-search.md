# Product discovery — November 12, 2026

`/search` is a dedicated discovery page linked from the shared desktop navigation and menu. `/api/discover` searches public collection products and qualified community additions with stable product identities. Drafts and disabled collections are excluded. Newly populated public collections and organizer product tags are read on each request; no deployment is needed for new records.

Search supports names, brands, categories, recorded tags, and a small deterministic vocabulary of everyday phrases (for example “isn’t greasy”, “doesn’t leak”, and “under makeup”). All meaningful terms and requested tags must match. Missing tags are not negative evidence. Price constraints and unsupported phrases currently return no matches rather than relaxing constraints invisibly. This is a lexical/phrase-based first version, not general semantic or LLM search. Results are paginated in groups of 24, with category, rated-only, community-score and personal-fit controls. URL state supports sharing and back/forward navigation.

Personal fit uses only the requesting account's saved opinions through the existing account API and identity protections. An existing personal verdict is shown directly. Otherwise, at least two item Vouch/Pass ratings on products with shared organizer tags in the same category are required. Each neighbor is weighted by tag Jaccard overlap; the score is `(10 + sum(verdictPoints × overlap)) / (2 + sum(overlap))`, where item Vouch = 10 and Pass = 0. The two neutral pseudo-observations shrink sparse estimates toward 5. Brand-only trust does not infer item fit. Estimates are explicitly labeled and are not calibrated satisfaction predictions. No profile means no invented fit score.

Best match gives lexical relevance priority, then combines available personal evidence (65%) and community score (35%), with a small preference for rated products. With no personal evidence it uses community score. Explicit sort modes are also available. Search community scores use the existing neutral-adjusted formula on latest-per-browser votes across public collections, independently of overall-board inclusion. This intentionally differs from a single experiment's score and is disclosed on the page. No community formula or stored verdict is changed.

Private responses use `Cache-Control: private, no-store` and `Vary: Cookie`. Results contain public product fields and the requester’s fit/verdict only, with no visitor IDs, other account opinions, emails or raw vote records. No search query history is stored by the application.

Validation: 248 tests passed including phrase matching, exclusions, unsupported constraints, cold start, positive/negative fit, brand-trust separation, pagination, collection visibility, latest-vote deduplication and response privacy. Production build passed. Browser verification and deployment recorded in the task completion report.

Scaling limit: this prototype scans public collection records and computes fit at request time. Before a large catalog, migrate discovery to a dedicated indexed product/search store with cached public aggregates and per-request private reranking. Richer semantic retrieval, typo tolerance and price filtering require additional implementation and grounded product data.

Live verification exposed a pre-existing browser-identity rotation failure: Cloudflare could not clone the framework Request wrapper. Rotation now constructs a native Request from its URL, method, headers and body, retaining the privacy boundary and supporting expired/switched accounts.

## Header search — November 16, 2026

The shared Edit header searches `/api/discover` across public Vouch categories alongside the current Edit’s catalog lookup. Discovery results show their category and open their canonical product page; catalog-only results retain the existing nomination flow for the current Edit. Missing-name nominations also remain scoped to that Edit, which is stated in the search status. No nomination or scoring storage changes are involved.

The placeholder and accessible search name are “Search vouch” at every width. The mobile wordmark is hidden on Edit search headers, leaving one row for the menu, search and right-side profile control. At intermediate widths (761–1100px), the menu button remains available when inline links are hidden. Search and navigation use the existing deployment and storage; no data migration is required.

`test/vouch-pill-browser-smoke.mjs` covers responsive controls, static search copy, cross-category product navigation, and the existing nomination handoff using isolated local fixtures.

## Global search implementation — November 17, 2026

`/search` remains the filterable product library. `/find?q=` is the full global
results route. The header works outside Edits and shares the accessible product
picker with `/find`; all rows open product pages. Both clients debounce 250 ms,
abort obsolete requests, render the Vouch phase first, and append catalog results.
The header shows at most eight rows and links to full results.

`GET /api/search` accepts `source=vouch` (2+ characters) or `source=catalog`
(3+ characters); the combined request starts both jobs concurrently. Public
inventory is cached for 60 seconds per store/D1 binding in the worker isolate.
Successful application POSTs invalidate that isolate's index; other isolates can
remain stale for up to 60 seconds. D1 remains authoritative. No personal opinions
are cached: fit is computed only for returned rows with the current account.
Provider hydration at this endpoint is cache-only, including the Vouch phase.

Local matching folds accents and plurals and supports token prefixes and compact
brands. Outside rows preserve provider order and require a matching brand term or
at least half the meaningful query terms. Provider references (including aliases)
precede the brand/name/variant key for identity reconciliation. Existing matches
retain Vouch evidence and canonical links. New rows have `vouchStatus: new`, no
invented score, and `action: {type: view, href: /products/...}`.

Offline measurement with 1,000 synthetic products and 200 warm queries reported
Vouch p50 2.28 ms and p95 2.76 ms on the development host. This measures endpoint
logic and an in-memory fixture, **not production D1, HTTP, or cold-isolate latency**.
Reproduce with `node scripts/search-latency-check.mjs`; the script also reports a
catalog fixture baseline. Production p95 remains unverified.

### November 17 follow-up: navigation and library placement

Search remains global on Explore, Leaderboard, product pages, sign-in and profiles,
including while voting. Removed account/home sign-in navigation locks and voting
search CSS suppression. The query endpoint remains independent of the current Edit.
Products now reads “All Products on Vouch”; removed the discovery hero, taste banner
and explanatory promotional section. Existing public inventory, category and
community-rating filters and pagination remain; drafts/private records are not
exposed. The discovery hero is deferred to a future homepage iteration.

Validation: 18 relevant search/discovery tests pass, changed JS lint passes, and
production build passes. Browser verification and publication remain blocked by
the execution sandbox's listener and outbound Git DNS restrictions.
