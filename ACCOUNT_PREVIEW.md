# Vouch accounts and product profiles — review preview

Implemented November 2, 2026. This work is a local review preview, not a production release. The inspected live Site remains version 13, source `a7606c2d5d4ff5624327c917aa9f62d0986d8329`; its deployment was confirmed succeeded before this work. No production data was read or changed for testing.

## Participant flow

Complete voting and optional nominations, preview a personal edit, then save it through email-code sign-in. Community results remain accessible without an account. After authentication, choose which browser responses belong to you, your display name, profile visibility, and each opinion's visibility. New profiles and opinions are private. Existing visibility is preserved unless explicitly changed. Profiles separate item vouches, passes, and trust in a brand. Skips and nominations do not become endorsements. One honest saved opinion, including a pass, earns the first-edit milestone.

`/account` is the owner's collection; `/account?experiment=sunscreen&review=1` reviews one experiment. `/profiles/:handle` shows only consenting public opinions when the profile is public. `/products/:id` lists public contributors by item endorsement, pass, and brand trust. Product counts are separate from anonymous experiment scores. Sign-in verifies email control, not identity, purchase, expertise, or product experience.

## Storage and ownership

The existing Cloudflare D1 `app_records` table is retained. New isolated `accounts-v1` and `account-auth-v1` records use the existing optimistic transaction adapter. Experiment JSON, nomination history, and exports retain their existing format; account claiming does not cast another vote or rewrite experiment data. No schema migration or production backfill is needed for this pilot.

Accounts maintain one current opinion per canonical product plus an append-only opinion history. A later experiment can replace an older opinion; editing the profile does not rewrite the historical experiment answer. Product identity uses saved stable product/SKU IDs. Name-only nominations without stable product identity are not merged into cross-experiment profiles. Catalogue aliases with different identifiers are not automatically inferred to be the same product.

Claim tickets cover an exact reviewed response snapshot and the cookie-owning browser, expire after thirty minutes, and support retry without duplicate history or milestones. Ownership prevents another account taking the same claimed contribution. Only a specifically answered product syncs from a subsequent vote on a claimed signed-in browser; unrelated anonymous history is never swept in. Private data is authorized server-side. The app rotates an owned browser identity when account identity is absent or changes, preserving historical records while isolating the next browser participant.

## Verification and limits

Automated domain and runtime tests cover email-code expiry/attempts/rate limits, session revocation, claims and duplicate retries, privacy, account switching, changed review snapshots, concurrent ownership, later votes, and existing experiment behavior. `node test/hosted-accounts-smoke.mjs` writes only an isolated local experiment against the Cloudflare/D1 preview, closes it afterward, and excludes it from overall results. Runtime and browser verification results are reported with the handoff.

This is a pilot storage design: all accounts share one optimistic JSON record, and authentication shares another. It requires normalization into indexed tables and load/abuse testing before a broad launch. Anonymous experiment scoring still deduplicates browsers rather than verified accounts; public product contributions deduplicate accounts. Privacy changes affect public contribution lists, not historical anonymous experiment aggregates.

Real email requires Resend sender-domain verification and server-side runtime configuration. See [AUTH_SETUP.md](AUTH_SETUP.md). The local test inbox demonstrates the complete flow without sending email. No real production inbox delivery has been verified. Following, feeds, notifications, advanced reputation, product-alias moderation, and account deletion/export interfaces are outside this first release.

### Completed verification on November 2

- 48 automated tests passed, including the complete file-runtime signup/claim/publication/returning-account flow and an eight-day simulated session expiry that preserves prior experiment rows.
- Local Vinext/Cloudflare D1 smoke passed: isolated experiment, three verdict types, email test inbox, private claim, one public opinion, signed-in vote synchronization, original response preservation, and logout isolation. Its verification experiment was closed and excluded from overall results.
- Browser review passed: voting through the summary, incorrect then correct code, review, private profile, public product exclusion, selective publication, and public profile. At 390px the collection had no horizontal overflow.
- The production build passed. Its local Worker returned account/product pages, reported email auth unavailable with no configured provider, and returned HTTP 503 without a preview code for signup.
- Diff whitespace checks and frontend syntax checks passed. No production publish or Notion release checkpoint update was performed.
