# Vouch product lookup

Production release preparation, November 6, 2026 (Eastern Time). The owner approved publishing the reviewed prototype and updating Notion. Channel3 will be the sole enabled live provider; Shopify remains deferred. Final version, source, deployment and checks are recorded in the release notes after successful publication. Earlier local-review notes below retain their original dates and status.

## Architecture

The existing catalog remains the first layer. The shared resolver adds curated/custom products and products already selected for the active category, then calls enabled providers only for queries of at least three characters with fewer than eight local matches. Sunscreen retains its local catalog. Other categories never inherit sunscreen listings.

Missing-favorite text and photo searches now pass the active experiment category through the resolver into Channel3. Its `filters.category_ids` uses verified taxonomy slugs: `sunscreen`, human `shampoo`, `water-bottles` plus `sports-water-bottles`, and `televisions`, including common singular/plural labels. Slugs were checked against `GET /v1/categories/search` on November 6, 2026 ([category API guidance](https://github.com/channel3-ai/skills/blob/main/skills/channel3-api/SKILL.md#categories--v1categories)). No extra taxonomy request is made while typing. Other custom categories are included in the search query until a verified filter mapping is added; the generic organizer “Products” category stays broad. URL lookups remain exact-URL lookups followed by the existing category check. Barcode matches use the scoped text-search path. Query cache keys remain category-specific and use a new version to bypass earlier unscoped provider results.

Channel3 is the enabled live source for this release. Shopify Catalog is implemented as an optional secondary adapter but remains disabled; both can run in parallel only when explicitly configured. Local exact matches win; Channel3 wins exact cross-provider duplicates and retains alternate provider references. Matching uses brand, normalized name and size/variant, never price, rating or commission. Unknown brands stay distinct. Conservative identity matching does not merge regional formulas or differently named listings automatically.

A selected live product stores only its provider reference and identity fields. Nominations, organizer-created boards, account opinions and account history retain these references. A shared response hydration boundary fills fresh photos and merchant page links for participant, organizer and account displays. Expired photos become placeholders on failure. Legacy products keep their existing IDs and stored photos.

Provider calls use server-side fetch with no new server dependency. Visitor identifiers remain inside Vouch and are never sent as provider headers or request fields. Channel3 affiliate offer URLs, prices and commission rates are stripped from search data. The product contributor page loads offers only after “Where to buy” is tapped and displays the commission disclosure beside links; voting and nomination screens show none of these fields. Offers are fetched fresh, never persisted or cached.

## Coverage evidence

The developer-only script is `scripts/catalog-coverage-check.mjs`. It writes summary facts into ignored `outputs/`, never raw provider responses. It waits at least 350 ms between calls and stops on authentication errors or rate limiting without retry loops. Fixture tests never make live API calls.

Authenticated Channel3 coverage ran November 5, 2026: 20/20 text queries succeeded and passed the automated top-three plausibility heuristic. All had a brand and image on the selected candidate. This is an automated match check, not a manual judgment of exact formula or variant. Of four URL lookups, one succeeded and three exceeded the requested four-second limit. Channel3 remains first. Full summary: `outputs/catalog-coverage-2026-11-05.md`.

Shopify authenticated coverage has not run; no Shopify credentials were supplied. Its adapter and token handling use fixtures and the documented request schemas. Keyless coverage can be requested explicitly with `--keyless-shopify`; it is not run by tests or by default. No coverage conclusion is drawn for Shopify.

## Storage and freshness

Durable identity fields: id, provider, providerId, brand, name, variantLabel, category, optional GTIN, alternateRefs. No provider description, price, retailer offer, rating or commission belongs in nomination/account/experiment records. Images are never copied into R2 or public assets.

| Data | Maximum cache age |
| --- | --- |
| Search queries | 10 minutes |
| Shopify product snapshots | 24 hours |
| Channel3 product snapshots | 6 hours |
| Shopify prices/availability | 15 minutes allowed; implementation fetches fresh |
| Channel3 offers/buy links/commissions | Never cached |
| Barcode identity hit / miss | 7 days / 1 day |

Node uses a bounded memory LRU for provider snapshots and the existing file-store transaction queue for the daily budget. Worker uses D1 `catalog_cache` with expiration, an in-memory front layer and opportunistic expiry deletion. D1 `catalog_daily_usage` atomically reserves calls. Schema additions were generated in `drizzle/0001_opposite_colleen_wing.sql`; previous migrations remain unchanged. Deployment must apply the new migration before enabling live features. No hosted migration was run.

Shopify attribution parameters and seller names remain intact. Brand is null unless explicit attributes or an unambiguous single brand-store prefix supply it. Promoted placements are never requested. Confirm Shopify’s permission to retain picked-product names before enabling it for persistent collections; this question remains open. See [Shopify usage guidelines](https://shopify.dev/docs/agents/catalog) and [Channel3 caching guidance](https://channel3.ai/docs/guides/caching).

## Configuration

Every feature defaults off. Merely setting a key does not enable live calls.

| Variable | Purpose |
| --- | --- |
| `CHANNEL3_API_KEY` | Server-only Channel3 credential |
| `SHOPIFY_CATALOG_CLIENT_ID`, `SHOPIFY_CATALOG_CLIENT_SECRET` | Server-only credentials; exchanged for an in-memory bearer token |
| `SHOPIFY_CATALOG_MCP_URL` | Saved catalog MCP URL; defaults to Shopify’s public Catalog endpoint |
| `SHOPIFY_UCP_PROFILE_URL` | Hosted Vouch profile URL; local runtime uses Shopify’s documented example profile until Vouch’s profile is deployed |
| `CATALOG_LIVE_PROVIDERS` | Ordered `channel3,shopify` list; empty disables live search |
| `CATALOG_DAILY_LIVE_SEARCH_BUDGET` | Daily allowance, default 300, reset at Eastern midnight |
| `CATALOG_LINK_PASTE` | Enables pasted product links |
| `CATALOG_WHERE_TO_BUY` | Enables contributor-page offers |
| `CATALOG_BARCODE` | Enables barcode lookup and scanner |
| `CATALOG_PHOTO_SEARCH` | Enables photo search |
| `GO_UPC_API_KEY`, `UPCITEMDB_USER_KEY` | Optional server-only barcode provider credentials |

Switches accept `true`, `on`, or `1`. Turn off an individual switch to remove that feature. Clear `CATALOG_LIVE_PROVIDERS` to stop live provider search while retaining local search and name-only nominations. Clear the optional switches as well to hide those controls.

A query can consume at most one search per enabled provider (normally two total); cached or sufficiently covered local queries consume zero. The daily allowance reserves each metered provider attempt, including fallbacks and barcode database attempts. Channel3 product-ID refresh is free and does not spend the metered allowance. At 300 paid Channel3 attempts and the research rate of $0.007, the search ceiling is about $2.10/day; confirm current vendor pricing before enabling billing. Text/URL/detail routes have a per-runtime visitor allowance of 20 requests per ten minutes; photo search also has a five-per-ten-minute cap. These memory caps are per Worker isolate and do not constitute distributed abuse protection. Requests without an established visitor cookie share a conservative anonymous allowance. The durable daily cap applies across isolates.

## Local credentials and previews

No secret file was created by this implementation. The supplied Channel3 key is held in the current private execution session and passed only into the isolated local preview process environment. It is not available to unrelated terminals and does not persist after that session ends. The user should rotate the key disclosed in chat before using it for production.

The dependency-free Node preview reads `process.env`. A local developer may use an ignored `.env.local` via `node --env-file=.env.local server.mjs`, or an existing environment, without printing key values. `scripts/run-framework.mjs` invokes Vinext; `scripts/sites-env.mjs` configures tool-state paths, not a secret loader. The Worker reads `env` bindings and requires local Wrangler/Sites secret configuration for local framework testing. See `AUTH_SETUP.md` for the analogous server-only email setup. Do not add provider variables to browser/public environment settings.

Production activation uses Sites server-only runtime settings and a saved-source deployment. The release notes record the applied environment revision and deployment outcome.

## Barcode and photo behavior

Barcode identity tries Open Beauty Facts, Open Food Facts, then Go-UPC if configured, otherwise paid/free UPCitemdb. It validates GS1 checksums before network calls and returns identity only. Shopify barcode matches, when present, are preferred after text lookup.

The browser prefers native BarcodeDetector and lazy-loads the pinned MIT `barcode-detector@3.2.3` / `zxing-wasm@3.1.6` fallback only when scanning is requested. The script, reader WASM and both license files are in `public/vendor/barcode-detector/`. WASM is explicitly served locally, never from a runtime CDN. Camera tracks stop on success, close, error or navigation. Manual entry and an on-device barcode-photo fallback remain available. Barcode images never leave the device.

Product photo search resizes to 1,024 px maximum, re-encodes JPEG to strip metadata and asks for consent before upload. The server enforces a roughly 2 MB request limit, accepts only the expected image structure and forwards the image without storing or logging it. Channel3 is tried first, then Shopify. Results pass through category/bundle filtering.

## Limitations and remaining release steps

Coverage is US-first, category taxonomy matching is conservative, some results have no reliable brand or size, and products can disappear. URL lookups that take over four seconds fall back to a friendly name-search message. Device camera support, particularly real iPhone Safari, remains unverified. Unknown Shopify brands must not be treated as the same brand. The existing one-product-per-brand rule remains unchanged.

Release procedure: keep Shopify disabled until its separate authentication/permission questions are resolved; configure server-only Channel3 credentials and chosen switches in Sites; apply the additive migration through normal publication; verify production routes, category search and images. Real-phone camera checks remain outstanding. The owner has now requested production release notes and a Notion update.

## Current verification and changed files

Baseline: 73 tests passed and production build passed. The local Cloudflare smoke check passes after correcting a migration-compatibility issue: resolving a legacy ID must not read the new catalog tables. Core D1 cache and atomic-budget SQL are additionally tested against SQLite. The additive migration is included for Sites to apply during the approved production release.

Keyless Shopify coverage ran November 6, 2026. All 20 text searches returned HTTP 200; 14/20 passed the automated top-three match heuristic, compared with Channel3’s 20/20. Shopify’s chosen candidates had no reliable brand in all 20 queries. One of four product URLs returned a result; three returned no products. The two separate coverage reports retain their own run-specific ordering; the combined conclusion and app preview keep **Channel3 first, Shopify second**. Shopify production authentication and private/saved-catalog access remain unverified.

Browser checks in the in-app browser covered 393 × 650 sunscreen local results, a new Shampoo category’s live results, selection and saving, two-nominator qualification, provider-photo hydration on the community board and contributor page, and fresh disclosed buying links. They also covered barcode manual entry and photo-selection/consent/results against a separate fixture-only server. Neither a physical camera nor iPhone Safari was used. Full camera permission-denial behavior and on-device barcode-photo decoding remain unverified.

The implementation does not cache any provider offers, including Shopify offers, rather than using its permitted 15-minute price cache. Shopify URL lookup uses documented `catalog.ids`, which accepts product URLs; it does not use an undocumented `catalog.urls` argument. Channel3 US localization is sent in `config.country`, and image search uses the documented `base64_image` input to `/v1/search`. Raw REST fetch preserves the existing dependency-free server style instead of adding an SDK.

Changed application files:

- `lib/catalog/normalize.mjs`, `providers/request.mjs`, `providers/channel3.mjs`, `providers/shopify-catalog.mjs`, `providers/gtin.mjs`: validation, sanitized adapters, timeouts and barcode identity.
- `lib/catalog/cache.mjs`, `resolver.mjs`, `runtime.mjs`, `api.mjs`, `hydrate.mjs`: expiring storage, limits, local-first merging, category lookup endpoints and shared display hydration.
- `server.mjs`, `lib/hosted-api.ts`, `cloudflare-env.d.ts`: Node/Worker configuration and wiring, larger bounded photo-request transport, WASM content type.
- `lib/experiment-api.mjs`, `lib/vouch-api.mjs`, `lib/accounts.mjs`, `lib/application-api.mjs`: scoped category integration, identity-only live persistence and hydration while preserving existing voting and account rules.
- `public/product-picker.js`, `public/nomination.js`, `public/admin.js`, `public/accounts.js`, `lib/experiment-page.html`: search metadata, broken-image placeholders, pasted links, scanner/photo controls, optional buying links and accurate source credits.
- `public/ucp/vouch-agent-profile.json`: proposed hosted agent profile; not deployed.
- `public/vendor/barcode-detector/*`, `eslint.config.mjs`: pinned MIT decoder/WASM/licenses; exclude unchanged third-party generated code from application lint.
- `db/schema.ts`, `drizzle/0001_opposite_colleen_wing.sql`, `drizzle/meta/*`: generated cache/usage schema migration and metadata.
- `scripts/catalog-coverage-check.mjs`, `test/catalog-*.test.mjs`: opt-in live summary check and offline regression tests.
- `PRODUCT_LOOKUP.md`, `README.md`, `SETUP-AUDIT.md`, `CATALOG_IMPORT.md`: current architecture/setup guidance; previous dated release history preserved.

The Channel3 skill was installed outside the repository at `~/.codex/skills/channel3-api` from Channel3’s official GitHub repository, commit `db55b30bb42e0f6306d47a9857bf1cd6482ecb48`. The requested npx installer failed because Git requires the Xcode license; the same skill files were downloaded directly. That was a local-review limitation at the time; Git is available for this production release, and source is reconciled against the latest deployed version before publishing. No sudo command was run.

Final local check results: **102/102 tests passed**, production build passed, and the existing Cloudflare runtime smoke test passed. Lint exits nonzero with four pre-existing `no-explicit-any` errors in untouched `lib/d1-store.ts` plus seven existing warnings; the newly authored catalog code has no lint errors. No unrelated D1-store refactor was made.

An authenticated, two-request Channel3 resolver measurement in the TVs category returned four results each time: first search one provider call, identical repeat zero provider calls, query-cache hit rate 1/2 (50%). This deliberately repeated pair is not a production traffic estimate. With both providers enabled, an uncached thin-local search can make two calls; locally covered and query-cached searches make zero.

The secret/test-identifier scan checked 373 text files across source and generated assets, excluding private runtime stores and dependency directories, and found no supplied Channel3 key or live-preview visitor identifier. Secrets were never copied into source, fixtures, build output, release notes or logs. Browser/live data checks used separate temporary preview storage; production visitor records were not retrieved.

Additional review evidence: barcode manual entry and product-photo consent/results passed in the fixture browser, and valid/invalid pasted links showed their expected results/messages. Search fit was checked at 393px and 1280px with no horizontal overflow. A live water-bottle request returned results without sunscreen leakage. Nineteen temporary development logs were also checked for the supplied key, with zero matches. Temporary preview servers were stopped after verification. [Phone screenshot](outputs/product-lookup-phone-review.png).

## Owner testing preview — November 6, 2026

A reusable local-only launch command is now available: `npm run preview:lookup`. It serves `http://127.0.0.1:4174` on loopback, enables the lookup switches for testing, and keeps all review votes/nominations under ignored `.data/product-lookup-preview/`. It does not load or modify production data, change production settings, or refresh the frozen local feed snapshot. The default preview allowance is 100 provider attempts/day. Source defaults for the real application remain off.

Test pages: `/sunscreen?board=1`, `/waterbottle?board=1`, `/shampoo?board=1`, and `/televisions?board=1`; organizer access is `/admin`. The two new-category boards intentionally begin empty, ready to search and nominate. Search results and the optional barcode/photo controls appear on each board. The local test inbox continues to send no email.

The running owner-review session has Channel3 and Shopify enabled, with the supplied Channel3 key passed only through the server process environment. The user requested that this review server remain available for testing. Restarting outside that private session requires an existing environment key; without it, the reusable command still works with Shopify’s keyless endpoint. No secret file was created.

Shopify dashboard work: the owner approved creating an identity named `Vouch local testing`. Shopify refused the creation pending personal identity verification, so no new API credential exists. The exact verification entry point was found through **catalog editor → Search preview → Response → Verify to unlock**, and the `Verify your identity → Start` screen was left open in Chrome for the owner. No personal documents, payment details, legal terms, account security settings or payouts were submitted/changed.

A catalog named `vouch-local-us` was saved in the owner’s Shopify developer organization. It includes Shopify products, leaves the Off-Shopify beta off, has no query prefix/category/price/rating restrictions, and sets a 20-result limit. The dashboard’s country control did not retain the attempted US selection; localization remains explicitly US on Vouch’s API requests. The current dashboard uses the standard MCP endpoint plus `catalog.catalog_id` instead of a distinct saved-catalog MCP URL. The adapter now supports the optional server setting `SHOPIFY_CATALOG_ID`, and it is supplied in the running local preview’s environment. A keyless search using that saved ID returned HTTP 200 and five results. Authenticated access remains gated until the owner finishes verification.

Additional fixes/checks: incomplete Shopify credentials fail explicitly instead of silently using keyless access; a token response missing `access_token` is treated as an authentication error; fixture tests cover concurrent token reuse, refresh before expiry, invalid/partial credentials and saved-catalog text/photo arguments. **105 automated tests pass.** A live local shampoo request returned results from both providers with `ok` statuses. These checks use no live calls inside the automated test suite.

Owner testing handoff: the owner chose to defer Shopify personal verification and test locally first. The original Shopify tab is back on the saved catalog, with **Response → Verify to unlock** available for later. The local review server remains running at port 4174, with both providers reporting `ok` through the saved-catalog configuration. Browser review found a shampoo-and-conditioner “Combo” result that escaped the original bundle vocabulary; the shared normalizer now excludes combo, multipack, twin, and quantity bundles such as “2 x 250ml,” with fixture regression coverage preserving single 2-in-1 formulas. **106 tests pass**, the production build passes, and lint passes for all files changed in this follow-up. Production remains unchanged.

Shopify follow-up: the owner reported completing the identity check. After refreshing the developer dashboard, credential creation for the previously approved `Vouch local testing` identity was attempted again. Shopify still refused it with the same verification-required banner; the fresh saved-catalog preview response also said `Catalog search is locked`, and its verification link returned to `Verify your identity → Start`. No identity/API credential was created, and the dashboard did not expose an approval or review status. Whether the submitted check is pending, failed, or incomplete remains unverified. The owner was asked what confirmation Shopify showed. The loopback preview remains available with Channel3 and saved-catalog keyless Shopify; no application code or production configuration changed during this check.

Category-scoped lookup follow-up, November 6: the owner deferred Shopify. The running preview at port 4174 was restarted with Channel3 only, and `preview:lookup` now defaults to Channel3 when its environment key is available, otherwise local search only. Explicit provider overrides still work. **109 automated tests pass**, including experiment-to-provider category propagation, participant category-override rejection, outbound text/photo filters, custom-category fallback and category-isolated cache reuse. The production build passes. Live preview searches returned 14 shampoo matches and 15 water-bottle matches with Channel3 reporting `ok`; identical repeats used the query cache without another provider search. An Isntree sunscreen search was covered by the local catalog and needed no provider call. These checks establish behavior, not a measured speed improvement against the old implementation. This follow-up remains local and uncommitted; production and release checkpoints are unchanged.
