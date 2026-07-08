# Verify — Element to Webflow extension

How to run and observe this Chrome extension (MV3, content-script only) headlessly.

## Handle

Playwright is preinstalled globally (`NODE_PATH=/opt/node22/lib/node_modules`), browsers at
`/opt/pw-browsers`. Extensions do NOT load in the default headless shell — you must pass
`channel: 'chromium'`:

```js
const context = await chromium.launchPersistentContext(profileDir, {
  headless: true,
  channel: 'chromium',           // required for --load-extension in headless
  args: [
    `--disable-extensions-except=${EXT_DIR}`,
    `--load-extension=${EXT_DIR}`,
  ],
});
```

## Recipe

1. Copy `manifest.json`, `content.js`, `content.css` to a scratch `ext/` dir and add a stub
   background service worker to the manifest copy (`"background": {"service_worker": "bg.js"}`,
   empty `bg.js`). The real extension has no SW; the stub exists only so
   `context.waitForEvent('serviceworker')` yields the extension ID.
2. Serve a test page over `http://127.0.0.1` (content scripts don't run on `file://` by default).
   A tall page (~5000px) with elements deep down exercises the scroll-sensitive overlay code.
3. Drive through real extension messaging — open `chrome-extension://<id>/bg.js` as a page and
   evaluate, exactly like popup.js does:
   ```js
   const tabs = await chrome.tabs.query({ url: 'http://127.0.0.1:*/*' });
   await chrome.tabs.sendMessage(tabs[0].id, { type: 'START_SELECTION_MODE' });
   ```
   Message types: `START_SELECTION_MODE`, `COPY_FOR_WEBFLOW`, `SELECT_BY_SELECTOR`,
   `GET_SELECTION_STATE`.
4. Hover/click with `page.mouse` (real events — the content script listens with capture:true),
   then compare overlay vs element via `getBoundingClientRect()` in `page.evaluate`. Overlays:
   `.__wfec-highlight` (hover), `.__wfec-selected` (selection), `.__wfec-label`. All are
   `position: fixed`, so both rects are viewport-relative and should match exactly
   (overlay is +4px wide/tall from its 2px border).

## Gotchas

- Wait ~250ms after mouse moves/scrolls: overlays have an 80ms CSS transition.
- The mouse point may land on a child of the element you aimed at — check
  `.__wfec-label` text for which element is actually hovered before comparing rects.
- `COPY_FOR_WEBFLOW` returns `{ ok, payload }` where payload parses as
  `{ type: "@webflow/XscpData", payload: { nodes, styles } }` — clipboard write may fail
  headlessly but the payload is still returned for inspection.
- A working harness from a past session may exist at
  `<scratchpad>/harness/run.js`; it measures hover/selected/label alignment at
  scroll 0 and ~1400px, scroll-while-hovering, selection tracking after mode exit,
  label clamping at viewport top, and the copy payload.

## Flows worth driving

- Hover deep in a scrolled page → highlight + label glued to element.
- Scroll while hovering and after selecting → boxes must track (scroll listener).
- Copy an element whose subtree repeats a class name with different computed styles →
  each instance must keep its own style entry in the payload (`card`, `card-2`, ...).
