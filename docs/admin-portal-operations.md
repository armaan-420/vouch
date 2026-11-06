## Production status — <date start="2026-11-06" />, version 41

Deployed source `eb60d8582103ff7d94a6be2f71dc0ee66e74dee2`; deployment `appgdep_6aee4e25c6ec8191811e0ec37fc5e833` succeeded, environment revision 5. [Open admin](https://v4ch.app/admin). The existing ChatGPT organizer sign-in and ADMIN_EMAILS allowlist remain required; anonymous inventory, suggestions and feedback APIs return 401.

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

