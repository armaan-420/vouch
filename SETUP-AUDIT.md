# Vouch setup audit — November 1, 2026

Vouch already had public hosting through Sites on Cloudflare Workers and a managed D1 database. A second deployment on Vercel would require a hosting migration, replacement of the Cloudflare database binding, and replacement of the Sites organizer authentication. It is unnecessary for the prototype, so the existing platform is retained.

## What is connected

| Area | Current setup |
| --- | --- |
| Public website | https://vouch-wharton-sunscreen-edit.armaann.chatgpt.site |
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
- A completed flow now requires answers to that experiment's selected products, rather than a fixed eight. Each browser still has one active nomination per experiment.
- Downloads contain the selected experiment's configuration and underlying votes, participant/session records, nominations, history and review records, rather than only a summary.
- Request bodies have byte limits; organizer operations require server authorization; write requests reject a mismatching Origin header. Closing an experiment rejects new participant writes on the server.
- The public interface loads product selections from the server, distinguishes each experiment, supports products without photos, and exposes the overall leaderboard.

## How to run a test

1. Sign into `/admin` with the allowed organizer account.
2. Expand **Create a separate experiment**, name it, choose its products, and create it. Its link ID must be unique. Product selections are fixed after creation so changing a test does not silently reinterpret existing votes.
3. Copy its participation link and share it with testers. Each link has `?experiment=<id>`.
4. Select that experiment in the dashboard to inspect its funnel, review nominations, or download its full results.
5. Close the experiment when collection is finished. Closing preserves its results and can be reversed.
6. Enable **Include these results in the overall leaderboard** only when the sample belongs in the overall ranking. The overall view is `/?overall=1`.

## Operations and remaining work before a larger public launch

- **Backup:** download results for each experiment after important test sessions. Automated database backups and a restore procedure have not been configured or recovery-tested in this project. A source rollback does not undo database writes.
- **Scale:** D1 currently stores each experiment as one JSON record with optimistic concurrency checks. Different experiments use different records, but writes within a popular experiment contend and each read loads its entire history. This is appropriate for small pilots. Normalize participants, votes and nominations into indexed tables before a large launch or sustained high traffic. The current organizer limits are 50 experiments and 32 starting products per experiment.
- **Identity:** votes identify browsers, not verified people. Cookie deletion, multiple browsers and scripted traffic can create additional participants. Verified accounts, stronger abuse controls and moderation would be a separate launch step.
- **Catalog coverage:** automatic product lookup covers the connected sunscreen brand catalogs. Other categories use custom SKU entry; automatic search is not a general web-wide product database.
- **Monitoring:** platform runtime logs and the health endpoint are available. External uptime alerts and an error-reporting service are not configured.
- **Domain:** the current HTTPS Sites address works. A custom domain is optional and has not been purchased or connected.
- **Environment:** local preview data lives in `.wrangler/state` (D1) or ignored `.data` files (Node preview). These are separate from hosted D1 and never uploaded as participant data. A separate hosted staging site is not configured.

## Verification

The test suite covers persistence, repeated votes, concurrent hosted-runtime writes, completion rules, nomination thresholds and edits, catalog fallback, experiment isolation, full export content, closing collection, stable custom SKUs, input validation and overall leaderboard deduplication. Browser checks cover creating an experiment, voting, rendering scores, viewing completion metrics and opting a local test into the overall leaderboard.

The original live website, board, community endpoint and product lookup returned successful responses during the audit; the anonymous organizer summary returned 401. Dependency updates and final hosted deployment checks are recorded in the task handoff.
