# Vouch scoring — dynamic community model

Founder approved November 1, 2026. This replaces the raw approval-percentage score across original products, community nominations and the overall leaderboard.

Score = 10 × (vouches + 0.25) / (vouches + passes + 0.5).

If there are fewer than 100 valid verdicts, cap the result at 9.9 before rounding. Otherwise use the calculated result. Display one decimal place. A displayed 10.0 therefore requires at least 100 verdicts and an adjusted score that rounds to 10.0 (at least 9.95).

| Vouches | Passes | Displayed score |
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

No valid verdicts returns null in the API and Unrated in the UI. Haven’t tried is excluded. A changed vote replaces the prior verdict; changing to Haven’t tried removes that browser’s previous contribution. The overall board first chooses each browser’s latest verdict per SKU across included experiments, then applies this same formula. The 100-verdict rule uses those deduplicated verdicts per product, not visits or nominations.

The 0.25 / 0.5 adjustment is a light neutral prior: sparse unanimous votes approach the extremes as supporting evidence grows. Balanced votes stay at 5.0. This is a product scoring choice, not a statistically calibrated confidence estimate or a personalized fit score. Anonymous browsers are not verified people. Small samples can still move sharply. A new pass can lower a score, including a previously earned 10.0.

All scores are computed from retained votes when read; no migration or vote reset is needed. Public vote counts and a /10 suffix remain hidden. A visible statement at the top of each rankings page explains that scores reflect the collective pool of community votes: the current experiment on category boards, or included experiments on the overall board. The board’s expandable explanation and prototype information describe the model.

Implementation: lib/vouch-api.mjs, shared voteScore function. Regression coverage: test/scoring.test.mjs plus server and experiment API tests.
