# Sign-in and account entry

Approved November 16, 2026. Release/deployment evidence is recorded in the dated release notes; earlier visual briefs and previews are historical sources.

- Route: `/account?signin=1` (also the anonymous `/account` flow).
- Form: “WELCOME TO VOUCH”, “Your taste. Your people.”, then “Sign in or join with your email. No password.” The italic second line uses Instrument Serif. The email placeholder is “Enter your email address.” The form has a 52px email field, lime focus outline, full-width 52px Ink button and a six-digit-code help line.
- Phones below 768px: no illustration or Sample activity label. No reserved blank space between headline and sign-in copy.
- Tablets 768–899px: the compact fan sits to the right of the headline and behind overlapping text; the eyebrow stays above both. The sample label remains visible and clear of the intro.
- Desktop 900px and above: two columns with a 420px form and warm `#ECE8DC` illustration panel. The static fan uses Jon / Stanley IceFlow (Pass), Maya / Owala FreeSip (illustrative 9.1), Priya / Hydro Flask Wide Mouth (illustrative 8.7), in that DOM order. Initials are JL, MK and PR. Center card is visually foremost. Products use local cutout images and empty thumbnail alt text; names and captions are text. No accounts, votes or private records feed this panel.
- Code step: “Check your email.”, escaped recipient email, ten-minute expiry, a single numeric input styled as six cells, paste/autofill and automatic six-digit verification, plus the manual verify button. Resend is disabled for 30 seconds; Change email restores the email step. Pending provisional verification retains its existing restriction on changing the saved email.
- All four account entry screens share the panel. Local-only test inbox and code remain visibly labeled. Focus moves to the headline on email/code transitions. Email focus scrolls the form into view for compact viewports. Fan angles are static composition; reduced motion has no entrance/hover transitions.

## Verification scope

309 automated tests pass, including static sample markup, DOM order and 30-second cooldown boundary/hourly cap checks. Local Chromium checks cover 320, 393, 767, 768, 834, 1024 and 1440px widths, phone illustration hiding, tablet/desktop visibility, no horizontal overflow, tight headline spacing and a 393×500 simulated keyboard viewport. Earlier local checks exercise email → code → signup → profile, returning sign-in, pending verification, code autosubmit, resend and Change email. Fixture records remain in ignored local `.data/` directories.

Real production email receipt/code sign-in, a physical mobile keyboard and a full screen-reader audit remain unverified. Production verification for this release uses GET requests only.

## Owning files

`public/accounts.js`, `public/accounts.css`, `lib/account-auth.mjs`; regression tests in `test/accounts.test.mjs` and `test/account-auth.test.mjs`.
