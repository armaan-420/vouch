# Vouch prototype — agent instructions

## Scheduled reviews

These rules apply to every scheduled or automated review run (code review, QA smoke, UX review, suggestions review, dependency audit). They also apply to any chat that invokes a `vouch-*-review` or `vouch-qa-smoke` skill.

- **Report, don't ship.** Never deploy, publish a Sites version, push to `main`, merge, run database migrations, or write to production.
- **The live site is read-only.** Against https://v4ch.app, use GET requests and page views only. Never create accounts, sign in, request email codes, vote, nominate, suggest a category, or submit feedback there.
- **Local writes stay local.** Write test records only against a loopback server (`127.0.0.1` / `localhost`) and only into ignored `.data/` paths.
- **No secrets or private data in reports.** Never print credentials, `.env*` / `.dev.vars*` values, cookies, emails, IPs, visitor records, or raw suggestion or feedback text that could identify a person.
- **Fixes are optional and isolated.** If a fix is small and obviously correct, put it on a branch named `review/<YYYY-MM-DD>-<slug>` with a test, and never merge it. Otherwise, describe the fix in the report.
- **Every finding needs evidence.** Give a severity (P0 broken/unsafe, P1 wrong for many users, P2 noticeable, P3 polish), evidence (file:line, command output, screenshot, or repro steps), and a one-line suggested fix. Cap each report at the skill's limit.
- **Respect settled decisions.** Read `/Users/armaannathani/Documents/Wharton/Fall '26/OIDD 6140/Vouch/Codex Reviews/DECISIONS.md` before suggesting product or UX changes. Never re-propose something listed there as rejected.
- **Release notes are not scheduled.** The Notion release-notes workflow runs only when Armaan asks. Scheduled runs must not touch `docs/release-notes-state.json`, the Notion changelog, or `Release Notes/`.

## Useful commands

- Unit and integration tests: `npm test`
- Lint: `npm run lint`
- Production build: `npm run build`
- Local server on the normal `.data/`: `npm run dev:local`
- Isolated auto-experiments preview: `npm run preview:auto` (http://127.0.0.1:4188)
- Live health check: `GET https://v4ch.app/api/health`
