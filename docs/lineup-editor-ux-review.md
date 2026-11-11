# Lineup creation and editor UX review — November 11, 2026

Scope: suggested-category manual creation, existing draft editing, product search and manual entry, ordering, photos, saving, cancellation and review. This implementation review is separate from scheduled report-only reviews. No production suggestion, vote or approval was created for testing.

## Findings and changes

| Finding in the previous workflow | Resulting behavior |
| --- | --- |
| P1: Suggestions without a completed research draft had no editor entry point. | Create lineup manually opens an empty editor for a suggestion. Saving creates a private draft, stops job processing and preserves saved research/history. Existing live, deleted, merged and blocked suggestions remain protected. Active research leases can briefly require a retry. |
| P1: Research could finish between opening manual creation and saving. | The manual save reuses that automatic private draft rather than rejecting the work or duplicating it. An already manually created draft requires Edit lineup. |
| P2: Long forms repeated the read-only lineup and mixed title/path settings with every product field. | One editing workspace hides read-only content. Title/address and product details are expandable. Search and selected products have distinct areas. |
| P2: Plain text product rows lacked visual confirmation. | Product cards have photo previews, photo-needed labels, brand/name, move controls and removal. |
| P2: Mixed catalog/custom products could change order on save. | Explicit validated product order is saved for both manual creation and edits. |
| P2: Accidental removal required rebuilding the item. | Undo restores the latest removed item in its prior position. |
| P2: Save controls were easy to lose below a long form. | Persistent save bar shows unsaved state and saving errors. Empty lineups cannot be saved. Controls are disabled during save. Cancel prompts before discarding changes; page exit warns about unsaved work. |
| P2: Phone layout needed a deliberate search-first flow. | Search stacks above selected products on narrow screens; desktop shows both columns together. |
| P3: Add photo focused a field hidden inside collapsed details after the redesign. | The correct details section opens before focusing the photo field. |

## Validation and limits

201 automated tests passed before final interaction polish; production build passed. Local browser testing at desktop and 390px phone width verified the workspace layout, manual product entry, empty-save prevention, manual creation while automatic research completed, private-draft success, removal and undo. Tests cover organizer authorization, draft privacy, research stopping after manual save, blocked approval with missing requirements, manual evidence entry, invalid ordering, leases and duplicate prevention.

Photo/source completion remains required for approval, including manual drafts. Manual creation does not fabricate research evidence. External catalog availability, physical phone behavior, and a full screen-reader audit were not established by the local browser checks. Future research refresh may intentionally rebuild a draft; use it only when replacing the manual research/lineup is intended.
