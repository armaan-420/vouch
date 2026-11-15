# Product details and quick tags

Implemented November 12, 2026. Product links on each collection board open `/products/<canonical-id>?experiment=<collection-id>`. The page shows the source board’s score in a circle filled to score / 10, with the same ranking thresholds and colors (green ≥8, black ≥6.5, yellow ≥5, red below 5). Score and counts come from that collection, not public account-opinion counts. Empty/unavailable results are distinct. Consenting public item-vouch identities appear as compact initials linking to profiles; hidden names remain anonymous. Images retain manual gallery controls. Buy now uses the product’s HTTPS merchant URL.

Desktop/tablet information and image share a grid row height. The purchase action stays at the bottom; expanded disclosures grow both columns. Phones stack the content.

## Tags

Four standard suggestions, in order: **Design, Quality, Staple, Value** (updated November 15, 2026). Staple means an everyday essential you keep returning to. They are available even without existing product tags. Ease of use and Reliability are retired from public chips; their historical definitions and selections remain stored. Other legacy taxonomy definitions and category-specific organizer assignments remain intact. Assigned and community-endorsed applicable tags are also available to endorse.

`GET /api/products/<id>` returns applicable tags, aggregate counts, organizer-assignment flags, and the current participant’s selected IDs. `POST` to the same URL accepts `{tagIds: [...]}` to replace the participant’s selection; an empty array removes it. Writes require same-origin JSON. Product identity is resolved before writing; unknown products, unknown/inapplicable tags and invalid payloads are rejected. A first write sets the standard HttpOnly/SameSite visitor cookie if needed.

Selections persist in the existing D1 record system under `product-tag-votes`, grouped by canonical product and participant, separate from organizer `product-tags` assignments. Anonymous selections use the visitor cookie. Signed-in selections use a stable account handle and follow that account across devices, including browser-profile verification and account merging. Claimed browser selections are retained, then collapsed into one account endorsement when next edited. Repeating a selection does not add another endorsement; clearing an account selection remains cleared. Anonymous visitors remain browser-based, and counts do not verify unique people. API/admin responses expose counts, never visitor keys. Local prototype localStorage tags are not silently migrated into shared endorsements. The aggregate record approach follows the pilot’s existing storage model; broader scale/abuse controls remain future work.

The experiment rating card places the four tappable chips directly below the product name, replacing formula text. Tapping toggles a tag without advancing the card; save failures remain visible and retryable. The product page uses the same selection endpoint. The owner’s collection history and category drilldown show their saved tags beneath each product name; product links open the tag editor. Public collections show aggregate product tags instead of identifying the owner’s selections.

The organizer Product Library shows a Tags column and supports tag search. Item detail lists Organizer tags and Community counts separately; the existing Category & tags form continues to manage organizer assignments. Community endorsements never overwrite those assignments.

November 15 validation: automated suite and production build passed; local browser checks confirmed experiment/product synchronization and the four-chip phone layout. Original November 12 validation: 253 automated tests and production build passed. Local browser checks covered board-to-product navigation, saved tag selections after reload, organizer assignment persistence, community counts in admin, desktop/mobile layout, and no browser errors. Production write testing is intentionally left to normal user activity.

## Compact navigation

The product page uses a scoped navigation row directly below the shared header: a forest-green Board/home link with a circular arrow and a quiet category breadcrumb. Product-shell top padding is 12px on desktop and 10px on phones, followed by a 44px link target and an 8px gap before the image. Desktop header-to-image spacing is reduced from 124px to 64px. Account/profile navigation and the shared header remain independent.

## Purchase-link coverage — November 14, 2026

The eight starter sunscreens now include exact manufacturer or retailer purchase URLs from the checked-in catalog. Product API responses also supply those destinations for older saved experiment metadata that predates shopping links. Explicit product URLs take precedence; provider-backed products continue through catalog hydration. The existing Buy now action opens the merchant in a new tab without changing the voting state. Pricing and stock are determined by the merchant. Products without an identified merchant destination still do not get an invented purchase link.

Beauty of Joseon’s original manufacturer URL redirects to its home page from the US, so Relief Sun uses the matching [YesStyle product listing](https://www.yesstyle.com/en/beauty-of-joseon-relief-sun-rice-probiotics-50ml/info.html/pid.1137908658), checked November 14. No price or stock promise is shown.
