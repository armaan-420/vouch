# Mobile nomination search

On screens 600px wide or narrower, focusing the nomination input opens a full-screen native dialog. This applies both to the experiment's final optional nomination step and to nominations on the Board. Desktop keeps the inline search.

The dialog reuses the existing input and results, preserves the query and selections, shows a compact selected count, and keeps the field at the top while results scroll. Three initial mobile results and See more remain unchanged. VisualViewport height and offsets track the usable area as the software keyboard and browser chrome move; window dimensions are the fallback. Safe-area padding protects controls.

Done closes search without saving, dismisses the keyboard, and restores the page's scroll position. The existing Save nominations / Save and see the board action submits selections. Keyboard Escape closes search. Changing to desktop width or navigating away releases the modal and scroll lock.

## Verification

- `npm test` and `npm run build`.
- Start `npm run preview:lookup` (isolated local test records, port 4174).
- Run `node test/mobile-nomination-smoke.mjs` with Playwright installed, or set `PLAYWRIGHT_MODULE` to its module path. The smoke check uses fixture search responses and intercepts nomination submission locally.
- Coverage: mobile opening, multi-selection, query retention, pagination, simulated keyboard height and viewport offset, sticky input during scroll, Done without submission, Escape, desktop layout, final-step name nomination/save, and navigation cleanup.
- Simulated viewport checks do not reproduce a native software keyboard. Verify iPhone Safari and Android Chrome manually: type, scroll results, select multiple items, clear, add a missing name, Done/reopen, dismiss the keyboard, rotate, and save.
