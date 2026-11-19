# Organizer workspace

## Current production — November 8, 2026, version 50

Sites version 50 is deployed at [Vouch](https://v4ch.app), source `cd5ba45f12d0fa29da0df441209efa6a0d05fb33`, deployment `appgdep_6af00aae41948191a294a21a3d8708d0`, environment revision 6. It succeeded on November 8, 2026 at 12:37 AM America/New_York. This documentation update covers deployed versions 42–50 since version 41.

All 188 automated tests and a fresh production build pass. Read-only production GET checks return 200 for the root, sunscreen, water bottles, admin login and health; anonymous inventory, suggestions and feedback return 401. Eight current admin assets exactly match source. No production records were changed during this documentation update. Lint was not rerun; version 41 recorded four errors and nine warnings, so this update makes no clean-lint claim.

Unattended research execution remains unverified; Sites currently lists no attached schedules. Source provenance does not establish endorsement accuracy or Google rank, and photos require visual review. Real production email-code inbox delivery, signed-in profile-photo upload, full screen-reader/physical-device accessibility, exhaustive matching and broad abuse/load tests remain outstanding. No new demand, retention, revenue or purchase outcome is established.

Release: [version 50](docs/releases/2026-11-08-v50.md). Earlier dated checks retain their historical scope.

Hosted admin access now uses a server-configured four-digit PIN instead of the previous ChatGPT sign-in/email allowlist. Sessions last a fixed 24 hours; Lock admin revokes the session, and changing the PIN invalidates prior sessions. Cookies are Secure, HttpOnly and SameSite=Strict; only random-token hashes are stored. Five failed attempts per IP-derived bucket in 15 minutes trigger a temporary block. Admin writes require same origin. Participant email-code accounts remain separate.

Experiment details now open Products, Settings and Participation, Missing Products, and Community Additions. Products supports name/URL/manual additions, photo URLs, reorder and removal with revision checks; removal preserves history and re-adding the same identity preserves its votes. Keep at least one product, at most 32, and one per brand. Live additions and reactivation require photos. Disable hides public access and overall participation while retaining data; Reactivate keeps the schedule. Permanent Delete requires the exact path and clears experiment activity and its associated suggestion, reserves the path, and retains shared products/personal opinions. Interrupted cleanup stays disabled for retry. Recoverable suggestion deletion is a separate action.

Suggestion review now has Product lineup, Research & sources, and Details & history tabs. Photo cards show missing images and researched-model differences; channel cards expose accepted coverage, source limitations and expandable evidence. Selected tabs and reading sections survive polling. List rows use Review; refresh/reject/delete live under More actions. Find missing photos reports progress and Add photo focuses the URL field. Admin product fields retain the corrected layout.

---

## Local Organizer update — November 18, 2026

### Home and navigation

Home links directly to missing products by Edit, draft suggestions, new feedback, and unverified People. The Edits, Suggestions and Feedback sidebar badges count items that need action. Home orders Edits by Live, Scheduled, Draft, Closed and Disabled. Additional closed Edits sit behind a disclosure. Visitor and finish-rate counts are per Edit. Visitors are distinct browsers, so adding those counts across Edits would double-count some browsers.

Phones use the Workspace menu from the sticky top bar. The sheet closes on selection, Escape, or a backdrop click and returns focus to Menu. Tablet and desktop use the sidebar. The System status dot in the sidebar opens database and research diagnostics.

### Edits

Search the Edits table by name, category or path. Open a row for its Overview or use the row's action menu to disable, reactivate or delete it. Deletion requires the exact path. Create Edit opens its own form.

Published Edit details use `#experiments/<id>/overview`, `/products`, `/missing`, `/community` and `/settings`. The original `#experiments/<id>` opens Overview. Browser Back and Forward traverse the selected tabs. Private drafts open for review in Suggestions. The explicit draft Overview path from Home has a link to that review.

Overview shows the participation funnel, result download, refresh and schedule. Finishing means answering every card and viewing the leaderboard. The counted-vote browsers number counts browsers with at least one non-skip vote. Products keeps up/down controls visible and holds Set photos and Remove in its row menu. Settings offers Follow schedule and Closed now. Pausing responses keeps scheduled dates saved. The existing lineup revision and lifecycle confirmation rules apply.

In Missing products, unconfirmed submissions come first, followed by confirmed groups and products on the community board. Select entries to confirm or combine them. Dismiss hides selected source nominations from the active inbox and lookup counts. Use Dismissed, then Restore, to bring them back. The visitor's submission, public community eligibility, and recorded votes remain intact. The organizer-only `POST /api/admin/nomination-status` uses the selected source keys, a boolean dismissed state, and existing authorization plus same-origin and JSON checks.

### Wharton pilot

Set targets reveals the same autosaving target inputs used in the previous version. The signup funnel uses Landing as its baseline. The highlight marks the largest loss in people between successive steps. The sections below the funnel remember their disclosure state on the current browser when local storage is available. Trust signal starts open on first visit. Spread includes per-card and per-method totals. Category, Since and CSV use the existing pilot report.

### Categories

Manage labels, parents and aliases from each category row. The grouped table counts registered Edits and products returned by the inventory for that category. Unassigned appears when there are standalone categories or Edits without a registry match. Edit settings suggests registry labels and accepts free text. See the [category registry guide](CATEGORIES.md).

### Product Library

Search matches product, brand, category and tags. The category filter and sort apply before the 25-row pagination. Votes sorts highest first by default. Click a sortable header to change its direction. Phones show product cards with a sort control. The thumbnail uses existing catalog hydration and published lineup photo overrides. Create a reusable tag opens the existing form from the toolbar.

Totals use each browser's latest verdict across all published Edits, including closed ones. Skips are excluded. A newer skip clears the earlier verdict. Per-Edit counts may add up to more than the combined total. Public product-page reviews remain a separate column and can make a product eligible for the default view. Include unvoted products adds stored products.

The inventory includes base and community votes, reviewed nomination history, and archived items outside the one-product-per-brand Board display. Unresolved historical IDs receive an archived-product label. Name-only community products keep their source Edit identity. Stable catalog and SKU identities combine across Edits. Legacy votes without timestamps sort oldest. Equal timestamps use registry order. Organizer authorization is required, and the inventory omits browser keys and private account identities.

## Suggestions

Columns: category/Edit path, supporting browsers, status, research/photo-match summary, updated date and actions. Search filters category and Edit title. Filters cover all active records, Live, Draft, In research (including queued/matching), Rejected, Failed and Deleted.

A category/row opens research, picks, source links, lineup editing, preview and private visitor notes. Research and notes remain organizer-only. Active job leases temporarily disable row actions.

- Approve asks for the existing one confirmation, then publishes a ready draft. Research in progress cannot be approved.
- Reject removes a draft from the registry and retains research/history. A live Edit cannot be rejected from Suggestions.
- Refresh research queues a new manual research attempt, retaining the preceding result in history. It can replace a draft lineup, uses the existing budget, and cannot rewrite an already-live Edit.
- Delete is recoverable: the suggestion moves to Deleted and processing stops. A private draft is held for restoration and removed from the registry. A live Edit and its votes stay intact.
- Restore returns the suggestion and its original draft, unless another Edit now owns its path. Recovery snapshots are not included in ordinary listing responses.

The existing dismiss/build endpoints remain compatible. All new actions use organizer authorization, JSON/same-origin checks and the durable lease. Registry/job writes remain separate records, as in the original draft workflow; this is not a distributed transaction.

## People and Feedback

The People cards set the Status filter. Selecting the current filter returns to All accounts. Feedback and People use the quiet refresh control and local update time. People actions remain in the row menu.
