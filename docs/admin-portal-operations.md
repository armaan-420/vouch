## People management — updated November 11, 2026

Open `/admin#accounts` (People) using the existing organizer PIN. The table combines email accounts, pending email sign-in attempts, and browser-only profiles. Search name/email/handle, filter Active/Unverified/Disabled, sort by joined date/name/last sign-in, and page through 25 rows at a time. It shows verification, profile visibility, vouch count and current email-session count. Older accounts without recorded sign-in dates show a dash.

- **Account actions:** each row groups its actions under an accessible three-dot popover. Escape and outside-click dismiss it.
- **Send verification email:** sends a single-use link without requiring an existing browser sign-in attempt. The link expires after ten minutes; opening the page does not consume it. The recipient explicitly chooses “Verify email and sign in.” Existing cooldown and hourly email limits apply. Disabling, deleting, changing email or signing out all devices invalidates outstanding links.
- **Add email:** accounts without an email have a separate action. Enter and confirm the new address; no existing email or handle is required. Saves the address as unverified and preserves the profile and collection. Use Send verification email afterward.
- **Change email:** requires the current email/handle confirmation and a valid, unused new address. Preserves the email account subject and collection, revokes email sessions and outstanding codes/links, removes the old Wharton badge, and marks the new address unverified. Send verification email separately to verify the new inbox. Existing browser-only profile credentials remain browser-bound.
- **Resend verification code:** available for an active pending sign-in attempt. Preserves the original challenge and browser binding, rotates the code, and uses the existing delivery provider. Existing cooldown and hourly email limits apply. Users without a current attempt must first start sign-in in their own browser. No code is returned to the organizer.
- **Sign out all devices:** revokes email sessions and pending codes. The account remains enabled; email users can sign in again.
- **Disable / re-enable:** disables email sign-in, revokes sessions/codes, prevents account access and hides public profiles, photos and account contributors. Re-enable restores the existing profile visibility. Browser-only profiles resume with their original browser credential; email sessions must sign in again. This does not ban anonymous browsing or remove historical experiment votes.
- **Delete:** requires typing the shown email or handle. Removes email auth, profile data, saved opinions/history, and profile photo. An opaque profile-key tombstone and ownership bindings prevent old browser credentials from reclaiming deleted history. Historical experiment results remain. The email can register a fresh account later.

Account actions use admin authorization, same-origin JSON requests and private, noncached responses. They do not grant organizer privileges or expose sign-in codes or verification links to the organizer. An email change does not verify the new address. Current storage remains a shared pilot transaction record; this page is not evidence of broad-scale load validation. Production mutation checks must use explicit authorization; automated verification uses isolated synthetic data.

## Current production — November 8, 2026, version 50

Sites version 50 is deployed at [Vouch](https://v4ch.app), source `cd5ba45f12d0fa29da0df441209efa6a0d05fb33`, deployment `appgdep_6af00aae41948191a294a21a3d8708d0`, environment revision 6. It succeeded on November 8, 2026 at 12:37 AM America/New_York. This documentation update covers deployed versions 42–50 since version 41.

All 188 automated tests and a fresh production build pass. Read-only production GET checks return 200 for the root, sunscreen, water bottles, admin login and health; anonymous inventory, suggestions and feedback return 401. Eight current admin assets exactly match source. No production records were changed during this documentation update. Lint was not rerun; version 41 recorded four errors and nine warnings, so this update makes no clean-lint claim.

Unattended research execution remains unverified; Sites currently lists no attached schedules. Source provenance does not establish endorsement accuracy or Google rank, and photos require visual review. Real production email-code inbox delivery, signed-in profile-photo upload, full screen-reader/physical-device accessibility, exhaustive matching and broad abuse/load tests remain outstanding. No new demand, retention, revenue or purchase outcome is established.

Release: [version 50](releases/2026-11-08-v50.md). Earlier dated checks retain their historical scope.

Hosted admin access now uses a server-configured four-digit PIN instead of the previous ChatGPT sign-in/email allowlist. Sessions last a fixed 24 hours; Lock admin revokes the session, and changing the PIN invalidates prior sessions. Cookies are Secure, HttpOnly and SameSite=Strict; only random-token hashes are stored. Five failed attempts per IP-derived bucket in 15 minutes trigger a temporary block. Admin writes require same origin. Participant email-code accounts remain separate.

Experiment details now open Products, Settings and Participation, Missing Products, and Community Additions. Products supports name/URL/manual additions, photo URLs, reorder and removal with revision checks; removal preserves history and re-adding the same identity preserves its votes. Keep at least one product, at most 32, and one per brand. Live additions and reactivation require photos. Disable hides public access and overall participation while retaining data; Reactivate keeps the schedule. Permanent Delete requires the exact path and clears experiment activity and its associated suggestion, reserves the path, and retains shared products/personal opinions. Interrupted cleanup stays disabled for retry. Recoverable suggestion deletion is a separate action.

Suggestion review now has Product lineup, Research & sources, and Details & history tabs. Photo cards show missing images and researched-model differences; channel cards expose accepted coverage, source limitations and expandable evidence. Selected tabs and reading sections survive polling. List rows use Review; refresh/reject/delete live under More actions. Find missing photos reports progress and Add photo focuses the URL field. Admin product fields retain the corrected layout.

Find missing photos checks the category, broader catalog, then saved product URL, requiring the same normalized brand and every model word. Up to ten missing items are checked per request, three at a time, with per-item results and manual Add photo fallback. Provider identities, research names and order are preserved. Organizer photo overrides survive storage/hydration; cached searches refresh snapshots and bounded duplicate-alias resolution prevents photo loss. Inspect images for model accuracy and availability.

---

## PIN access — November 7, 2026

The admin workspace and its APIs now use a server-validated PIN session, replacing the ChatGPT organizer email allowlist. The PIN is configured as the secret runtime setting `VOUCH_ADMIN_PIN`; never put it in source or browser assets. A successful unlock sets a Secure, HttpOnly, SameSite=Strict cookie. The database stores only its token hash and enforces a fixed 24-hour expiry that activity does not extend. Changing the configured PIN invalidates previous sessions. Lock workspace signs out the current browser immediately. Five incorrect attempts from one IP temporarily block further attempts for 15 minutes. Admin writes and login/logout require the same origin.

Loopback development can enable the same gate with `VOUCH_ADMIN_PIN` or the server's `adminAuthOptions`. Without that setting the legacy local-only organizer bypass remains available for synthetic fixtures; hosted access always fails closed without a configured PIN. The public collection pages retain their existing access.

## Production status — <date start="2026-11-06" />, version 41

Deployed source `eb60d8582103ff7d94a6be2f71dc0ee66e74dee2`; deployment `appgdep_6aee4e25c6ec8191811e0ec37fc5e833` succeeded, environment revision 5. [Open admin](https://v4ch.app/admin). At that release, ChatGPT organizer sign-in and the ADMIN_EMAILS allowlist were required; anonymous inventory, suggestions and feedback APIs return 401.

## Navigate the workspace

The sidebar has Home, Experiments, Product Library, Suggestions and Feedback. Home retains its overview and experiment selector. Other sections open table indexes; select a row to open its details. Direct fragment links and browser Back retain the selected section. Narrow-screen tables scroll within their container.

## Experiments

Search name, category or path. Rows show title/path, category, Live/Closed/Ended/Scheduled/Draft status, product count, active votes and dates. Live Edit details contain settings, participation, nomination review and community additions. Draft rows open the associated suggestion review. Creating an Edit has its own view. Do not confuse deployment with approving a new category: generated drafts remain private until the organizer approves them.

## Product Library

The default table lists every stored product with active verdicts, ordered by total votes. Search spans brand, name, category and tag labels across the returned inventory. Pagination is 25 rows; Include unvoted products also exposes stored products for curation, not the entire external catalog.

Columns are product/brand, category, votes, Vouch, Soft-Vouch, Pass, score and Edits with activity. Detail shows totals, per-Edit counts and category/tag editing. Closed Edits, historical/reviewed community nominations and unresolved archived product IDs are included. Draft activity is excluded.

Combined totals use each browser's latest verdict per canonical product across Edits; a newer skip clears its earlier contribution. Per-Edit counts can therefore sum above the deduplicated combined total. Browser counts are not verified people or purchasers. No scoring or existing vote records were reset. API responses omit browser identifiers and private account identities.

## Suggestions and feedback

Suggestions provide research and private draft review; see the companion guide below once linked. Research, source reasons and historical visitor notes stay organizer-only. Approve publishes, Reject keeps history, Refresh starts another budgeted attempt, and Delete is recoverable. Live Edits and their votes are protected from suggestion deletion or replacement.

Feedback lists private notes newest first, their source page/Edit, optional contact email, status and timestamp. Open a row to read it, then Mark read. The badge counts new notes. Public callers cannot read notes; feedback sends no email automatically.

## Verification and limits

156 tests and production build pass. Nine deployed navigation/admin assets match release source, public collection pages/health return 200 and anonymous admin APIs return 401. Local browser tests covered populated inventory/search/tag editing and suggestion delete/restore, refresh, rejection, approval and Live status in isolated synthetic data. Local feedback submission/readback/Mark read also passed. The production organizer sign-in and Suggestions table were verified in the browser. A real running-shoes suggestion was saved for end-to-end research review; no production votes, feedback notes or draft approvals were submitted. Physical-device, full accessibility and broad-load validation remain outstanding.

Release evidence: <mention url="https://app.notion.com/p/40cd2a3caa8a812d83f4f3d13065be2d" />.

## Production draft check — <date start="2026-11-06" />

The real running-shoes job completed a private ten-product draft. It is marked Draft · needs attention because all ten products need photos; source/model/variant quality needs manual review. The public page, preview query without organizer authorization, experiment API and board API return 404. No production approval was performed. Production Product Library search and product details were also verified against existing voting activity. Unattended cron execution remains unverified.

