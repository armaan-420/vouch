# Experiment attribution and early tester recognition

## Implemented behavior

- Flow: product answers → optional nominations → skippable name/email form (both required on submit) → rankings. Existing profiles bypass the form; skipping creates no profile. Results remain open.
- Native, labeled name/email fields use `autocomplete="name"` / `autocomplete="email"`, meaningful field names, email input mode, and a real form with autocomplete enabled. Values survive timer updates and failed submissions. Actual autofill suggestions depend on the browser’s saved contact data and settings.
- The form states that the submitted name appears with item vouches by default. Profile → Who sees your name controls whether public product contributions carry a name/profile link or appear anonymously. Hidden identities have no public profile or photo access.
- Wharton early tester comes from an exact, case-insensitive `@wharton.upenn.edu` email domain. No verification or community-results gate. Badge is self-reported participation recognition; category expertise is not implemented.
- Attribution requests save the normalized email privately with the profile. They do not send a code or log request bodies. The form has no badge invitation or email-discard copy. The address is visible only to the owner and is excluded from public responses. Email-code sign-in stores the verified address privately alongside its existing hashed lookup.
- Browser profiles are immediately editable with their random HttpOnly browser credential. Subsequent code sign-in can recover one matching new profile from another browser after verification. Existing verified accounts never sweep in unrelated matching unverified submissions. Multiple pending matches are not auto-merged. Same-browser ownership still supports explicit matching profile attachment. Existing privacy choices are preserved.
- Only the current experiment’s completed responses are attached; unrelated anonymous history is not swept in, and original experiment votes and scores are not modified. Explicit per-product privacy survives later verdict changes.

## Validation

- All 216 automated tests passed, including private email retention, verified cross-browser recovery, and protection of existing accounts. Integration coverage: exact-domain badge matching, complete-answer requirement, request-origin checks, private email storage and public email exclusion, public item-only attribution, idempotent retry, isolation/logout, name hiding and public filtering, and email-account promotion.
- Photo tests cover hidden-name public photo denial with continued owner access.
- Local browser smoke passed and covers 320/390/1280px layouts, form fields, failed-save recovery, skip/non-Wharton paths, badge display, persistent profile control, public API privacy, and absence of the old signup popup. Screenshots stay in ignored outputs.
- The production build passed. No real production participant is created as part of QA.

## Status

Published November 11, 2026 in Sites version 63 at https://v4ch.app. Implementation commit: `44ddce35519fbf4cf748c8d8f4cbe94baa0d279e`; published combined source: `fb70eb6c6f7ff2c3701723b6a52455a0de06d65c`. Native deployment succeeded. Read-only production checks passed for the experiment page, new form script, profile controls, styles, and anonymous account status. Email-retention revision implemented and checked after version 63; revised publication pending. Local browser checks also passed for code sign-in from a fresh browser and private email display. Previously discarded addresses cannot be recovered. Native browser autofill menus using a real saved personal contact were not exercised. No Notion release-note publication was requested.
