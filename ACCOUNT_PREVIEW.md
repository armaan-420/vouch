# Vouch accounts and product profiles — implementation and verification

## Current email capture — November 11, 2026

The pre-rankings form requires name and email on submit, supports native autofill, and offers Skip for now without either field. It contains no Wharton badge invitation or claim that email is discarded. A matching Wharton address still earns the badge on rankings and the profile after submission.

The normalized email is now saved privately with the profile and shown only to its owner, including in Edit profile. It is excluded from public profiles, product contributors and photo responses. Later email-code sign-in can recover the same new browser profile from another browser after inbox verification. A matching unverified submission cannot overwrite or automatically attach to an established email account; ambiguous duplicate pending profiles require explicit browser ownership rather than an automatic merge. Existing account visibility settings are preserved. No verification code is required during the initial form submission, and no previously discarded email can be recovered retroactively.


## Initial attribution flow — November 11, 2026 (superseded email handling)

After all selected products and optional nominations, signed-out participants without a saved browser profile see “Who’s behind these vouches?” before rankings. The optional form uses native `autocomplete="name"` and `autocomplete="email"` inputs in an autofill-enabled form. Submit creates a browser profile without a password or email code; Skip for now goes directly to rankings and stays dismissed for that experiment. The old scroll-triggered Save my picks modal is no longer loaded. Existing participants with profiles proceed directly to rankings.

The form explicitly explains that names appear with item vouches by default. New browser profiles and item vouches are public; passes, brand-only trust and skips do not become public item endorsements. Existing profile and opinion privacy choices are preserved. Profile → Who sees your name opens a checked-by-default control in Edit profile. Turning it off renders public product contributions as Anonymous, removes their profile link and badge, and denies public profile/photo access; the owner still sees their own name. Per-product visibility remains separately available. Name privacy changes do not alter experiment votes or aggregate scores.

The form accepts ordinary email addresses and assigns Wharton early tester only to the exact, case-insensitive `wharton.upenn.edu` domain. No verification or results gate is introduced. The address is used in memory then discarded: this form stores no email address or email-derived identifier. The badge is early-participation recognition, not verified affiliation or expertise. It appears on the rankings banner, profile and named product contributions. Email account signup also carries this badge after its existing email-code flow; that separate sign-in system retains its existing hashed email identifier.

An HttpOnly, SameSite browser credential controls browser-profile edits. Signing out or clearing cookies removes access to that browser profile. If the participant subsequently signs in by email in the same browser, their browser profile and claimed opinions attach to that verified account without duplicate product contributors; existing account privacy wins when merging. Earlier private accounts remain private. No historical visitor records are migrated or republished.

Validation and deployment status are recorded in `docs/tester-attribution.md`. This section supersedes the historical signup-prompt flow below. Notion release notes and checkpoints remain unchanged.


Initial implementation and local review: November 2, 2026. This document describes the current behavior and preserves the earlier verification history below. Production release status, exact source and deployment evidence are recorded in the canonical Notion changelog and repository docs/releases. Earlier documented production release: Sites version 18, source `964eed08e54bb59026daa81ac102e55ddd7f8713`, deployment `appgdep_6ae932bf595881919473372685607cfe`, environment revision 3, succeeded on November 2, 2026. GitHub contains the exact application commit. The canonical Notion changelog and 13 related working/index pages were updated. Actual production inbox delivery/sign-in remains unverified; the owner deferred this check.

## Current documentation publication — November 3, 2026

Sites version 30 / `33c860ed30ecf63311a8a9b8dbf0dfb84fc406f3` is deployed; deployment `appgdep_6aea1d66e860819193ac5939e551e597` succeeded, environment revision 3. The Notion changelog and all 45 accessible Vouch pages were updated. Fresh publication checks: 71 automated tests passed, diff whitespace check passed, and public bottle configuration confirmed nine photographed products, open/unscheduled and excluded from overall. Production inbox/code sign-in and a real signed-in production photo upload remain unverified. Earlier verification reports and no-publication statements describe their historical tasks. See [version 30 notes](docs/releases/2026-11-03-v30.md). Local documentation changes have not been committed or pushed.

## Profile collection redesign

The signed-in collection and public profile lead with photo, name, join date and a short bio. Only item vouches appear in counts, category collages and history. Category tiles open a list; history uses the first item-vouch date and folds groups after the newest two. Owners edit identity in a full-screen mobile sheet or centred dialog, manage per-vouch visibility under “Who sees each vouch”, and manage passes and brand trust under “All your answers”. Existing review, sign-in, experiment voting and product contributor behavior remain available.

Photos accept JPG, PNG or WebP up to 5 MB in the browser, are centre-cropped and re-encoded to 400×400 PNG, and have ancillary metadata removed again on the server. The owner approved R2; the hosted `BUCKET` binding stores images and D1 stores only opaque references. Local Node development uses ignored `.data/profile-photos/`. Photo requests re-check profile visibility and owner access and use no-store responses. A photo and accompanying profile edits save together; Cancel discards unsaved drafts.

Public profile responses contain only public item vouches, published bio/photo and safe history metadata. Private profiles and private photos return 404 to other visitors. Profiles and new opinions still default to private. No migration is required for existing accounts.

Verification: 61 automated tests passed, the local Cloudflare/D1 runtime and accounts smoke checks passed, and a local D1/R2 upload/privacy/removal check passed. Browser review covered zero/new/established profiles; 320, 390, 768, 1024 and 1280px without horizontal overflow; mobile sheet and centred dialog; name validation, bio save/cancel, photo upload, public filtering, folded history, sticky sidebar, Escape and focus return. A synthetic JPG became a 400×400 PNG without EXIF. Production email delivery and a real signed-in production photo upload were not exercised. Failed-network recovery and a screen-reader audit were not tested in the browser. Golf and Travel were isolated local fixtures only. Notion release notes/checkpoints are unchanged; publication of release notes was outside this request.

## Signed-in experiment connection — November 3, 2026

An authenticated participant's new answer now saves directly to their private collection, including on a fresh browser and when the first answer creates the browser identity. No prior Save my picks claim is required for a new signed-in answer. Only that specific answer is copied; unrelated anonymous history still requires explicit review. Existing opinion visibility is preserved, and new opinions remain private even on a public profile. Account switching, revocation and expiry retain the browser-rotation protections.

The voting response reports whether the account connection saved. If profile storage fails after the experiment answer is recorded, the response returns a retryable error that distinguishes the two saves. Retrying the answer does not create a duplicate experiment vote. Standings confirm a signed-in save and link to the contextual collection. My collection links keep the current experiment.

The contextual collection checks for earlier experiment responses missing from its account snapshot and offers Review and save your picks. The existing exact-snapshot claim flow recovers those responses without changing or recasting experiment votes. Recovery requires the same browser's experiment cookie and account sign-in; it does not match anonymous visitors to an account by guesswork. The generic /account route cannot discover an unrelated browser's missed round.

Verification: 69 automated checks passed, including nine bottle products, mixed verdicts, new and returning accounts on new browsers, first-answer cookies, private-by-default additions to public profiles, no anonymous-history sweep, visible storage failure and idempotent retry, and recovery of a previously completed round. Local Cloudflare/D1 account smoke passed with all nine water bottle vouches. A local browser signed in before voting without first saving a claim, completed nine item vouches, opened the profile from standings, and retained all nine after reload. These are isolated test records, not changes to a real participant's votes.

## Scores in collection history — November 3, 2026

Each history row and category-detail row shows the current Vouch score for that canonical item in the experiment named in its history group. The server uses the same `voteScore` model as the standings, resolves community nominations by stable SKU, and reads each source experiment only once per profile response. This is the current community score, not a snapshot of the score on the vouch date. No-vote items show Unrated; unavailable source data shows a dash. Scores use one decimal and the standings color thresholds. Private and public profiles receive only the aggregate score; public responses continue omitting private experiment IDs, visitor records and raw votes. The original vouch date and existing account/profile visibility rules are unchanged.

## Participant flow

Complete voting and optional nominations, then view the leaderboard. After a signed-out participant completes every selected product card and scrolls past the third ranked product, a voluntary “Save my picks” modal appears. The bottom-of-page invitation has been removed. Community results remain accessible without an account. After authentication, choose which browser responses belong to you, your display name, profile visibility, and each opinion's visibility. New profiles and opinions are private. Existing visibility is preserved unless explicitly changed. The profile shows item vouches; passes and trust in a brand remain stored and manageable under All your answers. Skips and nominations do not become endorsements. One honest saved opinion, including a pass, earns the first-edit milestone.

`/account` is the owner's collection; `/account?experiment=sunscreen&review=1` reviews one experiment. `/profiles/:handle` shows only consenting public item vouches when the profile is public. `/products/:id` lists public contributors by item endorsement, pass, and brand trust. Product counts are separate from anonymous experiment scores. Sign-in verifies email control, not identity, purchase, expertise, or product experience.

## Storage and ownership

The existing Cloudflare D1 `app_records` table is retained. New isolated `accounts-v1` and `account-auth-v1` records use the existing optimistic transaction adapter. Experiment JSON, nomination history, and exports retain their existing format; account claiming does not cast another vote or rewrite experiment data. No schema migration or production backfill is needed for this pilot.

Accounts maintain one current opinion per canonical product plus an append-only opinion history. A later experiment can replace an older opinion; editing the profile does not rewrite the historical experiment answer. Product identity uses saved stable product/SKU IDs. Name-only nominations without stable product identity are not merged into cross-experiment profiles. Catalogue aliases with different identifiers are not automatically inferred to be the same product.

Claim tickets cover an exact reviewed response snapshot and the cookie-owning browser, expire after thirty minutes, and support retry without duplicate history or milestones. Ownership prevents another account taking the same claimed contribution. Only the specifically answered product syncs from a new signed-in vote, including on an unclaimed browser; unrelated anonymous history is never swept in. Private data is authorized server-side. The app rotates an owned browser identity when account identity is absent or changes, preserving historical records while isolating the next browser participant.

## Verification and limits

Automated domain and runtime tests cover email-code expiry/attempts/rate limits, session revocation, claims and duplicate retries, privacy, account switching, changed review snapshots, concurrent ownership, later votes, and existing experiment behavior. `node test/hosted-accounts-smoke.mjs` writes only an isolated local experiment against the Cloudflare/D1 preview, closes it afterward, and excludes it from overall results. Runtime and browser verification results are reported with the handoff.

This is a pilot storage design: all accounts share one optimistic JSON record, and authentication shares another. It requires normalization into indexed tables and load/abuse testing before a broad launch. Anonymous experiment scoring still deduplicates browsers rather than verified accounts; public product contributions deduplicate accounts. Privacy changes affect public contribution lists, not historical anonymous experiment aggregates.

Real email requires Resend sender-domain verification and server-side runtime configuration. See [AUTH_SETUP.md](AUTH_SETUP.md). The local test inbox demonstrates the complete flow without sending email. No real production inbox delivery has been verified. Following, feeds, notifications, advanced reputation, product-alias moderation, and account deletion/export interfaces are outside this first release.

### Initial local verification on November 2 — historical

- 48 automated tests passed, including the complete file-runtime signup/claim/publication/returning-account flow and an eight-day simulated session expiry that preserves prior experiment rows.
- Local Vinext/Cloudflare D1 smoke passed: isolated experiment, three verdict types, email test inbox, private claim, one public opinion, signed-in vote synchronization, original response preservation, and logout isolation. Its verification experiment was closed and excluded from overall results.
- Browser review passed: voting through the summary, incorrect then correct code, review, private profile, public product exclusion, selective publication, and public profile. At 390px the collection had no horizontal overflow.
- The production build passed. Its local Worker returned account/product pages, reported email auth unavailable with no configured provider, and returned HTTP 503 without a preview code for signup.
- Diff whitespace checks and frontend syntax checks passed. No production publish or Notion release checkpoint update was performed.

### Email service configuration — November 2 — historical setup

Namecheap DNS records were added with owner confirmation, and Resend verified `auth.v4ch.app` for sending. Receiving remains disabled. The owner created a sending-only API key restricted to that domain. Sites environment revision 3 now holds `RESEND_API_KEY` and `VOUCH_AUTH_SECRET` as secrets plus `VOUCH_EMAIL_FROM` set to `Vouch <signin@auth.v4ch.app>`. The existing organizer allowlist is preserved. These are staged runtime settings: no production deployment or real inbox delivery test was performed. The local preview still uses its labeled test inbox. No credentials are included in source or documentation.

### Standings presentation refinement

The standings header shows Create Account for anonymous visitors and My Account for authenticated visitors. During an active scheduled experiment, the title is followed by remaining time in the top bar; unscheduled, upcoming, ended, and manually closed experiments show no countdown. The standings score guide and standalone schedule block were removed. Product images, brands, and titles link directly to their contributor page, with participant actions left-aligned. Numeric score colors are green at 8.0 and above, black from 6.5 to 7.9, yellow from 5.0 to 6.4, and red below 5.0; unrated entries stay neutral. Verified both account states, active/unscheduled headers, product navigation, score boundaries, and a 390px mobile header with no overflow. These refinements are part of the current release source.

### Save my picks invitation

The modal appears only for completed experiments and signed-out participants after meaningful standings scrolling; smaller boards trigger after the last product is viewed and the user scrolls. It appears once per experiment per tab visit (sessionStorage), stays dismissed on reload, and never gates results. Keep exploring, the close button, Escape, and the backdrop dismiss it without changing scroll position. Email/code verification happens inside the modal, then returns to explicit private picks review. Product history is the immediate benefit; suggestions, trusted-contributor recognition, and discounts are labeled upcoming under More reasons to join Vouch. The signup and confirmation language now says picks rather than edit. Local email continues using a labeled test inbox.

Verified the invitation in the local browser: no immediate prompt on results, no prompt before all cards are answered, prompt after scrolling beyond the third row, signed-in suppression, exact scroll restoration on dismissal, no second prompt during the visit, inline email-code signup, incorrect-code recovery, private review, and “Your picks are saved” confirmation. At 390px, neither the page nor modal has horizontal overflow. The production build includes the new prompt script and passed. No production deployment or real email was sent for these checks.
