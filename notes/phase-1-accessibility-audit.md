# M4 shell -- accessibility audit against blueprint revision 2

Date: 2026-09-04
Trigger: `decision-003-accessibility-is-a-gate.md` applies retroactively to work
already completed.

Subject: the Aetos shell built during the Phase 1 integration spike (status bar,
console, command input).

## Already compliant

| Requirement | Evidence |
|---|---|
| Landmark structure | `<header>`, `<main>`, `<footer>` |
| Labelled region | console section `aria-labelledby` a visually-hidden `<h2>` |
| Labelled control | `<label for="aetos-input">` |
| Keyboard submission | Enter submits; Shift+Enter reserved for newline |
| Keyboard-reachable scrollback | console `tabindex="0"` |
| Visible focus | `:focus-visible` outlines on console, input and button |
| No suppressed focus | no `outline: none` anywhere |
| Status not colour-alone | text label alongside the dot; dot `aria-hidden` |
| Reduced motion | `@media (prefers-reduced-motion: reduce)` |
| Button has a text label | "Send", not an icon alone |

## DEFECT FOUND AND FIXED -- output console was a live region

`role="log"` carries an **implicit `aria-live="polite"`** under the ARIA spec.
The console therefore announced **every line of game output** to a screen reader.
For a MUD that is not a minor annoyance: combat spam, a long room listing, or a
`who` output would produce continuous unstoppable speech, and the user could not
get ahead of it to type.

This is exactly what blueprint section 48 forbids ("do not announce every tiny
change"), and it would have survived to the M30 review because the markup *looks*
correct -- the offending attribute is never written down.

Fix, structural rather than cosmetic:

1. Console is explicitly `aria-live="off"`. It remains `role="log"`, so it is
   still navigable and readable on demand; it simply does not interrupt.
2. Added a dedicated visually-hidden announcer region (`#aetos-announcer`,
   `role="status"`, `aria-live="polite"`, `aria-atomic="true"`) as the single
   channel through which Aetos deliberately speaks.
3. Added an `Announcer` component in `aetos.js`, exposed on `window.Aetos`, so
   later widgets announce through one shared seam instead of each inventing its
   own live region. Resource thresholds (section 48) will use it at M8.

Also fixed: the status bar was wrapped as a whole in `role="status"
aria-live="polite"`, which would re-announce the static game name on every
connection change. The live region is now scoped to the connection indicator
alone, with `aria-atomic="true"`, and repeat states are filtered in JS so an
unchanged status does not re-announce.

## Tests added

`tests/test_accessibility.py` -- 14 assertions covering landmarks, labels,
keyboard operation, the live-region contract, colour-independence and focus
visibility. The live-region tests exist specifically so this defect cannot
silently return.

## Known gaps, deferred with owners

| Gap | Milestone |
|---|---|
| Accessibility profiles (Standard / Low Vision / Screen Reader) | M30, section 45 |
| High Contrast theme shipped in core | M19, section 44 |
| Low-vision mode (scaling, spacing, thicker borders) | M30, section 49 |
| Skip link (low value at two regions; needed as widgets grow) | M6 |
| Semantic regions for Location / Exits / People / Items | M9, M16, section 46 |
| Accessible non-visual mapper | M9, section 47 |
| Accessible context menus (Context Menu key, Shift+F10) | M10, section 51 |
| Nonverbal audio cues | M18, section 52 |
| Screen-reader detection / coexistence with Evennia's screenreader flag | M30, section 100 |

None of these block M2. All are recorded in `roadmap.md` against their milestone.

## Verification still required

Static assertions cannot prove screen-reader behaviour. The M30 review must
include a real assistive-technology pass (NVDA or VoiceOver), keyboard-only
operation, and 200% zoom. Recorded there.
