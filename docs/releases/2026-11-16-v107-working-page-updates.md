# Product definition

Destination: https://app.notion.com/p/40ad2a3caa8a8160afd6e082d848f7f7

## Current implementation — <date start="2026-11-16" />, version 107

Deployed at [Vouch](https://v4ch.app/account?signin=1). This update supersedes older sign-in and branding descriptions below; prior dated entries remain history.

Email entry uses “Your taste. Your people.” and the generic placeholder “Enter your email address.” Below 768px there is no illustration and no reserved headline spacer. Tablets at 768–899px show a compact fan beside/behind the heading; at 900px and above it occupies a warm paper panel beside the 420px form. Code entry, account creation and pending verification share this layout. The example cards are static fictional people and water-bottle products, clearly labeled “Sample activity”; they do not establish real usage or recommendations.

The code screen changes the heading to “Check your email.” with heading focus, a single paste/autofill-friendly six-digit field, automatic submission and a manual verify button. Resend opens after 30 seconds on client and server. Ten-minute expiry, verification attempt limits and hourly send caps remain. Phone keyboard scrolling is checked only with an emulated compact viewport. Production email receipt/code verification remains unverified.

The approved italic-v branding from version 106 is retained. Pending search/navigation/Vouch-pill edits are excluded from version 107. All 309 tests and the production build pass; production assets and responsive screens were verified read-only.

Release evidence and exact source: <mention url="https://app.notion.com/p/40cd2a3caa8a812d83f4f3d13065be2d">Release Notes & Changelog</mention>.


---

# Visual style

Destination: https://app.notion.com/p/40ad2a3caa8a813f823ed60828358479

## Current implementation — <date start="2026-11-16" />, version 107

Deployed at [Vouch](https://v4ch.app/account?signin=1). This update supersedes older sign-in and branding descriptions below; prior dated entries remain history.

Branding uses Paper #F6F4EA, Ink #292D24 and Lime #D7ED68, with Instrument Serif display text and DM Sans UI. Product headers use the approved tilted lime italic-v emblem before the lowercase wordmark. The former asterisk mark is retired; outlined brand assets, favicons, Apple touch icon and manifest were deployed in version 106 and are retained.

Final sign-in layout: below 768px, hide the entire polaroid illustration and sample label; keep the welcome eyebrow above the two-line headline and the intro immediately below it. At 768–899px the fan sits to the right, behind any overlapping headline text, with its sample label clear of the intro. At 900px and above use the warm #ECE8DC panel, no dark slab, beside the form.

The fan is product-first: Jon / Stanley IceFlow, Maya / Owala FreeSip, Priya / Hydro Flask Wide Mouth, in that DOM order. The center card is visually foremost. Short captions, two-letter initials and large bottle photos replace the former notification rows; Jon has an outline Pass tag, Maya/Priya have illustrative 9.1/8.7 lime score circles. Use “Sample activity” whenever the fan is shown. Examples are static, with no real visitor/account/vote lookup. Static fan angles remain under reduced motion; no hover or entrance movement is added.

The email field says “Enter your email address.” The former fixed-height headline spacer is removed. Current production browser checks cover 320–1440px without horizontal overflow, including phone hiding and tablet/desktop display. A physical keyboard and full screen-reader audit remain unverified.

Release evidence and exact source: <mention url="https://app.notion.com/p/40cd2a3caa8a812d83f4f3d13065be2d">Release Notes & Changelog</mention>.


---

# Documentation guide

Destination: https://app.notion.com/p/40ad2a3caa8a81b391a8d5f39f92a74f

## Documentation status — <date start="2026-11-16" />, version 107

Version 107 is deployed successfully at [Vouch](https://v4ch.app). Exact packaged source: <code>d14b86b2a52dc1cb8038666c05ff79163cbf7a14</code>; deployment <code>appgdep_6afba49ac46c8191945de1ee2a42aa52</code>; environment revision 7. This requested update covers the already-live logo rollout in version 106 and the approved responsive sign-in changes in version 107 since documented version 104. Version 105 is saved without an attached deployment. Unrelated uncommitted navigation/search/Vouch-pill edits remain outside this publication.

The canonical release notes, working product definition and visual guide are updated with the final design: no phone illustration, inline tablet fan, desktop paper panel, generic email placeholder, tighter headline spacing and 30-second resend. Local AUTH_SETUP.md, ACCOUNT_PREVIEW.md and docs/signin.md describe the same behavior. Historical source briefs and dated entries are preserved. All 309 tests and the production build pass; production checks use GET only and six deployed assets match source. Real inbox receipt/code sign-in, a physical keyboard and a full screen-reader audit remain unverified.

Advance local and Notion checkpoints only after publication succeeds; later documentation-only commits do not change the deployed application SHA. The workflow remains on request, with no background watcher.

Release evidence and exact source: <mention url="https://app.notion.com/p/40cd2a3caa8a812d83f4f3d13065be2d">Release Notes & Changelog</mention>.


---

# Documentation maintenance

Destination: https://app.notion.com/p/40ad2a3caa8a81e6b78cf477ecd6f6f2

## Documentation status — <date start="2026-11-16" />, version 107

Version 107 is deployed successfully at [Vouch](https://v4ch.app). Exact packaged source: <code>d14b86b2a52dc1cb8038666c05ff79163cbf7a14</code>; deployment <code>appgdep_6afba49ac46c8191945de1ee2a42aa52</code>; environment revision 7. This requested update covers the already-live logo rollout in version 106 and the approved responsive sign-in changes in version 107 since documented version 104. Version 105 is saved without an attached deployment. Unrelated uncommitted navigation/search/Vouch-pill edits remain outside this publication.

The canonical release notes, working product definition and visual guide are updated with the final design: no phone illustration, inline tablet fan, desktop paper panel, generic email placeholder, tighter headline spacing and 30-second resend. Local AUTH_SETUP.md, ACCOUNT_PREVIEW.md and docs/signin.md describe the same behavior. Historical source briefs and dated entries are preserved. All 309 tests and the production build pass; production checks use GET only and six deployed assets match source. Real inbox receipt/code sign-in, a physical keyboard and a full screen-reader audit remain unverified.

Advance local and Notion checkpoints only after publication succeeds; later documentation-only commits do not change the deployed application SHA. The workflow remains on request, with no background watcher.

Release evidence and exact source: <mention url="https://app.notion.com/p/40cd2a3caa8a812d83f4f3d13065be2d">Release Notes & Changelog</mention>.
