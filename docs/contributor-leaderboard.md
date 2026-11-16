# Wharton contributor leaderboard

Implemented November 16, 2026 to reward recommendations shared. `/community-leaderboard` is separate from product boards; it is available in the shared menu and from the account profile. Public profiles remain accessible without a social connection.

## Rules

- All-time ranking of unique, current, public item vouches across Vouch by verified Wharton members. Negative ratings, brand trust, skips and private opinions do not count. Repeated vote events, categories and devices do not add credit for the same product. Canonical product identifiers are used where available; latest state wins when aliases collide.
- Participation requires explicit opt-in, verified exact-domain `wharton.upenn.edu` email, a named public profile and at least one public vouch. Existing public profiles are not enrolled automatically. Email verification establishes inbox control, not current enrollment or product expertise; alumni with an eligible inbox can participate. Changing to an ineligible email removes eligibility.
- Rank ties use competition ranking (1, 2, 2, 4), with handle ordering for stability. Pages contain 25 people; signed-in participants see their position even outside the page.
- Joining never changes profile or opinion visibility. Leaving retains public recommendations and removes leaderboard participation. Hiding a profile or its name immediately excludes it; eligibility and counts are recomputed on request with no shared caching. Opt-in preference persists through temporary ineligibility; restoring eligibility restores participation.
- Public profile and leaderboard use the same public recommendation selector. Badges distinguish verified affiliation, historical early-tester recognition, and the highest current public milestone (10 / 25 / 50). Milestones can decrease when recommendations change or become private. No expert designation is inferred from volume. Wharton verified badge appears only for opted-in verified members; early-tester recognition does not establish affiliation.

## Architecture and limits

The server computes eligibility, counts, badges and ranks from the account store. The public response contains only permitted profile fields and counts, plus the requesting viewer's participation state. Origin protection and existing sign-in apply to preference updates. The browser cannot supply rank, membership or count. Disabled/deleted accounts are excluded, and public profile/photo endpoints retain their existing controls.

The initial implementation reads the existing account document and sorts eligible people in memory. It introduces no database migration, new provider, friends/follow system or analytics service. Before expansion across communities, normalize/index membership and recommendations, define canonical product reconciliation across catalog aliases, and measure query latency. Pagination bounds response size but not the current full-store scan. No automated detection of dishonest endorsements or duplicate human identities is claimed; one verified account can still share inaccurate recommendations.

Future communities and an application-wide board remain ideas in the Notion enhancement backlog, not implemented features. Names and profile data are self-reported. Search-engine and browser caches outside the application cannot be recalled after prior public exposure.

## Validation

Unit/API tests cover opt-in, authentication/origin checks, output privacy, verified eligibility, hidden/deleted/disabled accounts, distinct current recommendations, changing visibility, matching profile counts, badges, ties, pagination and viewer position. Browser QA uses synthetic accounts in ignored loopback-only `.data/contributor-preview`; none are production users. Full test/build and browser outcomes are reported with delivery.
