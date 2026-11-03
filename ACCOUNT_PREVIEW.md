# Vouch accounts and product profiles — implementation and verification

Initial implementation and local review: November 2, 2026. This document describes the current behavior and preserves the earlier verification history below. Production release status, exact source and deployment evidence are recorded in the canonical Notion changelog and repository docs/releases. Production release: Sites version 18, source `964eed08e54bb59026daa81ac102e55ddd7f8713`, deployment `appgdep_6ae932bf595881919473372685607cfe`, environment revision 3, succeeded on November 2, 2026. GitHub contains the exact application commit. The canonical Notion changelog and 13 related working/index pages were updated. Actual production inbox delivery/sign-in remains unverified; the owner deferred this check.

## Participant flow

Complete voting and optional nominations, then view the leaderboard. After a signed-out participant completes every selected product card and scrolls past the third ranked product, a voluntary “Save my picks” modal appears. The bottom-of-page invitation has been removed. Community results remain accessible without an account. After authentication, choose which browser responses belong to you, your display name, profile visibility, and each opinion's visibility. New profiles and opinions are private. Existing visibility is preserved unless explicitly changed. Profiles separate item vouches, passes, and trust in a brand. Skips and nominations do not become endorsements. One honest saved opinion, including a pass, earns the first-edit milestone.

`/account` is the owner's collection; `/account?experiment=sunscreen&review=1` reviews one experiment. `/profiles/:handle` shows only consenting public opinions when the profile is public. `/products/:id` lists public contributors by item endorsement, pass, and brand trust. Product counts are separate from anonymous experiment scores. Sign-in verifies email control, not identity, purchase, expertise, or product experience.

## Storage and ownership

The existing Cloudflare D1 `app_records` table is retained. New isolated `accounts-v1` and `account-auth-v1` records use the existing optimistic transaction adapter. Experiment JSON, nomination history, and exports retain their existing format; account claiming does not cast another vote or rewrite experiment data. No schema migration or production backfill is needed for this pilot.

Accounts maintain one current opinion per canonical product plus an append-only opinion history. A later experiment can replace an older opinion; editing the profile does not rewrite the historical experiment answer. Product identity uses saved stable product/SKU IDs. Name-only nominations without stable product identity are not merged into cross-experiment profiles. Catalogue aliases with different identifiers are not automatically inferred to be the same product.

Claim tickets cover an exact reviewed response snapshot and the cookie-owning browser, expire after thirty minutes, and support retry without duplicate history or milestones. Ownership prevents another account taking the same claimed contribution. Only a specifically answered product syncs from a subsequent vote on a claimed signed-in browser; unrelated anonymous history is never swept in. Private data is authorized server-side. The app rotates an owned browser identity when account identity is absent or changes, preserving historical records while isolating the next browser participant.

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
