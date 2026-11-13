# Explore categories

Implemented November 13, 2026. Participants can move from a category board into another open experiment. The board has a What else have you tried? section after the rankings, before suggestions and nominations. The redundant Explore categories link beneath the board title was removed on November 13 at Armaan’s request. It shows up to three other categories and links to `/categories` for the full list.

The directory and cards use `GET /api/categories`, which returns only minimal public lineup metadata for experiments currently open for voting. Draft, disabled, deleting, upcoming and ended/closed experiments are excluded. No participant records, progress, identity or organizer research are returned. The list is alphabetical and reflects organizer-created experiments rather than inferred personal eligibility.

Start vouching links to `/:experiment?start=1`, records the existing visit/start events and opens the first voting card. Existing answers remain available for revision; this feature does not calculate completion badges or resume positions. View board links directly to results. Account creation remains optional. If a schedule changes after a card loads, the experiment's existing schedule checks prevent voting outside its window.

Explore categories is available in the shared navigation and on the product discovery page. Empty lists offer category suggestions; errors offer retry. Product Library remains the organizer tool. This update adds no new voting data model, ranking logic or progress tracking.

Validation: integration coverage for public/open filtering, response field boundaries, directory routes, and the reserved category path; browser coverage should exercise board → another category → votes → board → directory on desktop and phone. Production checks use page views and read-only API requests.
