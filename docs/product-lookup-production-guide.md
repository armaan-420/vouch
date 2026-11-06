## Production status — <date start="2026-11-06" />, version 39

Channel3 lookup is deployed at [Vouch](https://v4ch.app/sunscreen?board=1). Source `38a2e8da8dc7917b4287e89630b3a79f78f0e7b3`; deployment `appgdep_6aede26afa848191adfde3bb14d1aad9` succeeded; runtime environment revision 4. Shopify is implemented as an optional adapter but is disabled and deferred. Related release history: <mention url="https://app.notion.com/p/40cd2a3caa8a812d83f4f3d13065be2d">Release Notes & Changelog</mention>.

## What participants can do

Search for a missing favorite by name or paste a public HTTPS product link. Select one or more results, keep searching without losing selections, and save nominations using the existing flow. Scan a barcode, enter its number, or find products from a photo. “Where to buy” appears only on product contributor pages and loads current offers on demand, with an affiliate disclosure. Voting and nomination screens do not display prices, retailer ratings or buying links.

Sunscreen and water bottles are existing production collections. Shampoo and TV lookup support is deployed, but their empty demo boards remain local; this release does not import test boards, votes, nominations or preview accounts. Organizers can create real experiments after choosing their lineups.

## Category and search contract

The active experiment supplies the category automatically, including after voting. Participants cannot substitute another category through a request parameter. Typed and photo searches send Channel3 structured category filters:

| Voting category | Verified Channel3 slugs |
| --- | --- |
| Sunscreen | sunscreen |
| Shampoo / shampoos | shampoo (human hair care) |
| Water bottle / water bottles | water-bottles; sports-water-bottles |
| TV / TVs / television / televisions | televisions |

These taxonomy slugs were verified with Channel3’s category API on <date start="2026-11-06" />. No taxonomy request is made while typing. Other custom categories are included in the query until a verified filter mapping is added; the generic organizer Products search stays broad. URL lookup uses the exact supplied product URL and then checks the returned category. Barcode identities feed the scoped text-search path.

Curated/custom products, active-board selections and the existing sunscreen catalog answer first. Live search begins only for queries of at least three characters with fewer than eight local matches. Result ranking uses text relevance; exact local matches win. Bundles are excluded. Existing SKU identities, voting, scoring, schedules, account privacy and the two-browser nomination threshold are preserved.

## Data and controls

Selected live products persist only provider references and identity fields such as name, brand, variant and category. Photos are refreshed from the provider when displayed; unavailable images become placeholders. Offers, prices and commission rates are not stored or cached. No visitor IDs, emails, account IDs or IP-derived identifiers are sent to providers. Barcode photos are decoded on-device; product photos require consent, resize to 1,024px maximum and strip metadata before forwarding without storage.

| Production setting | Current state |
| --- | --- |
| CATALOG_LIVE_PROVIDERS | channel3 |
| CHANNEL3_API_KEY | Server-only secret, never included in documentation |
| CATALOG_DAILY_LIVE_SEARCH_BUDGET | 300 provider attempts per Eastern calendar day |
| CATALOG_LINK_PASTE | true |
| CATALOG_WHERE_TO_BUY | true |
| CATALOG_BARCODE | true |
| CATALOG_PHOTO_SEARCH | true |

Existing auth/admin secrets and public access are preserved. Clear CATALOG_LIVE_PROVIDERS and redeploy to disable external search while retaining local results and name-only nominations. Individual controls can be disabled with their respective switches and a redeploy. Optional Go-UPC/UPCitemdb keys were not configured.

The additive migration creates catalog_cache and catalog_daily_usage; existing records are retained. Queries cache for ten minutes and are keyed by category and normalized query. Channel3 product snapshots expire after six hours. Barcode identity hits/misses expire after seven days/one day. The daily cap is atomic in D1. Visitor limits are per runtime: 20 requests per ten minutes, with a further five-photo-search limit. These are prototype controls and have not been load/abuse validated across all traffic.

## Verification and limits

All 110 automated tests and the final production build pass. Tests include category propagation from experiment to outbound request, participant category-override rejection, category-specific cache reuse, provider failures, identity-only persistence, D1 expiry/budgets, and Cloudflare runtime compatibility. Production HTTPS assets match source; health/config routes return 200, and anonymous organizer access remains 401.

Production checks returned five sunscreen results and eighteen water-bottle results, with Channel3 reporting ok. Identical repeats hit the query cache without another provider search. Current-offer endpoints returned 200 with an offer for each tested category. These are bounded checks, not exhaustive catalog/variant judgments or measured speed gains.

Version 38 deployed first but its live provider requests failed because Workers does not support redirect:error. Version 39 uses manual redirects and rejects 3xx responses without forwarding credentials. The new test exercises the actual Cloudflare runtime. [Cloudflare request documentation](https://developers.cloudflare.com/workers/runtime-apis/request/).

Real iPhone camera/scanner use, physical-phone accessibility, production product-photo upload, exact-variant coverage, and production inbox sign-in/profile-photo upload remain unverified. US-first coverage can miss products; some products lack reliable brand/variant fields and listings can disappear. Slow URL lookups offer name-search fallback. Shopify authentication and its separate identity-storage questions remain deferred.

## Source and maintenance

Implementation: lib/catalog/*, product picker/nomination/organizer/contributor UI, hosted and Node runtime wiring, and additive Drizzle schema. Local operating guide: PRODUCT_LOOKUP.md. Source changes were reviewed from the last documented version 35, including deployed versions 36–37 and all approved uncommitted lookup work before publication. Versions 36–37 also aligned community additions with board rankings and placed their chip beside the brand, with a single row of 44px-minimum voting controls. Historical sources remain intact. This documentation updates only when requested; it is not a watcher.

