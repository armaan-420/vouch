# Vouch setup audit — November 1, 2026

Vouch already had public hosting through Sites on Cloudflare Workers and a managed D1 database. A second deployment on Vercel would require a hosting migration, replacement of the Cloudflare database binding, and replacement of the Sites organizer authentication. It is unnecessary for the prototype, so the existing platform is retained.

## Current documentation publication — November 3, 2026

Sites version 30 / `33c860ed30ecf63311a8a9b8dbf0dfb84fc406f3` is deployed; deployment `appgdep_6aea1d66e860819193ac5939e551e597` succeeded, environment revision 3. The Notion changelog and all 45 accessible Vouch pages were updated. Fresh publication checks: 71 automated tests passed, diff whitespace check passed, and public bottle configuration confirmed nine photographed products, open/unscheduled and excluded from overall. Production inbox/code sign-in and a real signed-in production photo upload remain unverified. Earlier verification reports and no-publication statements describe their historical tasks. See [version 30 notes](docs/releases/2026-11-03-v30.md). Local documentation changes have not been committed or pushed.

## What is connected

| Area | Current setup |
| --- | --- |
| Public website | https://v4ch.app |
| Organizer dashboard | `/admin`, protected by ChatGPT sign-in and the server-side `ADMIN_EMAILS` allowlist |
| Server | Vinext request routes running on a Cloudflare Worker |
| Database | Managed Cloudflare D1, bound as `DB` in `.openai/hosting.json` |
| Saved inputs | Anonymous visitor/session activity, verdicts, nomination history, product confirmations and catalog data |
| Deployment | Versioned source and build archive published through Sites; schema migrations applied by the hosting service |
| Runtime configuration | Organizer allowlist configured as a hosting secret; no database credentials in the browser |
| Operational check | `/api/health` reads the database and returns 503/500 on unavailable storage |

## Changes made

- Separate experiments have immutable product selections and independent votes, nominations, metrics and exports. Existing sunscreen records retain their original database key and are preserved.
- The organizer can create experiments, select original or catalog products, register custom SKUs from any category, copy participation links, close collection, and choose which results contribute to the overall leaderboard.
- Every new experiment starts excluded from the overall leaderboard. The original sunscreen experiment is also excluded by default.
- SKU identity is stable across experiments. Reuse a custom ID such as `sku-example-shampoo-250ml` for the same SKU; use a different ID for another size or formula. Existing custom SKUs can be selected again without re-entry.
- `/api/overall` combines only included experiments. For each SKU, each anonymous browser contributes its latest verdict across those experiments. Skips do not count toward the score. A later skip supersedes that browser's earlier verdict.
- Catalog-backed community additions can contribute by their canonical SKU identity. Name-only nominations remain experiment-specific until a durable catalog/SKU identity is available; they are not automatically merged across experiments.
- A completed flow requires answers to that experiment's selected products and viewing standings. Browsers can save multiple nominations with atomic replacement and preserved removal history.
- Downloads contain the selected experiment's configuration and underlying votes, participant/session records, nominations, history and review records, rather than only a summary.
- Request bodies have byte limits; organizer operations require server authorization; write requests reject a mismatching Origin header. Closing an experiment rejects new participant writes on the server.
- The public interface loads product selections from the server, distinguishes each experiment, supports products without photos, and exposes the overall leaderboard.

## How to run a test

1. Sign into `/admin` with the allowed organizer account.
2. Expand **Create a separate experiment**, name it, choose its products, and create it. Its link ID must be unique. Product selections are fixed after creation so changing a test does not silently reinterpret existing votes.
3. Copy its participation link and share it with testers. Each link uses its experiment ID as its path, such as `/sunscreen-test-b`. Legacy `?experiment=<id>` links redirect to the matching path.
4. Select that experiment in the dashboard to inspect its funnel, review nominations, or download its full results.
5. Close the experiment when collection is finished. Closing preserves its results and can be reversed.
6. Enable **Include these results in the overall leaderboard** only when the sample belongs in the overall ranking. The overall view is `/sunscreen?overall=1`.

## Operations and remaining work before a larger public launch

- **Backup:** download results for each experiment after important test sessions. Automated database backups and a restore procedure have not been configured or recovery-tested in this project. A source rollback does not undo database writes.
- **Scale:** D1 currently stores each experiment as one JSON record with optimistic concurrency checks. Different experiments use different records, but writes within a popular experiment contend and each read loads its entire history. This is appropriate for small pilots. Normalize participants, votes and nominations into indexed tables before a large launch or sustained high traffic. The current organizer limits are 50 experiments and 32 starting products per experiment.
- **Identity:** votes identify browsers, not verified people. Cookie deletion, multiple browsers and scripted traffic can create additional participants. Verified accounts, stronger abuse controls and moderation would be a separate launch step.
- **Catalog coverage:** sunscreen lookup includes 2,201 checked-in listings plus recurring feeds; retailer imports are partial snapshots. Bottles use a nine-SKU category library. Other categories need lineup/lookup validation. Search is not a general web-wide product database.
- **Monitoring:** platform runtime logs and the health endpoint are available. External uptime alerts and an error-reporting service are not configured.
- **Domain:** `v4ch.app` is connected and serving over HTTPS. The home page is a Coming Soon placeholder; `/sunscreen` serves the original experiment, and each new experiment has its own path. The original Sites address continues to work.
- **Environment:** local preview data lives in `.wrangler/state` (D1) or ignored `.data` files (Node preview). These are separate from hosted D1 and never uploaded as participant data. A separate hosted staging site is not configured.

## Verification

The test suite covers persistence, repeated votes, concurrent hosted-runtime writes, completion rules, nomination thresholds and edits, catalog fallback, experiment isolation, full export content, closing collection, stable custom SKUs, input validation and overall leaderboard deduplication. Browser checks cover creating an experiment, voting, rendering scores, viewing completion metrics and opting a local test into the overall leaderboard.

The original live website, board, community endpoint and product lookup returned successful responses during the audit; the anonymous organizer summary returned 401. Dependency updates and final hosted deployment checks are recorded in the task handoff.

## Dependency audit

The audit identified affected Next.js, Zod, sharp and transitive production packages. Updated Next.js and its matching ESLint configuration to 16.4.3, Zod to 4.6.7, and the Miniflare sharp override to 0.35.5; refreshed compatible transitive dependencies. Adjusted the preview connector's record schemas for Zod 4.

`npm audit --omit=dev` reports **zero findings** after these updates. The full audit still reports **31 toolchain findings (25 moderate, 6 high)** in the retained Sites/Vinext development stack, including Vite, Wrangler/Miniflare, image tooling and lint/schema tooling. A broader toolchain upgrade is outstanding; the npm-suggested forced fixes include breaking downgrades and were not applied. Development servers bind only to loopback. This website does not expose Next/Vinext image generation or image optimization routes; product photos use ordinary image elements.

## Final live verification

The live deployment is Sites version 2, source `e767ea109322086e101a1ae185cb587cb703025d`. Confirmed HTTPS responses on `v4ch.app`, D1 health, experiment pages and the overall API. Signed into the live organizer dashboard, created `system-verification-20261101`, submitted one vote, confirmed its score from another anonymous request, checked its completion metric, and downloaded and inspected its full JSON export. Then closed that experiment and confirmed the server rejects further votes with HTTP 409. It remains clearly labeled **System verification — excluded**, closed and excluded from the overall leaderboard. Original sunscreen scores remain unrated; the overall leaderboard still contains no included experiments.

Unauthenticated organizer configuration/export requests return 401. A forged organizer email header also returns 401. Final local validation: 12 automated tests passed, the production build passed, and TypeScript checking passed. The live organizer screenshot is saved beside the project as `vouch-organizer-audit.jpg`.

## Dynamic score update — November 1, 2026

Founder-approved score model: see [SCORING.md](SCORING.md). All experiment, community and overall results use the shared voteScore function. Existing votes recalculate at read time; no vote migration is needed. The public boards and prototype information explain the model. Earlier deployment verification above is historical.

## November 2, 2026 — account preview, not deployed

The local account/profile implementation adds participant email authentication, reviewed ownership claims, private collections, selective public opinions, and public product contributors. It preserves the existing organizer sign-in and experiment record format. The earlier identity limitation describes the historical anonymous-only release; current anonymous experiment scores still count browsers. The account preview uses isolated optimistic JSON records in D1 rather than normalized indexed tables. Real email delivery is not configured or verified. See [ACCOUNT_PREVIEW.md](ACCOUNT_PREVIEW.md) and [AUTH_SETUP.md](AUTH_SETUP.md). No release checkpoint has been advanced.

## Current account and standings release preparation — November 2

The account, product-contributor, and Save my picks functionality is now included in the release source. Reviewable source behavior, storage limitations, and tests are documented in ACCOUNT_PREVIEW.md and AUTH_SETUP.md. The latest standings use account navigation, an active top-bar countdown, linked product identity, and score colors. Signup is voluntary after engagement, with private picks by default. Release status and exact source/version must be taken from the current dated changelog rather than earlier historical deployment notes above.

Production release verified: Sites version 18 / `964eed08e54bb59026daa81ac102e55ddd7f8713`, deployment `appgdep_6ae932bf595881919473372685607cfe`, environment revision 3. Automated tests: 48 passed. Local Cloudflare/D1 account smoke and build passed. Public standings/account/product routes returned 200; anonymous organizer access returned 401; served application assets match source. Production browser navigation from Create Account to email signup passed. Actual inbox/code verification remains unverified. No destructive database migration or local-data import occurred.
