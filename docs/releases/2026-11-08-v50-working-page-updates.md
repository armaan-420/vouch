# 🌱 Vouch

Notion: https://app.notion.com/p/3d4d2a3caa8a80ac9086c75c18b55141

## Documentation status — <date start="2026-11-08" />, version 50

Sites version 50 is deployed at [Vouch](https://v4ch.app), source `cd5ba45f12d0fa29da0df441209efa6a0d05fb33`, deployment `appgdep_6af00aae41948191a294a21a3d8708d0`, environment revision 6. It succeeded on <date start="2026-11-08" /> at 12:37 AM America/New_York. This documentation update covers deployed versions 42–50 since version 41.

Hosted admin access now uses a server-configured four-digit PIN instead of the previous ChatGPT sign-in/email allowlist. Sessions last a fixed 24 hours; Lock admin revokes the session, and changing the PIN invalidates prior sessions. Cookies are Secure, HttpOnly and SameSite=Strict; only random-token hashes are stored. Five failed attempts per IP-derived bucket in 15 minutes trigger a temporary block. Admin writes require same origin. Participant email-code accounts remain separate.

Experiment details now open Products, Settings and Participation, Missing Products, and Community Additions. Products supports name/URL/manual additions, photo URLs, reorder and removal with revision checks; removal preserves history and re-adding the same identity preserves its votes. Keep at least one product, at most 32, and one per brand. Live additions and reactivation require photos. Disable hides public access and overall participation while retaining data; Reactivate keeps the schedule. Permanent Delete requires the exact path and clears experiment activity and its associated suggestion, reserves the path, and retains shared products/personal opinions. Interrupted cleanup stays disabled for retry. Recoverable suggestion deletion is a separate action.

Generated categories remain private until all photo/source gates pass and the organizer explicitly approves. Public scores remain participant-vote based.

All 188 automated tests and a fresh production build pass. Read-only production GET checks return 200 for the root, sunscreen, water bottles, admin login and health; anonymous inventory, suggestions and feedback return 401. Eight current admin assets exactly match source. No production records were changed during this documentation update. Lint was not rerun; version 41 recorded four errors and nine warnings, so this update makes no clean-lint claim.

Unattended research execution remains unverified; Sites currently lists no attached schedules. Source provenance does not establish endorsement accuracy or Google rank, and photos require visual review. Real production email-code inbox delivery, signed-in profile-photo upload, full screen-reader/physical-device accessibility, exhaustive matching and broad abuse/load tests remain outstanding. No new demand, retention, revenue or purchase outcome is established.

Release details and application checkpoint: <mention url="https://app.notion.com/p/40cd2a3caa8a812d83f4f3d13065be2d">Release Notes & Changelog</mention>. Earlier dated sections below are retained as history and superseded where they differ.

---

# Vouch PRD — Working Product Definition

Notion: https://app.notion.com/p/40ad2a3caa8a8160afd6e082d848f7f7

## Documentation status — <date start="2026-11-08" />, version 50

Sites version 50 is deployed at [Vouch](https://v4ch.app), source `cd5ba45f12d0fa29da0df441209efa6a0d05fb33`, deployment `appgdep_6af00aae41948191a294a21a3d8708d0`, environment revision 6. It succeeded on <date start="2026-11-08" /> at 12:37 AM America/New_York. This documentation update covers deployed versions 42–50 since version 41.

Hosted admin access now uses a server-configured four-digit PIN instead of the previous ChatGPT sign-in/email allowlist. Sessions last a fixed 24 hours; Lock admin revokes the session, and changing the PIN invalidates prior sessions. Cookies are Secure, HttpOnly and SameSite=Strict; only random-token hashes are stored. Five failed attempts per IP-derived bucket in 15 minutes trigger a temporary block. Admin writes require same origin. Participant email-code accounts remain separate.

Experiment details now open Products, Settings and Participation, Missing Products, and Community Additions. Products supports name/URL/manual additions, photo URLs, reorder and removal with revision checks; removal preserves history and re-adding the same identity preserves its votes. Keep at least one product, at most 32, and one per brand. Live additions and reactivation require photos. Disable hides public access and overall participation while retaining data; Reactivate keeps the schedule. Permanent Delete requires the exact path and clears experiment activity and its associated suggestion, reserves the path, and retains shared products/personal opinions. Interrupted cleanup stays disabled for retry. Recoverable suggestion deletion is a separate action.

Research targets ten distinct brands with TikTok, Wirecutter, Google-first-organic-result and AI coverage tied to exact products. One Wirecutter brand is required, two preferred; Google must add a different brand. Returned source metadata establishes provenance only. Organizer-checked evidence is marked and timestamped. Missing sources or photos for any final-lineup product block approval, including legacy drafts. Invalid evidence becomes a private warning without discarding valid picks. Saved-response recovery avoids another model start; Refresh research starts a new budgeted attempt. Limits are 16,000 output tokens, 16 tool calls and 20 starts per Eastern day.

Find missing photos checks the category, broader catalog, then saved product URL, requiring the same normalized brand and every model word. Up to ten missing items are checked per request, three at a time, with per-item results and manual Add photo fallback. Provider identities, research names and order are preserved. Organizer photo overrides survive storage/hydration; cached searches refresh snapshots and bounded duplicate-alias resolution prevents photo loss. Inspect images for model accuracy and availability.

Suggestion review now has Product lineup, Research & sources, and Details & history tabs. Photo cards show missing images and researched-model differences; channel cards expose accepted coverage, source limitations and expandable evidence. Selected tabs and reading sections survive polling. List rows use Review; refresh/reject/delete live under More actions. Find missing photos reports progress and Add photo focuses the URL field. Admin product fields retain the corrected layout.

All 188 automated tests and a fresh production build pass. Read-only production GET checks return 200 for the root, sunscreen, water bottles, admin login and health; anonymous inventory, suggestions and feedback return 401. Eight current admin assets exactly match source. No production records were changed during this documentation update. Lint was not rerun; version 41 recorded four errors and nine warnings, so this update makes no clean-lint claim.

Unattended research execution remains unverified; Sites currently lists no attached schedules. Source provenance does not establish endorsement accuracy or Google rank, and photos require visual review. Real production email-code inbox delivery, signed-in profile-photo upload, full screen-reader/physical-device accessibility, exhaustive matching and broad abuse/load tests remain outstanding. No new demand, retention, revenue or purchase outcome is established.

Release details and application checkpoint: <mention url="https://app.notion.com/p/40cd2a3caa8a812d83f4f3d13065be2d">Release Notes & Changelog</mention>. Earlier dated sections below are retained as history and superseded where they differ.

---

# 📋 PRD

Notion: https://app.notion.com/p/40ad2a3caa8a81ecbb90cf90eeee520d

## Documentation status — <date start="2026-11-08" />, version 50

Sites version 50 is deployed at [Vouch](https://v4ch.app), source `cd5ba45f12d0fa29da0df441209efa6a0d05fb33`, deployment `appgdep_6af00aae41948191a294a21a3d8708d0`, environment revision 6. It succeeded on <date start="2026-11-08" /> at 12:37 AM America/New_York. This documentation update covers deployed versions 42–50 since version 41.

Working requirements now cover PIN sessions, editable experiment lineups and disable/reactivate/permanent-delete controls, strict source/photo approval gates, saved-response recovery, and visual suggestion review. The Working Product Definition and operating guides describe the exact semantics; historical specifications keep their original scope.

All 188 automated tests and a fresh production build pass. Read-only production GET checks return 200 for the root, sunscreen, water bottles, admin login and health; anonymous inventory, suggestions and feedback return 401. Eight current admin assets exactly match source. No production records were changed during this documentation update. Lint was not rerun; version 41 recorded four errors and nine warnings, so this update makes no clean-lint claim.

Unattended research execution remains unverified; Sites currently lists no attached schedules. Source provenance does not establish endorsement accuracy or Google rank, and photos require visual review. Real production email-code inbox delivery, signed-in profile-photo upload, full screen-reader/physical-device accessibility, exhaustive matching and broad abuse/load tests remain outstanding. No new demand, retention, revenue or purchase outcome is established.

Release details and application checkpoint: <mention url="https://app.notion.com/p/40cd2a3caa8a812d83f4f3d13065be2d">Release Notes & Changelog</mention>. Earlier dated sections below are retained as history and superseded where they differ.

---

# Weekly Product Experiments — Schedule & Playbook

Notion: https://app.notion.com/p/40cd2a3caa8a81389ec7e028685c4347

## Documentation status — <date start="2026-11-08" />, version 50

Sites version 50 is deployed at [Vouch](https://v4ch.app), source `cd5ba45f12d0fa29da0df441209efa6a0d05fb33`, deployment `appgdep_6af00aae41948191a294a21a3d8708d0`, environment revision 6. It succeeded on <date start="2026-11-08" /> at 12:37 AM America/New_York. This documentation update covers deployed versions 42–50 since version 41.

Experiment details now open Products, Settings and Participation, Missing Products, and Community Additions. Products supports name/URL/manual additions, photo URLs, reorder and removal with revision checks; removal preserves history and re-adding the same identity preserves its votes. Keep at least one product, at most 32, and one per brand. Live additions and reactivation require photos. Disable hides public access and overall participation while retaining data; Reactivate keeps the schedule. Permanent Delete requires the exact path and clears experiment activity and its associated suggestion, reserves the path, and retains shared products/personal opinions. Interrupted cleanup stays disabled for retry. Recoverable suggestion deletion is a separate action.

Research targets ten distinct brands with TikTok, Wirecutter, Google-first-organic-result and AI coverage tied to exact products. One Wirecutter brand is required, two preferred; Google must add a different brand. Returned source metadata establishes provenance only. Organizer-checked evidence is marked and timestamped. Missing sources or photos for any final-lineup product block approval, including legacy drafts. Invalid evidence becomes a private warning without discarding valid picks. Saved-response recovery avoids another model start; Refresh research starts a new budgeted attempt. Limits are 16,000 output tokens, 16 tool calls and 20 starts per Eastern day.

Review source claims and each image, inspect the private preview, then explicitly approve. Disable does not reset schedule or votes. Research-ready is not a public launch or evidence of demand. No attached Sites schedule was returned, so do not rely on an unattended weekly drop.

All 188 automated tests and a fresh production build pass. Read-only production GET checks return 200 for the root, sunscreen, water bottles, admin login and health; anonymous inventory, suggestions and feedback return 401. Eight current admin assets exactly match source. No production records were changed during this documentation update. Lint was not rerun; version 41 recorded four errors and nine warnings, so this update makes no clean-lint claim.

Unattended research execution remains unverified; Sites currently lists no attached schedules. Source provenance does not establish endorsement accuracy or Google rank, and photos require visual review. Real production email-code inbox delivery, signed-in profile-photo upload, full screen-reader/physical-device accessibility, exhaustive matching and broad abuse/load tests remain outstanding. No new demand, retention, revenue or purchase outcome is established.

Release details and application checkpoint: <mention url="https://app.notion.com/p/40cd2a3caa8a812d83f4f3d13065be2d">Release Notes & Changelog</mention>. Earlier dated sections below are retained as history and superseded where they differ.

---

# Decision Log & Open Questions

Notion: https://app.notion.com/p/40ad2a3caa8a81be8266de9ea607cd7a

## Documentation status — <date start="2026-11-08" />, version 50

Sites version 50 is deployed at [Vouch](https://v4ch.app), source `cd5ba45f12d0fa29da0df441209efa6a0d05fb33`, deployment `appgdep_6af00aae41948191a294a21a3d8708d0`, environment revision 6. It succeeded on <date start="2026-11-08" /> at 12:37 AM America/New_York. This documentation update covers deployed versions 42–50 since version 41.

Delivered decisions: four-digit PIN with remembered 24-hour sessions; editable, revision-protected experiment lineups; disable/reactivate and separately confirmed permanent deletion; four-channel source coverage and photos before draft approval; visual review and conservative missing-photo recovery. Suggestion deletion remains recoverable. Human votes still determine public rankings.

Remaining choices and evidence: source accessibility/accuracy, unattended processing, real-device usability, sustainable review/acquisition cost and repeated contribution/retention. The release does not validate these hypotheses.

All 188 automated tests and a fresh production build pass. Read-only production GET checks return 200 for the root, sunscreen, water bottles, admin login and health; anonymous inventory, suggestions and feedback return 401. Eight current admin assets exactly match source. No production records were changed during this documentation update. Lint was not rerun; version 41 recorded four errors and nine warnings, so this update makes no clean-lint claim.

Unattended research execution remains unverified; Sites currently lists no attached schedules. Source provenance does not establish endorsement accuracy or Google rank, and photos require visual review. Real production email-code inbox delivery, signed-in profile-photo upload, full screen-reader/physical-device accessibility, exhaustive matching and broad abuse/load tests remain outstanding. No new demand, retention, revenue or purchase outcome is established.

Release details and application checkpoint: <mention url="https://app.notion.com/p/40cd2a3caa8a812d83f4f3d13065be2d">Release Notes & Changelog</mention>. Earlier dated sections below are retained as history and superseded where they differ.

---

# 🗺️ Decisions & Roadmap

Notion: https://app.notion.com/p/40ad2a3caa8a8120ab9af0209630f092

## Documentation status — <date start="2026-11-08" />, version 50

Sites version 50 is deployed at [Vouch](https://v4ch.app), source `cd5ba45f12d0fa29da0df441209efa6a0d05fb33`, deployment `appgdep_6af00aae41948191a294a21a3d8708d0`, environment revision 6. It succeeded on <date start="2026-11-08" /> at 12:37 AM America/New_York. This documentation update covers deployed versions 42–50 since version 41.

Versions 42–50 deliver stricter source/photo gates, experiment product/lifecycle controls, PIN sessions, diagnostics and saved-response recovery, visual suggestion review and photo-cache fixes. Next evidence gates remain complete source-reviewed draft preparation, sustainable manual review, verified unattended processing, real-device accessibility and repeat usage. Generated drafts require explicit approval.

All 188 automated tests and a fresh production build pass. Read-only production GET checks return 200 for the root, sunscreen, water bottles, admin login and health; anonymous inventory, suggestions and feedback return 401. Eight current admin assets exactly match source. No production records were changed during this documentation update. Lint was not rerun; version 41 recorded four errors and nine warnings, so this update makes no clean-lint claim.

Unattended research execution remains unverified; Sites currently lists no attached schedules. Source provenance does not establish endorsement accuracy or Google rank, and photos require visual review. Real production email-code inbox delivery, signed-in profile-photo upload, full screen-reader/physical-device accessibility, exhaustive matching and broad abuse/load tests remain outstanding. No new demand, retention, revenue or purchase outcome is established.

Release details and application checkpoint: <mention url="https://app.notion.com/p/40cd2a3caa8a812d83f4f3d13065be2d">Release Notes & Changelog</mention>. Earlier dated sections below are retained as history and superseded where they differ.

---

# Experiment Backlog & Evidence Gates

Notion: https://app.notion.com/p/40ad2a3caa8a814f99b3e42420a1a0bd

## Documentation status — <date start="2026-11-08" />, version 50

Sites version 50 is deployed at [Vouch](https://v4ch.app), source `cd5ba45f12d0fa29da0df441209efa6a0d05fb33`, deployment `appgdep_6af00aae41948191a294a21a3d8708d0`, environment revision 6. It succeeded on <date start="2026-11-08" /> at 12:37 AM America/New_York. This documentation update covers deployed versions 42–50 since version 41.

Measure source-complete draft rate, exact-model photo coverage, organizer correction time, recovery success, repeated support and return contributions before expanding categories. These are proposed measurements, not measured improvements. Test with people outside the founder's network; browser support counts do not establish unique-person demand. Deployment and 188 passing tests establish mechanics only.

All 188 automated tests and a fresh production build pass. Read-only production GET checks return 200 for the root, sunscreen, water bottles, admin login and health; anonymous inventory, suggestions and feedback return 401. Eight current admin assets exactly match source. No production records were changed during this documentation update. Lint was not rerun; version 41 recorded four errors and nine warnings, so this update makes no clean-lint claim.

Unattended research execution remains unverified; Sites currently lists no attached schedules. Source provenance does not establish endorsement accuracy or Google rank, and photos require visual review. Real production email-code inbox delivery, signed-in profile-photo upload, full screen-reader/physical-device accessibility, exhaustive matching and broad abuse/load tests remain outstanding. No new demand, retention, revenue or purchase outcome is established.

Release details and application checkpoint: <mention url="https://app.notion.com/p/40cd2a3caa8a812d83f4f3d13065be2d">Release Notes & Changelog</mention>. Earlier dated sections below are retained as history and superseded where they differ.

---

# 🧪 POC Experiments

Notion: https://app.notion.com/p/40ad2a3caa8a81a98d8ccbbccb04ab3b

## Documentation status — <date start="2026-11-08" />, version 50

Sites version 50 is deployed at [Vouch](https://v4ch.app), source `cd5ba45f12d0fa29da0df441209efa6a0d05fb33`, deployment `appgdep_6af00aae41948191a294a21a3d8708d0`, environment revision 6. It succeeded on <date start="2026-11-08" /> at 12:37 AM America/New_York. This documentation update covers deployed versions 42–50 since version 41.

Experiment details now open Products, Settings and Participation, Missing Products, and Community Additions. Products supports name/URL/manual additions, photo URLs, reorder and removal with revision checks; removal preserves history and re-adding the same identity preserves its votes. Keep at least one product, at most 32, and one per brand. Live additions and reactivation require photos. Disable hides public access and overall participation while retaining data; Reactivate keeps the schedule. Permanent Delete requires the exact path and clears experiment activity and its associated suggestion, reserves the path, and retains shared products/personal opinions. Interrupted cleanup stays disabled for retry. Recoverable suggestion deletion is a separate action.

New category drafts require photos and all four accepted research channels before explicit approval. Recovery/photo tools help preparation but do not establish a completed pilot or improved outcomes.

All 188 automated tests and a fresh production build pass. Read-only production GET checks return 200 for the root, sunscreen, water bottles, admin login and health; anonymous inventory, suggestions and feedback return 401. Eight current admin assets exactly match source. No production records were changed during this documentation update. Lint was not rerun; version 41 recorded four errors and nine warnings, so this update makes no clean-lint claim.

Unattended research execution remains unverified; Sites currently lists no attached schedules. Source provenance does not establish endorsement accuracy or Google rank, and photos require visual review. Real production email-code inbox delivery, signed-in profile-photo upload, full screen-reader/physical-device accessibility, exhaustive matching and broad abuse/load tests remain outstanding. No new demand, retention, revenue or purchase outcome is established.

Release details and application checkpoint: <mention url="https://app.notion.com/p/40cd2a3caa8a812d83f4f3d13065be2d">Release Notes & Changelog</mention>. Earlier dated sections below are retained as history and superseded where they differ.

---

# Vouch or Pass — Wharton Beauty & Golf Pilot

Notion: https://app.notion.com/p/40ad2a3caa8a8194b850c9a43e178b6f

## Documentation status — <date start="2026-11-08" />, version 50

Sites version 50 is deployed at [Vouch](https://v4ch.app), source `cd5ba45f12d0fa29da0df441209efa6a0d05fb33`, deployment `appgdep_6af00aae41948191a294a21a3d8708d0`, environment revision 6. It succeeded on <date start="2026-11-08" /> at 12:37 AM America/New_York. This documentation update covers deployed versions 42–50 since version 41.

The existing participant flow and vote formula remain. Organizer curation can now change a lineup while retaining prior votes; record lineup revisions when interpreting results because exposure can change. Disable pauses public availability; reactivation retains schedules. Generated category preparation now requires source and photo review. No new pilot outcome or golf launch is established.

All 188 automated tests and a fresh production build pass. Read-only production GET checks return 200 for the root, sunscreen, water bottles, admin login and health; anonymous inventory, suggestions and feedback return 401. Eight current admin assets exactly match source. No production records were changed during this documentation update. Lint was not rerun; version 41 recorded four errors and nine warnings, so this update makes no clean-lint claim.

Unattended research execution remains unverified; Sites currently lists no attached schedules. Source provenance does not establish endorsement accuracy or Google rank, and photos require visual review. Real production email-code inbox delivery, signed-in profile-photo upload, full screen-reader/physical-device accessibility, exhaustive matching and broad abuse/load tests remain outstanding. No new demand, retention, revenue or purchase outcome is established.

Release details and application checkpoint: <mention url="https://app.notion.com/p/40cd2a3caa8a812d83f4f3d13065be2d">Release Notes & Changelog</mention>. Earlier dated sections below are retained as history and superseded where they differ.

---

# 🎨 Brand & Design

Notion: https://app.notion.com/p/40ad2a3caa8a81bd94a3ea1ddedd7cb7

## Documentation status — <date start="2026-11-08" />, version 50

Sites version 50 is deployed at [Vouch](https://v4ch.app), source `cd5ba45f12d0fa29da0df441209efa6a0d05fb33`, deployment `appgdep_6af00aae41948191a294a21a3d8708d0`, environment revision 6. It succeeded on <date start="2026-11-08" /> at 12:37 AM America/New_York. This documentation update covers deployed versions 42–50 since version 41.

Suggestion review now has Product lineup, Research & sources, and Details & history tabs. Photo cards show missing images and researched-model differences; channel cards expose accepted coverage, source limitations and expandable evidence. Selected tabs and reading sections survive polling. List rows use Review; refresh/reject/delete live under More actions. Find missing photos reports progress and Add photo focuses the URL field. Admin product fields retain the corrected layout.

All 188 automated tests and a fresh production build pass. Read-only production GET checks return 200 for the root, sunscreen, water bottles, admin login and health; anonymous inventory, suggestions and feedback return 401. Eight current admin assets exactly match source. No production records were changed during this documentation update. Lint was not rerun; version 41 recorded four errors and nine warnings, so this update makes no clean-lint claim.

Unattended research execution remains unverified; Sites currently lists no attached schedules. Source provenance does not establish endorsement accuracy or Google rank, and photos require visual review. Real production email-code inbox delivery, signed-in profile-photo upload, full screen-reader/physical-device accessibility, exhaustive matching and broad abuse/load tests remain outstanding. No new demand, retention, revenue or purchase outcome is established.

Release details and application checkpoint: <mention url="https://app.notion.com/p/40cd2a3caa8a812d83f4f3d13065be2d">Release Notes & Changelog</mention>. Earlier dated sections below are retained as history and superseded where they differ.

---

# Visual Style Guide

Notion: https://app.notion.com/p/40ad2a3caa8a813f823ed60828358479

## Documentation status — <date start="2026-11-08" />, version 50

Sites version 50 is deployed at [Vouch](https://v4ch.app), source `cd5ba45f12d0fa29da0df441209efa6a0d05fb33`, deployment `appgdep_6af00aae41948191a294a21a3d8708d0`, environment revision 6. It succeeded on <date start="2026-11-08" /> at 12:37 AM America/New_York. This documentation update covers deployed versions 42–50 since version 41.

Suggestion review now has Product lineup, Research & sources, and Details & history tabs. Photo cards show missing images and researched-model differences; channel cards expose accepted coverage, source limitations and expandable evidence. Selected tabs and reading sections survive polling. List rows use Review; refresh/reject/delete live under More actions. Find missing photos reports progress and Add photo focuses the URL field. Admin product fields retain the corrected layout.

Retain the existing forest/ivory palette, public vote controls, score chips and navigation. Photo completeness indicators describe preparation, not product quality. Layout changes do not replace the need for physical-phone, larger-text and screen-reader checks.

All 188 automated tests and a fresh production build pass. Read-only production GET checks return 200 for the root, sunscreen, water bottles, admin login and health; anonymous inventory, suggestions and feedback return 401. Eight current admin assets exactly match source. No production records were changed during this documentation update. Lint was not rerun; version 41 recorded four errors and nine warnings, so this update makes no clean-lint claim.

Unattended research execution remains unverified; Sites currently lists no attached schedules. Source provenance does not establish endorsement accuracy or Google rank, and photos require visual review. Real production email-code inbox delivery, signed-in profile-photo upload, full screen-reader/physical-device accessibility, exhaustive matching and broad abuse/load tests remain outstanding. No new demand, retention, revenue or purchase outcome is established.

Release details and application checkpoint: <mention url="https://app.notion.com/p/40cd2a3caa8a812d83f4f3d13065be2d">Release Notes & Changelog</mention>. Earlier dated sections below are retained as history and superseded where they differ.

---

# How to Maintain Vouch Documentation

Notion: https://app.notion.com/p/40ad2a3caa8a81e6b78cf477ecd6f6f2

## Documentation status — <date start="2026-11-08" />, version 50

Sites version 50 is deployed at [Vouch](https://v4ch.app), source `cd5ba45f12d0fa29da0df441209efa6a0d05fb33`, deployment `appgdep_6af00aae41948191a294a21a3d8708d0`, environment revision 6. It succeeded on <date start="2026-11-08" /> at 12:37 AM America/New_York. This documentation update covers deployed versions 42–50 since version 41.

The application checkpoint is version 50 / `cd5ba45f12d0fa29da0df441209efa6a0d05fb33`, environment revision 6. For the next requested update, inspect source changes including uncommitted work and verify saved versions against deployment status. Separate recovering a saved response from new research; distinguish source provenance, manual source checks, photos, approval and actual public launch. Never publish secrets or private records. Advance checkpoints only after Notion publication succeeds. This remains an on-request workflow.

All 188 automated tests and a fresh production build pass. Read-only production GET checks return 200 for the root, sunscreen, water bottles, admin login and health; anonymous inventory, suggestions and feedback return 401. Eight current admin assets exactly match source. No production records were changed during this documentation update. Lint was not rerun; version 41 recorded four errors and nine warnings, so this update makes no clean-lint claim.

Unattended research execution remains unverified; Sites currently lists no attached schedules. Source provenance does not establish endorsement accuracy or Google rank, and photos require visual review. Real production email-code inbox delivery, signed-in profile-photo upload, full screen-reader/physical-device accessibility, exhaustive matching and broad abuse/load tests remain outstanding. No new demand, retention, revenue or purchase outcome is established.

Release details and application checkpoint: <mention url="https://app.notion.com/p/40cd2a3caa8a812d83f4f3d13065be2d">Release Notes & Changelog</mention>. Earlier dated sections below are retained as history and superseded where they differ.

---

# ✍️ Documentation Guide & Templates

Notion: https://app.notion.com/p/40ad2a3caa8a81b391a8d5f39f92a74f

## Documentation status — <date start="2026-11-08" />, version 50

Sites version 50 is deployed at [Vouch](https://v4ch.app), source `cd5ba45f12d0fa29da0df441209efa6a0d05fb33`, deployment `appgdep_6af00aae41948191a294a21a3d8708d0`, environment revision 6. It succeeded on <date start="2026-11-08" /> at 12:37 AM America/New_York. This documentation update covers deployed versions 42–50 since version 41.

Working requirements, operations, lookup, design, roadmap, evidence boundaries and source coverage now account for versions 42–50. Historical source/interview/deck artifacts retain their original contents. Record exact application SHA, deployment/environment revision, checks and limitations; later documentation edits are not another application release.

All 188 automated tests and a fresh production build pass. Read-only production GET checks return 200 for the root, sunscreen, water bottles, admin login and health; anonymous inventory, suggestions and feedback return 401. Eight current admin assets exactly match source. No production records were changed during this documentation update. Lint was not rerun; version 41 recorded four errors and nine warnings, so this update makes no clean-lint claim.

Unattended research execution remains unverified; Sites currently lists no attached schedules. Source provenance does not establish endorsement accuracy or Google rank, and photos require visual review. Real production email-code inbox delivery, signed-in profile-photo upload, full screen-reader/physical-device accessibility, exhaustive matching and broad abuse/load tests remain outstanding. No new demand, retention, revenue or purchase outcome is established.

Release details and application checkpoint: <mention url="https://app.notion.com/p/40cd2a3caa8a812d83f4f3d13065be2d">Release Notes & Changelog</mention>. Earlier dated sections below are retained as history and superseded where they differ.

---

# 🔎 Product Lookup — Production Guide

Notion: https://app.notion.com/p/410d2a3caa8a817cbd4bc22f981a73e2

## Documentation status — <date start="2026-11-08" />, version 50

Sites version 50 is deployed at [Vouch](https://v4ch.app), source `cd5ba45f12d0fa29da0df441209efa6a0d05fb33`, deployment `appgdep_6af00aae41948191a294a21a3d8708d0`, environment revision 6. It succeeded on <date start="2026-11-08" /> at 12:37 AM America/New_York. This documentation update covers deployed versions 42–50 since version 41.

Find missing photos checks the category, broader catalog, then saved product URL, requiring the same normalized brand and every model word. Up to ten missing items are checked per request, three at a time, with per-item results and manual Add photo fallback. Provider identities, research names and order are preserved. Organizer photo overrides survive storage/hydration; cached searches refresh snapshots and bounded duplicate-alias resolution prevents photo loss. Inspect images for model accuracy and availability.

Name/URL/manual entry is also available in organizer experiment and draft editors. Live additions require photos; provider records persist identity rather than short-lived media. Channel3 remains the configured provider in the prior production baseline; Shopify is deferred. This update did not inspect secret values, retest metered lookup or establish exhaustive variant coverage.

All 188 automated tests and a fresh production build pass. Read-only production GET checks return 200 for the root, sunscreen, water bottles, admin login and health; anonymous inventory, suggestions and feedback return 401. Eight current admin assets exactly match source. No production records were changed during this documentation update. Lint was not rerun; version 41 recorded four errors and nine warnings, so this update makes no clean-lint claim.

Unattended research execution remains unverified; Sites currently lists no attached schedules. Source provenance does not establish endorsement accuracy or Google rank, and photos require visual review. Real production email-code inbox delivery, signed-in profile-photo upload, full screen-reader/physical-device accessibility, exhaustive matching and broad abuse/load tests remain outstanding. No new demand, retention, revenue or purchase outcome is established.

Release details and application checkpoint: <mention url="https://app.notion.com/p/40cd2a3caa8a812d83f4f3d13065be2d">Release Notes & Changelog</mention>. Earlier dated sections below are retained as history and superseded where they differ.

---

# Research Overview & Evidence Boundaries

Notion: https://app.notion.com/p/40ad2a3caa8a81d0addcd4ab8bc73fec

## Documentation status — <date start="2026-11-08" />, version 50

Sites version 50 is deployed at [Vouch](https://v4ch.app), source `cd5ba45f12d0fa29da0df441209efa6a0d05fb33`, deployment `appgdep_6af00aae41948191a294a21a3d8708d0`, environment revision 6. It succeeded on <date start="2026-11-08" /> at 12:37 AM America/New_York. This documentation update covers deployed versions 42–50 since version 41.

Research targets ten distinct brands with TikTok, Wirecutter, Google-first-organic-result and AI coverage tied to exact products. One Wirecutter brand is required, two preferred; Google must add a different brand. Returned source metadata establishes provenance only. Organizer-checked evidence is marked and timestamped. Missing sources or photos for any final-lineup product block approval, including legacy drafts. Invalid evidence becomes a private warning without discarding valid picks. Saved-response recovery avoids another model start; Refresh research starts a new budgeted attempt. Limits are 16,000 output tokens, 16 tool calls and 20 starts per Eastern day.

AI synthesis is not independent testing. TikTok popularity is not effectiveness. Provider URL provenance does not verify endorsements, organic rank or an exact product match. Photo recovery and 188 tests establish mechanics, not recommendation accuracy, purchase outcomes, demand, or retention. Existing user interviews/surveys are unchanged.

All 188 automated tests and a fresh production build pass. Read-only production GET checks return 200 for the root, sunscreen, water bottles, admin login and health; anonymous inventory, suggestions and feedback return 401. Eight current admin assets exactly match source. No production records were changed during this documentation update. Lint was not rerun; version 41 recorded four errors and nine warnings, so this update makes no clean-lint claim.

Unattended research execution remains unverified; Sites currently lists no attached schedules. Source provenance does not establish endorsement accuracy or Google rank, and photos require visual review. Real production email-code inbox delivery, signed-in profile-photo upload, full screen-reader/physical-device accessibility, exhaustive matching and broad abuse/load tests remain outstanding. No new demand, retention, revenue or purchase outcome is established.

Release details and application checkpoint: <mention url="https://app.notion.com/p/40cd2a3caa8a812d83f4f3d13065be2d">Release Notes & Changelog</mention>. Earlier dated sections below are retained as history and superseded where they differ.

---

# 📚 Source Library & Chat Archive

Notion: https://app.notion.com/p/40ad2a3caa8a815db76ff10a4b65e2af

## Documentation status — <date start="2026-11-08" />, version 50

Sites version 50 is deployed at [Vouch](https://v4ch.app), source `cd5ba45f12d0fa29da0df441209efa6a0d05fb33`, deployment `appgdep_6af00aae41948191a294a21a3d8708d0`, environment revision 6. It succeeded on <date start="2026-11-08" /> at 12:37 AM America/New_York. This documentation update covers deployed versions 42–50 since version 41.

Application review covers version 41 through version 50, including every saved version and the intervening suggestion-layout commit. Current references include experiment-management, admin operations and category-suggestion guides. Preserve historical chat exports, interviews, source bundles and visual assets; their contents are not newly validated by this release.

All 188 automated tests and a fresh production build pass. Read-only production GET checks return 200 for the root, sunscreen, water bottles, admin login and health; anonymous inventory, suggestions and feedback return 401. Eight current admin assets exactly match source. No production records were changed during this documentation update. Lint was not rerun; version 41 recorded four errors and nine warnings, so this update makes no clean-lint claim.

Unattended research execution remains unverified; Sites currently lists no attached schedules. Source provenance does not establish endorsement accuracy or Google rank, and photos require visual review. Real production email-code inbox delivery, signed-in profile-photo upload, full screen-reader/physical-device accessibility, exhaustive matching and broad abuse/load tests remain outstanding. No new demand, retention, revenue or purchase outcome is established.

Release details and application checkpoint: <mention url="https://app.notion.com/p/40cd2a3caa8a812d83f4f3d13065be2d">Release Notes & Changelog</mention>. Earlier dated sections below are retained as history and superseded where they differ.

---

# Source Files & Migration Coverage

Notion: https://app.notion.com/p/40ad2a3caa8a81d0aa28ea8f64068f1e

## Documentation status — <date start="2026-11-08" />, version 50

Sites version 50 is deployed at [Vouch](https://v4ch.app), source `cd5ba45f12d0fa29da0df441209efa6a0d05fb33`, deployment `appgdep_6af00aae41948191a294a21a3d8708d0`, environment revision 6. It succeeded on <date start="2026-11-08" /> at 12:37 AM America/New_York. This documentation update covers deployed versions 42–50 since version 41.

Changed modules cover admin authentication/routes, experiment product/lifecycle APIs and storage cleanup, account/public discovery boundaries, research evidence/diagnostics/recovery, suggestion UI and catalog photo caching/alias traversal. The reviewed range adds no package dependency or schema migration. PIN sessions and deletion markers use the existing durable store. Separate the deployed application SHA from documentation changes.

All 188 automated tests and a fresh production build pass. Read-only production GET checks return 200 for the root, sunscreen, water bottles, admin login and health; anonymous inventory, suggestions and feedback return 401. Eight current admin assets exactly match source. No production records were changed during this documentation update. Lint was not rerun; version 41 recorded four errors and nine warnings, so this update makes no clean-lint claim.

Unattended research execution remains unverified; Sites currently lists no attached schedules. Source provenance does not establish endorsement accuracy or Google rank, and photos require visual review. Real production email-code inbox delivery, signed-in profile-photo upload, full screen-reader/physical-device accessibility, exhaustive matching and broad abuse/load tests remain outstanding. No new demand, retention, revenue or purchase outcome is established.

Release details and application checkpoint: <mention url="https://app.notion.com/p/40cd2a3caa8a812d83f4f3d13065be2d">Release Notes & Changelog</mention>. Earlier dated sections below are retained as history and superseded where they differ.

---

# 🔎 User Research

Notion: https://app.notion.com/p/40ad2a3caa8a8119a7d8f5c26393c2c6

## Documentation status — <date start="2026-11-08" />, version 50

Sites version 50 is deployed at [Vouch](https://v4ch.app), source `cd5ba45f12d0fa29da0df441209efa6a0d05fb33`, deployment `appgdep_6af00aae41948191a294a21a3d8708d0`, environment revision 6. It succeeded on <date start="2026-11-08" /> at 12:37 AM America/New_York. This documentation update covers deployed versions 42–50 since version 41.

No new interview or survey evidence is created by these releases. Usability questions now include PIN re-entry/locking, visual source review, manual photo correction, lineup changes and destructive-action comprehension. Source-channel checks are organizer research metadata; browser support, private draft completion and a successful deployment do not demonstrate retained demand.

All 188 automated tests and a fresh production build pass. Read-only production GET checks return 200 for the root, sunscreen, water bottles, admin login and health; anonymous inventory, suggestions and feedback return 401. Eight current admin assets exactly match source. No production records were changed during this documentation update. Lint was not rerun; version 41 recorded four errors and nine warnings, so this update makes no clean-lint claim.

Unattended research execution remains unverified; Sites currently lists no attached schedules. Source provenance does not establish endorsement accuracy or Google rank, and photos require visual review. Real production email-code inbox delivery, signed-in profile-photo upload, full screen-reader/physical-device accessibility, exhaustive matching and broad abuse/load tests remain outstanding. No new demand, retention, revenue or purchase outcome is established.

Release details and application checkpoint: <mention url="https://app.notion.com/p/40cd2a3caa8a812d83f4f3d13065be2d">Release Notes & Changelog</mention>. Earlier dated sections below are retained as history and superseded where they differ.

---

# Admin Portal — Operations & Tables

Notion: https://app.notion.com/p/410d2a3caa8a81068d70fdf63eed12ae

## Documentation status — <date start="2026-11-08" />, version 50

Sites version 50 is deployed at [Vouch](https://v4ch.app), source `cd5ba45f12d0fa29da0df441209efa6a0d05fb33`, deployment `appgdep_6af00aae41948191a294a21a3d8708d0`, environment revision 6. It succeeded on <date start="2026-11-08" /> at 12:37 AM America/New_York. This documentation update covers deployed versions 42–50 since version 41.

Hosted admin access now uses a server-configured four-digit PIN instead of the previous ChatGPT sign-in/email allowlist. Sessions last a fixed 24 hours; Lock admin revokes the session, and changing the PIN invalidates prior sessions. Cookies are Secure, HttpOnly and SameSite=Strict; only random-token hashes are stored. Five failed attempts per IP-derived bucket in 15 minutes trigger a temporary block. Admin writes require same origin. Participant email-code accounts remain separate.

Experiment details now open Products, Settings and Participation, Missing Products, and Community Additions. Products supports name/URL/manual additions, photo URLs, reorder and removal with revision checks; removal preserves history and re-adding the same identity preserves its votes. Keep at least one product, at most 32, and one per brand. Live additions and reactivation require photos. Disable hides public access and overall participation while retaining data; Reactivate keeps the schedule. Permanent Delete requires the exact path and clears experiment activity and its associated suggestion, reserves the path, and retains shared products/personal opinions. Interrupted cleanup stays disabled for retry. Recoverable suggestion deletion is a separate action.

Suggestion review now has Product lineup, Research & sources, and Details & history tabs. Photo cards show missing images and researched-model differences; channel cards expose accepted coverage, source limitations and expandable evidence. Selected tabs and reading sections survive polling. List rows use Review; refresh/reject/delete live under More actions. Find missing photos reports progress and Add photo focuses the URL field. Admin product fields retain the corrected layout.

Find missing photos checks the category, broader catalog, then saved product URL, requiring the same normalized brand and every model word. Up to ten missing items are checked per request, three at a time, with per-item results and manual Add photo fallback. Provider identities, research names and order are preserved. Organizer photo overrides survive storage/hydration; cached searches refresh snapshots and bounded duplicate-alias resolution prevents photo loss. Inspect images for model accuracy and availability.

Suggestions retain recoverable Delete/Restore. Recover saved research polls the saved provider response without starting another paid request; Refresh research requests a new attempt. Diagnostics remain organizer-only. Draft publication requires the current lineup to pass every source/photo check.

All 188 automated tests and a fresh production build pass. Read-only production GET checks return 200 for the root, sunscreen, water bottles, admin login and health; anonymous inventory, suggestions and feedback return 401. Eight current admin assets exactly match source. No production records were changed during this documentation update. Lint was not rerun; version 41 recorded four errors and nine warnings, so this update makes no clean-lint claim.

Unattended research execution remains unverified; Sites currently lists no attached schedules. Source provenance does not establish endorsement accuracy or Google rank, and photos require visual review. Real production email-code inbox delivery, signed-in profile-photo upload, full screen-reader/physical-device accessibility, exhaustive matching and broad abuse/load tests remain outstanding. No new demand, retention, revenue or purchase outcome is established.

Release details and application checkpoint: <mention url="https://app.notion.com/p/40cd2a3caa8a812d83f4f3d13065be2d">Release Notes & Changelog</mention>. Earlier dated sections below are retained as history and superseded where they differ.

---

# Category Suggestions — Research, Drafts & Approval

Notion: https://app.notion.com/p/410d2a3caa8a81d9bab8e460f1aed49e

## Documentation status — <date start="2026-11-08" />, version 50

Sites version 50 is deployed at [Vouch](https://v4ch.app), source `cd5ba45f12d0fa29da0df441209efa6a0d05fb33`, deployment `appgdep_6af00aae41948191a294a21a3d8708d0`, environment revision 6. It succeeded on <date start="2026-11-08" /> at 12:37 AM America/New_York. This documentation update covers deployed versions 42–50 since version 41.

Research targets ten distinct brands with TikTok, Wirecutter, Google-first-organic-result and AI coverage tied to exact products. One Wirecutter brand is required, two preferred; Google must add a different brand. Returned source metadata establishes provenance only. Organizer-checked evidence is marked and timestamped. Missing sources or photos for any final-lineup product block approval, including legacy drafts. Invalid evidence becomes a private warning without discarding valid picks. Saved-response recovery avoids another model start; Refresh research starts a new budgeted attempt. Limits are 16,000 output tokens, 16 tool calls and 20 starts per Eastern day.

Find missing photos checks the category, broader catalog, then saved product URL, requiring the same normalized brand and every model word. Up to ten missing items are checked per request, three at a time, with per-item results and manual Add photo fallback. Provider identities, research names and order are preserved. Organizer photo overrides survive storage/hydration; cached searches refresh snapshots and bounded duplicate-alias resolution prevents photo loss. Inspect images for model accuracy and availability.

Suggestion review now has Product lineup, Research & sources, and Details & history tabs. Photo cards show missing images and researched-model differences; channel cards expose accepted coverage, source limitations and expandable evidence. Selected tabs and reading sections survive polling. List rows use Review; refresh/reject/delete live under More actions. Find missing photos reports progress and Add photo focuses the URL field. Admin product fields retain the corrected layout.

Recover saved research is available for eligible failed jobs with a saved response and no accepted research; it refreshes the processing window without another start. Diagnostics expose classified completion/output-limit/validation failures. It cannot overwrite a live Edit. Refresh research remains the separate budgeted action. A generated draft is private and never automatically published.

All 188 automated tests and a fresh production build pass. Read-only production GET checks return 200 for the root, sunscreen, water bottles, admin login and health; anonymous inventory, suggestions and feedback return 401. Eight current admin assets exactly match source. No production records were changed during this documentation update. Lint was not rerun; version 41 recorded four errors and nine warnings, so this update makes no clean-lint claim.

Unattended research execution remains unverified; Sites currently lists no attached schedules. Source provenance does not establish endorsement accuracy or Google rank, and photos require visual review. Real production email-code inbox delivery, signed-in profile-photo upload, full screen-reader/physical-device accessibility, exhaustive matching and broad abuse/load tests remain outstanding. No new demand, retention, revenue or purchase outcome is established.

Release details and application checkpoint: <mention url="https://app.notion.com/p/40cd2a3caa8a812d83f4f3d13065be2d">Release Notes & Changelog</mention>. Earlier dated sections below are retained as history and superseded where they differ.

---

# Mission Statement

Notion: https://app.notion.com/p/40ad2a3caa8a81c5abeed1d64e0bb96e

## Documentation status — <date start="2026-11-08" />, version 50

Sites version 50 is deployed at [Vouch](https://v4ch.app), source `cd5ba45f12d0fa29da0df441209efa6a0d05fb33`, deployment `appgdep_6af00aae41948191a294a21a3d8708d0`, environment revision 6. It succeeded on <date start="2026-11-08" /> at 12:37 AM America/New_York. This documentation update covers deployed versions 42–50 since version 41.

Vouch continues to use human experience for public recommendations. AI now prepares private category research for organizer review; it does not set participant rankings or validate trust, fit or purchase benefit. Versions 42–50 improve preparation and operations within the existing mission; the mission text below is unchanged.

All 188 automated tests and a fresh production build pass. Read-only production GET checks return 200 for the root, sunscreen, water bottles, admin login and health; anonymous inventory, suggestions and feedback return 401. Eight current admin assets exactly match source. No production records were changed during this documentation update. Lint was not rerun; version 41 recorded four errors and nine warnings, so this update makes no clean-lint claim.

Unattended research execution remains unverified; Sites currently lists no attached schedules. Source provenance does not establish endorsement accuracy or Google rank, and photos require visual review. Real production email-code inbox delivery, signed-in profile-photo upload, full screen-reader/physical-device accessibility, exhaustive matching and broad abuse/load tests remain outstanding. No new demand, retention, revenue or purchase outcome is established.

Release details and application checkpoint: <mention url="https://app.notion.com/p/40cd2a3caa8a812d83f4f3d13065be2d">Release Notes & Changelog</mention>. Earlier dated sections below are retained as history and superseded where they differ.

---

# Business Model Exploration

Notion: https://app.notion.com/p/40ad2a3caa8a8141bda6efede7c356e6

## Documentation status — <date start="2026-11-08" />, version 50

Sites version 50 is deployed at [Vouch](https://v4ch.app), source `cd5ba45f12d0fa29da0df441209efa6a0d05fb33`, deployment `appgdep_6af00aae41948191a294a21a3d8708d0`, environment revision 6. It succeeded on <date start="2026-11-08" /> at 12:37 AM America/New_York. This documentation update covers deployed versions 42–50 since version 41.

The new research/photo checks introduce operating work that must be measured before category expansion. The cap of 20 model starts per day is not a dollar-spend cap; inaccessible sources and manual image review can constrain throughput. Affiliate commerce and premium/business offerings remain hypotheses. Price, commission and affiliate economics do not select or rank research candidates.

All 188 automated tests and a fresh production build pass. Read-only production GET checks return 200 for the root, sunscreen, water bottles, admin login and health; anonymous inventory, suggestions and feedback return 401. Eight current admin assets exactly match source. No production records were changed during this documentation update. Lint was not rerun; version 41 recorded four errors and nine warnings, so this update makes no clean-lint claim.

Unattended research execution remains unverified; Sites currently lists no attached schedules. Source provenance does not establish endorsement accuracy or Google rank, and photos require visual review. Real production email-code inbox delivery, signed-in profile-photo upload, full screen-reader/physical-device accessibility, exhaustive matching and broad abuse/load tests remain outstanding. No new demand, retention, revenue or purchase outcome is established.

Release details and application checkpoint: <mention url="https://app.notion.com/p/40cd2a3caa8a812d83f4f3d13065be2d">Release Notes & Changelog</mention>. Earlier dated sections below are retained as history and superseded where they differ.

---

# Pitch & Storytelling

Notion: https://app.notion.com/p/40ad2a3caa8a81b49c07ec91179f56fe

## Documentation status — <date start="2026-11-08" />, version 50

Sites version 50 is deployed at [Vouch](https://v4ch.app), source `cd5ba45f12d0fa29da0df441209efa6a0d05fb33`, deployment `appgdep_6af00aae41948191a294a21a3d8708d0`, environment revision 6. It succeeded on <date start="2026-11-08" /> at 12:37 AM America/New_York. This documentation update covers deployed versions 42–50 since version 41.

Current demo capability includes category suggestions, private source/photo-reviewed drafts, editable experiments, PIN-protected admin and visual review tools alongside verdicts, standings and optional collections. Do not describe generated research as independent testing, automatic public launches, validated demand or revenue. The submitted deck and historical scripts retain their original contents/status.

All 188 automated tests and a fresh production build pass. Read-only production GET checks return 200 for the root, sunscreen, water bottles, admin login and health; anonymous inventory, suggestions and feedback return 401. Eight current admin assets exactly match source. No production records were changed during this documentation update. Lint was not rerun; version 41 recorded four errors and nine warnings, so this update makes no clean-lint claim.

Unattended research execution remains unverified; Sites currently lists no attached schedules. Source provenance does not establish endorsement accuracy or Google rank, and photos require visual review. Real production email-code inbox delivery, signed-in profile-photo upload, full screen-reader/physical-device accessibility, exhaustive matching and broad abuse/load tests remain outstanding. No new demand, retention, revenue or purchase outcome is established.

Release details and application checkpoint: <mention url="https://app.notion.com/p/40cd2a3caa8a812d83f4f3d13065be2d">Release Notes & Changelog</mention>. Earlier dated sections below are retained as history and superseded where they differ.

---

# Value Proposition Canvas — Purchaser & Reviewer

Notion: https://app.notion.com/p/40ad2a3caa8a81f5b590fd810d935f42

## Documentation status — <date start="2026-11-08" />, version 50

Sites version 50 is deployed at [Vouch](https://v4ch.app), source `cd5ba45f12d0fa29da0df441209efa6a0d05fb33`, deployment `appgdep_6af00aae41948191a294a21a3d8708d0`, environment revision 6. It succeeded on <date start="2026-11-08" /> at 12:37 AM America/New_York. This documentation update covers deployed versions 42–50 since version 41.

Category suggestions and private draft tooling expand the available test surfaces. Source/photograph review and editable lineups help the organizer prepare experiments; their value to participants and their effect on repeat contribution still need measurement. Existing canvases remain hypotheses; no new gain/pain validation is claimed.

All 188 automated tests and a fresh production build pass. Read-only production GET checks return 200 for the root, sunscreen, water bottles, admin login and health; anonymous inventory, suggestions and feedback return 401. Eight current admin assets exactly match source. No production records were changed during this documentation update. Lint was not rerun; version 41 recorded four errors and nine warnings, so this update makes no clean-lint claim.

Unattended research execution remains unverified; Sites currently lists no attached schedules. Source provenance does not establish endorsement accuracy or Google rank, and photos require visual review. Real production email-code inbox delivery, signed-in profile-photo upload, full screen-reader/physical-device accessibility, exhaustive matching and broad abuse/load tests remain outstanding. No new demand, retention, revenue or purchase outcome is established.

Release details and application checkpoint: <mention url="https://app.notion.com/p/40cd2a3caa8a812d83f4f3d13065be2d">Release Notes & Changelog</mention>. Earlier dated sections below are retained as history and superseded where they differ.

---

# Vouch North Star

Notion: https://app.notion.com/p/3d4d2a3caa8a8195bd47c6c3eb880c33

## Documentation status — <date start="2026-11-08" />, version 50

Sites version 50 is deployed at [Vouch](https://v4ch.app), source `cd5ba45f12d0fa29da0df441209efa6a0d05fb33`, deployment `appgdep_6af00aae41948191a294a21a3d8708d0`, environment revision 6. It succeeded on <date start="2026-11-08" /> at 12:37 AM America/New_York. This documentation update covers deployed versions 42–50 since version 41.

Human experience remains the authority for public vote rankings. AI category research is private organizer preparation with source/photo gates and explicit publication approval. The broader following, personalized fit, reputation and rewards vision retains its hypothesis status; these operating releases do not prove adoption or better purchases.

All 188 automated tests and a fresh production build pass. Read-only production GET checks return 200 for the root, sunscreen, water bottles, admin login and health; anonymous inventory, suggestions and feedback return 401. Eight current admin assets exactly match source. No production records were changed during this documentation update. Lint was not rerun; version 41 recorded four errors and nine warnings, so this update makes no clean-lint claim.

Unattended research execution remains unverified; Sites currently lists no attached schedules. Source provenance does not establish endorsement accuracy or Google rank, and photos require visual review. Real production email-code inbox delivery, signed-in profile-photo upload, full screen-reader/physical-device accessibility, exhaustive matching and broad abuse/load tests remain outstanding. No new demand, retention, revenue or purchase outcome is established.

Release details and application checkpoint: <mention url="https://app.notion.com/p/40cd2a3caa8a812d83f4f3d13065be2d">Release Notes & Changelog</mention>. Earlier dated sections below are retained as history and superseded where they differ.

---

# Business Model Canvas

Notion: https://app.notion.com/p/40ad2a3caa8a81efa717cdb2fb77f159

## Documentation status — <date start="2026-11-08" />, version 50

Sites version 50 is deployed at [Vouch](https://v4ch.app), source `cd5ba45f12d0fa29da0df441209efa6a0d05fb33`, deployment `appgdep_6af00aae41948191a294a21a3d8708d0`, environment revision 6. It succeeded on <date start="2026-11-08" /> at 12:37 AM America/New_York. This documentation update covers deployed versions 42–50 since version 41.

New operating costs include research requests, source verification, exact-model photo matching and organizer moderation. Measure them alongside acquisition, repeat use and any disclosed affiliate revenue before expanding categories. The 20-start daily cap does not cap dollar spend. Pricing/commission never determine candidate selection or public vote scores; no business model is validated.

All 188 automated tests and a fresh production build pass. Read-only production GET checks return 200 for the root, sunscreen, water bottles, admin login and health; anonymous inventory, suggestions and feedback return 401. Eight current admin assets exactly match source. No production records were changed during this documentation update. Lint was not rerun; version 41 recorded four errors and nine warnings, so this update makes no clean-lint claim.

Unattended research execution remains unverified; Sites currently lists no attached schedules. Source provenance does not establish endorsement accuracy or Google rank, and photos require visual review. Real production email-code inbox delivery, signed-in profile-photo upload, full screen-reader/physical-device accessibility, exhaustive matching and broad abuse/load tests remain outstanding. No new demand, retention, revenue or purchase outcome is established.

Release details and application checkpoint: <mention url="https://app.notion.com/p/40cd2a3caa8a812d83f4f3d13065be2d">Release Notes & Changelog</mention>. Earlier dated sections below are retained as history and superseded where they differ.

---

# Pitch Copy & Narrative Notes

Notion: https://app.notion.com/p/40ad2a3caa8a81cdae73fe299fb1e463

## Documentation status — <date start="2026-11-08" />, version 50

Sites version 50 is deployed at [Vouch](https://v4ch.app), source `cd5ba45f12d0fa29da0df441209efa6a0d05fb33`, deployment `appgdep_6af00aae41948191a294a21a3d8708d0`, environment revision 6. It succeeded on <date start="2026-11-08" /> at 12:37 AM America/New_York. This documentation update covers deployed versions 42–50 since version 41.

The latest demonstrable capabilities add private category research with source/photo approval gates, experiment curation/lifecycle controls, visual suggestion review and remembered admin PIN sessions. Public boards remain based on participant votes. Do not reuse historical claims of personalization, expert validation, automated public launches, demand or revenue as current facts. The historical script below is preserved.

All 188 automated tests and a fresh production build pass. Read-only production GET checks return 200 for the root, sunscreen, water bottles, admin login and health; anonymous inventory, suggestions and feedback return 401. Eight current admin assets exactly match source. No production records were changed during this documentation update. Lint was not rerun; version 41 recorded four errors and nine warnings, so this update makes no clean-lint claim.

Unattended research execution remains unverified; Sites currently lists no attached schedules. Source provenance does not establish endorsement accuracy or Google rank, and photos require visual review. Real production email-code inbox delivery, signed-in profile-photo upload, full screen-reader/physical-device accessibility, exhaustive matching and broad abuse/load tests remain outstanding. No new demand, retention, revenue or purchase outcome is established.

Release details and application checkpoint: <mention url="https://app.notion.com/p/40cd2a3caa8a812d83f4f3d13065be2d">Release Notes & Changelog</mention>. Earlier dated sections below are retained as history and superseded where they differ.

