# Experiment attribution and early tester recognition

## Implemented behavior

- Flow: product answers → optional nominations → optional name/email form → rankings. Existing profiles bypass the form; skipping creates no profile. Results remain open.
- Native, labeled name/email fields use `autocomplete="name"` / `autocomplete="email"`, meaningful field names, email input mode, and a real form with autocomplete enabled. Values survive timer updates and failed submissions. Actual autofill suggestions depend on the browser’s saved contact data and settings.
- The form states that the submitted name appears with item vouches by default. Profile → Who sees your name controls whether public product contributions carry a name/profile link or appear anonymously. Hidden identities have no public profile or photo access.
- Wharton early tester comes from an exact, case-insensitive `@wharton.upenn.edu` email domain. No verification or community-results gate. Badge is self-reported participation recognition; category expertise is not implemented.
- Attribution requests do not persist the email or a derived email identifier, send email, or log request bodies. Only the badge flag is retained. Independent email sign-in still uses its existing hashed email identifier and code delivery.
- Browser profiles are editable only with their random HttpOnly browser credential. Signing out/clearing cookies removes access. Same-browser email sign-in attaches the browser profile to the verified account. Existing target-account privacy and per-product visibility choices are preserved.
- Only the current experiment’s completed responses are attached; unrelated anonymous history is not swept in, and original experiment votes and scores are not modified. Explicit per-product privacy survives later verdict changes.

## Validation

- All 210 automated tests passed. Integration coverage: exact-domain badge matching, complete-answer requirement, request-origin checks, no stored email/email hash, public item-only attribution, idempotent retry, isolation/logout, name hiding and public filtering, and email-account promotion.
- Photo tests cover hidden-name public photo denial with continued owner access.
- Local browser smoke passed and covers 320/390/1280px layouts, form fields, failed-save recovery, skip/non-Wharton paths, badge display, persistent profile control, public API privacy, and absence of the old signup popup. Screenshots stay in ignored outputs.
- The production build passed. No real production participant is created as part of QA.

## Status

Implemented locally; publication pending. Native browser autofill menus using a real saved personal contact were not exercised. No Notion release-note publication was requested.
