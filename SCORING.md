# Vouch scoring — dynamic community model

## Current production — November 8, 2026, version 50

Sites version 50 is deployed at [Vouch](https://v4ch.app), source `cd5ba45f12d0fa29da0df441209efa6a0d05fb33`, deployment `appgdep_6af00aae41948191a294a21a3d8708d0`, environment revision 6. It succeeded on November 8, 2026 at 12:37 AM America/New_York. This documentation update covers deployed versions 42–50 since version 41.

All 188 automated tests and a fresh production build pass. Read-only production GET checks return 200 for the root, sunscreen, water bottles, admin login and health; anonymous inventory, suggestions and feedback return 401. Eight current admin assets exactly match source. No production records were changed during this documentation update. Lint was not rerun; version 41 recorded four errors and nine warnings, so this update makes no clean-lint claim.

Unattended research execution remains unverified; Sites currently lists no attached schedules. Source provenance does not establish endorsement accuracy or Google rank, and photos require visual review. Real production email-code inbox delivery, signed-in profile-photo upload, full screen-reader/physical-device accessibility, exhaustive matching and broad abuse/load tests remain outstanding. No new demand, retention, revenue or purchase outcome is established.

Release: [version 50](docs/releases/2026-11-08-v50.md). Existing formula and prior checks retain their scope.

The score formula is unchanged by versions 42–50. Product totals in the new Products tab are experiment-specific active verdicts without browser identifiers. Lineup changes retain historical votes, so record lineup revisions when comparing results. Disabled experiments are excluded from overall-board aggregation.

---

Founder approved November 1, 2026. This replaces the raw approval-percentage score across original products, community nominations and the overall leaderboard.

Updated November 2, 2026: item vouches (`yes`) carry weight 1; brand vouches (`brand`) carry weight 0.5; passes (`no`) carry weight 1. Brand trust is recorded against the displayed item only, never propagated across a brand. Existing `yes` votes retain full weight because their intent cannot be inferred retrospectively.

Weighted support = item vouches + 0.5 × brand vouches.

Score = 10 × (weighted support + 0.25) / (weighted support + passes + 0.5).

If there are fewer than 100 weighted verdicts, cap the result at 9.9 before rounding. Otherwise use the calculated result. Display one decimal place. A displayed 10.0 therefore requires at least 100 weighted verdicts and an adjusted score that rounds to 10.0 (at least 9.95).

| Item vouches | Passes | Displayed score |
| --- | --- | --- |
| 1 | 0 | 8.3 |
| 2 | 0 | 9.0 |
| 5 | 0 | 9.5 |
| 10 | 0 | 9.8 |
| 20 | 0 | 9.9 |
| 99 | 0 | 9.9 |
| 100 | 0 | 10.0 |
| 2 | 1 | 6.4 |
| 12 | 3 | 7.9 |
| 90 | 10 | 9.0 |
| 100 | 1 | 9.9 |
| 0 | 1 | 1.7 |

No valid verdicts returns null in the API and Unrated in the UI. Haven’t tried is excluded. A changed vote replaces the prior verdict; changing to Haven’t tried removes that browser’s previous contribution. The overall board first chooses each browser’s latest verdict per SKU across included experiments, then applies this same formula. The 100-weighted-verdict rule uses the sum of weights of those deduplicated verdicts per product, not visits or nominations.

The 0.25 / 0.5 adjustment is a light neutral prior: sparse unanimous votes approach the extremes as supporting evidence grows. Balanced votes stay at 5.0. This is a product scoring choice, not a statistically calibrated confidence estimate or a personalized fit score. Anonymous browsers are not verified people. Small samples can still move sharply. A new pass can lower a score, including a previously earned 10.0.

All scores are computed from retained votes when read; no migration or vote reset is needed. Updated November 5, 2026: a clickable total-vote chip appears beneath each rated score on collection, community-nominated and overall boards. The chip sums Yes (item vouch), Maybe (Soft-Vouch / brand trust) and Pass as unweighted active votes. Unrated items show no chip. The popover contains only “The community says,” the total number of votes, and the three Yes / Maybe / Pass counts. The visual chip is 16px tall with 9px type; the mobile hit area expands to 44px without enlarging the visible pill. Skips and invalid values are excluded; changed votes replace the old contribution. Overall counts use the same latest-per-browser, per-SKU deduplication as scores. Counts represent anonymous browser verdicts, not verified unique people, and expose no visitor identifiers. The /10 suffix remains hidden. A visible statement at the top of each rankings page explains that scores reflect the collective pool of community votes: the current experiment on category boards, or included experiments on the overall board. Prototype information and this document describe the model; the vote popover intentionally omits formula and explanatory copy.

Implementation: lib/vouch-api.mjs, shared voteScore function. Regression coverage: test/scoring.test.mjs plus server and experiment API tests.

Two brand vouches with no passes earn 8.3, equivalent to one item vouch. One brand vouch plus one pass earns 3.8, versus 5.0 for one item vouch plus one pass. Two hundred brand vouches reach the same evidence threshold as 100 item vouches. Skips and unknown values contribute no weight.
