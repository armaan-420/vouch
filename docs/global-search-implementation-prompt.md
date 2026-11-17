# Codex prompt: Vouch global product search (Channel3) with vouch-from-anywhere

Revised November 16, 2026. Paste everything below the line into Codex. Run it from `vouch-sunscreen-prototype/`. Read `docs/search-next-iteration-plan.md` first. Historical source at the original writing was `2059dc3`; subsequent local commits `54f2e8e` and `4e68dd3` added an initial search implementation and the plan. Inspect the actual working tree, GitHub SHA, and Sites version before assuming any change is live. Preserve later edits.

Decisions Armaan made for this build:
- Search **both Vouch and Channel3** for eligible queries, return matches found, and explain provider limits or genuine no-match cases.
- Clicking a result opens a **product page**, and the visitor can **vouch for it there**.
- A vouch for a product that isn't on any Edit is **saved to the person's profile right away**. If an eligible open public Edit exists for that product's category, it is **also nominated there** under existing nomination rules. If no Edit matches, it stays profile-only; if several match, the person chooses.
- Anyone can search and open product pages. **Saving a vouch requires sign-in**, using the existing inline email-code flow at the moment they tap Vouch.
- `/search` is the **filterable Vouch product library** with no search input. Put full global search results at a separate route such as `/find?q=...`.

---

## Goal

Finish Vouch's global product search so that:

1. Typing a product name in the site header shows matching products. A separate full-results route such as `/find` shows all search results; `/search` remains the filterable Products library. Vouch's own products appear promptly, followed by Channel3 products.
2. Every result can be clicked. It opens a product page that works even if the product has never been on Vouch.
3. On that page, a signed-in person can tap **Vouch**. That saves an item vouch to their profile and nominates the product into the matching public Edit when one exists.

Optimize for perceived speed first, then Channel3 cost. Don't change voting, scoring formulas, nomination qualification thresholds, or the profile rule that only item vouches are shown.

## Read first (don't skip)

- `lib/global-search.mjs`, `lib/application-api.mjs` (`/api/search`, `/api/discover`), `lib/discovery-search.mjs`, `test/global-search.test.mjs`, `test/discovery-search.test.mjs`
- `lib/catalog/resolver.mjs`, `lib/catalog/normalize.mjs`, `lib/catalog/providers/channel3.mjs`, `lib/catalog/cache.mjs`, `lib/catalog/runtime.mjs`, `lib/catalog/hydrate.mjs`
- `public/site-nav.js` (header search, 250 ms debounce, `context.nominate`), `public/product-picker.js`, `public/discovery.js`, `lib/search-page.html`
- `lib/accounts.mjs`: the `/api/products/:id` product route (it currently returns 404 for products outside public Edits), `upsert`, `productKey`, `data.products`, opinion visibility defaults
- `lib/account-auth.mjs` and the inline email sign-in flow
- `lib/vouch-api.mjs` and `lib/experiment-api.mjs`: `/api/nominations`, community qualification (two nominators), `inCategory`
- `PRODUCT_LOOKUP.md`, `docs/discovery-search.md`, `AGENTS.md`

The original prompt observed uncommitted header-search and pill work, but that snapshot is stale. Inspect `git status`, commits, and the current files. Build on user changes; do not revert, stash, or overwrite them. The initial unified search in `54f2e8e` is not proof of deployment.

## Problems in the current version that you must fix

These were found by running the real filter functions on sample product titles (Nov 16, 2026). In that test, 15 of 25 good products were dropped.

1. **Strict every-word match after Channel3.** `rankProducts` keeps a provider result only if every typed word appears in its brand + name. "noise cancelling headphones" drops a Sony WH-1000XM5 titled "Noise Canceling Over-Ear". There's no plural handling ("airpods" vs "AirPod").
2. **Sunscreen ranking rules applied everywhere.** +6 for sunscreen words, +3 for SPF, −10 for foundation/makeup/lip balm, −8 for mini/deluxe/travel. They distort every other category.
3. **The bundle filter is too broad for general products.** `isBundle` drops any title containing set, kit, pack, duo, twin, gift, combo or "12 Pack". That loses LEGO sets, cookware sets, hydration packs, twin mattresses, "TV Set" titles, Theragun Duo, gift editions, golf balls and 12-pack drinks.
4. **Category gate by name containment.** The headphones rule also drops titles containing "case", which removes "AirPods Pro 2 with MagSafe Case".
5. **External results lead nowhere.** `action: {type:'nominate'}` results outside the current Edit only show "Open its category to nominate it", and `/products/c3-…` returns 404.
6. **Slow ordering.** `/api/search` waits for a full discovery scan of every public collection (including personal-fit math) *before* it calls Channel3, then returns everything together.
7. Live calls only happen for queries of 3+ characters with fewer than 8 local matches. For global search, Channel3 should run for every query of 3+ characters (cached), without waiting on local results.

## What to build

### 1. Search API: two fast phases

Keep `/api/search?q=` working, and add a `source` parameter:

- `source=vouch`: Vouch's own products only. Target: **under 150 ms on the server at p95**. Never calls Channel3.
- `source=catalog`: Channel3 results (cache first), already merged against Vouch identities so duplicates are marked as Vouch products. Hard timeout **2.5 s**. On timeout or limit, return `partial: true` with whatever is available.
- No `source`: both, run **in parallel** (`Promise.allSettled`), for backward compatibility.

Client (`site-nav.js` header and the separate full-results route, such as `/find`):
- Keep the 250 ms debounce. Fire `source=vouch` at 2+ characters and `source=catalog` at 3+ characters, **at the same time**.
- Render Vouch results the moment they arrive, then append Channel3 rows under them without reordering rows the person can already see. Show a small inline "Finding more products…" row while Channel3 is pending.
- Abort both requests on new input (the existing version counter plus `AbortController`). Drop stale responses.
- Results in the header are capped at 8 visible rows, with a "See all results" link to `/find?q=`. Keep `/search` as the filterable Products library. Remove obsolete query controls/copy and URL handling from the library.

**Speed work for the Vouch phase:**
- Stop rebuilding the public inventory on every keystroke. Build an in-memory search index (normalized brand, name, aliases, category, tag labels, plus a small precomputed token list per product). Cache it per isolate with a short TTL (about 60 s). Document write invalidation and cross-isolate staleness; D1/file-store remains the source of truth.
- Compute personal fit only for the top results you return, not for the whole inventory.
- Matching: case-folded, accent-folded prefix match on tokens, simple plural folding (s/es), and a compact form ("lulu lemon" ↔ "lululemon"). Rank: exact brand+name > all terms matched > most terms matched, then the existing best-match evidence. Keep the discovery page's phrase vocabulary.

**Speed and cost work for the Channel3 phase:**
- Use one global query cache key (`query:v3:global:<normalized tokens>`), 10-minute TTL, shared through D1 like the existing cache.
- Coalesce identical in-flight queries (the resolver already has `pending`; reuse it).
- Don't call Channel3 for under 3 characters, for whitespace or punctuation-only changes, or when the normalized query matches the last one.
- Request `limit: 20`, `config.country: 'US'`, and no category filter. Keep visitor IDs out of provider requests, as today.
- The daily budget stays a durable cross-isolate cap. Give global search a configurable share (`CATALOG_GLOBAL_SEARCH_DAILY_BUDGET`, initially at most 250) **inside the existing overall cap**. Do not raise the production cap to 600 in this build; review actual usage and cost first. When the budget is spent, return Vouch results plus `partial: true` and a clear message.

### 2. Filtering and ranking for global results

Create a **global profile** in the catalog code, separate from the Edit/category path. Preserve current sunscreen and water-bottle Edit behavior as found at implementation time; existing tests must keep passing.

- No sunscreen boosts or penalties in the global profile. Do not restore old sunscreen boosts to global search.
- Bundle filter for global results: only drop clear multi-product bundles, such as "N x" quantities, "+"-joined products, and titles with "bundle", "combo", "multipack" or "variety pack" where the title names two distinct products. Keep set, kit, pack, duo, twin, gift edition and single-SKU "12 Pack" products. Add fixture tests for every example in "Problems" #3.
- Relevance for provider rows: **trust Channel3's order as the main signal**. Keep a row if brand matches a query term **or** at least half of the meaningful query terms (with plural folding and compact matching) appear in brand + name + Channel3 category. Never require every word.
- Merge with Vouch identities in this order: provider reference (including `alternateRefs`), then the canonical brand / normalized name / variant key. A merged row is a Vouch row (shows its score and opens its existing page).
- Mark each external row with `vouchStatus: 'new'` (rename from `external` everywhere, including tests) and a `vouchCategory` (see section 4).

### 3. Product page for products not yet on Vouch

Make `/products/c3-<providerId>` and its `/api/products/:id` data work:

- If the ID resolves to a Vouch product (directly or through an alias), redirect to or render the existing canonical page.
- Otherwise, fetch the Channel3 snapshot through the resolver's `find` (Channel3 product refresh is free; reuse the 6-hour snapshot cache). Render name, brand, images, variant label, retailer count and Channel3 category, plus:
  - a "New to Vouch" state with no score and "Be the first to vouch";
  - the **Vouch** button (section 5);
  - "Where to buy" only behind the existing `CATALOG_WHERE_TO_BUY` switch, offers fetched on tap, and the commission disclosure next to links, exactly as today;
  - if a matching public Edit exists, "Part of the {Category} Edit once 2 people nominate it" (use the real threshold from code, not a hard-coded 2).
- Don't persist anything just because someone viewed the page. Add `<meta name="robots" content="noindex">` for products that aren't on Vouch yet.
- Unknown or expired IDs show a friendly "This product isn't available anymore" page, not a 500.

### 4. Matching a Channel3 product to a Vouch Edit

Write one deterministic function, `matchEdits(product, publicEdits)`, that returns eligible open public Edits (possibly zero or several). No LLM, no guessing.

- Use the existing verified Channel3 slug map (sunscreen, shampoo, water bottles, TVs) in reverse.
- Compare the Channel3 category title against each public Edit's category with token and plural folding.
- Add an organizer-editable alias list per Edit (for example Running Shoes ← "Athletic Shoes", "Running Shoes"). Store it with the Edit settings and add a simple field in the admin Edit settings. If that admin UI is more than a small change, store the list in config and say so in your report.
- For sunscreen, also require `isSunscreen` (unchanged rule).
- Return a set of eligible Edits when more than one matches, and let the person pick on the product page. Don't guess or silently make it profile-only.
- Draft, disabled, closed and not-yet-open Edits never qualify for automatic nomination.

### 5. Vouching from a product page

New endpoint: `POST /api/account/vouch` with body `{ productId }`. Same-origin and JSON checks like the other POST routes.

- **Requires a signed-in account.** If the person isn't signed in, the button opens the existing inline email-code sign-in. After it succeeds, the vouch saves automatically without a second tap. Preserve the pending product across the sign-in step in client state only, not in a URL parameter.
- In one account-store transaction for the **profile save**:
  1. Resolve the product (Vouch product, alias, or Channel3 snapshot). Store **identity fields only** in `data.products` (id, provider, providerId, brand, name, variantLabel, category, gtin, alternateRefs), the same rule as `PRODUCT_LOOKUP.md`. No prices, offers, ratings, commissions or provider descriptions.
  2. `upsert` an item opinion with verdict `yes` and the existing default visibility rule for vouches. Record `source: 'search'`.
- Then, for one eligible open public Edit (or the visitor's explicit choice), **reuse the existing nomination code path** (the internal function behind `/api/nominations`; refactor it into a shared function if needed rather than duplicating it). Count it as this account's nomination, and apply existing per-person deduplication and qualification. If nomination keys on a browser visitor, use the account's linked browser identity as the existing claim flow does. Don't lower or bypass qualification.
- Profile save and Edit nomination touch different records and are **not one atomic transaction**. If the profile save succeeds and nomination fails, respond `{ saved: true, nomination: { status: 'retryable' } }` (or equivalent), show that the profile vouch succeeded, and offer an idempotent nomination retry. Repeated taps and concurrent requests must not duplicate either record.
- Response should distinguish `nominated`, `already_on_edit`, `already_nominated`, `retryable`, and `no_eligible_edit`, include the actual Edit URL/status, and never report a failed nomination as a failed profile save.
- UI result:
  - "Saved to your profile."
  - plus either a nomination message showing the **actual** remaining qualification count or "Already in the {Category} Edit" (link to its page),
  - or, with no match, "No {Category} Edit yet — it's on your profile."
- If they've already vouched: the button shows **Vouched ✓** with a link to change it on their profile. Pass and brand trust aren't offered here; the profile shows item vouches only.
- Rate limit: 30 vouches per account per hour using a durable rule that works across isolates. Return a friendly 429. Do not use an isolate-only memory window as the authority.
- When the vouch is saved and the product joins an Edit, it must hydrate correctly on the profile, the Edit board and the contributor page through the existing `hydrate` boundary.

### 6. Search result rows

Use the same result-row component in the header and the separate `/find` full-results route; the `/search` library keeps its browse cards:
- Vouch rows: photo, brand, name, category, community score (existing style), and a "Vouched by you" mark when relevant.
- New rows: photo, brand, name, Channel3 category, and a small "New to Vouch" label. No price, no star ratings, no commission.
- Clicking any result opens its product page. The existing Edit nomination path stays available where applicable, but its actions must agree with the global result contract and the product-page flow.
- Empty state, signed-in or not: "No matches. Try the brand and product name." If `CATALOG_LINK_PASTE` is on, add "or paste a product link". Keep the existing name-only nomination inside an Edit.
- Accessibility: keep the combobox/listbox roles, arrow keys, Enter and Escape behavior from `product-picker.js`. Announce "N results, more loading" and the final count through the existing status region.

## Out of scope

Barcode and photo search (deferred on the future-enhancements list; don't re-add their controls). Shopify. LLM or embedding search. Price filters. Changing scores, vote formulas or qualification thresholds. Deploying, publishing to Sites, or editing release notes or Notion.

## Milestones, tests and checks

Implement in two reviewable milestones, both required for the end-to-end goal: **A:** identity projection, two-phase search API, global result route/header and Products library cleanup; **B:** outside product pages, sign-in, profile vouch, eligible Edit choice/nomination and recovery. Use separate commits so regressions are traceable.

Add or extend offline fixture tests (no live calls in the test suite):
- global bundle profile (every example in Problems #3 is kept; true multi-product bundles are dropped);
- global relevance (the Sony XM5, AirPod/AirPods, "moisturizer for oily skin", "lulu lemon align" and "olaplex shampo" cases);
- sunscreen and water-bottle Edit search unchanged;
- `source=vouch` never calls a provider, and `source=catalog` returns partial results on a timeout or spent budget;
- parallel phases, query coalescing, the global cache key and the global budget share;
- `matchEdits`: slug map, title match, aliases, ambiguous result presents a choice, drafts/disabled/closed/upcoming excluded;
- the product page for a new Channel3 product, an aliased Vouch product, and an expired ID;
- `POST /api/account/vouch`: signed-out 401, profile save, identity-only storage, nomination through the shared path, ambiguous Edit choice, duplicate/concurrent vouch, already-on-Edit, durable rate limit, origin check, and profile-save-success/nomination-failure with idempotent retry;
- a browser smoke test (extend `test/vouch-pill-browser-smoke.mjs` or add one): type, see Vouch rows, then new rows; open a new product; sign in through the fixture inbox; vouch; check the profile and Edit nomination.

Performance check: add `scripts/search-latency-check.mjs`. Seed a fixture inventory about 10× today's size and measure server time for `source=vouch` (p50 and p95 over 200 queries) and cached `source=catalog`. Under 150 ms p95 for local results is a **goal to measure**, not an assumed result. Explain isolate cache freshness and report observed numbers.

Live coverage (optional, developer-only): extend `scripts/catalog-coverage-check.mjs` to about 60 global queries across at least 15 categories, mixing exact names, generic phrases, typos and set/pack/kit titles. Report how many raw Channel3 results each query returned and how many survived Vouch's global filters. It needs a valid `CHANNEL3_API_KEY` in the environment. **The key saved in `../API key/` was rejected on Nov 16, 2026.** If no working key is available, skip this step and say so. Never print or commit a key.

Run the full test suite, the production build and lint on the files you changed. Report the counts exactly.

## Documentation

Update `docs/discovery-search.md` and `PRODUCT_LOOKUP.md` with targeted edits covering the new phases, global profile, product page, `matchEdits`, vouch endpoint, new config variables and measured latency. Preserve the dated history already in those files.

## Final report

List the files changed, test/build results, measured latency, skipped steps and why, and unverified behavior (for example real-phone behavior or live Channel3 coverage). This handoff is **local implementation and review only**: do not deploy or alter production data unless Armaan separately asks to ship. If a later request authorizes publication, follow `AGENTS.md` for GitHub/Sites synchronization and verification.
