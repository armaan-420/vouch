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

## Board tags, scores and public vouchers — November 16, 2026

The vote breakdown adds a public item-voucher row beneath three compact, 64px-high tiles. Labels stay on one line, emojis are removed, and label/count stacks have equal 10px top/bottom padding. The row uses the existing product API's consenting `contributors`, filters to item verdicts only, and counts public vouchers independently of anonymous board totals. Anonymous contributors remain neutral, unlinked question marks; named people use the shared initials/avatar helper. The viewer leads the row when their public handle is present. At most four avatars appear.

People load when the popup first opens and are cached by the same canonical product ID used in board product links. Successful item/community answers invalidate that product's cache. Loading has a quiet placeholder; errors and empty public lists hide the added row. “See all” opens the item's product page at `#item-people`, retaining `?experiment=` and scrolling after the async page render. Avatar links open the public profile. Existing Escape, keyboard disclosure and one-open-popup behavior remain available.

Approved for publication November 16, 2026. Deployment evidence is recorded separately in the dated release notes. Checks: 304 tests and production build passed; browser checks used synthetic public accounts at 320px, 375px and desktop, including anonymous avatars, empty rows, keyboard focus and product navigation. Viewer-first copy and cache invalidation are covered by automated tests. Full lint still has four pre-existing `no-explicit-any` errors in `lib/d1-store.ts`.

The Board always shows the product API's tag set in its supplied order (Design, Quality, Staple, Value by default). Its single-line strip begins at the image's left edge and scrolls horizontally when needed. Counts are hidden at zero; neutral, community-endorsed and personally selected chips have distinct fills. Taps immediately update the count/selection, save through the existing tag endpoint, and roll back on error. The dashed + is a visible placeholder with a not-available message; a public custom-tag workflow is not implemented.

Each row keeps a larger score and its plain-text vote count together in one clickable disclosure above the separate chip strip. Both score and count open the same popup; the count stays directly beneath the score. The interim toggle/expanded pills and the detached counter overlapping the chips were reviewed locally and are not the selected layout. Mobile checks covered 320px, 375px and 390px widths; desktop was also reviewed. Scoring/ranking calculations are unchanged by these row changes.
