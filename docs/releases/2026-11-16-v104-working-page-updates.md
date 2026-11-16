# 3d4d2a3caa8a80ac9086c75c18b55141

Notion: https://app.notion.com/p/3d4d2a3caa8a80ac9086c75c18b55141

The public journey now connects Explore categories, product Boards, Products discovery, personal collections and the Wharton contributor leaderboard. The current Board shows always-visible tappable tags, a larger score with its vote count directly below, and a shared score/count popup with public item vouchers and a product-page “See all” link. Mobile chips scroll horizontally when needed.

Email codes support signup and sign-in. The standard tags are Design, Quality, Staple and Value; signed-in selections follow the account. Category covers and display names are organizer-editable. Research stays private until explicit approval, with missing source breadth shown as warnings rather than hard channel gates. Verified named Wharton members are included in the contributor leaderboard unless opted out; private/hidden profiles are excluded.

304 tests and the build pass. Four existing D1 lint errors remain. The public custom-tag “+” is a placeholder, and no new adoption or shopping outcome is claimed.

---

# 40ad2a3caa8a8160afd6e082d848f7f7

Notion: https://app.notion.com/p/40ad2a3caa8a8160afd6e082d848f7f7

The implemented product now includes a public category directory, cross-category Board links, deterministic phrase/tag search with labeled personal-fit estimates, product detail pages, personal collections and the Wharton contributor leaderboard. Shared navigation is Explore → Leaderboard → Products, with a mobile menu and a header that returns on upward scrolling.

Board tags are always visible beneath the image/name, data-driven and tappable. Counts distinguish community endorsements from the viewer's selection; optimistic saves roll back on failure. A larger score and its plain-text count form one clickable disclosure above the chips. Public-voucher faces come only from public item vouches, independently of anonymous board totals; “See all” opens that item's people section. Anonymous names never become profile links. A public custom-tag creation flow is not implemented.

Email-code entry, private saved email and verified Wharton inbox status are separate from the historical tester badge. The contributor leaderboard ranks distinct current public item recommendations by eligible verified members, honors opt-outs and excludes hidden/private profiles. Research can create and repair private drafts; publication requires five distinct brands, photos and explicit organizer approval. Source breadth is advisory. No shopping conversion, verified firsthand experience or causal retention result is established.

The earlier scoring model has been superseded by Vouch 10, Brand vouch 7 and Nope 0 with one neutral prior of 5; skips are excluded. The current Board UI update makes no additional score-formula change.

---

# 40ad2a3caa8a813f823ed60828358479

Notion: https://app.notion.com/p/40ad2a3caa8a813f823ed60828358479

The selected Board layout groups rank, image, wrapping product name and a larger score at the top. The plain-text vote count stays tightly beneath the score. Both open the same popup. Always-visible 32px chips start at the image's left edge on the next row and scroll horizontally; they do not sit behind a fixed score/count overlay. The earlier mobile Tags disclosure and detached counter were local explorations, not the selected release.

Tag states: outline when unused, beige when others endorsed it, dark with a lime count when selected personally. Zero counts are hidden. The standard order is Design, Quality, Staple, Value. The dashed “+” remains a not-available placeholder.

Popup labels are single-line Vouch, Brand vouch and Nope without emojis. Each tile is 64px high, with equal 10px padding above the label and below the number. A divider separates the optional public-voucher row. Up to four overlapping initials use the shared product-page helper; hidden names use neutral question marks. “See all” is an underlined product link. People load on demand; unavailable/empty data adds no error row.

The sign-in visual includes a clearly labeled illustrative product score. Current shared navigation uses Explore, Leaderboard and Products. Browser review covered 320px, 375px, 390px and desktop, including keyboard popup behavior; physical-device/full screen-reader verification remains outstanding.

---

# 410d2a3caa8a81068d70fdf63eed12ae

Notion: https://app.notion.com/p/410d2a3caa8a81068d70fdf63eed12ae

People/account management now supports verification messages, a separate Add email action for browser profiles, email changes, disabling/re-enabling accounts, session revocation and account deletion. Email changes reset verification and require inbox proof; confirmations and same-origin/admin protections remain. These actions do not rewrite anonymous experiment votes.

Experiment settings support category covers, full display titles and card category names while preserving the page address, lineup, schedule and votes. Suggestions can edit draft covers/names before approval. Community tag counts remain separate from organizer tag assignments.

The research review workspace saves source tasks, exact-model evidence/access notes, proposed lineups, pins/exclusions and activity. Organizers can pause/resume, retry a source, recheck evidence and explicitly apply a lineup. Missing source breadth is advisory; approval still requires five distinct brands and photos. Daily private-category tools and recovery workers do not approve or publish categories.

This release's production verification was read-only: anonymous People, inventory and Suggestions APIs return 401. No production account action, draft approval or data migration was performed for verification.

---

# 410d2a3caa8a81d9bab8e460f1aed49e

Notion: https://app.notion.com/p/410d2a3caa8a81d9bab8e460f1aed49e

The old mandatory Wirecutter/TikTok/Google/AI coverage gates below are superseded. Missing source breadth, inaccessible publishers and unverified trend coverage are advisory warnings. Publication still requires five distinct brands, photos for the selected products and an explicit organizer action. A partial lineup remains private and can be completed manually; the system must not invent products to fill it.

Research is a resumable workspace with independent editorial, Wirecutter, Google-discovery, TikTok/trend, manufacturer and optional Reddit tasks. Link provenance, opened-page checks, AI checks and organizer checks are distinct. Reddit is anecdotal evidence; Google positions require separately configured capture. Source repairs preserve unrelated progress and organizer edits. Pause/resume, pins/exclusions and applying a proposed lineup remain explicit actions.

An hourly Sites recovery schedule is configured, with a GitHub Actions fallback. The deployed daily-category tools enforce three private slots per Eastern day; failed/deleted/merged slots still consume that daily batch. They cannot publish a category. This release did not start or approve a production research job, change schedules or benchmark live source quality. Source/model accuracy and actual unattended completion must be verified separately.

---

# 410d2a3caa8a817cbd4bc22f981a73e2

Notion: https://app.notion.com/p/410d2a3caa8a817cbd4bc22f981a73e2

Mobile nomination search uses a focused dialog with preserved selections and one-tap Save & finish. Barcode and photo-search controls are deferred from the current picker UI even though provider capabilities remain in the code. Saved nominations are collapsed behind their own compact disclosure.

Catalog persistence now batches saved snapshots and routine read paths can hydrate from saved data without launching unnecessary live provider work. Missing-photo repair reports per-item results while preserving exact-model identity and existing organizer photos. Starter sunscreen detail pages have known merchant links; retailer pricing and availability are not promised.

Products discovery searches public lineup metadata and recorded tags with a limited phrase vocabulary. Personal-fit estimates use the requester's related saved ratings and are labeled estimates; unsupported price/phrase constraints do not become general semantic search. Product pages show community scores, public item vouchers and persistent tags. Board “See all” links land at that product's people section and retain the experiment query.

This documentation update does not assert exhaustive matching, current merchant stock, real-phone camera behavior, a fresh live-provider benchmark or production inbox delivery. Those require separate checks.
