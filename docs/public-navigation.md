# Public navigation

Updated November 16, 2026 at Armaan's request. The shared header uses Explore (`/categories`), Leaderboard (`/community-leaderboard`) and Products (`/search`) in that order. Desktop shows the links directly; mobile exposes the same three destinations in the menu. Active destinations have an underline. The account control and contextual product search remain available.

The layout takes inspiration from The Infatuation's clear brand/navigation separation, compact controls and active-link underline, while retaining Vouch typography and colors. Reference: https://www.theinfatuation.com/philadelphia.

Suggest a category, Give feedback, The board and Your collection are removed from the shared navigation. Their underlying functionality is retained for possible future restoration. Contextual in-page actions and the voting flow's Board exit are unchanged. Product discovery now uses the shared header rather than a separate navigation layout.

The early-tester banner above collection Boards is removed. Historical early-tester badges remain on profiles and the contributor leaderboard.

The sticky header hides after downward scrolling and returns when scrolling upward. It remains visible near the top, while its controls have keyboard focus, while search/menu panels are open, and while a modal is open. Reduced-motion settings disable the transition. Overscroll is clamped and direction thresholds avoid jitter; the header stays in layout to prevent content jumps.

Existing home and account signup navigation restrictions remain in place. Public profiles expose the shared navigation to visitors. The mobile menu keeps its Escape handling, focus containment and page-scroll lock; returning to desktop closes an open mobile menu.

Validation: full automated suite, production build and changed JavaScript lint; browser checks on desktop and phone cover the Board-to-leaderboard path, Products and Explore navigation, mobile menu contents and scroll direction behavior. Only synthetic loopback state is used for local writes; production checks are read-only.
