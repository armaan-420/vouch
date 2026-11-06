# Vouch

A product recommendation network with category experiments, community standings, and personal product collections. The original public sunscreen experiment lets participants vote Pass, Soft-Vouch (brand trust), Vouch (item experience), or Haven’t tried; explore a community leaderboard; search for and nominate a missing product.

## Shared public navigation — local preview

Public headers now share desktop search/category/feedback/account actions and a compact mobile menu. Search appears on Edit pages and hands products to the existing product/nomination flows. Feedback is private, rate-limited and available to the organizer under Feedback. See [TOP_NAV.md](TOP_NAV.md) for files, controls, checks, screenshots and remaining verification limits.

## Organizer workspace — local layout

The organizer uses sidebar navigation for Home, Experiments, Product Library and Suggestions. Home keeps its existing overview. The other sections open searchable tables with addressable detail pages: experiment settings/participation, cross-experiment product voting activity and tags, and suggestion research with row actions. Suggestion deletion is recoverable and leaves live Edits intact. See [ADMIN_WORKSPACE.md](ADMIN_WORKSPACE.md) for columns, vote deduplication, action semantics, checks and local-data limits.

## Automatic Edit drafts — local preview

Run `npm run preview:auto` to test category suggestions becoming private ten-product drafts, organizer lineup editing and one-confirmation approval. The isolated preview uses labeled fixture research, no live catalog providers, and a local notification inbox; it does not deploy or change hosted records. See [AUTO_EXPERIMENTS.md](AUTO_EXPERIMENTS.md) for the test flow, real-research setup, budget, state machine, verification and limitations.

## Category-scoped live lookup — November 6, 2026

Sites version 39 is live, application source `38a2e8da8dc7917b4287e89630b3a79f78f0e7b3`, deployment `appgdep_6aede26afa848191adfde3bb14d1aad9`, environment revision 4. Channel3 uses the active voting category for missing-favorite searches; local results answer first and repeated searches use category-specific caching. Link paste, barcode/photo controls and disclosed contributor-page offers are enabled. Shopify remains deferred. The empty shampoo/TV preview boards remain local; production retains its existing collections.

All 110 tests and final build pass. Production searches, cache reuse and current offers were verified, and six public assets match source. The Notion changelog, new lookup guide and eleven affected working pages were published before advancing checkpoints. See [release notes](docs/releases/2026-11-06-v39.md), [production guide](docs/product-lookup-production-guide.md), and [PRODUCT_LOOKUP.md](PRODUCT_LOOKUP.md) for controls and remaining device/coverage checks. Earlier dated sections retain their historical status.

## Compact vote counts — November 5, 2026

Approved board UI: a soft pale chip beneath each rated score says “N votes” (singular “1 vote”), counts all active Yes / Maybe / Pass verdicts and excludes skips. It is 16px tall with 9px text and 2px × 5px padding. Unrated rows have no chip. Tap to reveal only “The community says,” the exact total, and the three colored Yes / Maybe / Pass counts. Click outside or Escape closes the breakdown. Community additions and the overall board share this component; the existing score formula and latest-per-browser deduplication are unchanged. Browser counts are not verified unique people and differ from public account contributors. Published as Sites version 35, application source `7a523461e5d64b031167623eeac57030e550a342`; deployment `appgdep_6aed50f74eb8819197af0844668e611b` succeeded. All 73 tests and the production build passed; deployed app.js/style.css match source. The Notion release log and 17 affected working pages were updated successfully. See [version 35 notes](docs/releases/2026-11-05-v35.md).

## Separate product search — November 5, 2026

Participant nominations on The Board and after the voting cards, plus the organizer experiment product picker, share product-picker.js. The search field remains full width while selected products appear below it. Selecting a catalog result keeps the query and results open; remove individual selections or Clear all. Clear search and Search another brand preserve selections. Arrow keys, Enter and Escape operate the result list. Phones at up to 600px show three initial results, wider screens five; See more adds the same number without nested result scrolling. Search still returns at most 20 matches; this release does not expand coverage or introduce fuzzy matching.

Nomination and experiment-creation actions use forest green #123C2E with ivory #F5F0E8. Selected chips retain the original pale #F7F9EF fill and #C3CEAE border; the rejected sand concept is not used. Manual names are marked For review. Catalog selection still preserves exact IDs, on-board products navigate to their existing card, and the final nomination action saves before opening The Board. Save failures retain selections for retry.

Validation: 73 existing automated tests pass, frontend syntax checks pass, production build passes. Isolated local browser checks cover repeated searches, keyboard selection, pagination, organizer selections, saving, and 390px phone layout without horizontal overflow. Physical phone keyboard and full screen-reader testing remain unverified. Published as Sites version 33 (926e96734b4f73aac39c2eab9fcc8d09920be506), deployment succeeded November 5, 2026. Notion changelog and five affected working pages were updated; local checkpoint/mirrors followed successful publication. See docs/releases/2026-11-05-v33.md.

Earlier November 5 sections below retain their local-review chronology; the version 31 release subsequently included those source changes. See the current release notes for deployment evidence.

## Local mobile layout review — November 5, 2026

Local implementation only; no saved Sites version or deployment was created. Participant pages remove the category chip, header collection title, community-picks badge and footer links. The mobile landing page places product art behind the headline. Rating uses a compact header and a viewport-sized flexible product card, with Pass, Soft-Vouch (I trust this brand), Vouch (I tried this item), and I haven’t tried this. Visitor-facing flow and account copy uses collections or voting instead of experiments; internal routes, storage keys and organizer terminology are retained for compatibility.

Browser checks: all eight sunscreen cards fit at 393 × 650 with no vertical or horizontal scrolling; a saved-answer revisit also fits at 393 × 570. Landing fits at 393 × 650. Back navigation and the optional-nomination handoff were exercised. These are browser viewport checks, not physical iPhone Safari verification. Very short viewports and larger accessibility text may still scroll so content remains reachable. Existing automated schedule, routing and voting checks: 14 passed. The review server uses an isolated temporary data folder with voting open, because the existing local sunscreen schedule has ended; its test responses do not change the existing local dataset or hosted data. Release-note checkpoints remain unchanged.

## Local copy and alignment revision — November 5, 2026

The returning headline is explicitly two lines, Welcome / back., with Your takes are in. beneath it. The first-time CTA is Start vouching. Participant results headings and navigation now use The Board, See the board, and See the final board; nomination continuation and account return links use the same board terminology. The numbered steps read Vouch for your favorites, Add your essentials, and Reveal the board. Landing headlines, introductory text and primary actions share a left edge, with equal-width, top-aligned step columns. The previous centered mobile hero spacing is preserved.

Browser verification covered the first-time and returning landing at 393 × 650, headline/CTA left-edge measurements, all eight voting cards through nomination continuation and The Board. Landing and returning states fit without page scrolling. Syntax checks passed. These changes remain local, with no saved Sites version, deployment, Notion publication, or release checkpoint change.

## Local landing navigation review — November 5, 2026

The participant header now offers an unfilled, underlined Sign in link with a 44px tap target, or a signed-in profile photo/initial circle linking to the owner’s account page. Voting and nomination screens retain a quiet Standings link. First-time and partially answered landings keep Vouch or pass as the primary action and expose standings through a small landing-only footer link. The voting footer remains tagline-only. Visitors who answered every currently selected product (including Haven’t tried) see Welcome back, their saved-answer count, See the standings, and a secondary Revisit your takes action. Closed or ended voting opens a landing with See the final standings; direct standings URLs remain available. The welcome-back state reflects this browser’s saved responses, rather than assuming account sign-in means the current collection is complete.

Local browser verification at 393 × 650 covered first-time landing/footer access, completed return, closed-voting landing/results, voting header with no page scroll, and a synthetic account sign-in and initial-circle link to its private profile. The existing 17 routing, schedule, voting and account-flow checks passed; the framework build passed. Physical iPhone and the header photo variant were not exercised. No deployment, Sites version, Notion publication, or release checkpoint update was made.

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

The main `/` page is a branded Coming Soon teaser with the Vouch wordmark, a centered editorial headline and a short product introduction; experiment entry remains on the dedicated experiment URLs. Each experiment uses its Link ID as its path: /sunscreen, /golf, or /sunscreen-test-b. Create a golf experiment with Link ID golf in the organizer to make /golf available. Unknown experiment paths return 404. Organizer links and copied links use these paths; older /?experiment=… links redirect to the matching path. Experiment navigation and the overall board stay under that experiment’s URL. Reserved app paths cannot be used as experiment IDs.

## Behavior

- Scores use a dynamic, sample-adjusted community model on a 0–10 scale, one decimal place. Formula: `10 × (weighted support + 0.25) / (weighted support + passes + 0.5)`, capped at 9.9 before rounding while there are fewer than 100 weighted verdicts. Item vouches count 1, brand vouches count 0.5, and passes count 1. Existing vouches keep full weight. After that, normal one-decimal rounding applies. Two vouches and no passes earn 9.0; 12 vouches and 3 passes earn 7.9. The same model applies to all experiment, community and overall boards. See [SCORING.md](SCORING.md). Rankings clearly identify the collective pool of votes they represent: this experiment on category boards, or included experiments on the overall board. Unvoted products are Unrated. Rated board items show an unobtrusive total-vote chip; unrated items have no chip. The /10 suffix stays hidden. Each anonymous browser has one active verdict per product per experiment; changing it replaces the prior vote. Skips do not affect scores.
- This release adds Channel3 live product lookup, enabled through production runtime switches; see [PRODUCT_LOOKUP.md](PRODUCT_LOOKUP.md) for provider setup, coverage, caching and verification. The existing local product lookup searches the full paginated sunscreen catalogs from 16 brand/retailer sources plus the worldwide sunscreen category in Open Beauty Facts. The checked-in fallback contains 2,201 listings, including 1,371 imported retailer listings from Ulta Beauty (423), YesStyle (217), Care to Beauty (485), Dermstore (224), and Soko Glam (22), alongside the existing brand feeds and Open Beauty Facts. New release listings are merged into the dedicated hosted catalog database record on initialization. Hosted suggestions return immediately from the saved catalog while an expired catalog refreshes in the background every 15 minutes; source outages retain prior listings. Matching handles accents, punctuation and spacing differences. Up to 20 suggestions appear, with source and available country labels. Retailer listings are saved import snapshots; the original brand/Open Beauty Facts feeds continue refreshing. Coverage is not exhaustive; missing products can still be nominated by name. YesStyle is partial after HTTP 429; Sephora and Olive Young blocked automated access; Target is not imported. Configurable Care to Beauty cards and unidentified Dermstore brands are excluded. Conservative matching preserves regional differences but differently named duplicates can remain. See [CATALOG_IMPORT.md](CATALOG_IMPORT.md) and [import report](data/retailer-import-report.json). Open Beauty Facts data is attributed under ODbL, with the derived extract available at `/catalogue/open-beauty-facts.json`; its contents are DbCL and images CC BY-SA 3.0.
- Selecting a local result saves its authoritative identity and source metadata. Live-provider selections save provider IDs and identity fields; their images are refreshed when displayed. Two distinct anonymous browsers nominating the same selection automatically add it to the board with **Community Nominated**. Products already on the board lead back to voting.
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

## Current documentation publication — November 3, 2026

Sites version 30 / `33c860ed30ecf63311a8a9b8dbf0dfb84fc406f3` is deployed; deployment `appgdep_6aea1d66e860819193ac5939e551e597` succeeded, environment revision 3. The Notion changelog and all 45 accessible Vouch pages were updated. Fresh publication checks: 71 automated tests passed, diff whitespace check passed, and public bottle configuration confirmed nine photographed products, open/unscheduled and excluded from overall. Production inbox/code sign-in and a real signed-in production photo upload remain unverified. Earlier verification reports and no-publication statements describe their historical tasks. See [version 30 notes](docs/releases/2026-11-03-v30.md). Local documentation changes have not been committed or pushed.

## Previously documented release — version 18 (historical)

Sites version 18 is live at https://v4ch.app/sunscreen, application source `964eed08e54bb59026daa81ac102e55ddd7f8713`, deployment `appgdep_6ae932bf595881919473372685607cfe`, environment revision 3. Release notes are in [docs/releases/2026-11-02-v18.md](docs/releases/2026-11-02-v18.md) and the canonical [Notion changelog](https://app.notion.com/p/40cd2a3caa8a812d83f4f3d13065be2d). At that verification, production assets matched source; account navigation works and email signup is configured without preview delivery. Actual inbox receipt/sign-in is pending owner testing.

### Community listings (November 5, 2026)
Qualified community nominations appear alongside the original lineup in score order, with matching rank, image, product name and score layout. A small Community Nominated chip sits beside the brand; direct voting remains available in one left-aligned row, including a compact outlined “I haven’t tried this” button. Voting buttons retain at least 44px touch targets. The overall board includes qualified nominations from organizer-included collections; reviewed name-only products remain separate per collection when no shared SKU exists.
