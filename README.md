# Vouch — The Wharton Sunscreen Edit

A product-testing website with separate experiments and an optional overall leaderboard. The original public sunscreen experiment lets participants vote Pass, Vouch for brand, Vouch for item, or Haven’t tried; explore a community leaderboard; search for and nominate a missing product.

## Account and product-profile preview

A first account implementation is available for local review; it has not been deployed. Participants can preview their edit, sign in by email code, review which browser contributions belong to them, save a private collection, and explicitly publish selected opinions. Item vouches, passes, and brand trust remain separate. Existing experiment responses and scoring remain preserved. See [ACCOUNT_PREVIEW.md](ACCOUNT_PREVIEW.md) for flow, data ownership, checks, and limitations, and [AUTH_SETUP.md](AUTH_SETUP.md) for real-email configuration. The loopback development preview uses a clearly labeled local test inbox and sends no email.

## Experiment URLs

The main / page shows only Coming Soon. Each experiment uses its Link ID as its path: /sunscreen, /golf, or /sunscreen-test-b. Create a golf experiment with Link ID golf in the organizer to make /golf available. Unknown experiment paths return 404. Organizer links and copied links use these paths; older /?experiment=… links redirect to the matching path. Experiment navigation and the overall board stay under that experiment’s URL. Reserved app paths cannot be used as experiment IDs.

## Behavior

- Scores use a dynamic, sample-adjusted community model on a 0–10 scale, one decimal place. Formula: `10 × (weighted support + 0.25) / (weighted support + passes + 0.5)`, capped at 9.9 before rounding while there are fewer than 100 weighted verdicts. Item vouches count 1, brand vouches count 0.5, and passes count 1. Existing vouches keep full weight. After that, normal one-decimal rounding applies. Two vouches and no passes earn 9.0; 12 vouches and 3 passes earn 7.9. The same model applies to all experiment, community and overall boards. See [SCORING.md](SCORING.md). Rankings clearly identify the collective pool of votes they represent: this experiment on category boards, or included experiments on the overall board. Unvoted products are Unrated. No vote totals or /10 suffix appear. Each anonymous browser has one active verdict per product per experiment; changing it replaces the prior vote. Skips do not affect scores.
- Product lookup searches the full paginated sunscreen catalogs from 15 brand/retailer sources plus the worldwide sunscreen category in Open Beauty Facts. The checked-in fallback currently contains 829 listings, including Japanese, Korean, European, US and Australian products. Hosted suggestions return immediately from the saved catalog while an expired catalog refreshes in the background every 15 minutes; source outages retain prior listings. Matching handles accents, punctuation and spacing differences. Up to 20 suggestions appear, with source and available country labels. Coverage is not exhaustive; missing products can still be nominated by name. Open Beauty Facts data is attributed under ODbL, with the derived extract available at `/catalogue/open-beauty-facts.json`; its contents are DbCL and images CC BY-SA 3.0.
- Selecting a result saves its authoritative product ID, title, photo, and source URL. Two distinct anonymous browsers nominating the same selection automatically add it to the board with **Community Nominated**. Products already on the board lead back to voting.
- Nominations clear search text after selection, with the next input beside the chips when space permits. Missing names can be added for organizer review. “See the board” opens the community board and stays fixed at the bottom of the viewport; source credits are in Prototype info. Saving shows a small checkmark inside the selection field; changing the draft clears it.
- Name-only fallback nominations enter the organizer’s lookup inbox. Confirming and combining aliases can qualify them at the same two-participant threshold.
- Each browser can select and save multiple nominations per experiment, keep selections across searches, and remove individual products. Saving replaces the browser’s full selection atomically; duplicate products count once. Removed nominations are preserved in history. Votes, nominations, and funnel data use shared durable storage.
- The funnel measures unique browsers, starts, answering all selected cards in an experiment, leaderboard views, reaching the nomination section, and nominations. Completing the flow requires all selected cards plus viewing the leaderboard. Nominating is optional. Cookies identify browsers, not verified people; clearing cookies or using another browser can count the same person twice.

## Hosting and organizer access

The cloud app uses the supplied Sites Vinext/Cloudflare Worker integration and a D1 database. `.openai/hosting.json` retains the Site identity and declares the `DB` binding. Schema changes are generated under `drizzle/`; publication applies hosted migrations.

`/admin` and `/api/admin/*` require Sign in with ChatGPT and an email on the server-side `ADMIN_EMAILS` allowlist. Set it through the hosting environment, never in public source. Anonymous visitors can vote without signing in. There is no public static copy of the organizer page. `ADMIN_EMAILS` is not bundled into browser code.

Database updates use optimistic version checks, retrying conflicting writes so simultaneous participants do not overwrite each other. The catalog has its own database record. Production starts clean; local prototype/test activity is not imported.

## Development

Node 22.13 or later is required.

```sh
npm ci
npm run dev
```

The Vinext local preview uses port 5173 by default. `npm run dev -- --port 4175 --hostname 127.0.0.1` uses the integration-test port. Local D1 migrations follow the Sites starter workflow; build first to generate `dist/server/wrangler.json`, then apply the checked-in schema migration using Wrangler with `--local` and `--persist-to .wrangler/state`.

Local-only development sign-in is `/signin-with-chatgpt?return_to=/admin`, using the starter’s `seedy@sites.test` mock account. That exception is compiled out of production.

`npm run dev:local` runs the dependency-free Node preview at port 4173. It stores records under ignored `.data/` and uses the same API behavior. Its organizer page is loopback-only and unrestricted; it is not the public server.

```sh
npm test
node test/hosted-local-smoke.mjs
npm run build
```

The smoke test writes only to the local Vinext runtime at port 4175. Unit tests use isolated temporary storage. Tests cover visitor deduplication, completion tracking, nomination thresholds and edits, real vote scores, catalog selection, invalid product IDs, and failure fallback.

Runtime data, cookies, local environment values, caches, and `.wrangler/` are ignored. No visitor records or credentials are published to GitHub.

## Experiments and operating guide

See [SETUP-AUDIT.md](SETUP-AUDIT.md) for the audited infrastructure, organizer workflow, experiment isolation, overall ranking rules, and remaining work before a larger public launch. Start at `/admin` to create an experiment and copy its participation link. Each new experiment is excluded from the overall leaderboard until you include it. Full data exports are available per experiment. The public overall view is `/sunscreen?overall=1`.

Each experiment has an optional start/end schedule in the organizer, entered in the organizer’s local time zone and stored in UTC. Set both dates or clear both. A live countdown appears on its landing page and results board, with dates shown in the visitor’s time zone. Response collection opens at the start and closes at the end; manual closure overrides the schedule. Results remain readable. Open pages refresh schedule changes every 30 seconds and on return to the tab. Existing unscheduled experiments keep accepting responses and show “Schedule to be announced.”

Experiments present one product per brand (case, accents, spacing and punctuation are ignored when matching brands). The first lineup product is retained. Community additions cannot introduce a second product from a represented brand; existing votes and nominations remain stored.
