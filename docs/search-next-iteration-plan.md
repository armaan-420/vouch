# Vouch search: implementation plan

Status: planning document, November 16, 2026 (America/New_York). This is a handoff for a future implementation agent, not a claim that the behavior below is live.

## Outcome and boundaries

Global search should retrieve public Vouch products and outside Channel3 candidates, resolve stable identities, return explicit status/evidence/actions, and let every result open a product page. A signed-in person can vouch for an outside product there: save the item vouch to their profile, then nominate it into an eligible public Edit if one exists. The `/search` Products page remains a **filterable library of Vouch products**, without text search; put full results on a separate route (for example `/find?q=...`). Search from Edits and the global results page uses the same backend contract. Preserve existing votes, nomination thresholds, account opinions, URLs, D1/R2 data, and score formulas. This is an end-to-end build in two milestones, not two unrelated projects.

Settled product decisions in `../../Codex Reviews/DECISIONS.md`: Channel3 is the primary live catalog; rankings must not use commissions; buy links need disclosure; retailer star ratings must not appear next to Vouch scores. Barcode and photo search are deferred in `docs/mobile-product-search.md` and the future-enhancements list. Do not reintroduce them as part of this work.

## Baseline to inspect before editing

- Local commit `54f2e8e` introduced `lib/global-search.mjs`, `/api/search`, a header caller in `public/site-nav.js`, and a Products library in `lib/search-page.html` / `public/discovery.js`; `4e68dd3` added this plan. At creation of this plan, both were **local only**: GitHub and Sites source pushes failed due DNS resolution. First inspect `git status`, local/remote SHAs, Sites saved versions, and deployment status. Do not infer that the live site contains them. Preserve any subsequent user changes.
- `lib/discovery-search.mjs` gathers public Edit products and qualified community additions, deduplicates browser votes, joins organizer tags and the requester's account opinions, and powers the library via `/api/discover`. Draft and disabled Edits are excluded.
- `lib/catalog/runtime.mjs`, `lib/catalog/resolver.mjs`, and `lib/catalog/providers/channel3.mjs` drive live catalog search. Production configuration last inspected had `CATALOG_LIVE_PROVIDERS=channel3` and a 300-attempt Eastern-day budget. The Shopify provider is coded but disabled. Confirm current configuration without printing secrets.
- `lib/experiment-api.mjs` still implements Edit-scoped `/api/products/search`, nominations and product lookup. Other nomination/admin flows may depend on it. `product-search.mjs` and the bootstrap catalog still exist for legacy and admin uses; inventory and remove usages intentionally instead of deleting data or modules wholesale.
- `lib/global-search.mjs` currently enumerates the whole public catalog on **every keystroke**, invokes Channel3 for queries of at least three characters, merges by provider ID or normalized brand/name/variant, and returns up to 40. The header displays only three/five initially and its “See more” reveals already loaded items. It does not provide server pagination or a complete action for every outside category.
- The library currently uses `/api/discover` with category, reviewed-only, sort and 24-item pagination. Its `public/discovery.js` retains some old query branches and language after the input was removed. Clean this up without changing the library’s role.

## Product decisions for implementation

| Decision | Default to implement | Why |
| --- | --- | --- |
| What is a Vouch product? | A product with a canonical ID in a public Edit or qualified community addition. Show `listed` with zero ratings and `rated` when it has community opinions. | Avoid implying that an outside catalog hit has Vouch evidence. |
| Outside action | Every outside result opens `/products/c3-<id>`; from there a signed-in visitor can save an item vouch to their profile. Also nominate into an eligible open public Edit; otherwise keep it profile-only. | The present header cannot nominate a cross-category result; this completes the journey. |
| Category context | Global retrieval is category-neutral; an optional category filter narrows results when the user explicitly chooses one. A current Edit context can guide the action, not silently restrict retrieval. | Search should mean the same thing everywhere. |
| Duplicate resolution | Exact canonical ID/provider pair first, then verified GTIN where available, then conservative normalized brand/model/variant match. Never merge distinct sizes, formulations, generations, or variants solely by similar names. | Protect votes and identity. |
| Evidence | Show Vouch score, count, tags, and personal verdict/fit only for internal products. Keep outside evidence null. | Avoid fabricated trust signals. |
| Ranking and display | Within each source, use explicit relevance rules; render the fast Vouch phase immediately and append outside rows without moving visible results. The full results page can group sources with clear labels. Never use commission or retailer reviews. | A changing row order under the user's pointer is disruptive. |

## Proposed endpoint contract

Use `GET /api/search?q=...&source=vouch|catalog&category=...&cursor=...&limit=...&contextEdit=...`. No `source` runs both phases in parallel for compatibility. `source=vouch` never invokes Channel3; `source=catalog` retrieves outside candidates and resolves known Vouch identities. `q` is bounded to 100 characters. Vouch retrieval begins at two characters, Channel3 at three. `category` is an optional explicit filter; `contextEdit` affects actions only. Enforce a bounded limit and validated cursor; paginate by source so late Channel3 arrival does not shift Vouch pages. Use `Cache-Control: private, no-store` and `Vary: Cookie` when personal evidence is included. Return no visitor IDs, emails, raw votes, credentials, or other people's opinions.

Illustrative response (values are examples, not database records):

```json
{
  "query": "owala freesip",
  "results": [{
    "identity": {"canonicalId": "sku-example", "providerRefs": [{"provider": "channel3", "id": "123"}]},
    "name": "FreeSip 24 oz", "brand": "Owala", "category": "Water bottles",
    "image": "https://example.com/image.jpg",
    "relevance": {"score": 91, "reasons": ["model match", "brand match"]},
    "vouch": {"status": "rated", "score": "8.0", "ratingCount": 12,
      "tags": [], "personalVerdict": null, "personalFit": null},
    "action": {"type": "view_product", "href": "/products/sku-example", "label": "View product"}
  }],
  "nextCursor": null,
  "sources": {"vouch": "ok", "channel3": "ok"},
  "partial": false
}
```

Every result action is `view_product`; a truly external result has a null canonical ID and a valid `/products/c3-…` destination. The product page owns the signed-in Vouch action and any Edit choice. Do not return guessed Vouch identities or nominate into an unrelated category. A provider failure retains Vouch results and identifies the failed source. Report a total only when accurate. The example is illustrative; align the response shape with the existing API and test it before implementing UI callers.

## Work sequence and acceptance gates

### 1. Inventory and identity

Trace every consumer of `/api/products/search`, `/api/discover`, catalog lookup, `canonicalProductId`, and the product picker. Record which consumers need nomination-specific behavior. Build a read-only canonical inventory adapter for public Edits and community additions; include provider references and variant fields. Resolve duplicates conservatively, preserve all existing IDs, and expose canonical product URLs. Test products in multiple Edits, community additions, drafts, disabled Edits, provider title changes, and near-identical variants. No destructive database migration is required for the first cut.

### 2. Retrieval and ranking

Search local inventory through a cached public projection instead of scanning all records or calculating personal fit for every product at each keystroke. A per-isolate index with an approximately 60-second TTL is a starting point; document how writes invalidate it and how other isolates converge. Keep personal evidence in a per-request join for only returned candidates. Fire local and Channel3 phases concurrently; display local rows as they arrive. Query Channel3 once per normalized 3+ character query, subject to shared D1 cache, coalescing, timeout, rate limits, and the existing overall budget. Add a configurable **global share within the current overall cap**; do not raise the production cap without observed usage and a separate configuration decision. Validate that global queries have no implicit category filter. Do not make the old sunscreen feed a global candidate source. Preserve provider order as a signal while applying lenient global matching, plural/compact forms, and variant-safe deduplication. Measure latency and tune weights against a fixed query set; the suggested 150 ms p95 local target is a goal, not a result.

### 3. Product pages, vouching, and nomination

Resolve `/products/c3-<providerId>` and `/api/products/:id` through an existing canonical Vouch identity when possible; otherwise show an outside product page with its grounded catalog fields, a “New to Vouch” state, no Vouch score, and a Vouch button. Viewing must not persist the product. Handle expired IDs gracefully and mark unlisted outside pages `noindex`. Keep optional buy offers behind the existing switch and disclose commerce links. Reuse the current inline email-code sign-in at the moment a visitor taps Vouch; after sign-in, complete the pending action once without putting it in a URL.

Add a signed-in account vouch endpoint with same-origin/JSON checks and idempotent item-opinion upsert. Persist identity fields only, with the existing default visibility and item-vouch profile rule. Match open public Edits deterministically using verified taxonomy/organizer aliases; exclude drafts, disabled and closed Edits. If several Edits qualify, present a choice on the product page instead of silently treating it as profile-only. Reuse the existing nomination path and its browser/account identity, deduplication and qualification rules. Return the actual nomination count/status; never hard-code “needs one more.”

**Cross-record failure rule:** the profile save and Edit nomination are separate store writes. If the save succeeds but nomination fails, respond with `saved: true` and `nomination: {status: 'retryable'}` (or equivalent), show “Saved to your profile; nomination needs retry,” and allow an idempotent retry that does not duplicate the vouch. If the product is already on an Edit, report that state without a new nomination. Rate-limit account vouches durably enough for the deployed multi-isolate environment; test duplicate taps and concurrent requests.

### 4. Search UI and Products library

Update the shared header to render the local phase promptly, then append Channel3 results without reordering already visible rows. The header shows at most eight rows and links “See all results” to a **separate** full search route (for example `/find?q=…`). That route handles source-aware pagination and status; it must not reuse the Products library URL for query results. Both surfaces show Vouch evidence only on Vouch identities and “New to Vouch” for outside products. All rows open a product page. Keep keyboard navigation, loading/partial/empty states, focus return, Escape, and screen-reader announcements. Keep `/search` as a filterable Vouch library; remove obsolete query examples and URL code. Verify mobile/desktop and reduced motion. Preserve the existing Edit nomination handoff where it is useful, but do not let it diverge from the global action contract.

### 5. Quality, milestones, and rollout

Create a small, anonymized query set: exact brand/model, partial model, misspelling, generic need, category query, Vouch rated, Vouch listed, outside-only, duplicate provider identity, distinct variant, and provider failure/budget exhaustion. Record expected result/action for each before tuning. Measure top-result correctness, duplicate rate, zero-result rate, median/p95 response time, provider attempts per search, and selection/nomination conversion with privacy-safe aggregate telemetry (no raw query history unless separately approved). Set explicit thresholds from baseline observations rather than inventing target numbers. Run unit, API integration, and browser smoke tests against isolated local data, then `npm test`, `npm run build`, and relevant lint. Inspect read-only production responses after deployment; do not create synthetic visitor data in production.

Implement **Milestone A:** identity projection, global search profile, two-phase endpoint, header/full-results UI and library cleanup. Implement **Milestone B:** external product pages, inline sign-in, profile vouch, Edit matching/choice, nomination and recovery. Complete both milestones for the end-to-end goal; use separate commits and checks so failures can be isolated. Preserve legacy endpoints for admin/nomination consumers until migrated. This handoff is for another agent to implement and review locally; **do not deploy as part of the handoff unless Armaan separately asks to ship**. When later authorized to publish, follow the existing GitHub/Sites workflow and verify remote SHA, saved version, deployment, and read-only live behavior. Notion release notes remain on request only.

## Known risks and open design choices

- The current global endpoint's unbounded inventory enumeration and private fit calculation will grow expensive; address before expanding catalog size.
- Channel3 taxonomy labels and Vouch category names can differ. Explicit mapping or a category normalization table is needed for a reliable Edit handoff.
- Identity matching by normalized text can falsely merge variants; provider IDs and confirmed mappings should take precedence. Maintain a way to correct bad aliases without rewriting historical votes.
- The existing `/api/discover` score is an aggregate across public Edits and may differ from an Edit board. Label it as a Vouch-wide score if shown.
- Outside products with no eligible Edit remain profile-only after a signed-in item vouch. If category matching is ambiguous, ask the visitor to choose among valid Edits on the product page.
- If the search source cannot be pushed or previewed due environment DNS or loopback restrictions, retain a checked local commit, report the precise blocked step, and do not claim deployment.
