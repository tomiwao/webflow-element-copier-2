# Project Context Handoff — webflow-element-copier-2

## What this project is
A Chrome extension (Manifest V3) called "Element to Webflow" that lets a user
pick any DOM element on any webpage, converts it (tag structure + computed
styles + attributes) into Webflow's internal clipboard JSON format
(`@webflow/XscpData`), and copies it so it can be pasted directly into the
Webflow Designer canvas.

Files:
- `manifest.json` — MV3 manifest, content script injected on `<all_urls>`.
- `content.js` — injected into every page. Handles hover/click element
  picking, keyboard nav (↑ parent / ↓ child / Esc cancel), CSS/XPath
  selector-based selection, and the DOM→Webflow JSON conversion
  (`convertDomToWebflowModel`). Listens for messages:
  `START_SELECTION_MODE`, `COPY_FOR_WEBFLOW`, `SELECT_BY_SELECTOR`,
  `GET_SELECTION_STATE`.
- `content.css` — styles for the on-page highlight/selected/label overlays
  (all `position: fixed`, injected under `document.documentElement`).
- `popup.html` / `popup.js` — extension popup UI: Select Element button,
  selector input + "Select by CSS/XPath" button, "Copy for Webflow" button,
  "Copy Minimal Test Payload" button (for sanity-testing the Webflow paste
  format independent of the DOM-copy logic). Talks to the content script via
  `chrome.tabs.sendMessage`.
- `README.md` — project readme (not modified this session).

## Git state
- Repo: `tomiwao/webflow-element-copier-2`.
- Working branch: `claude/codex-breakage-audit-vg9gj2` (pushed, tracked).
- Base history: `main` has two prior commits —
  `b6fe9e5` (initial extension) and `c2ed295` ("add precise selector
  targeting and preserve source class names", authored by a prior
  Codex/agent session — this is the commit the user said "seems to have
  broken it").
- This session added one commit on top:
  `3d6ceb2` — "fix: dedupe copied styles by class name + computed styles,
  not name alone" (touches only `content.js`, +13/-6 lines).
- **Open PR:** https://github.com/tomiwao/webflow-element-copier-2/pull/1
  (draft, base `main` ← head `claude/codex-breakage-audit-vg9gj2`).
  As of last check: open, draft, `mergeable_state: clean`, no CI configured
  in this repo (no workflows), no review comments, no issue comments.
  This session is subscribed to PR webhook activity for #1 (comments, CI,
  reviews will arrive as `<github-webhook-activity>` events in that specific
  conversation — a fresh agent picking this up will need to re-subscribe if
  it wants those events, via `subscribe_pr_activity`).

## What was audited and the bug that was found
Diffed `b6fe9e5` → `c2ed295` to find what the "precise selector targeting /
preserve source class names" commit changed. Three areas changed:
`content.js` (selector resolution + class-name preservation),
`popup.html`/`popup.js` (new selector input + button, wired correctly —
verified no ID/listener mismatches, not the source of breakage).

**Root cause of the regression** (in `content.js`,
`convertDomToWebflowModel` → `getOrCreateStyleId`):

The commit introduced a `styleByClassName` cache keyed **only by class
name**, so that elements sharing a source class name would reuse a single
Webflow style entry (goal: "preserve source class names" instead of
generating a synthetic style per node). But since class names are routinely
reused across many *different* elements with different actual computed
styles (`.item`, `.col`, `.btn`, list rows, etc. — the normal case in real
HTML), every element *after the first* with a given class silently reused
the **first** element's `styleLess` (computed style string). Its own real
width/height/color/spacing/etc. was discarded entirely. Net effect: copying
any element whose subtree has more than one node sharing a class (extremely
common) produced visually broken pastes in Webflow — which matches the
user's "Codex seems to have broken it" report.

## Fix applied (commit `3d6ceb2`)
Changed the cache in `getOrCreateStyleId` from "one style per class name" to
"one style per (class name, computed styleLess) pair":
- Computes `styleLess` first, then looks for an existing variant under that
  class name with the *same* `styleLess` string — reuses that style ID if
  found (so truly-identical instances still correctly share one style, which
  was the original intent).
- If the class name exists but with *different* computed styles, a new style
  entry is created with a suffixed name (`card`, `card-2`, `card-3`, ...)
  instead of clobbering/losing the divergent styles.
- Verified with `node --check content.js` (syntax only — this is a browser
  extension content script, not directly Node-runnable/testable headlessly
  since it depends on `document`, `chrome.*`, `getComputedStyle`, etc.).

## What was NOT changed / NOT investigated further
These were noticed during the audit but are **pre-existing** from the very
first commit (`b6fe9e5`), not part of the "Codex broke it" regression, and
were left alone since they weren't the reported breakage — flagging for the
next agent in case the user wants them addressed too:

1. **Overlay positioning uses `position: fixed` (content.css) but
   `positionOverlay()` in `content.js` adds `window.scrollX`/`scrollY` to
   `getBoundingClientRect()` values** (`content.js`, `positionOverlay`,
   `updateLabel`). For a `position: fixed` element, coordinates should be
   viewport-relative (no scroll offset added); as written, the highlight/
   selected/label overlays will drift away from the actual hovered/selected
   element as soon as the page is scrolled. This bug exists in both
   `b6fe9e5` and `c2ed295` — it predates the commit the user was asking
   about, but is a real, easily-reproduced UX bug (open a tall page, scroll
   down, hover an element — highlight box will be offset by however far
   you've scrolled). Fix would be either: switch overlays to
   `position: absolute` (then the current scroll-offset math is correct), or
   keep `position: fixed` and stop adding `scrollX`/`scrollY`.

2. Not manually tested end-to-end in an actual browser (load unpacked
   extension → select an element with repeated classes → copy → paste into
   real Webflow Designer). The PR body includes this as an unchecked item in
   the test plan. No Playwright/Chromium-extension test harness exists in
   this repo currently.

3. No CI/lint/test tooling exists in this repo at all (no `package.json`,
   no workflows). All verification so far has been manual code reading +
   `node --check`.

## Suggested next steps for the next agent
1. If picking this up to continue: re-subscribe to PR #1 webhook activity
   if you want live comment/CI notifications.
2. Decide whether to tackle the pre-existing scroll-offset overlay bug
   (#1 above) — it's real but out of scope for the original "Codex broke
   it" complaint, so wasn't fixed in this session. Ask the user if unsure.
3. If possible, do a manual browser smoke test of the style-dedup fix
   (load unpacked extension in Chrome, pick an element containing repeated
   classes with different actual styles, copy, paste into Webflow, confirm
   each instance keeps its own styling) and check off that test-plan item
   on PR #1.
4. PR #1 is currently a **draft** — flip it to ready-for-review once the
   user is satisfied, or merge if instructed.
