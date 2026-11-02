# Vouch — The Wharton Sunscreen Edit

A public sunscreen experiment: vote Vouch, Pass, or Haven’t tried; explore a community leaderboard; search for and nominate a missing product.

## Behavior

- Scores are real shared votes on a 0–10 scale, one decimal place. Unvoted products are Unrated. No vote totals or /10 suffix appear. Each anonymous browser has one active verdict per product; changing it replaces the prior vote. Skips do not affect scores.
- Live product lookup searches 12 brand catalogs: Beauty of Joseon, SKIN1004, Round Lab, Mixsoon, Innisfree, Supergoop!, EltaMD, Medicube, Isntree, Haruharu Wonder, KraveBeauty, and Naturium. The last successful fetch found 128 individual sunscreen listings. Catalogs refresh every 15 minutes; cached results are labeled when a refresh fails. Coverage is these catalogs, not the entire web.
- Selecting a result saves its authoritative product ID, title, photo, and source URL. Two distinct anonymous browsers nominating the same selection automatically add it to the board with **Community Nominated**. Products already on the board lead back to voting.
- Name-only fallback nominations enter the organizer’s lookup inbox. Confirming and combining aliases can qualify them at the same two-participant threshold.
- Each browser has one active nomination and can change it. Earlier versions are preserved in history. Votes, nominations, and funnel data use shared durable storage.
- The funnel measures unique browsers, starts, answering all eight initial cards, leaderboard views, reaching the nomination section, and nominations. Completing the flow requires all eight cards plus viewing the leaderboard. Nominating is optional. Cookies identify browsers, not verified people; clearing cookies or using another browser can count the same person twice.

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
