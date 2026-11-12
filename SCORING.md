# Vouch scoring — community response average

## Historical deployment verification — November 8, 2026, version 50

Sites version 50 is deployed at [Vouch](https://v4ch.app), source `cd5ba45f12d0fa29da0df441209efa6a0d05fb33`, deployment `appgdep_6af00aae41948191a294a21a3d8708d0`, environment revision 6. It succeeded on November 8, 2026 at 12:37 AM America/New_York. This documentation update covers deployed versions 42–50 since version 41.

All 188 automated tests and a fresh production build pass. Read-only production GET checks return 200 for the root, sunscreen, water bottles, admin login and health; anonymous inventory, suggestions and feedback return 401. Eight current admin assets exactly match source. No production records were changed during this documentation update. Lint was not rerun; version 41 recorded four errors and nine warnings, so this update makes no clean-lint claim.

Unattended research execution remains unverified; Sites currently lists no attached schedules. Source provenance does not establish endorsement accuracy or Google rank, and photos require visual review. Real production email-code inbox delivery, signed-in profile-photo upload, full screen-reader/physical-device accessibility, exhaustive matching and broad abuse/load tests remain outstanding. No new demand, retention, revenue or purchase outcome is established.

Release: [version 50](docs/releases/2026-11-08-v50.md). Existing formula and prior checks retain their scope.

The score formula is unchanged by versions 42–50. Product totals in the new Products tab are experiment-specific active verdicts without browser identifiers. Lineup changes retain historical votes, so record lineup revisions when comparing results. Disabled experiments are excluded from overall-board aggregation.

---

## Current scoring model — approved November 11, 2026

Each active Vouch (`yes`) contributes 10 points, Soft-Vouch (`brand`) 7, and Pass (`no`) 0. Each is one response in the denominator. One neutral response worth 5 tempers sparse scores:

**Score = (10 × Vouches + 7 × Soft-Vouches + 5) / (Vouches + Soft-Vouches + Passes + 1)**

Display one decimal place with ordinary rounding; there is no separate 100-verdict threshold or 9.9 cap. A displayed 10.0 is rounded, not necessarily unanimous. No valid responses returns `null` in the API and Unrated in the UI. Haven’t tried (`skip`) and unknown values are excluded from both numerator and denominator.

| Vouches | Soft-Vouches | Passes | Score |
| --- | --- | --- | --- |
| 1 | 0 | 0 | 7.5 |
| 0 | 1 | 0 | 6.0 |
| 0 | 0 | 1 | 2.5 |
| 2 | 0 | 0 | 8.3 |
| 0 | 2 | 0 | 6.3 |
| 700 | 200 | 100 | 8.4 |
| 500 | 500 | 0 | 8.5 |
| 0 | 1000 | 0 | 7.0 |

Soft-Vouches alone approach 7. A Soft-Vouch can raise a score below 7 or lower a score above 7. Vouches never lower a score; Passes never raise one. Brand trust is recorded against the displayed item only and never propagated across the brand. Existing verdict meanings are preserved.

### Existing database records and score surfaces

D1 stores raw verdicts in `app_records`, not materialized community scores. All scores are computed when read using `voteScore` in `lib/vouch-api.mjs`. Deploying this model therefore recalculates all existing original-product, community-nominated, per-experiment, overall, organizer product-library, and public/private profile-history scores without rewriting records or resetting votes. Profile history shows the current community score in the originating experiment, rather than a score captured on the vouch date. Previously exported files remain historical snapshots.

Changed votes replace prior verdicts; changing to Haven’t tried removes the browser’s previous contribution. Overall and organizer aggregates retain their existing latest-per-browser, per-product deduplication and experiment inclusion rules before applying the formula. Vote totals and the Yes / Maybe / Pass breakdown remain raw counts; skips and invalid verdicts are excluded. Already-open pages receive new scores on their next data refresh.

### Meaning and limitations

The neutral response is a product scoring choice, not a calibrated confidence estimate or personalized fit score. Small samples can move sharply. Votes represent anonymous browsers, not verified unique people or verified product experience. A Pass does not establish firsthand use. Scores above 7 require item Vouches; a high score still needs the vote count for context.

The participant Prototype info explains the point values and neutral adjustment. Vote popovers retain their compact counts without formula copy, and the /10 suffix remains hidden.

### Previous model (historical)

Approved November 1 and amended November 2, 2026: weighted support was Vouches + 0.5 × Soft-Vouches; score was `10 × (support + 0.25) / (support + Passes + 0.5)`, capped at 9.9 below 100 weighted verdicts. That model treated Soft-Vouches as weaker positive evidence and allowed brand trust alone to approach 10. It is superseded by the November 11 model above. Prior release artifacts retain their original descriptions and verification scope.

Implementation: `lib/vouch-api.mjs`. Regression coverage: `test/scoring.test.mjs`, server persistence/API tests, experiments and profile-history tests.
