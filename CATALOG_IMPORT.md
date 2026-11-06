# Retailer catalog import — November 2, 2026

Retailer imports are frozen; new live lookup work uses the provider adapters described in [PRODUCT_LOOKUP.md](PRODUCT_LOOKUP.md).

Imported 1,371 additional retailer listings into the release catalog, bringing its checked-in total from 829 to 2,200. Production can contain additional products from its independent live feed refresh. This is a product listing count, not a claim that every formulation is unique.

| Source | Added listings | Coverage |
| --- | ---: | --- |
| Ulta Beauty | 423 | Eight listing pages |
| YesStyle | 217 | First three pages; stopped on HTTP 429 |
| Care to Beauty | 485 | Face/lip, body and baby/children categories; best effort because pagination totals/page sizes vary |
| Dermstore | 224 | Sixteen pages; explicitly recognized brands only |
| Soko Glam | 22 | Structured sunscreen collection feed |

Sephora and Olive Young returned HTTP 403; access controls were not bypassed. Target was not imported because its response did not have a validated product listing parser. The supplied Sephora brand counts are a discovery checklist, not product records.

## Data and identity

Each new record includes its retailer product ID, brand, title, source URL, validated HTTPS photo URL, any SPF stated in its title, catalog market context and import timestamp. Catalog market describes the retailer context and is not a verified country of manufacture or formula identifier. No prices, stock guarantees, retailer reviews, participant records or account data are imported.

Existing IDs remain intact. Repeated retailer IDs are skipped; exact normalized brand/title matches within one catalog market are merged with alternate source links. Different titles, markets, sizes or shade descriptions can remain separate. No fuzzy merge of regional formulas is attempted. Bundles/multipacks, after-sun products and self-tanners are excluded. Care to Beauty configurable parent cards are omitted because they can combine SPF/tint/formula variants. Retailer names and imagery remain source-provided, not independently verified against packaging.

## Storage and refresh

`data/catalog-bootstrap.json` ships with the application. On search initialization, newly shipped records are merged with the saved catalog and written to the dedicated `catalog` database row, even when the prior saved cache is fresh. Experiment, vote, nomination and account rows are untouched. Existing brand and Open Beauty Facts refreshes retain imported source IDs. Retailer snapshots do not refresh automatically.

To repeat an explicit import, run `node scripts/import-retailer-catalogs.mjs`. Downloaded public listing pages are cached under ignored `outputs/retailer-pages/`; remove that cache before requesting fresh pages. The importer stops a route on access denial, rate limits, changed formats or repeated pagination. Inspect `data/retailer-import-report.json` and review results before publishing. Do not describe partial imports as exhaustive. The runtime still shows at most 20 matches per search.

## Validation

Unit coverage verifies listing URL/image validation, bundle exclusions, safe JSON parsing, configurable-card exclusion, market-aware exact identity, persistence into a previously fresh saved catalog, and retention through subsequent feed refreshes. Publication and live search checks are recorded in the delivery chat; a local file edit alone does not establish live status.

## Lion Pose follow-up — November 2, 2026

Added the standalone UNGHOSTED mineral SPF 42 directly from Lion Pose’s public brand catalog, including its product ID, photo and source link. The brand describes it as formerly Ghost-Buster; both names and sunscreen are searchable aliases. Lion Pose joins the recurring brand catalog refresh; bundles remain excluded. The checked-in catalog now contains 2201 listings.
