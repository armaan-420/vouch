# Automatic Edit drafts

## Current production — November 8, 2026, version 50

Sites version 50 is deployed at [Vouch](https://v4ch.app), source `cd5ba45f12d0fa29da0df441209efa6a0d05fb33`, deployment `appgdep_6af00aae41948191a294a21a3d8708d0`, environment revision 6. It succeeded on November 8, 2026 at 12:37 AM America/New_York. This documentation update covers deployed versions 42–50 since version 41.

All 188 automated tests and a fresh production build pass. Read-only production GET checks return 200 for the root, sunscreen, water bottles, admin login and health; anonymous inventory, suggestions and feedback return 401. Eight current admin assets exactly match source. No production records were changed during this documentation update. Lint was not rerun; version 41 recorded four errors and nine warnings, so this update makes no clean-lint claim.

Unattended research execution remains unverified; Sites currently lists no attached schedules. Source provenance does not establish endorsement accuracy or Google rank, and photos require visual review. Real production email-code inbox delivery, signed-in profile-photo upload, full screen-reader/physical-device accessibility, exhaustive matching and broad abuse/load tests remain outstanding. No new demand, retention, revenue or purchase outcome is established.

Release: [version 50](docs/releases/2026-11-08-v50.md). Earlier dated checks retain their historical scope.

Research targets ten distinct brands with TikTok, Wirecutter, Google-first-organic-result and AI coverage tied to exact products. One Wirecutter brand is required, two preferred; Google must add a different brand. Returned source metadata establishes provenance only. Organizer-checked evidence is marked and timestamped. Missing sources or photos for any final-lineup product block approval, including legacy drafts. Invalid evidence becomes a private warning without discarding valid picks. Saved-response recovery avoids another model start; Refresh research starts a new budgeted attempt. Limits are 16,000 output tokens, 16 tool calls and 20 starts per Eastern day.

Find missing photos checks the category, broader catalog, then saved product URL, requiring the same normalized brand and every model word. Up to ten missing items are checked per request, three at a time, with per-item results and manual Add photo fallback. Provider identities, research names and order are preserved. Organizer photo overrides survive storage/hydration; cached searches refresh snapshots and bounded duplicate-alias resolution prevents photo loss. Inspect images for model accuracy and availability.

Suggestion review now has Product lineup, Research & sources, and Details & history tabs. Photo cards show missing images and researched-model differences; channel cards expose accepted coverage, source limitations and expandable evidence. Selected tabs and reading sections survive polling. List rows use Review; refresh/reject/delete live under More actions. Find missing photos reports progress and Add photo focuses the URL field. Admin product fields retain the corrected layout.

Recover saved research resumes a saved response without a new daily start. Refresh research starts a new budgeted attempt. All drafts remain private until explicit approval and current source/photo checks. Hosted admin uses PIN sessions; the unrestricted loopback preview remains development-only.

---

Visitors suggest a category immediately after the standings list or through Suggest a category in the shared hamburger menu. The root teaser has no inline suggestion card. Vouch records support, researches ten products, matches catalog identities, and builds a private draft for organizer review. The app runs this process; Codex does not need to remain in a chat or rebuild the application for each suggestion.

Initial automatic-draft deployment was Sites version 41 on November 6, 2026; current version 50 uses runtime revision 6 and retains automatic research with a server-only OpenAI key and a 20-start daily budget. Scheduled unattended invocation remains unverified; see Release Notes and the Notion operating guide for current verification.

## Try the isolated preview

From this repository, run:

```sh
npm run preview:auto
```

Open http://127.0.0.1:4188/sunscreen, choose Suggest a category from the menu and suggest **running shoes** or **backpacks**. Then open http://127.0.0.1:4188/admin#suggestions-panel. The local runner advances once a second, even with the organizer page closed. A ten-product draft normally appears in about twelve seconds. Restarting the server resumes saved jobs.

This command forces fixture research and disables live catalog providers. It sends no research requests or email. Running shoes and backpacks have fixed illustrative product names; other categories have explicitly synthetic Demo Brand products. Fixture reasons and source links are labeled as such; they are not evidence of current popularity, availability, or quality. Missing photos are expected. Fixture moderation only exercises the local blocklist, not semantic moderation.

Data is isolated in ignored `.data/auto-experiments-preview/`. The preview seeds a local water-bottle Edit so suggesting “water bottles” links to `/waterbottle` without creating another job. It does not change your usual `.data/` records or hosted records. The organizer is unrestricted on the loopback Node server, following the existing development convention.

1. Submit a category. The visitor form no longer asks Why. Inline submission changes the button to Suggested ✓; the navigation modal closes and shows a dismissible confirmation banner. Existing live categories link to their Edit instead. Historical optional notes remain visible only to organizers.
2. In Suggestions, inspect products, reasons, sources, notes, state, and support count.
3. Preview the private Board. Voting and nominations are disabled.
4. Edit lineup: change title/path; remove/add catalog products using the shared picker; edit custom product brand/name and optional HTTPS photo/manufacturer URL.
5. Complete the required source checks and attach a photo to every final-lineup product, then choose Approve and confirm **Approve Edit** once. The participation path becomes available for voting.
6. Dismiss removes a draft from the registry but retains its job and research. Retry research rebuilds the same draft. Build draft also works with automatic building off, but does not bypass moderation.

`npm run dev:local` instead uses your normal `.data/` and environment. Without an OpenAI key it uses fixtures. With a key it uses OpenAI and requires `EXPERIMENT_AUTO_BUILD=on` or manual Build draft. Never expose the Node preview beyond loopback.

## Stored records and states

- `category-suggestions`: normalized category, display name, distinct supporting browsers, first/last times and per-browser optional notes (280 characters).
- `suggestion-jobs`: durable progress, lease, timestamps, research, provider response ID, reported token usage, matching results, draft ID, redacted error and notification claim. Its budget is counted by Eastern calendar day.
- `experiment-registry`: drafts have `status:'draft'`, `origin:{type:'suggestion',suggestionKey}`, no schedule, `closed:false`, and `includeInOverall:false`. Missing status remains live for historical records.
- `suggestion-notifications`: local-only test inbox, available through the organizer suggestions response.

The usual progression is `queued → researching → matching → ready | needs_attention | rejected | failed`, followed by `approved`, `dismissed` or recoverable `deleted`. The table workspace adds reject/delete/restore actions; see ADMIN_WORKSPACE.md. Immediate fixture results go directly from queued to matching. Matching handles one product per step. At least eight photos yields ready; four or more usable products with fewer photos yields needs_attention. Fewer than four usable products or a disallowed category yields rejected. A complete ten-product no-photo draft remains reviewable as needs_attention.

Drafts do not count against the fifty-live-Edit limit. Approval checks that limit. Shared lineup validation enforces valid paths, 1–32 products and one product per brand. Taken slugs get numeric suffixes. Draft-only custom products are not added to the shared SKU library until approval.

## Deduplication, privacy and trust

Normalization lowercases, strips accents/punctuation, collapses spaces and folds simple plurals. Compact comparison handles `waterbottle` versus `Water bottles`. Repeated support from one browser updates its note; it does not create another supporter or job. Five new category suggestions per browser in a rolling 24 hours are allowed. Cookies identify browsers, not verified people, and can be cleared. Canonical research categories also merge aliases.

The provider receives only normalized category text. Notes, cookies, identities, emails and IPs are never placed in research input. Obvious blocked categories cost no provider request. The research instructions restrict categories to physical consumer products and reject adult products, weapons, drugs, nicotine, prescriptions/medical devices, services, people, places, events, politics and nonsense; brand-specific requests should broaden where appropriate.

Research picks represent requested recognition-based candidates, not tested “best” products. Reasons and source URLs are organizer-only. Participant Boards use votes and the existing score calculation. Commission and price do not enter research selection or catalog matching. A match requires normalized brand equality and at least 60% model-name token overlap, preferring a photo. Unmatched picks become custom products; a conservatively recognized manufacturer source can supply their URL.

Provider products persist only the existing catalog `identity()` fields. Provider photos and URLs hydrate from the resolver and respect its cache rules. Research/match records do not store short-lived provider images, offers, commissions or prices.

Public draft paths, experiment data, boards, votes, nominations, catalog routes scoped to the draft, account claim previews and product contributor pages return 404. Drafts are excluded from overall results and public registry product discovery. Organizer preview requires both `preview=1` and the existing organizer authorization; the query alone grants no access. Preview HTML is not cached. Drafts cannot collect account opinions, so new draft-only products cannot enter public profiles. Existing account privacy rules remain unchanged.

## Drivers, leases, retries and budget

- Hosted suggestion submission uses the existing execution context's `waitUntil` for one initial step.
- The visible organizer Suggestions section calls the authorized run endpoint every fifteen seconds. Editing pauses that polling.
- Node preview advances once a second while its process runs.
- A Worker `scheduled` handler and five-minute `triggers.crons` are present. The production build preserves them in generated Wrangler configuration. Actual Sites scheduler registration and hosted invocations are **unverified**; registration must be verified separately; see the latest release notes for deployment status.

Each advance acquires a sixty-second durable lease using the existing optimistic transaction helper. Provider HTTP requests time out after eighteen seconds; OpenAI research starts with `background:true` and polls the saved response ID on later steps. Research has a ten-minute deadline. Catalog matching handles one pick per step. Repeated final steps recover the existing draft by its suggestion origin. Research-start requests use a stable idempotency key per research attempt; step failures retry up to three times with exponential backoff, then retain a generic redacted error in failed state. Manual retry starts a new budgeted research attempt.

The default budget is twenty research starts per Eastern day. Over-budget jobs stay queued; in-progress matching can finish. This limits starts, not dollar spend or total web-search tool charges. Each response also caps output at 16,000 tokens and sixteen tool calls. Actual returned usage is retained for review, with no invented dollar estimate.

The five-minute trigger performs one step, so an unattended hosted build can take approximately an hour, plus research polling. Organizer polling is faster, but neither timing is a latency guarantee. The local one-second driver is intended to make repeated flow testing convenient.

## Environment configuration

No values or secret files are written by this feature. Supply local values through the environment of the Node process, or through the existing framework environment workflow described in AUTH_SETUP.md and PRODUCT_LOOKUP.md.

| Variable | Meaning |
| --- | --- |
| `OPENAI_API_KEY` | Server-only Responses API key for real research. Missing key never silently enables fixtures in production. |
| `EXPERIMENT_RESEARCH_MODEL` | Default `gpt-5.4`; must support Responses, web search, background execution and structured output. |
| `EXPERIMENT_RESEARCH_PROVIDER` | `fake` is available only in development. Omit for real research. |
| `EXPERIMENT_AUTO_BUILD` | `on` or `off`; default off in production, on in local fixture mode. Suggestions are still saved when off. |
| `EXPERIMENT_RESEARCH_DAILY_BUDGET` | Default 20 research starts per Eastern day. Zero pauses new starts. |
| `SUGGESTION_NOTIFY_EMAIL` | Optional organizer notification destination. |
| `SUGGESTION_ADMIN_URL` | Full canonical organizer URL, e.g. `https://your-domain/admin`; required for scheduled notification delivery. |
| `RESEND_API_KEY`, `VOUCH_EMAIL_FROM` | Existing server-only Resend configuration; required for real notification delivery. |
| `CATALOG_LIVE_PROVIDERS`, `CHANNEL3_API_KEY` | Existing catalog settings; enable Channel3 to improve matching/photo coverage. |
| Shopify catalog variables | Optional existing provider configuration; see PRODUCT_LOOKUP.md. |

For eventual Sites use, configure research key/model/budget, explicitly turn auto-build on, configure the existing catalog provider(s), and optionally set the notification address, admin URL and Resend settings. Hosted organizer authorization uses the server-configured PIN and fixed 24-hour sessions. Do not enable fake mode in production. Production activation requires a server research key; without it, queued jobs remain paused without consuming budget or retries. The organizer displays a configuration message.

Notifications contain category, state and the organizer link, never visitor notes or identifiers. A durable claim ensures at most one notification attempt per job. Failed delivery leaves a visible organizer warning; it is not retried automatically, avoiding duplicate email. Local notifications go only to the test inbox.

The adapter follows official OpenAI documentation for [web search](https://developers.openai.com/api/docs/guides/tools-web-search), [background mode](https://developers.openai.com/api/docs/guides/background), and [structured output](https://developers.openai.com/api/docs/guides/structured-outputs). Cron uses the [Cloudflare scheduled handler](https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/).

## Verification and remaining limits

Baseline: **110 passed**. Current suite: **156 passed**, including normalization, repeated support, rate limit, moderation blocklist, schema/source validation, catalog identity matching and photo thresholds, concurrent leases and expiry, retries/redaction, budget rollover, canonical merge, slug collisions, capacity, draft gating, editing, approval, dismissal, notifications and background provider request fixtures.

The final production build passed. The isolated HTTP smoke check passed with a ten-product, zero-photo fixture draft in 12.2 seconds and one local notification. It exercises autonomous local processing, draft 404/organizer preview, a product edit, approval, a real vote, water-bottle duplicate handling and the local notification inbox. Browser checks verify category submission, generated ten-product review, product-detail editing and saving, and private Board preview. The draft Board has no horizontal overflow at 320px and 390px; the organizer was also checked at 390px. The browser's original native confirmation stalled automation; it was replaced with an in-page accessible confirmation. The later table-workspace check verified the in-page confirmation and approval-to-Live transition in a separate synthetic browser QA dataset; participant voting also passes the API smoke check. Full screen-reader and physical-device testing remain unverified.

The release check completed real gpt-5.4 web-search/structured-output research for running shoes: ten validated picks from ten brands with HTTPS sources; the direct check reported 9,996 total tokens. A separate production running-shoes suggestion is retained as a private review case. Fixture runs test mechanics, not research quality. Source accuracy, full catalog-match coverage, notification inbox delivery and unattended cron registration remain separate verification limits.

AI picks and sources can be wrong or outdated. “Top ten” is recognition-based and is not tested best. Catalog photo coverage depends on provider access and matching; niche categories can need manual changes. Simple plural folding is not a linguistic synonym system. Local fake research intentionally does not semantically moderate arbitrary categories. Registry/job writes are separate records: draft generation recovers by origin and approval can be repeated, but this is not a distributed transaction across records. Records are bounded per request, not a comprehensive anti-abuse system. Hosted cron execution and Sites support for registering that schedule remain unverified; the generated Worker handler alone does not prove unattended execution.

## Changed files

- `lib/auto-experiments/{api,research,matching}.mjs`: suggestions, durable jobs, research providers, matching and organizer actions.
- `lib/experiment-api.mjs`, `lib/application-api.mjs`, `lib/accounts.mjs`, `lib/experiment-pages.mjs`: shared validation, API dispatch and private-draft boundaries.
- `lib/{home-page,admin-page,experiment-page}.html`, `public/{suggestions,admin-suggestions,admin,app}.js`, `public/style.css`: suggestion cards, organizer review/edit/confirmation and read-only preview.
- `lib/hosted-api.ts`, `worker/index.ts`, `vite.config.ts`, `cloudflare-env.d.ts`: environment, background jobs and generated cron wiring.
- `lib/email-delivery.mjs`, `server.mjs`: category-only notifications and local processing/inbox.
- `scripts/preview-auto-experiments.mjs`, `package.json`: isolated fixture preview command.
- `test/auto-experiments.test.mjs`, `AUTO_EXPERIMENTS.md`, `README.md`: coverage and local testing instructions.
