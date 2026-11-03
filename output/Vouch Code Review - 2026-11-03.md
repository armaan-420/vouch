# Vouch code review — November 3, 2026

Reviewed application routes, APIs, account authentication/ownership, database and file stores, browser scripts, catalog ingestion/search, scoring, organizer controls, deployment configuration and the retained framework/UI scaffolding.

## Fixed

- Voting input was parsed with an unbounded request clone before normal validation. The application now uses the bounded JSON reader and shares its parsed result within that request; chunked oversized bodies are rejected with HTTP 413 before experiment writes.
- Authentication used shared-record transactions for repeated identity checks. Identity results are reused only within the request. Every new request still checks stored session validity. Activity timestamps update at most once per minute; the idle cutoff can occur up to a minute early, while absolute expiry and logout revocation are preserved. HMAC keys import lazily.
- Organizer tag seeding/read checks no longer run during public voting or schedule polling.
- Product search builds a reusable text/ID index per catalog revision. A local 240-query comparison across the 2,201-product bootstrap catalog retained identical results and measured approximately 3.07 ms/query before versus 0.21 ms/query after (about 15x less search CPU; not a network-latency claim).
- A transient catalog initialization failure no longer poisons the isolate's search promise permanently.
- Direct standings links now load saved nominations, preventing an apparently empty form from accidentally replacing existing selections.
- Account initialization resolves browser ownership before later account requests and avoids creating unused review tickets on ordinary collection visits.
- Standings images load lazily and decode asynchronously. The largest two PNGs were recompressed losslessly, with byte-for-byte equality of decoded pixels verified.
- Corrected two existing TypeScript failures: default storage label and email delivery option annotations.

## Validation

Automated tests, TypeScript, production dependency audit, local Cloudflare/D1 smoke tests and browser regression checks are recorded in the task handoff. Browser verified saved nomination chips after navigation directly to ?board=1. Local account smoke verified anonymous votes, code verification, private claiming, selective public opinions, synchronization and logout isolation. All runtime smoke writes were confined to local preview.

## Remaining limitations

- D1 stores each experiment and all account/auth data in large optimistic JSON records. The write reduction helps pilot traffic; indexed normalized tables are still needed for a large public launch.
- Large product photos could be reduced further with responsive dimensions or newer image formats. This pass preserves existing URLs and decoded pixels.
- Existing development-tool dependency findings require a separate compatibility upgrade; production dependency audit is recorded separately.
- Real production email delivery and inbox-code sign-in were not exercised in this review.

Concurrent water-bottle photo/backfill and copy updates were present during review; preserved and covered by the shared suite. Publication provenance is supplied by Sites after packaging. Release documentation checkpoints were not advanced: Notion publication was not requested in this task.
