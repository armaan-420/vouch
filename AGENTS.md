# Vouch prototype — agent instructions

## Completed implementation tasks: sync and publish

Armaan requested automatic GitHub syncing and continued Sites/Cloudflare hosting on November 10, 2026. For user-requested implementation tasks, finish the cloud workflow without a separate routine publishing confirmation unless the user asks for local-only work, a draft, or no deployment.

- Preserve the existing public site at https://v4ch.app and its D1/R2 data. Use the Sites skill and the project ID in `.openai/hosting.json`; do not create a replacement Site or migrate providers.
- Inspect the working tree and include only intended project changes. Exclude credentials, runtime data and visitor records. Run appropriate checks before committing.
- Commit completed work and push it to `https://github.com/armaan-420/vouch.git` (`github` remote, `main`). The opt-in local `.githooks/post-commit` hook performs a normal push on main. Verify the remote SHA and retry a failed push after resolving the cause; never force-push or discard remote changes.
- For application changes, use the Sites source helper and native save/deploy tools to publish the exact checked source, then wait for a successful deployment and perform appropriate read-only verification. Sync any helper-created final commit to GitHub too. A GitHub push alone does not deploy Sites.
- Documentation, Git hooks and CI-only changes do not need a production redeployment. Keep Notion release notes on request only.
- These rules do not override the scheduled-review rules below. Reviews remain report-only and must not commit to main or trigger its sync hook. Use an isolated review branch for optional fixes.
- For a new clone, inspect existing hooks before enabling `git config --local core.hooksPath .githooks`. Local edits are not auto-committed; completed tasks must explicitly commit. If publishing is unavailable, report the exact incomplete step rather than claiming it went live.

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

## Daily category creation and completion tasks

Armaan explicitly authorized these two tasks on November 14, 2026. They are distinct from the report-only scheduled reviews above. Read `docs/daily-category-automation.md` on every run.

- **Create three Vouch category suggestions** (3 PM): use the connected Vouch tools to check inventory and today's Eastern-day batch, select genuinely new consumer-product categories, and create only missing daily slots. This task is authorized to write private suggestions and advance their research through the scoped Vouch tools.
- **Review daily research batch** (10 PM): read today's batch and advance existing recoverable research through `vouch_process_research`, at most twelve invocations. This task is authorized to advance saved private research; do not create more suggestions, reset failed jobs, override pauses or start new research revisions.
- Neither task may publish/approve categories, deploy, push source, change configuration, access secrets, or use a browser/production database as a fallback. If a required connected tool or organizer authorization is unavailable, report the exact blocker. Do not infer that local code is deployed.
- The server owns the three-per-Eastern-day cap. Failed, paused, deleted, or merged entries still consume their slots; report them rather than replacing them. Do not manufacture community support or invent products, sources, or completion.
- Keep the existing review automation rules unchanged for all other scheduled reviews.

## Useful commands

- Unit and integration tests: `npm test`
- Lint: `npm run lint`
- Production build: `npm run build`
- Local server on the normal `.data/`: `npm run dev:local`
- Isolated auto-experiments preview: `npm run preview:auto` (http://127.0.0.1:4188)
- Live health check: `GET https://v4ch.app/api/health`
