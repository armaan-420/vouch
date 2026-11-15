# Daily category suggestions

## Purpose and current activation status

Armaan authorized daily creation of three private product-category suggestions on November 14, 2026. Existing local Codex tasks are active at 3 PM and 10 PM. They use this repository; their schedules have not been changed. These are local execution tasks, so their availability depends on the configured computer and Codex scheduler, independently of Vouch's hosted background research.

The daily-batch implementation is prepared locally. Deployment and a real production batch have **not** been verified. Do not describe this as live until the Sites source workflow succeeds, the new tools appear in the connected Vouch plugin, and an authenticated batch is tested. Existing research-processing tools alone cannot create suggestions.

## Creation task: Create three Vouch category suggestions

1. Call `vouch_daily_batch_status` with no arguments. The server resolves today in America/New_York. If three entries already exist, report them and do not create more.
2. Call `vouch_category_inventory`. Check all live, draft and historical suggestion names, including canonical names. Do not repeat rejected/deleted categories or use cosmetic rewordings of an existing category.
3. Select distinct consumer-product categories suited to comparisons with at least five plausible brands. Prefer concrete product types with meaningful price/features/use-case differences. Avoid brand names, services, broad departments, duplicates and unsuitable categories. Product viability is a research hypothesis, not an assertion of verified availability.
4. Call `vouch_create_daily_suggestions` with `{"categories":["First category","Second category","Third category"]}`. One to twelve preference-ordered candidates are accepted; at most the unused slots out of three are created. Names must be 2–60 characters. If duplicates leave unused slots, inspect the updated inventory and supply different candidates in at most two more calls.
5. Call `vouch_process_research` to kick off queued work if necessary. Research continues through the existing hosted runner. Do not wait indefinitely or reset work to manufacture completion.
6. Read `vouch_daily_batch_status` again. Report date, categories, review links, suggestions created versus completed drafts, paused/failed states and remaining slots. A queued suggestion is not a completed draft.

If a tool or organizer authorization is unavailable, stop production actions and report that exact blocker. Never retrieve credentials, write directly to D1, sign in through the browser, or substitute public form submissions.

## Evening task: Review daily research batch

1. Read `vouch_daily_batch_status` with no arguments and `vouch_research_status`.
2. If today's batch has unpaused queued/researching/matching work, call `vouch_process_research`, then reread batch status. Stop once today's work is finished/paused/failed, the processor makes no progress, or twelve processor invocations have been made. Each call advances the shared queue fairly; unrelated jobs can also progress.
3. Do not submit new categories, replace failed entries, override pauses, refresh research, retry terminal failures or publish anything. Transient recoverable work is handled by the existing runner; terminal failures require organizer attention.
4. Report the created count, completed-draft count, each category's state/review link, and failures, pauses, missing photos/products or work still running. Zero created means the creation task did not establish a batch; it does not mean the day succeeded.

For an explicit historical check, `vouch_daily_batch_status` accepts `{"date":"YYYY-MM-DD"}`. Creation always targets the server's current Eastern date and cannot backfill arbitrary days.

## Server behavior

- `vouch_category_inventory`: organizer-only category names, IDs and states. No supporter records, names, notes or emails.
- `vouch_create_daily_suggestions`: organizer-only creation into the existing durable research queue. Automatic research and its server key must already be configured. The tool cannot publish, approve or edit existing categories.
- `vouch_daily_batch_status`: organizer-only batch counts, safe status fields, product/photo snapshot counts and private review links. Photo snapshots are review aids, not visual or current-availability verification.
- Existing `vouch_research_status` / `vouch_process_research` continue to read aggregate health and advance work.

Daily slots and new jobs are written atomically in the existing `suggestion-jobs` record under `dailyBatches[date]`; no schema migration is needed. Concurrent calls and response-loss retries share the same three slots. A partial batch can be filled later. Case, accents, spacing, punctuation, simple plurals, compact names and saved canonical names participate in duplicate checks. Semantic near-duplicates still require agent judgment. Existing experiment-registry writes remain separate transactions, as in the current suggestion workflow.

Automation entries are attributed to **Vouch daily automation**, with no invented visitor or support count. Normal research budgets, leases, source tasks, retries, matching and private-draft gates apply. Prefer one useful original Reddit recommendation, allow at most two, and accept zero when no suitable discussion is accessible. Source gaps remain advisory; publication requires at least five distinct brands, photos and explicit organizer approval.

A batch records submissions, not guaranteed successful research. Failed, merged, deleted or paused entries consume slots and are reported without automatic replacement. Three researched drafts by an exact deadline cannot be guaranteed during provider, source, runner or scheduler outages.

## Verification before activation is called complete

1. Run batch/auth/privacy/concurrency tests and production build.
2. Push the exact checked source to GitHub and the existing Sites repository; deploy the existing Site, preserving D1/R2 and public access.
3. Verify all five Vouch tools are exposed. Use the category inventory to select three genuinely new categories, create today's batch, and repeat the call to confirm zero additional suggestions.
4. Confirm the batch is visible in Admin → Suggestions and that research advances without an open portal. Record actual completion or exact outstanding failures. Keep the drafts private.

Local fixture tests prove mechanics only, not real product research quality, photo accuracy or future task execution.

### Local validation — November 14, 2026

The 91 batch, maintenance, existing suggestion and research-workspace tests pass, including concurrency, response-loss retry via persisted state, partial batches, Eastern rollover/DST, input validation, organizer authorization and anonymous draft protection. Changed-file lint and the production build pass. The full test suite could not complete in this restricted session: existing account/community HTTP tests fail with `listen EPERM` on loopback and other server tests wait for listeners; that run was interrupted. No full-suite pass is claimed.

The Sites source helper failed to open the existing source remote because `git.chatgpt-team.site` could not resolve. GitHub CLI source sync likewise failed because `github.com` could not resolve. The Codex app task-view/project API returned `Codex app tool request failed`; the two existing task configurations were inspected read-only from disk. Their schedules/prompts remain unchanged; repository instructions provide the exact tool workflow. No new production category, deployment, source push or authenticated new-tool verification has occurred.
