# Experiment management

## Current production — November 8, 2026, version 50

Sites version 50 is deployed at [Vouch](https://v4ch.app), source `cd5ba45f12d0fa29da0df441209efa6a0d05fb33`, deployment `appgdep_6af00aae41948191a294a21a3d8708d0`, environment revision 6. It succeeded on November 8, 2026 at 12:37 AM America/New_York. This documentation update covers deployed versions 42–50 since version 41.

All 188 automated tests and a fresh production build pass. Read-only production GET checks return 200 for the root, sunscreen, water bottles, admin login and health; anonymous inventory, suggestions and feedback return 401. Eight current admin assets exactly match source. No production records were changed during this documentation update. Lint was not rerun; version 41 recorded four errors and nine warnings, so this update makes no clean-lint claim.

Unattended research execution remains unverified; Sites currently lists no attached schedules. Source provenance does not establish endorsement accuracy or Google rank, and photos require visual review. Real production email-code inbox delivery, signed-in profile-photo upload, full screen-reader/physical-device accessibility, exhaustive matching and broad abuse/load tests remain outstanding. No new demand, retention, revenue or purchase outcome is established.

Release: [version 50](releases/2026-11-08-v50.md). Earlier dated checks retain their historical scope.

Experiment details now open Products, Settings and Participation, Missing Products, and Community Additions. Products supports name/URL/manual additions, photo URLs, reorder and removal with revision checks; removal preserves history and re-adding the same identity preserves its votes. Keep at least one product, at most 32, and one per brand. Live additions and reactivation require photos. Disable hides public access and overall participation while retaining data; Reactivate keeps the schedule. Permanent Delete requires the exact path and clears experiment activity and its associated suggestion, reserves the path, and retains shared products/personal opinions. Interrupted cleanup stays disabled for retry. Recoverable suggestion deletion is a separate action.

Hosted admin access now uses a server-configured four-digit PIN instead of the previous ChatGPT sign-in/email allowlist. Sessions last a fixed 24 hours; Lock admin revokes the session, and changing the PIN invalidates prior sessions. Cookies are Secure, HttpOnly and SameSite=Strict; only random-token hashes are stored. Five failed attempts per IP-derived bucket in 15 minutes trigger a temporary block. Admin writes require same origin. Participant email-code accounts remain separate.

---

Each experiment opens on Products, with separate Settings and Participation, Missing Products, and Community Additions tabs. Products shows the actual voting order, images, total votes, Vouch / Soft-Vouch / Pass counts, and score. Counts are experiment-specific active verdicts; skips are excluded. Browser identifiers and raw response records are not returned by the products endpoint.

Use the up/down actions to change the voting order. Remove takes a product out of the active lineup; historical votes and product metadata are retained for reporting. Adding the same product later keeps its existing votes. At least one product must remain, and the existing one-product-per-brand and 32-product limits apply. Updates carry a lineup revision so concurrent edits cannot silently overwrite another change.

Add a product supports catalog search, HTTPS product URLs, and manual details. Live additions require a photo. Set photo attaches an organizer photo URL; provider products retain their identity and rehydrate provider media unless an override is attached. Public HTTPS photos and existing bundled /assets images count toward photo readiness. A saved URL is not a guarantee of future availability or exact visual identity; inspect the image before publication. URL lookup depends on available catalog coverage; manual entry remains available when lookup fails.

The experiments table includes these actions:

- Disable takes the page and visitor experiment APIs offline (404), removes the experiment from the overall board, and keeps its products, votes, settings and participation. Organizer management stays available.
- Reactivate restores the page using its existing schedule and response settings. All products must have photos before reactivation. A closed or ended schedule stays closed or ended until changed in Settings and Participation.
- Delete asks the organizer to type the experiment path, then permanently removes the experiment, its experiment-specific votes, sessions, nominations and associated suggestion. A deletion marker prevents reuse/restoration of that exact path. Shared catalog products and users' personal account opinions are independent and are retained.

Deletion first makes the experiment unavailable, then clears related records and removes its admin row. If cleanup fails, the disabled row stays available; retry Delete to finish. Reactivation and product changes are blocked while deletion is pending. This is a recoverable multi-record process, not a cross-record transaction.

The default sunscreen experiment supports disable and permanent delete too. Empty registries remain empty after deletion; the client does not silently recreate the default experiment.

## Suggestion review

Refresh suggestions appears only on the Suggestions list. Individual suggestions retain Refresh research. Research already attempts catalog photo matching; Find missing photos retries photo matching for a completed private draft. Unresolved products stay private and can be given a photo URL manually. Provider matches retain catalog identities rather than short-lived image URLs.

Edit lineup supports search, product URLs, and manual additions before approval. The detail page shows the entire current lineup, including organizer additions. Every item, including manual additions, needs a photo before approval; the existing private research coverage checks still apply to products in the final lineup. This update does not automatically publish drafts or alter production experiment data during validation.

Validation: 172 automated tests pass, covering vote breakdown privacy, reorder/remove/add, concurrent lineup changes, photo gates, offline APIs, reactivation, permanent deletion, deletion retries, and draft photo matching. Local browser checks covered all four tabs, a catalog addition, reordering, confirmation dialogs, draft photo fields and refresh visibility. Third-party URL/lookup coverage varies. Full physical-phone and screen-reader testing remains outstanding.
