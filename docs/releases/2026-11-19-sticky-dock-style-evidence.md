# Experiment Board sticky dock style review

Candidate `2f9053093fce926953d71a9ca4e698ebc984e4f1` was reviewed against Vouch Style Guide v1.2, canvas v21. Reviewed the Actions, Color, Type, Voting, Wharton and Next steps boards. Scope covers the everyday experiment Board and the Wharton pilot Board. The ranking and trust-disclosure text is unchanged.

| Width | Result |
| --- | --- |
| 390 and 700px | All six states fit. The first scroll reveals the dock. More opens a modal sheet and Escape returns focus. |
| 1050px | All six states fit. The dock is visible on load. More opens above the dock and Escape returns focus. |
| 360, 393, 430, 768, 1024 and 1280px | All six states fit without horizontal overflow or truncation. Footer clearance and ranking-to-vouch-card adjacency passed. |

The dock uses the existing light card surface, Ink and Muted text, DM Sans, Lime primary and olive focus outline. The two dock controls are 44px tall, More rows are at least 60px, and the fallback link field uses 16px input text. Verified focus return and the reduced-motion route in Chromium. The 393 × 852 layout uses 130px for the existing header and dock together. The contrast pairs follow the guide's Ink-on-Lime and Muted-on-light-card values.

All 400 tests and the Sites production build passed. Lint passed with 20 warnings and no errors. Pilot account states, sharing and suggestions used browser fixtures. Native sharing on a physical iPhone and signed-in production writes remain unverified.
