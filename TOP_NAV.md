# Shared public top navigation

## Current production — November 8, 2026, version 50

Sites version 50 is deployed at [Vouch](https://v4ch.app), source `cd5ba45f12d0fa29da0df441209efa6a0d05fb33`, deployment `appgdep_6af00aae41948191a294a21a3d8708d0`, environment revision 6. It succeeded on November 8, 2026 at 12:37 AM America/New_York. This documentation update covers deployed versions 42–50 since version 41.

All 188 automated tests and a fresh production build pass. Read-only production GET checks return 200 for the root, sunscreen, water bottles, admin login and health; anonymous inventory, suggestions and feedback return 401. Eight current admin assets exactly match source. No production records were changed during this documentation update. Lint was not rerun; version 41 recorded four errors and nine warnings, so this update makes no clean-lint claim.

Unattended research execution remains unverified; Sites currently lists no attached schedules. Source provenance does not establish endorsement accuracy or Google rank, and photos require visual review. Real production email-code inbox delivery, signed-in profile-photo upload, full screen-reader/physical-device accessibility, exhaustive matching and broad abuse/load tests remain outstanding. No new demand, retention, revenue or purchase outcome is established.

Release: [version 50](docs/releases/2026-11-08-v50.md). Earlier dated checks retain their historical scope.

Shared public navigation and feedback are deployed. Organizer routes now use PIN sessions. Suggestion review now has Product lineup, Research & sources, and Details & history tabs. Photo cards show missing images and researched-model differences; channel cards expose accepted coverage, source limitations and expandable evidence. Selected tabs and reading sections survive polling. List rows use Review; refresh/reject/delete live under More actions. Find missing photos reports progress and Add photo focuses the URL field. Admin product fields retain the corrected layout.

---

Implemented from `../VOUCH_TOP_NAV_CODEX_PROMPT.md` and the browser-rendered `../VOUCH_TOP_NAV_MOCKUP.html`. See the latest release notes for production source/version and verification status.

## Navigation

At every width, Edit pages show the wordmark, search icon, green Sign in pill or current profile avatar, and hamburger menu. Category suggestions and feedback live in the menu. Account, public product/profile pages and the home teaser hide product search. The home teaser retains its Coming soon status and has no inline suggestion card.

The dropdown contains Suggest a category, Give feedback, The board and Your collection. Non-Edit pages omit search and The board. Opening the menu locks body scroll; Escape, an outside tap or a selection closes it. Keyboard focus stays in the expanded header and returns to its toggle on dismissal.

Search replaces the bar with a full-width input and Close search button. Escape or close returns focus to the search toggle. Results use the shared product picker, with arrows/Enter/Escape, a 250ms debounce, cancellation of stale requests and explicit loading/empty/error text. Search remains scoped to the loaded Edit. Known categories get a plural product noun; unknown categories fall back to products when necessary.

On-board results use the existing product-page path builder. Other results open the existing nomination flow with the actual catalog product selected and its query preserved, without automatically saving a nomination. No-match results offer nomination by name. Closed/upcoming Edits explain that nominations are paused. Private drafts hide search navigation and both category triggers; their mobile Board link preserves the organizer preview parameter.

Voting keeps the original account-action switch to The Board. On phones its search and menu are hidden for the minimal rating header. Countdowns retain their existing logic; they stay next to/under the wordmark on desktop and are hidden on mobile.

The existing suggestion dialog is reused, with its submit/reset label changed to Suggest a category. Its established success banner and inline acknowledgement are retained. The mobile menu closes before opening that dialog, and focus returns to the menu toggle.

## Private feedback

Feedback opens a native dialog with a required 5–1000 character message and optional reply email. Submission sends the current pathname and, on an Edit, its ID. Success reads “Thanks — we read every note.” It sends no email or notification.

`POST /api/feedback` uses the existing record store, JSON-only requests, a 4096-byte body limit, same-origin/cross-site checks, a protected browser cookie and five submissions per browser per rolling day. Fields are trimmed/limited and email/path/ID values are validated. Entries contain ID, message, email, path, experiment ID, visitor key, creation time and new/read status. Public responses acknowledge only success and never echo saved content.

`GET /api/admin/feedback` and `POST /api/admin/feedback/status` require organizer authorization. The organizer's new Feedback tab lists entries newest first, supports detail links and Mark read, and omits visitor keys from responses. Feedback text and email addresses are never logged or included in public data responses. As with other browser-based limits, clearing cookies or using another browser can bypass the per-browser quota.

## Files

| File | Change |
| --- | --- |
| `lib/{experiment-page,account-page,home-page}.html` | Shared header structure, inline SVGs, script loading and home teaser status. |
| `public/site-nav.js` | Responsive navigation, focus/scroll handling, search and feedback dialog. |
| `public/style.css` | Replaced retired public-header rules with one shared navigation component; feedback styling and touch targets. |
| `public/suggestions.js` | Category label and submit/reset naming. |
| `public/product-picker.js` | Optional navigation mode using existing result rendering, without catalog tools or focus stealing on selection. Existing nomination/admin defaults remain unchanged. |
| `public/app.js` | Shared nav context, draft trigger handling, current account/voting state and nomination handoff. |
| `public/accounts.js`, `public/accounts.css` | Refresh the avatar after profile/auth changes; retain the shared header on mobile profiles and remove the duplicate mobile wordmark. |
| `lib/feedback-api.mjs`, `lib/application-api.mjs` | Private feedback storage/API and application dispatch. |
| `lib/admin-page.html`, `public/admin-navigation.js`, `public/admin-feedback.js`, `public/admin.css` | Organizer Feedback table, detail and mark-read action. |
| `test/feedback.test.mjs` | Feedback validation, size/content-type/origin checks, rolling limits, private acknowledgement, organizer authorization, ordering and read status. |

## Verification

- Baseline: 149 tests. Final: 156 passing tests. Production build passes.
- Lint was run before and after: the same four pre-existing `no-explicit-any` errors in `lib/d1-store.ts` and nine existing warnings remain. No new lint findings were introduced.
- `/sunscreen`: 1280, 768, 375, 360 and 320px, without header overlap or horizontal overflow.
- `/account`: 1280 and 375px. Home: 375px. Signed-in private profile: 375px, shared header visible and initial avatar shown.
- Browser interactions: menu open/close and outside tap, scroll lock and focus return; suggestion from the mobile menu and successful submission; mobile search open/close/Escape; keyboard selection of an on-board product; pointer selection of an off-board product into a prefilled nomination; loading and no-match states; draft suppression; voting's The Board link and minimal mobile bar.
- Feedback submission, private organizer readback and Mark read were exercised in a separate temporary QA dataset using a clearly labeled synthetic note and email. Local test-inbox sign-in and private profile creation verified the avatar without sending email. The regular preview's account records were not used for this QA sign-in.
- Screenshots in `output/`: desktop, mobile closed, mobile menu and mobile search states.

Physical iPhone/touch-keyboard behavior, a full screen-reader audit, an actual uploaded-photo avatar, live-provider outages and hosted feedback persistence remain unverified. Saved local catalog search was exercised; this work does not expand catalog coverage. Feedback is stored in the existing application-record store and adds no new service, key, email delivery or database migration.
