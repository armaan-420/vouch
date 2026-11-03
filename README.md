# Vouch

A product recommendation network with category experiments, community standings, and personal product collections. The original public sunscreen experiment lets participants vote Pass, Vouch for brand, Vouch for item, or Haven’t tried; explore a community leaderboard; search for and nominate a missing product.

## Product library and tags

The organizer includes nine water bottle SKUs with product photos, used by the live `/waterbottle` experiment and a reusable tag system for every identified Vouch product. Global tags and category-specific tags are managed in Product library & tags. Tags are organizer curation, with no automatic performance or popularity claims. See [PRODUCT_TAGS.md](PRODUCT_TAGS.md) for setup, storage, supported products, and limitations.

## Accounts and product profiles

Participants finish the experiment and see the standings before an optional Save my picks invitation. Signed-out participants who answered every selected card see a small modal after scrolling past the third ranked product (or viewing the last product on a shorter board). It appears once per experiment per tab visit, is dismissible without losing scroll position, and never gates results. Email-code signup happens inside the modal, followed by explicit contribution and visibility review. Participants save a private collection and can publish selected opinions. Item vouches, passes, and brand trust remain separate. New signed-in answers save directly to the account, including on a new browser, with new opinions private by default. Contextual collection pages offer review/recovery of earlier responses that missed the account; account save failures are visible and retryable. Existing experiment responses and scoring remain preserved. See [ACCOUNT_PREVIEW.md](ACCOUNT_PREVIEW.md) for flow, data ownership, checks, and limitations, and [AUTH_SETUP.md](AUTH_SETUP.md) for real-email configuration. The loopback development preview uses a clearly labeled local test inbox and sends no email. Hosted email uses Resend with server-only configuration; an available auth status confirms configuration, not inbox delivery. Suggestions, trusted-contributor recognition and discounts are upcoming features, clearly labeled in the invitation.

## Profile collection redesign

The signed-in collection and public profile lead with photo, name, join date and a short bio. Only item vouches appear in counts, category collages and history. Category tiles open a list; history uses the first item-vouch date and folds groups after the newest two. Owners edit identity in a full-screen mobile sheet or centred dialog, manage per-vouch visibility under “Who sees each vouch”, and manage passes and brand trust under “All your answers”. Existing review, sign-in, experiment voting and product contributor behavior remain available.

Photos accept JPG, PNG or WebP up to 5 MB in the browser, are centre-cropped and re-encoded to 400×400 PNG, and have ancillary metadata removed again on the server. The owner approved R2; the hosted `BUCKET` binding stores images and D1 stores only opaque references. Local Node development uses ignored `.data/profile-photos/`. Photo requests re-check profile visibility and owner access and use no-store responses. A photo and accompanying profile edits save together; Cancel discards unsaved drafts.

Public profile responses contain only public item vouches, published bio/photo and safe history metadata. Private profiles and private photos return 404 to other visitors. Profiles and new opinions still default to private. No migration is required for existing accounts.

Verification: 61 automated tests passed, the local Cloudflare/D1 runtime and accounts smoke checks passed, and a local D1/R2 upload/privacy/removal check passed. Browser review covered zero/new/established profiles; 320, 390, 768, 1024 and 1280px without horizontal overflow; mobile sheet and centred dialog; name validation, bio save/cancel, photo upload, public filtering, folded history, sticky sidebar, Escape and focus return. A synthetic JPG became a 400×400 PNG without EXIF. Production email delivery and a real signed-in production photo upload were not exercised. Failed-network recovery and a screen-reader audit were not tested in the browser. Golf and Travel were isolated local fixtures only. Notion release notes/checkpoints are unchanged; publication of release notes was outside this request.

## Experiment URLs

The main / page shows only Coming Soon. Each experiment uses its Link ID as its path: /sunscreen, /golf, or /sunscreen-test-b. Create a golf experiment with Link ID golf in the organizer to make /golf available. Unknown experiment paths return 404. Organizer links and copied links use these paths; older /?experiment=… links redirect to the matching path. Experiment navigation and the overall board stay under that experiment’s URL. Reserved app paths cannot be used as experiment IDs.

## Behavior

- Scores use a dynamic, sample-adjusted community model on a 0–10 scale, one decimal place. Formula: `10 × (weighted support + 0.25) / (weighted support + passes + 0.5)`, capped at 9.9 before rounding while there are fewer than 100 weighted verdicts. Item vouches count 1, brand vouches count 0.5, and passes count 1. Existing vouches keep full weight. After that, normal one-decimal rounding applies. Two vouches and no passes earn 9.0; 12 vouches and 3 passes earn 7.9. The same model applies to all experiment, community and overall boards. See [SCORING.md](SCORING.md). Rankings clearly identify the collective pool of votes they represent: this experiment on category boards, or included experiments on the overall board. Unvoted products are Unrated. No vote totals or /10 suffix appear. Each anonymous browser has one active verdict per product per experiment; changing it replaces the prior vote. Skips do not affect scores.
- Product lookup searches the full paginated sunscreen catalogs from 16 brand/retailer sources plus the worldwide sunscreen category in Open Beauty Facts. The checked-in fallback contains 2,201 listings, including 1,371 imported retailer listings from Ulta Beauty (423), YesStyle (217), Care to Beauty (485), Dermstore (224), and Soko Glam (22), alongside the existing brand feeds and Open Beauty Facts. New release listings are merged into the dedicated hosted catalog database record on initialization. Hosted suggestions return immediately from the saved catalog while an expired catalog refreshes in the background every 15 minutes; source outages retain prior listings. Matching handles accents, punctuation and spacing differences. Up to 20 suggestions appear, with source and available country labels. Retailer listings are saved import snapshots; the original brand/Open Beauty Facts feeds continue refreshing. Coverage is not exhaustive; missing products can still be nominated by name. YesStyle is partial after HTTP 429; Sephora and Olive Young blocked automated access; Target is not imported. Configurable Care to Beauty cards and unidentified Dermstore brands are excluded. Conservative matching preserves regional differences but differently named duplicates can remain. See [CATALOG_IMPORT.md](CATALOG_IMPORT.md) and [import report](data/retailer-import-report.json). Open Beauty Facts data is attributed under ODbL, with the derived extract available at `/catalogue/open-beauty-facts.json`; its contents are DbCL and images CC BY-SA 3.0.
- Selecting a result saves its authoritative product ID, title, photo, and source URL. Two distinct anonymous browsers nominating the same selection automatically add it to the board with **Community Nominated**. Products already on the board lead back to voting.
- Nominations clear search text after selection, with the next input beside the chips when space permits. Missing names can be added for organizer review. The fixed “See the standings →” button saves selected nominations before navigating, changing to “Save N nominations and see the standings →” when selections exist. Failed saves retain selections and show an error; source credits are in Prototype info. Saving shows a small checkmark inside the selection field; changing the draft clears it.
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

Each experiment has an optional start/end schedule in the organizer, entered in the organizer’s local time zone and stored in UTC. Set both dates or clear both. During an active scheduled experiment, a countdown appears beside the experiment title outside voting. Voting shows only the wordmark and a quiet Standings link. Product progress counts products only; optional nominations follow the final answered card, with no mid-flow shortcut. Response collection opens at the start and closes at the end; manual closure overrides the schedule. Results remain readable. Open pages refresh schedule changes every 30 seconds and on return to the tab. Unscheduled experiments keep accepting responses. Unscheduled, upcoming, ended and manually closed experiments show no countdown.

Experiments present one product per brand (case, accents, spacing and punctuation are ignored when matching brands). The first lineup product is retained. Community additions cannot introduce a second product from a represented brand; existing votes and nominations remain stored.

## Standings presentation

The top-right action is Create Account when signed out and My Account when signed in. Product images, brands, and names open public contributor pages; participant actions stay left-aligned. Public contributors require both a public profile and a public opinion. Scores remain anonymous experiment aggregates. Numeric score colors: green at 8.0+, black at 6.5–7.9, yellow at 5.0–6.4, red below 5.0; Unrated stays neutral. The expandable score guide is removed from standings; scoring information remains in Prototype info and SCORING.md.

## Previously documented release

Sites version 18 is live at https://v4ch.app/sunscreen, application source `964eed08e54bb59026daa81ac102e55ddd7f8713`, deployment `appgdep_6ae932bf595881919473372685607cfe`, environment revision 3. Release notes are in [docs/releases/2026-11-02-v18.md](docs/releases/2026-11-02-v18.md) and the canonical [Notion changelog](https://app.notion.com/p/40cd2a3caa8a812d83f4f3d13065be2d). At that verification, production assets matched source; account navigation works and email signup is configured without preview delivery. Actual inbox receipt/sign-in is pending owner testing.
