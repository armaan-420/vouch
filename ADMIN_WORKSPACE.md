# Organizer tables

## Current production — November 8, 2026, version 50

Sites version 50 is deployed at [Vouch](https://v4ch.app), source `cd5ba45f12d0fa29da0df441209efa6a0d05fb33`, deployment `appgdep_6af00aae41948191a294a21a3d8708d0`, environment revision 6. It succeeded on November 8, 2026 at 12:37 AM America/New_York. This documentation update covers deployed versions 42–50 since version 41.

All 188 automated tests and a fresh production build pass. Read-only production GET checks return 200 for the root, sunscreen, water bottles, admin login and health; anonymous inventory, suggestions and feedback return 401. Eight current admin assets exactly match source. No production records were changed during this documentation update. Lint was not rerun; version 41 recorded four errors and nine warnings, so this update makes no clean-lint claim.

Unattended research execution remains unverified; Sites currently lists no attached schedules. Source provenance does not establish endorsement accuracy or Google rank, and photos require visual review. Real production email-code inbox delivery, signed-in profile-photo upload, full screen-reader/physical-device accessibility, exhaustive matching and broad abuse/load tests remain outstanding. No new demand, retention, revenue or purchase outcome is established.

Release: [version 50](docs/releases/2026-11-08-v50.md). Earlier dated checks retain their historical scope.

Hosted admin access now uses a server-configured four-digit PIN instead of the previous ChatGPT sign-in/email allowlist. Sessions last a fixed 24 hours; Lock admin revokes the session, and changing the PIN invalidates prior sessions. Cookies are Secure, HttpOnly and SameSite=Strict; only random-token hashes are stored. Five failed attempts per IP-derived bucket in 15 minutes trigger a temporary block. Admin writes require same origin. Participant email-code accounts remain separate.

Experiment details now open Products, Settings and Participation, Missing Products, and Community Additions. Products supports name/URL/manual additions, photo URLs, reorder and removal with revision checks; removal preserves history and re-adding the same identity preserves its votes. Keep at least one product, at most 32, and one per brand. Live additions and reactivation require photos. Disable hides public access and overall participation while retaining data; Reactivate keeps the schedule. Permanent Delete requires the exact path and clears experiment activity and its associated suggestion, reserves the path, and retains shared products/personal opinions. Interrupted cleanup stays disabled for retry. Recoverable suggestion deletion is a separate action.

Suggestion review now has Product lineup, Research & sources, and Details & history tabs. Photo cards show missing images and researched-model differences; channel cards expose accepted coverage, source limitations and expandable evidence. Selected tabs and reading sections survive polling. List rows use Review; refresh/reject/delete live under More actions. Find missing photos reports progress and Add photo focuses the URL field. Admin product fields retain the corrected layout.

---

Home retains its existing overview. The other sidebar sections now open table indexes, with details on separate addressable views within the organizer. Publication status and source/version are recorded in the latest release notes.

## Experiments

Columns: Edit name/path, category, publication or schedule status, product count, active votes, and schedule dates. Search filters name, category and path. A live/closed/scheduled Edit opens its own settings and participation page, with nomination review and community additions below. Draft rows open the related suggestion review; they cannot be published through the settings form. Create experiment has its own view.

Links use `#experiments/<id>` and preserve the selected experiment in the URL. The global experiment selector stays on Home; detail pages use their own experiment identity to avoid changing settings for a different row.

## Product Library

The default table contains products with active verdicts, ordered by vote count. Search matches product name, brand, category and tag labels across the entire returned inventory, not only the displayed page. Pagination shows 25 products per page. Include unvoted products exposes stored curated/custom products for tagging; it does not query the entire external catalog.

Columns: product and brand, category, total votes, item Vouch, Soft-Vouch, Pass, score, and number of Edits with activity. Product details show totals, per-experiment counts/scores, category and tag editing. Skips are excluded.

The organizer inventory reads every registered published experiment, including closed or ended Edits. It includes base votes and community votes, reviewed nomination history and products no longer visible under the one-product-per-brand Board presentation. Unresolved historical IDs get a clearly labeled archived-product placeholder rather than being silently omitted. Name-only community identities stay scoped to their source experiment. Stable catalog/SKU identities combine across experiments.

For the combined product total and score, each browser's latest recorded verdict wins across Edits, following the existing overall-board principle. A newer skip clears its earlier contribution. Timestamps missing from legacy records are treated as oldest; equal timestamps use deterministic registry iteration order. Per-experiment rows describe that experiment's active verdicts and can sum higher than the deduplicated combined total. Scores use the shared current formula: Vouch = 10, Soft-Vouch = 7, Pass = 0, plus one neutral response worth 5. Existing saved votes recalculate on read. Voting and the overall-board opt-in setting are unchanged.

`GET /api/admin/inventory` supplies aggregate experiment and product records. It requires organizer authorization. Browser keys are used only for deduplication in memory; responses contain no visitor IDs, sessions or private account identities. No sixty-product cap is applied. Catalog provider identity/photo hydration rules still apply. Historical/community products are also resolvable when saving tags.

The current isolated preview at port 4188 has no recorded votes. Its default library is therefore empty; Include unvoted products can be used to inspect the table. No production voting data was imported. Populated-library checks used a separate temporary QA dataset.

## Suggestions

Columns: category/Edit path, supporting browsers, status, research/photo-match summary, updated date and actions. Search filters category and Edit title. Filters cover all active records, Live, Draft, In research (including queued/matching), Rejected, Failed and Deleted.

A category/row opens research, picks, source links, lineup editing, preview and private visitor notes. Research and notes remain organizer-only. Active job leases temporarily disable row actions.

- Approve asks for the existing one confirmation, then publishes a ready draft. Research in progress cannot be approved.
- Reject removes a draft from the registry and retains research/history. A live Edit cannot be rejected from Suggestions.
- Refresh research queues a new manual research attempt, retaining the preceding result in history. It can replace a draft lineup, uses the existing budget, and cannot rewrite an already-live Edit.
- Delete is recoverable: the suggestion moves to Deleted and processing stops. A private draft is held for restoration and removed from the registry. A live Edit and its votes stay intact.
- Restore returns the suggestion and its original draft, unless another Edit now owns its path. Recovery snapshots are not included in ordinary listing responses.

The existing dismiss/build endpoints remain compatible. All new actions use organizer authorization, JSON/same-origin checks and the durable lease. Registry/job writes remain separate records, as in the original draft workflow; this is not a distributed transaction.

## Navigation and verification

Sidebar links return to each table. Row links are keyboard-accessible; the row background also opens the detail view. Browser Back and direct fragment links work. Tables scroll inside their own containers on narrow screens, with a scroll hint, rather than widening the page. Suggestion actions stay visible at the right of desktop tables.

Automated suite: 156 passing tests, including latest-verdict aggregation, skips, nomination history, more than sixty products, authorization, absence of browser IDs in inventory, draft exclusion, rejection, deletion/restoration, live-Edit protection and refresh history.

Browser checks on a separate synthetic QA dataset cover populated product counts, search/details, tag saving, suggestion delete/restore, refresh-to-draft, rejection, approval and Live status. The regular local preview was checked for all table indexes, experiment settings and unvoted product search/detail. Physical-device and full screen-reader checks remain unverified.
