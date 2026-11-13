# Interactive category research

Category suggestions build private drafts. Research is now a saved workspace with a brief, separate source tasks, content-check batches, a candidate pool and an activity log. Opening Suggestions is not required for unattended processing.

## Review policy

Source breadth, exact-model checks, independent editorial support and official model/availability checks guide review. Missing sources, inaccessible publishers, unverified trends and fewer than three checked editorial publishers are warnings. They do not fail a draft or block approval. Approval still requires five distinct brands, a photo for every selected product, and an explicit organizer action. An automatic research result never publishes a category.

A partial lineup with fewer than five products remains a private draft for editing. If no suitable products are found, the suggestion needs attention and offers manual lineup creation; the system does not invent products to make a draft.

## Source tasks

- Independent editorial: seek original recommendations across at least three publishers.
- Wirecutter: explicitly search the original publisher; record missing coverage or access limits.
- Google discovery: seek leading review sources. Without `SERPAPI_API_KEY`, use general web discovery and explicitly show that Google positions were not captured. With the optional server-only key, record up to ten organic US results for each of two queries, including region, query, capture time and observed position. This is not a product-quality ranking.
- TikTok & trends: seek original dated content. A mention is not proof of a trend; record sampling, access and sponsorship limitations. No TikTok Research API access is assumed.
- Manufacturer checks: establish exact model, variant and availability; manufacturer marketing is not independent endorsement.

Source tasks are independent background Responses requests using the existing configured model (default `gpt-5.4`). Wirecutter and TikTok use domain filters. A second pass explicitly opens batches of up to six original source URLs and checks exact-model and claim support. A URL appearing in search metadata alone is never an AI content check. The UI distinguishes link recorded, page opened, AI content checked and organizer checked. AI checks remain fallible and carry the actual passage and limitations for review.

The initial cycle allows up to 16 model requests, 60,000 observed output tokens and 30 minutes. Each model request caps output at 6,000 tokens and tools at six calls. Limits are bounds on work, not a dollar estimate. Reaching a limit preserves candidates and marks remaining checks for review. Explicit source repairs create a fresh bounded cycle; they do not run indefinitely. The existing Eastern-day category start budget remains in place.

## Organizer controls

The workspace shows real completed source-task counts, queries, coverage/access outcomes, candidate counts, token/request usage and the activity log. The evidence comparison shows original links, publication/retrieval dates when known, supporting passages, trend context and conflicting findings.

- Adjust scope/audience/exclusions: starts a new research revision and preserves the existing draft. Prior research is retained in bounded history.
- Add a source: sends an original HTTPS link and an organizer note to a selected source task. A submitted URL is not automatically checked.
- Retry this source: preserves unrelated tasks, the selected lineup, title, photos and ordering. Prior source results are retained in bounded history.
- Recheck missing evidence: checks unresolved claims without clearing supported records.
- Pin/exclude: changes the proposed selection, not the saved draft. Selection is based on evidence coverage and organizer choices, never commissions, and is not a Vouch community score.
- Apply proposed lineup: explicitly updates the draft selection. Matching retained models keep their saved product records and photos; title/address remain intact.
- Pause after current step / resume: checkpoints the work and prevents further advancement until resumed.

Read-only organizer metrics are available at `/api/admin/suggestions/metrics`. They contain queue category, state, request/token use, source completion, coverage warnings and elapsed time; they omit visitor records and supporter notes. These support real-category benchmark comparisons; fixture tests do not establish live source accuracy or provider success rates.

## Unattended processing

The durable job workspace, leases and saved provider request IDs remain in D1. Request starts have saved idempotency keys. Short runner invocations wait for imminent saved polls within their bounded execution window. New suggestions get a request-context kickoff where supported. GitHub Actions remains a fallback, now allowing up to 17.5 minutes of queue advancement per invocation; its cron configuration is not a timing guarantee.

The Site exposes two organizer-only MCP maintenance tools, `vouch_research_status` and `vouch_process_research`, for a linked cloud recovery schedule. Sites authenticates requests; tool execution additionally requires a verified caller email in the existing `ADMIN_EMAILS` allowlist and a Site-scoped authenticated user ID. Public discovery lists only tool schemas. The maintenance tools cannot create suggestions, approve drafts or publish categories. They return aggregate health only. A schedule must be registered and its authenticated access verified separately after deployment.

## Validation

Automated coverage includes missing-source approval, partial lineups, explicit attempts for each source, provider retries with the same idempotency key, saved response handling, source-only repairs, preservation of organizer edits/photos, pins/exclusions, pause/resume, exact-model checks, provenance-only/TikTok-only support limits, optional Google capture and maintenance authorization. `test/research-workspace-smoke.mjs` exercises the local organizer at desktop and phone widths with labeled fixtures. Live provider and real-category quality measurement must be reported separately from these checks.

## Deployment and operational verification — November 13, 2026

Sites version 84 deployed successfully from `4bcf1cb8063804d37c9b133b57120eeff11f109a`, environment revision 7. GitHub main was synchronized. All 270 tests, the production build, lint for changed research files and two synthetic desktop/phone research-review browser checks pass. Public research JavaScript/CSS match the deployed source; unauthenticated organizer suggestions and metrics return 401. The platform MCP URL returns 401 without platform authentication; the custom domain does not expose that MCP route.

The hourly Sites cloud recovery schedule is enabled. Sites rejected a five-minute cloud task because its minimum interval is hourly; GitHub's existing five-minute cron remains the fallback's configured cadence, without a timing guarantee. First execution of the hourly task and authenticated MCP tool invocation remain unverified: the private plugin is installed but its new tools were not exposed in the authoring chat. Existing saved jobs remain executable through the configured runner and organizer page.

`SERPAPI_API_KEY` is not configured, so actual Google positions are unavailable and explicitly flagged. Wirecutter/TikTok retrieval depends on source accessibility. The revised API-backed source tasks and real category accuracy were not benchmarked live in this pass; the existing production API key is masked by the environment manager and was not copied or exposed. No new production category was created or approved for verification.
