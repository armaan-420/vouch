# Vouch UX review — November 2, 2026

The site has a coherent identity and a simple voting interaction. Its largest opportunities are clearer state, easier correction, better mobile interaction targets, and a dashboard organized around the organizer’s immediate task. Preserve the visual identity; prioritize behavior and information hierarchy.

This is an expert heuristic review, not a measured usability study or Google certification. Findings combine live observation, local interaction tests, and source inspection. No product code was changed.

**Coverage:** live `/`, `/sunscreen`, experiment leaderboard, nomination search, product selection, overall leaderboard, and an invalid experiment URL; desktop and 390 × 844 mobile layouts. Voting, previous-answer behavior, eight-card completion, and organizer screens were exercised in the matching local runtime. Production votes and organizer settings were not changed. Upcoming/closed collection behavior and error recovery were inspected in source; network failures, production sign-in, and a full assistive-technology audit were not tested.

**Google framework:** Google’s [Mobile App UX Principles](https://www.thinkwithgoogle.com/_qs/documents/2081/Mobile_App_UX_Principles_3.pdf) for task clarity, navigation, feedback, search and confirmation; [Google accessibility guidance](https://support.google.com/accessibility/android/answer/7101858?hl=en) for touch targets; and PAIR’s [Explainability + Trust](https://pair.withgoogle.com/chapter/explainability-trust) and [Errors + Graceful Failure](https://pair.withgoogle.com/chapter/errors-failing/) for setting expectations and explaining data-driven output. PAIR is applied as a transferable design lens: the catalogue lookup and score formula are not assumed to be AI systems. The mobile-app guidance is adapted to this website rather than treated as a literal web specification.

**What works well**

- Distinctive, consistent typography, palette, imagery and tone.
- One product per voting card, an explicit progress indicator and clear Vouch / Pass / Haven’t tried choices.
- Anonymous participation without a sign-in barrier.
- Search supports keyboard selection, multiple selections, visible chips and manual fallback.
- Cached catalogue results keep suggestions usable during a refresh.
- Nomination saving has visible success feedback and a prominent top save action.
- Experiment switching is available in the organizer’s persistent top bar.
- Shared results explain their experiment scope, and an expandable explanation describes the score formula.

**Fix first — interaction and accessibility**

| Finding and evidence | User impact | Recommendation and acceptance check |
|---|---|---|
| Mobile organizer header overlaps the heading. Observed at 390 px: the wrapped experiment selector extends below the fixed-height header. | Content is obscured immediately on arrival and while scrolling. | Allow the header to size to its rows, maintain an opaque sticky background, and reserve its full height. Check at 320, 360, 390 and 430 px with long experiment titles. |
| Several mobile controls are small. Measured DOM bounds: chip remove 24 × 24 px; top Save approximately 58 × 37 px; community voting 31–33 px high; “The board” 18 px high; manual fallback about 15 px high. | Accidental taps and difficult use for people with reduced dexterity. | Use roughly 48 × 48 CSS-pixel interaction areas as a practical Material-inspired mobile target, with spacing. Keep icons visually compact using padding. Google’s published native recommendation is 48 dp; these measurements are CSS pixels, not a WCAG certification test. |
| Revisiting a card does not display its saved answer. Tested by vouching and returning to the previous product. | Users cannot tell whether their answer persisted or what they are replacing. | Mark the current choice visibly and programmatically, show “Your answer: Vouch,” and explain that choosing another option replaces it. |
| Dynamic screen changes lose useful focus context. Voting replaces the card and observed focus returns to the page rather than the new product. Source does not focus the next heading or announce the new card. | Keyboard and screen-reader users must rediscover their location. | Focus the new product heading or card landmark after advancement, announce progress, and expose progress semantically. Test with keyboard and an actual screen reader. |

**Improve next — participant clarity and trust**

1. **Say whether the experiment is open.** The live unscheduled experiment accepts responses while displaying “Schedule to be announced.” This implies that participation may not have started. Use “Open for responses” for an open unscheduled experiment. Upcoming, ended and manually closed experiments should have distinct labels. Keep dates secondary.

2. **Make completion explicit.** The last answer transitions directly to the standings, without a clear “Your responses are saved” completion message. Add a short completion banner and label nominations as optional. Landing copy should state the product count and anonymity; add a time estimate only after measuring it. Verify that a first-time participant can identify when the required task is finished.

3. **Distinguish selected, unsaved and saved nominations.** Chips are a strong improvement, but saved selections and new drafts look the same. The Save button remains available after a successful save. Show “Unsaved changes” only when the selection differs from saved data, then “Saved.” Make removal semantics clear: removing a chip changes the draft until Save is pressed. Preserve drafts or warn before discarding them on reload/navigation. Avoid blocking navigation when nothing changed.

4. **Keep exact product identity visible.** Imported titles repeat brands and can be long enough to hide size, formula or market in a chip. Search results can show several close variants. Present brand once, a concise product name, then SPF, size, tint/formula and market when known. Provide a way to expand a chip or inspect its full identity on touch devices; a hover title is insufficient.

5. **Resolve duplicate records without collapsing distinct formulas.** Source inspection shows identities are provider-specific. The same actual sunscreen can therefore be nominated through different sources and accumulate separate counts. Match records using a canonical identity for the exact formula, market and size, and provide organizer merge tools for uncertain aliases. Preserve genuinely different US/international formulas. Treat this as a data-integrity issue with a visible UX consequence, not just label cleanup.

6. **Calibrate trust in the rankings.** A precise 9.4 looks equally established regardless of the amount of feedback. The expandable explanation helps, but confidence is absent beside individual results. Add a plain-language indicator such as “Early feedback,” derived from a documented rule. This can respect the existing decision not to display raw vote totals. Label the score as community recommendation sentiment; keep formula details expandable. Make SPF/formula qualifiers available on the board as well as the voting card.

7. **Give empty destinations a useful next step.** The live overall leaderboard currently says no experiments have been included. Either suppress this destination until it has content or provide a direct “Back to this experiment’s results” action and explain when it will become useful. The deliberately minimal `/` landing page is appropriate for invitation-only testing; it becomes a discovery problem if people are expected to find active experiments from the main domain. Invalid experiment URLs currently return plain text; add branded recovery and an appropriate return link without exposing private experiments.

8. **Respect navigation and resumption expectations.** Landing, voting and experiment results share one URL and use replacement history, so browser Back cannot retrace those stages. Reload returns to the landing page, and starting again begins at the first product. Add intentional history behavior and a “Continue” action for an unfinished session. Let users edit a particular product from results rather than replaying every card. Preserve the direct “View results” route for people who only want to browse.

**Improve next — organizer hierarchy and recovery**

- Put the selected experiment’s title, collection status, share link and metrics before schedule/settings. Routine monitoring should not require scrolling past a configuration form. Group the rest into Results, Products, Settings and Review nominations; on mobile use sections or tabs rather than a long uninterrupted page.
- During experiment switching, clear or visibly mark the old metrics/inbox as loading. They currently remain until the next request completes. Scope notices and loading/success messages to the selected experiment. Protect meaningful unsaved settings from being silently discarded when switching.
- Add inline validation and a clear review step to experiment creation. Explain Link ID as the shareable URL; put specialist SKU controls behind advanced options. Show the selected product count and final collection state before creation. After creation, lead with the new link and Copy action.
- Organize the nomination inbox by action needed: Needs review, Gathering nominations, On the board. Show the pending count. Put Confirm/combine actions near their selections and offer a reversible review history for mistaken merges. The current confirmation form is separated from a potentially long list.
- Keep source attribution and licensing available, but make it a compact secondary area. The long licensing block currently competes with search, fallback and the lower save action on mobile. Preserve required attribution; reduce its visual prominence rather than removing it.

**Failure behavior and accessibility follow-up**

The source includes useful foundations: initial-load retry, vote-save error feedback, cached search, and manual nomination fallback. Standardize loading, empty, error, saved and retry states across public and admin screens. Keep a participant’s work visible when a request fails. Exercise slow connections, catalogue outages, partial source failure and repeated submission before calling recovery verified.

The checked primary muted text/background color pairs have calculated contrast around 4.55–5.26:1, so this review does not assert a blanket color-contrast failure. Tiny 9–11 px metadata and control labels still warrant readability improvements. Verify all states, focus visibility, native select styles, zoom/reflow, reduced motion and screen-reader behavior separately.

**Suggested implementation order**

1. Fix mobile admin overlap, touch areas, selected vote states and focus management.
2. Clarify open/saved/completed states and provide useful empty-state navigation.
3. Reorder admin information, improve product identity and add safe duplicate resolution.
4. Improve resumption/history and reduce secondary copy.

**How to validate improvements**

Run five short participant sessions covering first use, skipping an unfamiliar product, correcting an answer, finding an international sunscreen, selecting two variants and saving nominations. Ask each person when the flow is finished and whether their nominations are saved. Run two organizer sessions covering switching experiments, finding results, scheduling a collection and resolving a missing-product submission. Measure task completion without help, correction success, time to first relevant search result, successful nomination saves and mistaken experiment context. Establish baselines before setting numerical improvement targets.

**Evidence screenshot — mobile organizer overlap**

![The wrapped experiment switcher overlaps the page heading](</Users/armaannathani/Documents/Wharton/Fall '26/OIDD 6140/Vouch/vouch-ux-admin-mobile-overlap.png>)
