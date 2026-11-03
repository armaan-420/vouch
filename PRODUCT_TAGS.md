# Product library and reusable tags

Implemented November 2, 2026. The organizer at `/admin` has a Product library & tags section. Search by brand, product name, or category; select a product; choose global/category tags; save. Search results are bounded to 60; use a more specific query for larger catalogs. The library searches experiment products, custom SKUs, and the existing external sunscreen catalog. New custom SKUs become available after saving their experiment.

## Water bottle starter catalog

Eight stable SKU identities are seeded additively into the shared `experiment-registry` record on the first API request after deployment. Existing records are preserved. The starter list is in `lib/water-bottles.mjs`, with manufacturer links and a November 2, 2026 verification date:

- Owala FreeSip Stainless Steel 24 oz
- Hydro Flask Wide Mouth with Flex Straw Cap 32 oz
- Stanley IceFlow Bottle Flip Straw 2.0 24 oz
- YETI Rambler with Flip Chug Cap 26 oz
- Nalgene Wide Mouth Bottle 32 oz
- CamelBak Eddy+ Insulated Stainless Steel 25 oz
- Klean Kanteen Classic with Flip Seal Sport Cap 27 oz
- S’well Original Bottle 17 oz

These are a curated starting set, not a popularity ranking or exhaustive catalog. Prices and stock are not tracked. Photos are not seeded; existing placeholder artwork is used. Different capacities and lids have distinct SKU identities. Color variants are grouped. Manufacturer links identify the product family; default color/size selection on retailer pages can change.

To launch later: create a separate experiment, enter category **Water bottles**, select the bottle SKUs under Choose products, and set the link ID and schedule. No bottle experiment is automatically created or opened. Current one-product-per-brand selection rules still apply. Water-bottle experiment search uses the bottle library rather than sunscreen feeds. Sunscreen nominations cannot select the bottle SKUs.

## Taxonomy and storage

`product-tags` is a separate durable D1 `app_records` record with `definitions` and `products` maps. Global definitions have `category: null`; category definitions carry a category name. Assignments use canonical product ID (`onBoardId` where present), with `category`, `tagIds`, `source: organizer`, and `updatedAt`. Tags follow the same canonical SKU across experiments. Historical votes and experiment records are not rewritten. Tags may be cleared by saving an empty selection.

Initial global tags: Value, Sturdy, Viral, Beautiful, Durable.

Initial Water bottles tags: Leak-proof, Heat retention, Cold retention, Easy to clean, Lightweight, Cup-holder friendly, Easy to carry, Straw lid, Dishwasher safe.

Initial Sunscreen tags (approved November 2, 2026): Lightweight, Non-greasy, Hydrating, No white cast, Matte finish, Dewy finish, Wears well under makeup, No pilling, No eye sting, Fragrance-free, Mineral, Chemical, Hybrid, Water-resistant. Definitions are seeded additively into existing taxonomy records; prior custom tags and product assignments are preserved. No individual sunscreen is automatically tagged. Formula and water-resistance assignments should use product-label evidence; experience tags describe organizer curation. SPF, tint, and water-resistance duration fields are not part of this tag-only update.

Organizers can create additional global tags or tags for any category. Tags have stable IDs; duplicate labels in the same scope are rejected ignoring case and surrounding whitespace. Assignment validates all IDs and category scope atomically. Up to 30 tags per product. Category comparisons ignore case and repeated whitespace; use the shared category name consistently.

All products are eligible: default sunscreen products, seeded bottles, saved custom products, experiment products, and resolvable catalog listings. Imported catalog listings without a category default to Sunscreen; organizers can set their category when saving tags. Newly added products start untagged. Name-only unconfirmed nominations must become identifiable products before tagging.

## Boundaries

Tags currently support organizer curation only. They are not participant tag votes, popularity measurements, verified product testing, public profile badges, or public tag filters. No tags are assigned automatically. In particular, Viral needs a future evidence rule, and heat/cold retention or leak claims can depend on lid, model, usage, and manufacturer restrictions. Tag records are separate from per-experiment results downloads; the organizer-only `/api/admin/tags` endpoint returns the full taxonomy/assignments for future integration.

Organizer endpoints (`/api/admin/products`, `/api/admin/tags`, `/api/admin/product-tags`) use the existing authorization and same-origin write protection. Checks cover additive seeding, experiment creation, category search/nomination isolation, global/category assignments, invalid IDs, custom definitions, clearing assignments, and organizer access.
