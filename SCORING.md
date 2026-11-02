# Vouch scoring — dynamic community model

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

All scores are computed from retained votes when read; no migration or vote reset is needed. Public vote counts and a /10 suffix remain hidden. A visible statement at the top of each rankings page explains that scores reflect the collective pool of community votes: the current experiment on category boards, or included experiments on the overall board. The board’s expandable explanation and prototype information describe the model.

Implementation: lib/vouch-api.mjs, shared voteScore function. Regression coverage: test/scoring.test.mjs plus server and experiment API tests.

Two brand vouches with no passes earn 8.3, equivalent to one item vouch. One brand vouch plus one pass earns 3.8, versus 5.0 for one item vouch plus one pass. Two hundred brand vouches reach the same evidence threshold as 100 item vouches. Skips and unknown values contribute no weight.
