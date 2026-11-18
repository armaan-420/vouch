# Category registry

Vouch stores the registry in the `category-registry-v1` scope of `app_records`. The record has `version: 1` and a `categories` map keyed by stable ID. Each entry has `id`, `label`, `parentId`, `aliases`, `providerSlugs` and `cover`. The initial hierarchy groups categories under Beauty, Electronics, and Travel & Outdoors. The saved registry is the authority after initialization.

IDs are immutable lowercase slugs of 1–64 characters. A category can be at the root or one level below it. A root can also be used directly by an Edit. Self-parenting, cycles, unknown parents and a third level are rejected. Labels and aliases are unique across the registry after case, accents and punctuation are normalized by the catalog tokenizer.

## Resolution and APIs

Resolution checks a known `categoryId`, then a provider `categorySlug`, then the normalized category label and aliases. Unmatched labels retain their display text and derive a normalized fallback ID. Empty values fall back to Uncategorized. Previously indexed standalone provider products can still be filtered by their provider slug when their category has no registry match.

Edits retain their saved `category` label. Creating an Edit or saving its category in settings writes the registry ID and display label when there is a match. Free text still saves and returns a warning when it has no match. Changing a parent takes effect on the next read. Renaming a label keeps the ID and appears in registry-backed pickers. Existing Edit labels and label-scoped tags retain their saved text until explicitly edited.

`GET /api/categories` retains each Edit's `id` and path and supplies its `categoryId`, `parentCategoryId`, `parentCategory` and bundled `fallbackImage`. Its `parents` list reflects open Edits. `GET /api/discover?category=electronics` includes Electronics and its children. Child filters and existing label links still work. The API returns `parentId` on category options and a list of parents. The Discover dropdown remains a flat list of product categories. Grouped navigation and parent-wide options are deferred.

## Organizer workflow

Open **Categories** in the organizer. Choose **New category** and leave Parent empty to create a root. To add a child, choose a root from Parent. Open an existing label to rename it, change its parent, or edit its comma-separated aliases. The **Unassigned** list shows root categories without children and Edit labels that still have no registry match. To attach an unmatched Edit, create a matching category or alias, then save the Edit's settings or rerun the backfill. The Edit settings category field suggests registry labels and accepts typed values.

The organizer-only endpoints are `GET /api/admin/categories` and `POST /api/admin/categories`. Send `action: "create"` with `label`, `parentId` (or `null`), and `aliases`. The server generates an ID if omitted. Send `action: "update"` with the existing ID and the new label, parent and aliases. The initial provider slugs and bundled covers are retained during organizer edits.

## Backfill

The first registry initialization backfills matched Edit IDs through the experiment store. It reports unmatched labels with Edit IDs for organizer review. The backfill only writes missing `categoryId` fields.

From the prototype directory, preview or apply the same backfill to a local file store:

```sh
node scripts/backfill-category-ids.mjs --dry-run
node scripts/backfill-category-ids.mjs
node scripts/backfill-category-ids.mjs --dry-run --data-dir /path/to/local-data
```

The default directory is `.data`. Running with `--dry-run` reads files only. The script uses the saved registry when available and the starter registry otherwise. Stop any local server using the same directory before running the write command so its in-memory file store cannot overwrite the result. Repeated runs skip already assigned Edits.

## Remaining hardcoded rules

The headphone product matching rules in `lib/catalog/resolver.mjs` and the Wharton chip groupings in `public/board-categories.js` remain in code. Tag scoping in `lib/product-tags.mjs` still uses category labels. These sites carry `TODO(category-registry)` comments.
