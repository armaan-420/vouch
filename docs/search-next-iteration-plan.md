# Vouch search: implementation plan

Status: planning document, November 16, 2026 (America/New_York). This is a handoff for a future implementation agent, not a claim that the behavior below is live.

## Outcome and boundaries

One global product search should retrieve public Vouch products and outside Channel3 candidates, resolve them to a stable Vouch product identity where possible, rank them together, and return an explicit status, evidence, and usable next action. The `/search` Products page should remain a **filterable library of Vouch products**, without a text search box, until search quality is ready. Search entry points on Edits should call the same backend endpoint. Preserve existing votes, nominations, account opinions, product URLs, D1/R2 records, and the public site. Do not silently change voting or community-score formulas.

Settled product decisions in `../Codex Reviews/DECISIONS.md`: Channel3 is the primary live catalog; rankings must not use commissions; buy links need disclosure; retailer star ratings must not appear next to Vouch scores. Barcode and photo search are deferred in `docs/mobile-product-search.md` and the future-enhancements list. Do not reintroduce them as part of this work.

## Baseline to inspect before editing

- Local commit `54f2e8e` introduced `lib/global-search.mjs`, `/api/search`, a header caller in `public/site-nav.js`, and a Products library in `lib/search-page.html` / `public/discovery.js`. At creation of this plan, that commit was **local only**: GitHub and Sites source pushes failed due DNS resolution. First inspect `git status`, local/remote SHAs, Sites saved versions, and deployment status. Do not infer that the live site contains it.
- `lib/discovery-search.mjs` gathers public Edit products and qualified community additions, deduplicates browser votes, joins organizer tags and the requester's account opinions, and powers the library via `/api/discover`. Draft and disabled Edits are excluded.
- `lib/catalog/runtime.mjs`, `lib/catalog/resolver.mjs`, and `lib/catalog/providers/channel3.mjs` drive live catalog search. Production configuration last inspected had `CATALOG_LIVE_PROVIDERS=channel3` and a 300-attempt Eastern-day budget. The Shopify provider is coded but disabled. Confirm current configuration without printing secrets.
- `lib/experiment-api.mjs` still implements Edit-scoped `/api/products/search`, nominations and product lookup. Other nomination/admin flows may depend on it. `product-search.mjs` and the bootstrap catalog still exist for legacy and admin uses; inventory and remove usages intentionally instead of deleting data or modules wholesale.
- `lib/global-search.mjs` currently enumerates the whole public catalog on **every keystroke**, invokes Channel3 for queries of at least three characters, merges by provider ID or normalized brand/name/variant, and returns up to 40. The header displays only three/five initially and its “See more” reveals already loaded items. It does not provide server pagination or a complete action for every outside category.
- The library currently uses `/api/discover` with category, reviewed-only, sort and 24-item pagination. Its `public/discovery.js` retains some old query branches and language after the input was removed. Clean this up without changing the library’s role.

## Product decisions for implementation

| Decision | Default to implement | Why |
| --- | --- | --- |
| What is a Vouch product? | A product with a canonical ID in a public Edit or qualified community addition. Show `listed` with zero ratings and `rated` when it has community opinions. | Avoid implying that an outside catalog hit has Vouch evidence. |
| Outside action | If a matching open Edit exists, offer “Vouch for this in [Edit]” and navigate to that Edit with a safe product handoff. Otherwise offer “Suggest this product/category” only if a real supported flow exists; otherwise return `unavailable` with explanation, and do not render an actionable row as a dead end. | The present header cannot nominate a cross-category result. |
| Category context | Global retrieval is category-neutral; an optional category filter narrows results when the user explicitly chooses one. A current Edit context can guide the action, not silently restrict retrieval. | Search should mean the same thing everywhere. |
| Duplicate resolution | Exact canonical ID/provider pair first, then verified GTIN where available, then conservative normalized brand/model/variant match. Never merge distinct sizes, formulations, generations, or variants solely by similar names. | Protect votes and identity. |
| Evidence | Show Vouch score, count, tags, and personal verdict/fit only for internal products. Keep outside evidence null. | Avoid fabricated trust signals. |
| Ranking | Text relevance plus modest Vouch evidence and intent signals, with explicit, testable weights. Do not rank by commission or retailer reviews. | Exact product matches can outrank weak internal matches. |

## Proposed endpoint contract

Use `GET /api/search?q=...&category=...&cursor=...&limit=...&contextEdit=...`. `q` is trimmed and bounded (100 characters); empty or one-character queries return no search candidates. `category` is optional and explicit. `contextEdit` affects available actions only. Enforce a bounded `limit` (for example 20, maximum 40) and an opaque, validated cursor. Use `Cache-Control: private, no-store` and `Vary: Cookie` when personal evidence is included. Return a public-safe response with no visitor IDs, emails, raw votes, provider credentials, or other people's opinions.

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
    "action": {"type": "view_product", "href": "/products/sku-example", "label": "View Vouch opinions"}
  }],
  "nextCursor": null,
  "sources": {"vouch": "ok", "channel3": "ok"},
  "partial": false
}
```

Define and validate all action variants (`view_product`, `vouch_in_edit`, `suggest_product`, `unavailable`) on the server; client code should dispatch by `action.type`. Keep `canonicalId` null for truly external items. Do not return a guessed Vouch URL or a nomination action without a valid target. A partial provider failure should retain Vouch results and identify the failed source. The response should include a stable pagination order and total only if it can be computed accurately.

## Work sequence and acceptance gates

### 1. Inventory and identity

Trace every consumer of `/api/products/search`, `/api/discover`, catalog lookup, `canonicalProductId`, and the product picker. Record which consumers need nomination-specific behavior. Build a read-only canonical inventory adapter for public Edits and community additions; include provider references and variant fields. Resolve duplicates conservatively, preserve all existing IDs, and expose canonical product URLs. Test products in multiple Edits, community additions, drafts, disabled Edits, provider title changes, and near-identical variants. No destructive database migration is required for the first cut.

### 2. Retrieval and ranking

Search the local inventory with an indexed or cached public projection instead of repeatedly scanning all public records and calculating personal fit for every product at each keystroke. Invalidate/rebuild on Edit publication, product changes, tags, and votes as appropriate; keep personal evidence in a per-request join. Query Channel3 once per normalized query when the query meets the length threshold, subject to existing budget, timeout, cache, and rate limits. Return local results immediately or within the endpoint deadline when Channel3 is slow; surface `partial`. Validate that broad global queries do not silently append a category term. Do not make the old sunscreen feed a global candidate source. Rank a bounded candidate set once after identity resolution; document weights and deterministic tie breaks. Add typo tolerance/aliases only with measured test queries, not ungrounded semantic claims.

### 3. Actions and UI

Update the shared header to render server-provided status, evidence, and action. Keep results keyboard accessible, show loading/partial/empty states, and fetch the next page when “See more” is used. For outside products, support a correct Edit handoff that confirms eligibility and uses the existing nomination workflow; for unsupported categories show a truthful non-action state. Keep the Products page as a filterable Vouch library; remove obsolete search examples, query URL handling, and search copy from it. Verify phone and desktop layouts, focus return, Escape, screen-reader labels, and reduced motion. Do not expose buy links without the established disclosure.

### 4. Quality and rollout

Create a small, anonymized query set: exact brand/model, partial model, misspelling, generic need, category query, Vouch rated, Vouch listed, outside-only, duplicate provider identity, distinct variant, and provider failure/budget exhaustion. Record expected result/action for each before tuning. Measure top-result correctness, duplicate rate, zero-result rate, median/p95 response time, provider attempts per search, and selection/nomination conversion with privacy-safe aggregate telemetry (no raw query history unless separately approved). Set explicit thresholds from baseline observations rather than inventing target numbers. Run unit, API integration, and browser smoke tests against isolated local data, then `npm test`, `npm run build`, and relevant lint. Inspect read-only production responses after deployment; do not create synthetic visitor data in production.

Roll out in reversible stages: backend endpoint with contract tests; header consumer and action handoff; library cleanup; production monitoring. Preserve existing endpoints for admin/nomination consumers until their call sites are migrated. Update documentation, commit intended files, push GitHub `main`, then use the existing Sites project and exact source commit to save/deploy. Verify the GitHub SHA, saved Sites version, successful deployment, and live read-only checks. Document the release in Notion only if Armaan separately requests release notes.

## Known risks and open design choices

- The current global endpoint's unbounded inventory enumeration and private fit calculation will grow expensive; address before expanding catalog size.
- Channel3 taxonomy labels and Vouch category names can differ. Explicit mapping or a category normalization table is needed for a reliable Edit handoff.
- Identity matching by normalized text can falsely merge variants; provider IDs and confirmed mappings should take precedence. Maintain a way to correct bad aliases without rewriting historical votes.
- The existing `/api/discover` score is an aggregate across public Edits and may differ from an Edit board. Label it as a Vouch-wide score if shown.
- Agree on a real flow for outside products with no eligible Edit. Until then, use `unavailable` rather than a clickable action that fails.
- If the search source cannot be pushed or previewed due environment DNS or loopback restrictions, retain a checked local commit, report the precise blocked step, and do not claim deployment.
