# Product details and quick tags

Implemented November 12, 2026. Product links on each collection board open `/products/<canonical-id>?experiment=<collection-id>`. The page shows the source board’s score in a circle filled to score / 10, with the same ranking thresholds and colors (green ≥8, black ≥6.5, yellow ≥5, red below 5). Score and counts come from that collection, not public account-opinion counts. Empty/unavailable results are distinct. Consenting public item-vouch identities appear as compact initials linking to profiles; hidden names remain anonymous. Images retain manual gallery controls. Buy now uses the product’s HTTPS merchant URL.

Desktop/tablet information and image share a grid row height. The purchase action stays at the bottom; expanded disclosures grow both columns. Phones stack the content.

## Tags

Five standard suggestions: Value, Quality, Ease of use, Design, Reliability. They are available even without existing product tags. Legacy taxonomy definitions and category-specific organizer assignments remain intact. Assigned and community-endorsed applicable tags are also available to endorse.

`GET /api/products/<id>` returns applicable tags, aggregate counts, organizer-assignment flags, and the current browser’s selected IDs. `POST` to the same URL accepts `{tagIds: [...]}` to replace the browser’s selection; an empty array removes it. Writes require same-origin JSON. Product identity is resolved before writing; unknown products, unknown/inapplicable tags and invalid payloads are rejected. A first write sets the standard HttpOnly/SameSite visitor cookie if needed.

Selections persist in the existing D1 record system under `product-tag-votes`, grouped by canonical product and browser, separate from organizer `product-tags` assignments. Repeating a selection does not add another endorsement. Cookie clearing or another browser represents a new visitor; tag votes are browser-based, not verified unique people or account-synced. API/admin responses expose counts, never visitor keys. Local prototype localStorage tags are not silently migrated into shared endorsements. The aggregate record approach follows the pilot’s existing storage model; broader scale/abuse controls remain future work.

The organizer Product Library shows a Tags column and supports tag search. Item detail lists Organizer tags and Community counts separately; the existing Category & tags form continues to manage organizer assignments. Community endorsements never overwrite those assignments.

Validation: 253 automated tests and production build passed. Local browser checks covered board-to-product navigation, saved tag selections after reload, organizer assignment persistence, community counts in admin, desktop/mobile layout, and no browser errors. Production write testing is intentionally left to normal user activity.
