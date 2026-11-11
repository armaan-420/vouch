# Experiment attribution and early tester recognition

## Simple account creation

`/account` now has a Name/Email form with native autofill, required fields, Skip, and a preview of item vouches. Desktop uses two columns; mobile stacks the preview below the form. Submit uses `/api/account/signup` to save the previewed current-experiment responses and open the profile directly. No code or additional publication checklist interrupts new account creation. An empty or partial collection is supported. Preview tokens bind the browser, experiment and exact response snapshot, so stale/foreign previews cannot be claimed. Existing privacy, email storage and badge rules apply.

`/account?signin=1` and the Already have an account link preserve verification-code sign-in for returning users. Header Sign in links select that mode. Existing accounts can still explicitly review unclaimed picks.

The expanded 218-test suite passed. Browser checks passed at phone and desktop sizes, including simple signup, required/autofill fields, preview contents, failed-save recovery, direct profile landing, no-picks skip and returning code sign-in. The production build passed. Published November 11, 2026 in Sites version 65 from `0f62155a04c53bcfb98f6b99f53b9e7551916aea`. Native deployment succeeded, and read-only checks confirmed the live account page, signup and preview script, responsive styles and separate Sign in links.

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

Published November 11, 2026 in Sites version 64 at https://v4ch.app. Source: `1834331b29de5ce6786a379a2f0d4283b9a7699c`. Native deployment succeeded; read-only live checks confirmed the form copy, required fields, private profile email UI and updated privacy explanation. All 216 automated tests, local phone/desktop browser checks (including fresh-browser code sign-in), and the production build passed. Actual production email delivery was not exercised, and native autofill menus using a saved personal contact were not exercised.

Version 63 introduced the initial browser-only attribution flow; version 64 supersedes its email-discard behavior. Previously discarded addresses cannot be recovered. No Notion release-note publication was requested.
