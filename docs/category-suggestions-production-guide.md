## Production status — <date start="2026-11-06" />, version 41

Suggestions, private draft processing and organizer review are deployed at [Vouch](https://v4ch.app/sunscreen). Source `eb60d8582103ff7d94a6be2f71dc0ee66e74dee2`; deployment `appgdep_6aee4e25c6ec8191811e0ec37fc5e833` succeeded, environment revision 5.

**Automatic research is enabled:** the owner-provided OpenAI key is stored as a server-only Sites secret. EXPERIMENT_AUTO_BUILD=on and the daily research-start limit is 20. Missing-key protection preserves queued jobs without consuming budget or retries. Never enable local fixtures in production.

## Visitor journey

Desktop and mobile share wordmark, product-search icon on Edit pages, account action and hamburger menu. Choose Suggest a category to open “What should Vouch rank next?” The form asks only for category; Why was removed. Successful modal submission closes it and shows a dismissible confirmation banner. The inline category form follows the standings list and acknowledges success in its button. The root Coming Soon page has no inline suggestion form; its menu offers the dialog. Private drafts hide category triggers.

Existing live categories link to their Edit. Case, accents, punctuation, spaces and simple plurals are normalized; compact IDs such as waterbottle also match. The same browser updates its support without creating another job. Limits allow five new categories per browser per rolling 24 hours. Cookies can be cleared, so counts are supporting browsers, not verified people.

## Research and draft lifecycle

Configured processing researches ten recognized currently sold products, one brand per pick, with 1–3 HTTPS sources and reasons. It uses the Responses API with web search/background structured output; only normalized category text goes to the provider. Visitor notes, cookies, identities and email are excluded. Adult/inappropriate categories and non-product requests are rejected. Research reasons are review material, not evidence that items are best or tested.

Picks match existing local/Channel3 catalog identities by normalized brand and model-token overlap, preferring photos. Unmatched picks become draft custom products. Identity references are persisted; short-lived provider images/offers/prices/commissions are not. Missing photos require review. Price and affiliate economics never select or rank research picks.

States: queued → researching → matching → ready or needs attention; rejected and failed retain reviewable context. Every product having a photo plus complete source coverage yields ready; four or more usable products with missing photos or source coverage yields needs attention; fewer than four yields rejected. Ready does not mean public.

Draft paths/data/votes/nominations and draft-only product/account discovery return 404 to visitors. Organizer preview requires authorization plus preview=1; voting remains disabled. Drafts are excluded from overall results and start with includeInOverall=false. Missing legacy status means live.

## Organizer actions

Open Suggestions to search and filter Live, Draft, In research, Rejected, Failed or Deleted. Rows show category/path, support, status, research/photo summary, update time and actions. Open a row for picks, sources, history, preview and lineup editing.

Approve uses one explicit confirmation and publishes a completed draft only after the server rechecks all product photos and the required research coverage. Reject removes its private registry entry but retains research/history. Refresh queues a new budgeted attempt, preserves prior research and can replace a draft lineup; it cannot rewrite a live Edit. Delete moves the suggestion to Deleted, halts processing and holds its private draft for restoration. Restore recovers it unless its path has been taken. Deleting a live suggestion never deletes the live Edit or votes. Active leases temporarily disable actions.

## Activation and operating controls

1. OPENAI_API_KEY is configured securely in Sites. Default research model gpt-5.4 completed a real web-search/structured-output check.
2. EXPERIMENT_AUTO_BUILD=on and the daily research-start budget is 20 per Eastern calendar day; environment revision 5 was deployed. Zero pauses new starts. This is a start cap, not a dollar-spend guarantee.
3. Existing Channel3 configuration supplies catalog matching. Shopify remains deferred. Optional SUGGESTION_NOTIFY_EMAIL plus SUGGESTION_ADMIN_URL and existing Resend credentials enable category-only review notifications. Notifications are currently unconfigured and delivery is unverified.
4. Submission can schedule an initial waitUntil step; the visible Suggestions page advances work every 15 seconds. The Worker exports a scheduled handler and generated configuration declares a five-minute cron, but Sites registration/invocation is unverified. Do not claim unattended production completion until that path is proven.
5. Review one real category, match quality and source accuracy before approving it. A generated draft is never published automatically.

Jobs use durable 60-second leases, provider timeouts, background response polling, bounded retries and redacted failures. Research has a ten-minute deadline; matching handles one pick per step. Retries are recoverable; registry/job records are separate, not a distributed transaction. A five-minute stepper may take approximately an hour plus research polling; no latency guarantee is established.

## Evidence and limits

156 tests and build pass, including missing-key pause, privacy, draft gating, leases, normalization, budgets, retries, editing, approval and delete/restore. Local fixtures verify mechanics, not research quality or retention. A direct live running-shoes request returned ten valid picks from ten brands with HTTPS sources and reported 9,996 total tokens. Production accepted a running-shoes suggestion and the authenticated organizer shows Automatic drafts on / In research. Unattended scheduling remains unverified. Existing votes/scoring/accounts stay intact; local fixture Edits were not imported. Full screen-reader/physical-phone testing and broad abuse/load validation remain outstanding.

Release evidence: <mention url="https://app.notion.com/p/40cd2a3caa8a812d83f4f3d13065be2d" />.

## Production draft check — <date start="2026-11-06" />

The real running-shoes job completed a private ten-product draft. It is marked Draft · needs attention because all ten products need photos; source/model/variant quality needs manual review. The public page, preview query without organizer authorization, experiment API and board API return 404. No production approval was performed. Production Product Library search and product details were also verified against existing voting activity. Unattended cron execution remains unverified.


## Research and photo requirements — November 7, 2026

The research brief now requests actual TikTok trend evidence, at least one and preferably two distinct Wirecutter brand picks, another brand recommended by the first organic Google result, and an AI recommendation corroborated by reputable editorial/manufacturer sources. Ten products from distinct brands remain the target. AI means the configured OpenAI model synthesis, not a separate ChatGPT consumer session.

The private organizer record stores channel, exact product, source URL, query, explanation, and Google search URL/rank when applicable. Returned evidence must appear in provider source metadata to count automatically; a Google result also requires its actual search page in that metadata. This verifies URL provenance, not the truth of endorsements or trend claims. Blocked/paywalled/missing coverage stays incomplete; do not invent a source or equate hosted web search with Google ranking. An organizer can personally check and record missing evidence in Suggestions. Manual records carry an organizer marker and timestamp. Source research is never added to visitor-facing product records.

Approval requires complete TikTok/Wirecutter/Google/AI coverage for products still in the final lineup and a photo for every item. Google must contribute a different brand from the Wirecutter evidence. One verified Wirecutter pick is sufficient; two is preferred. Legacy drafts must complete these checks too. Removing or changing a product invalidates its coverage. Missing sources or photos keep drafts private; no category is approved automatically.

All draft products have a photo URL field in Edit lineup. Custom products save that photo directly. Provider products can receive an organizer photo override, preserved through identity storage and response hydration without retaining short-lived provider media. Otherwise provider photos are re-resolved at approval. Publication checks for a valid public HTTPS photo URL, not guaranteed future availability or exact visual identity; organizer review should confirm each image loads and matches the model. Existing live categories are not retroactively unpublished.

The research tool-call allowance is now 16 (previously 5), with a 16,000 output-token ceiling. The daily start cap remains 20 and is not a monetary budget. Research quality, source access and future third-party photo availability still require operational review. Local automated checks use explicitly labeled fixtures; no new production category was submitted or approved during validation.

Validation for this update: 162 automated tests and the production build pass. A local browser check confirmed ten photo fields for a ten-product draft, the private research summary, and disabled approval with missing photos. The revised live research brief has not been exercised on a new production category; source accessibility remains unverified.

## Experiment curation and draft preparation — November 7, 2026

Refresh suggestions is now limited to the list page. Private draft details include Find missing photos and Edit lineup, with a shared name/URL/manual product adder. The visible lineup includes organizer additions, and every item must have a photo before approval. Existing bundled images count toward readiness. See [Experiment management](experiment-management-guide.md) for the Products, Settings and Participation, Missing Products, and Community Additions tabs, plus disable/reactivate/permanent-delete behavior.
