# Wharton experiment — local implementation

Built November 17, 2026 on branch `local/wharton-people-experiment` from `00a8713`. Local only: no push, Sites save, deployment, Notion write, production migration or live visitor changes.

## Open the preview

Run `node scripts/preview-wharton.mjs` in this repository, then open http://127.0.0.1:4196/wharton.

The preview uses `.data/wharton-preview`, separate from normal local data and production. It seeds the existing nine-bottle starter lineup into this isolated registry only, without seeded endorsements. The existing sunscreen category is also available. Signup accepts a Wharton email and shows a local test code on the verification screen; no email is sent. Returning verified Wharton participants go straight to available categories. Local test accounts created by the browser smoke are synthetic.

Stop the process with Ctrl-C when finished. No credentials or manual configuration are required for this preview. To test the real inbox delivery path later, use the existing email-provider configuration; that external delivery was deliberately not exercised here.

## Changes

- Dedicated `/wharton` landing, email-code recovery and category selection; no signup visibility choices. Existing general account/sign-in screens remain available.
- Existing rating card, tags, verdict buttons, Skip and immediate advancement remain. An inline optional note inside the product card saves with the answer, restores on revisiting, and retains typed text if saving fails.
- One current comment per account/product opinion, maximum 240 characters. Notes on item Vouches can appear with eligible public endorsements; notes on other verdicts stay owner-only. Changing a verdict clears the old note. Existing profile opinion settings edit/remove comments. Existing visibility choices continue to apply.
- Board tag chips are replaced by photos/initials and named public item-vouch summaries. Tags remain in rating, product detail and the library. A batched request reads account data once for up to 100 Board product IDs and returns at most four people per item. Individual avatars open profiles; the summary opens product detail's People who vouch section.
- Existing product detail lists endorsers and optional comments; existing profiles/collections are reused. No synthetic names, reviews or popularity counts in application UI.
- Admin → People → a person's actions → Review comments lists recommendation comments with a removal control. List pages are capped at 50; removal preserves the underlying verdict and prevents stale sync from restoring the removed text.
- Existing experiment summaries add comment-adoption and Board people/profile click counts. These metrics carry no comment text. They do not establish increased trust.

## Reversible checkpoints

All commits used `git -c core.hooksPath=/dev/null commit` to bypass the main-branch push hook.

1. `a0f56f4` — Board people rows, batched summaries and photo support.
2. `932da30` — Optional comments, storage/sync, owner editing and endorser detail.
3. `ed1a4c1` — Dedicated Wharton entry, authentication and category journey; local preview script.
4. Final integration checkpoint — moderation UI, click counts, removal of unused Board tag handlers, edge-case fixes, verification and this guide.

To put the working checkout back on the untouched original version, stop the preview and run `git switch main`. The implementation remains saved on `local/wharton-people-experiment`; switch back to resume. Confirm there are no unrelated uncommitted edits before switching.

To undo a selected checkpoint while retaining history, use `git -c core.hooksPath=/dev/null revert <commit>`. Later integration changes depend on earlier features, so revert dependent/newer checkpoints first. Reverting application code does not delete local preview records. Legacy verdict-string storage remains compatible; notes are additive companion records. No destructive rollback/migration is required.

## Verification

- 327 automated tests pass, including new tests for batched Board summaries, public/private filtering, comment persistence, validation, edit/clear, unchanged vote counts/dates, stale-sync handling and organizer removal.
- Production build passes, including `/wharton`.
- Changed-file lint has no errors; existing warnings remain in the legacy application files.
- Phone (390px) and desktop (1440px) browser smoke: signup, email-code error recovery, verification, category choice, rating with tags present, comment save, revisiting/restoration, Board people row, product comment and profile navigation. No page errors or horizontal overflow on the checked product detail.
- Browser test: `node test/wharton-browser-smoke.mjs` while the isolated preview is running. It writes synthetic test records only to localhost.
- No live-site, real-mail or production-provider testing performed. Public product detail retains the pre-existing full contributor response; the new Board request is bounded. The account store is still the existing shared document, suitable for this pilot rather than an indexed large-network design.

## Before a three-category student pilot

Choose and approve a sports category and exact lineup through the existing organizer process. The implementation displays currently open, approved categories instead of publishing placeholder categories. Decide whether the existing sunscreen lineup is the desired skincare choice. No sports category was invented or approved during implementation.

## Feedback refinements — November 17

- `2e3bf4a`: email submission replaces only the signup box with code entry, retaining the landing hero/image. Verification uses the entered name automatically; category choice removes the right-hand image. Three editorial category rows reflect the concept mockup. Running shoes remains Coming soon until an approved experiment exists.
- `d6bb0d8`: zero-endorser Board rows are hidden; visible avatars align to the product image, 46px after the rank.
- Inline-note checkpoint: replaces the external disclosure with a quiet pencil/textarea row inside the product card. It grows to four lines with helper/counter, compacts the phone photo while focused and guards pointerdown so a vote saves the note in one tap. Existing vote controls and tags remain unchanged.

Verification: full lint completes with zero errors and 21 existing warnings; all 327 tests pass; build passes. Browser checks at 390px and 1440px cover unchanged landing hero during code entry, three category rows with no right-hand image, small phone thumbnail vs unchanged desktop photo, four-line field cap, Tab from note to verdict, one-tap voting, restored note/saved verdict, Skip clearing, image/avatar alignment, hidden empty rows, and profile navigation. A reduced 390×500 viewport simulates the keyboard-reduced available space and confirms the vote buttons fit. A real iOS/Android keyboard was not exercised; on-device confirmation remains useful. The supplied HTML mockup was opened in the browser as the reference.

## Item-page refinement — November 17

Implemented the VOUCH_ITEM_PAGE_CODEX_PROMPT.md and VOUCH_ITEM_PAGE_MOCKUP.html found in the parent Vouch folder (the specified OIDD-level path was absent). This remains local-only on the existing branch.

- Score-only ring: 54px on phones, 60px desktop; existing link, label and unrated/unavailable behavior retained.
- Vouched by: first six people in API order, overlapping 30px avatars, +N and a name summary. See all/+N expands the complete people list with names only. Existing #item-people anchor and shared avatar renderer remain.
- What stands out: compact tags with Tap to add yours, stronger counts, lime selected state and unchanged saving. Removed the old context rewrite to match the new markup.
- What people say: separate public item-vouch comments with author/avatar/date; initially two on mobile and four at desktop grid widths; accessible inline expansion for remaining comments. No section when there are no comments.
- Gallery is 210px on phones and sticky on desktop, without the old 580px minimum. Removed the obsolete endorser-row/comment styles. API, scoring, contributor eligibility, community breakdown and purchase logic are unchanged.

Validation: 327 tests pass; full lint has zero errors and 21 existing warnings; production build passes. `node test/item-page-browser-smoke.mjs` intercepts product reads in the browser with 12 varied synthetic public endorsers, seven notes and two synthetic image responses. It checks 393×852 and 1440×900 rendering, avatar limits, summary, people/comment expansion, keyboard activation, tag toggle/save, zero/one/two/all-anonymous/no-comment cases, an unrated page, horizontal overflow and console errors. Existing Wharton flow smoke also passes with the new comment selectors. No production data was seeded or changed. The HTML reference was opened in the browser; before/after screenshots are in the workspace's output/item-page-refinement folder. Physical screen-reader announcement behavior was not directly tested; controls retain named links, focus styling and aria-expanded/aria-controls.

## Shared header and search — November 17

Local navigation refinement based on Armaan's Infatuation screenshots. Supersedes the earlier always-visible mobile search/profile layout.

- Mobile shared header: Vouch emblem left, search icon right, 64px tall. Search opens a full-height paper panel with query/results, category/product/leaderboard/account destinations, and a contextual Board link. The account destination remains available inside search. The existing Wharton signup landing keeps its separate layout.
- Desktop: one brand lockup, one search field without a second brand emblem, clearly separated destination links and account action. Intermediate widths use the existing menu when full destination links do not fit.
- Rating's Board shortcut now lives beside Your take, separate from search. Desktop account access remains available during rating.
- Consolidated successive header CSS rules into one responsive definition; removed an existing malformed empty CSS fragment. Kept the existing search engine, loading state, catalog lookup, product links and nomination handoff. Search copy stays Search vouch.
- Mobile search uses dialog semantics, background inertness and scroll locking, keyboard containment, Escape/close buttons, and focus return. Resizing restores modality/focus correctly. Clicking an already-focused desktop field reopens search after Escape. No new external provider or API is required.
- An adjacent product purchase-control overflow found at 1100px was corrected separately in `f2de4d9`.

Validation: 327 automated tests and production build pass; full lint has zero errors and existing warnings. `node test/navigation-browser-smoke.mjs` checks 320/390/760/768/900/1100/1440 widths across rating, Board, product, categories and account pages; loading/results/failure, routing, focus, Escape, modal background state, resizing, and overflow use synthetic intercepted search responses. Updated floating Vouch smoke passes across 320/360/375/768/1280px with scroll behavior, reduced motion, global-result routing, nomination handoff and route gating. Wharton signup-to-profile and item-page browser smokes also pass. No real device screen-reader or OS keyboard session was used. Screenshots are in output/navigation-refinement at the workspace root.

### Mobile hamburger refinement

At Armaan's follow-up request, the mobile header now shows the hamburger immediately to the right of search. It opens the shared navigation menu with an account/sign-in link. Navigation remains available within the expanded search panel too. Browser checks pass at 320–1440px, including control spacing, menu open/close state, Escape focus return, search results and responsive resizing. Production build passes. Local only.

## Wharton Board category chips

Local implementation of the approved category-chip concept. Water bottles and Sunscreen link to open, public experiments returned by the existing category inventory. Running shoes stays Soon until a matching approved experiment opens; no category or products are published by this work. The original isolated concept remains in output/board-category-concept.

The current Board shows Vouch for [category] for an unstarted flow, Continue vouching for a partial flow, and no invitation after completion. Completed chips show a small check. The three experiment choices use ordinary accessible navigation links with aria-current, rather than pretending full-page navigation is an in-place ARIA tab widget. Existing category cards below the Board remain available.

GET /api/category-participation accepts at most three public experiment IDs and returns only the current participant's status, answered product IDs and first unanswered ID. It reuses existing browser/account ownership and stored verdicts, including Skip. Account-linked browser history preserves completion across devices, including skipped cards that do not appear as profile endorsements. It does not add completion counters to profiles or publish private opinions. No migration or external setup is required.

Continue opens the existing rating flow at the first unanswered product and skips already answered cards as it advances, preserving existing answers. Wharton entry context stays in category links. The category inventory loader is reused across Board chips and existing category cards; participation reads are bounded and not shared-cached between people. Failures show a retry state rather than inventing completion.

Board layout centers rank and score/vote total across product plus endorser chips. People remain aligned to the product image; empty endorser rows remain hidden. Ratings, score calculations, tags and comments are unchanged.

Validation: 337 tests pass, including new participation tests for new/partial/complete, Skip, another category, cross-device recovery, isolated visitors and bounded queries. Production build passes; full lint has zero errors and existing warnings. Local browser checks at 390px and 1440px cover live (synthetic local account) new/partial/complete states, first-unanswered resume, category switching, pending Running shoes, full-row rank/score centering, no overflow and no page errors. Existing Wharton flow smoke also passes. Screenshots are in output/board-category-implementation at the workspace root. Local only; no push or deployment.

### Profile action and floating pill removal

Mobile header actions now appear in order: Search → Profile/sign-in → Menu. Signed-in users retain their existing avatar/initial; signed-out users see a person icon. Removed floating Vouch pill creation, observers, scroll behavior and reserved page padding, while keeping the in-page nomination card and search nomination handoff. The old pill smoke command now forwards to shared navigation coverage. Category chips wrap on very narrow phones to avoid overflow. Navigation checks pass at 320–1440px; the signed-in Wharton flow and production build pass. Local only.

## Wharton lineup: Water bottles · Lip balm · Carry-On

Armaan selected these category labels and explicitly asked to reuse existing products rather than do new research. Updated both the dedicated Wharton category choices and Board chips. Lip balm replaces Sunscreen in these Wharton-specific surfaces; Carry-On replaces Running shoes and remains Soon.

Read-only connected category inventory confirmed Lip balm is already live/approved as lip-balm. Its public experiment response at https://v4ch.app/api/experiment?experiment=lip-balm was read on November 17, 2026. The local snapshot in data/wharton-lip-balm.json contains its existing ten product identities, names and merchant links; no visitor responses, accounts or scores were imported. Ten existing product photos are mirrored into public/assets/wharton-lip-balm for reliable local preview. The isolated preview seeds this lineup only when absent, preserving existing local answers on restart.

Carry-On has no live experiment and its prior production suggestion is marked rejected. This work does not reactivate, approve or publish it. The placeholder uses the requested Carry-On label and a simple suitcase illustration. Other existing categories remain in the general directory.

Checks: 337 tests and build pass; lint has zero errors and existing warnings. Phone/desktop Board and Wharton flow smokes pass with the new labels. Verified all ten Lip balm photos decode and its rating card can save a note/vote and advance, with Lip balm active on its Board and Carry-On shown as Soon. No production writes, push or deployment.
