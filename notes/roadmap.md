# Aetos Web Client -- Master Roadmap

Blueprint revision: **2 (voice + accessibility architecture)**, adopted 2026-09-04
Supersedes revision 1. This file is the working checklist; the blueprint prose is
the specification.

Target: `evennia.contrib.base_systems.aetos_webclient`, official Evennia contrib.

---

## What changed in revision 2

Revision 1 treated accessibility as a single late section and had no voice
support. Revision 2 makes both structural.

**Accessibility promoted from a checklist to an architecture.** It was one section
near the end; it is now blueprint sections 45-52 -- accessibility profiles
(Standard / Low Vision / Screen Reader Optimized), screen-reader mode with
semantic regions, an accessible non-visual mapper, threshold-based announcements,
low-vision mode, keyboard-only operation, accessible context menus, and audio
cues.

**A new binding rule on every widget:**

> No core Aetos widget is finished until it is usable without vision and usable
> without a mouse.

This changes the Definition of Done for work already completed, not just future
work. See `decision-003-accessibility-is-a-gate.md`.

**Voice input added as a first-class input method** (blueprint sections 84-104,
milestone M33): push-to-talk, dictation mode, command mode, a deterministic
entity-aware resolver, alias/macro integration, dangerous-command confirmation,
capability detection, microphone permission control, privacy messaging, optional
speech synthesis, and screen-reader coexistence.

**Voice claims no new authority.** The permanent rule:

> Voice is another way to enter a command. It receives no special game authority.

Spoken input joins keyboard, macros, aliases, map clicks and scripts at the same
`AetosCommandDispatcher` seam and passes through Evennia's parser, locks,
permissions, cooldowns and roundtime unchanged. This is the same rule already
implemented for the keyboard path in M4.

**Downstream edits:** every drag operation now requires a keyboard equivalent
(section 16); context menus must open via Context Menu key and Shift+F10 (section
51); Definition of Done gains "accessibility reviewed"; README gains Voice and
Accessibility sections; browser QA gains screen-reader mode, keyboard-only mode
and voice capability detection; scope list gains the voice and accessibility
features.

---

## Architectural consequences to honour from here on

These are the parts of revision 2 that constrain code rather than just add
features. They are listed here because getting them wrong later is expensive.

1. **The command dispatcher is the single input seam.** Voice, macros, aliases,
   map clicks, scripts and the keyboard all converge there. Already built in M4
   (`CommandDispatcher` in `aetos.js`). Voice must not add a parallel path.

2. **Every widget needs a non-visual equivalent designed in, not retrofitted.**
   The mapper is the sharpest case: section 47 requires a textual location/exits/
   landmarks rendering alongside the visual graph. That has to shape the map
   widget's data model in M9, long before the M30 accessibility review.

3. **The resource system needs announcement thresholds** (section 48) as part of
   its schema in M8, not as an M30 addition. Announcing every tick is unusable.

4. **Aetos must not talk over assistive technology** (sections 52, 100). Speech
   synthesis stays off by default in screen-reader mode. Semantic HTML and ARIA
   are the primary output; Aetos speech is an opt-in extra.

5. **Voice degrades to nothing.** Where speech recognition is unavailable the
   controls are absent and the rest of Aetos is unaffected (section 95).

6. **Never claim recognition is local.** The browser or OS may use an external
   service. Aetos sends only recognised text to Evennia and never raw audio, and
   the privacy copy must say exactly that and no more (section 96).

---

## Milestones

Legend: `[x]` complete · `[~]` in progress · `[ ]` not started

```
[x] M0   Fresh Evennia laboratory
[x] M1   Contrib integration spike
[x] M2   Protocol + handshake + manifest
[x] M3   State store + provider system
[x] M4   Aetos shell: console, input, basic widgets
[x] M5   Local storage + profile export/import
[x] M6   Layout manager + widget registry
[x] M7   Workspaces + Edit Layout + widget palette
[x] M8   Generic resources            (+ announcement thresholds, rev 2)
[x] M9   Universal mapper             (+ accessible mapper, rev 2)
[x] M10  Context actions              (+ accessible context menus, rev 2)
[x] M11  Relationships + notes + personal POIs
[x] M12  Hotbars + five-command macros + command queue
[x] M13  Aliases + triggers
[x] M14  Timers + Aetos scripting
[x] M15  Command palette + automation editors + privacy panel
[x] M16  Inventory + equipment + target + effects
[ ] M17  Rich chat + event history
[ ] M18  Audio + multimedia           (+ nonverbal cues, rev 2)
[ ] M19  Themes                       (+ High Contrast ships in core)
[~] M20  Mobile + responsive UI  (layout done; PWA + gestures remain)
[ ] M21  Developer inspector + visual designer
[ ] M22  Widget SDK
[ ] M23  Server-described advanced UI manifest
[ ] M24  Reconnect hardening
[ ] M25  Performance hardening
[ ] M26  Security hardening
[ ] M27  Configuration validation
[ ] M28  Documentation
[ ] M29  Compatibility matrix
[~] M30  Accessibility review  -- WITHDRAWN, see Addendum A below
[ ] M31  Release candidate
[ ] M32  Upstream PR
[ ] M33  Voice input + speech accessibility        <-- NEW in rev 2
```

### Note on M33's position

M33 sits after the upstream PR in the blueprint's ordering. That is worth a
decision rather than silent acceptance: shipping voice after the PR means the
first upstream submission does not include it, and the PR description in section
76 lists "voice control" as part of the solution.

Two coherent readings, to settle before M30:

- **Ship M33 before M32.** The PR then matches its own description, and voice gets
  reviewed with everything else. Costs a later PR.
- **Ship M33 as a follow-up.** Smaller first PR, easier review. Then the initial PR
  description must not claim voice.

The accessibility *architecture* (M30 and sections 45-52) is independent of this
and stays before the release candidate either way. Voice is an accessibility
*enhancement*, not the accessibility story itself -- keyboard-only and
screen-reader support must not depend on it.

---

## Phase gate status

| Phase | Gate | Status |
|---|---|---|
| 0 | Fresh Evennia laboratory | **MET** -- `phase-0-baseline.md` |
| 1 | Contrib integration spike | **MET** -- `phase-1-integration-spike.md` |
| 2 | Protocol foundation | **MET** -- protocol.py + manifest.py, 72 Aetos tests OK |
| 3 | State store + providers | **MET** -- providers + store.js, 112 Aetos tests OK |
| 4 | Aetos shell (console/input/widgets) | **MET** -- `m4-shell-widgets.md`, 116 Aetos tests OK |
| 5 | Local storage + profile export/import | **MET** -- `m5-local-data.md`, 130 py + 32 browser OK |
| 6 | Layout manager + widget registry | **MET** -- `m6-layout-widgets.md`, 133 py + 35 browser OK |
| 7 | Workspaces + edit-layout UI | **MET** -- `m7-workspaces-edit-layout.md`, 148 py + 76 browser OK |
| 8 | Generic resources (+ thresholds) | **MET** -- `m8-resources.md`, 175 py + 95 browser OK |
| 9 | Universal mapper (+ accessible mapper) | **MET** -- `m9-mapper.md`, 211 py OK |
| 10 | Context actions (+ accessible menus) | **MET** -- `m10-context-actions.md`, 232 py + 119 browser OK |
| 11 | Relationships + notes + personal POIs | **MET** -- `m11-local-player-data.md`, 242 py + 154 browser OK |
| 12 | Hotbars + macros + command queue | **MET** -- `m12-macros-queue.md`, 258 py + 181 browser OK |
| 16 | Inventory/equipment/target/effects | **MET** -- `m16-character-state.md`, 409 py OK |
| 15 | Palette + editors + privacy | **MET** -- `m15-palette-settings.md`, 334 py + 326 browser OK |
| 14 | Timers + scripting sandbox | **MET** -- `m14-timers-scripting.md`, 313 py + 286 browser OK |
| 13 | Aliases + triggers | **MET** -- `m13-aliases-triggers.md`, 273 py + 217 browser OK |
| 14 | Timers + Aetos scripting | next |

---

## Definition of Done (revision 2)

A phase is done only when **all** hold:

- [ ] implementation complete
- [ ] error handling complete
- [ ] tests complete
- [ ] documentation updated
- [ ] fresh Evennia compatibility maintained
- [ ] no genre assumptions introduced
- [ ] no external project dependency introduced
- [ ] security reviewed
- [ ] **accessibility reviewed** -- usable without vision, usable without a mouse
- [ ] previous test suites still pass (Evennia baseline: 1847 tests, 2 errors)

---

## Architectural test question

Every proposed feature gets one question:

> Would this make sense in an Evennia game whose genre and mechanics we have never
> seen?

Yes -> Aetos Core candidate. No -> game-specific provider, widget or adapter.

---

## Standing constraints

- Clean-room: nothing from DireEngine, Dragon's Ire, Maritime, WorldBuilder or
  Area Forge. Design lessons only.
- Core-only dependencies: Python, Evennia, universally available browser APIs.
- No persistent server-side player profile. Player data is browser-local, scoped
  by game origin.
- Server authority absolute. No client path bypasses a command.
- `evennia.js` and the Portal are never modified.
- PR diff limited to `evennia/contrib/base_systems/aetos_webclient/`.
- Aetos declares no Python version of its own -- see
  `decision-001-python-version-policy.md`.


---

# Addendum A — Accessibility, Assistive Technology, Cognitive Support and AAC

Normative specification: [`docs/addendum-a-accessibility.md`](../docs/addendum-a-accessibility.md).
Requirement IDs beginning `A11Y-` are **release gates, not suggestions**
(Addendum A.2, A.107).

This section assigns the staging. The addendum says what; this says when.

## A.106 supersedes M30

The roadmap's single "M30 Accessibility review" is withdrawn. It is replaced by
a parallel **A-track** interleaved with the feature milestones, ending in a
final validation stage that validates an architecture which already exists
rather than being the first serious look at accessibility.

```text
A0  Accessibility Foundation
        ↓
A1..A7  requirements inside every implementation milestone
        ↓
continuous automated (axe) + keyboard testing
        ↓
A8  assistive-technology validation
```

## ORDERING DEVIATION — recorded rather than glossed

Addendum A.98 places the Accessibility Foundation **immediately after clean
Evennia setup**, before rich widgets. A.104 is explicit: *do not build the
visual interface first and retrofit this specification afterward.*

The addendum arrived at **M16**, with sixteen milestones already built. A0 is
therefore a **retrofit**, which is exactly the thing A.104 warns against.

This is recorded as a deviation rather than quietly absorbed, per A.2. Two
consequences follow and both are accepted:

1. A0 is not purely additive. It includes an audit pass over M4–M16 and will
   change existing widgets, not only add new files.
2. A0 **blocks M17**. No further feature milestone starts until the foundation
   exists, because every milestone after it inherits the foundation's
   correctness. Continuing to add features first would deepen the retrofit.

The mitigating fact is that the project has treated accessibility as a merge
gate since [`decision-003`](decision-003-accessibility-is-a-gate.md), so the
retrofit is narrower than the ordering suggests. The audit below is the
evidence, not the hope.

## Where the client already stands

Audited against the addendum at M16. **Verified by inspection, not assumed.**

| Requirement | Status | Evidence |
| --- | --- | --- |
| `A11Y-DOM-002` no `role="application"` | **MET** | zero occurrences in template or JS |
| `A11Y-LOG-002/003` transcript not blindly live | **MET** | console is `role="log"` with `aria-live="off"` set explicitly, with the reasoning in a comment |
| `A11Y-ANN-001` one central announcer | **MET (polite only)** | single `#aetos-announcer`, `role="status"`, `aria-live="polite"`, `aria-atomic`; no widget owns its own live region |
| `A11Y-KEY-002` no character-only shortcuts | **MET** | only `Ctrl+K`, `Ctrl+Shift+L`, `F1` |
| `A11Y-FOCUS-003` modal dialog pattern | **MET** | `dialog.js` and `help.js`: focus in, focus trapped, focus returned |
| `A11Y-FOCUS-001` no focus theft | **MET** | no sync path calls `focus()`; guarded by browser QA |
| `A11Y-KEY-001` keyboard equivalents | **LARGELY MET** | layout editing, context menus, palette, help all keyboard-operable |
| `A11Y-LAYOUT-001` non-drag alternative | **MET** | layout editing is keyboard-first; dragging was never the only path |
| `A11Y-MAP-003` route has textual equivalent | **MET** | generated from the same graph as the picture |
| `A11Y-VIS-002` responsive sizing | **MET** | `clamp()`, grid, `rem`; no rigid pixel layout |
| `A11Y-MEDIA-*` | **N/A yet** | no media subsystem |
| A.104 layout-library escape hatch | **MOOT** | GoldenLayout was dropped in [`decision-004`](decision-004-self-contained-client.md); the layout manager is ours |
| `A11Y-NAV-001` skip links | **ABSENT** | none in the template |
| A.7 `<nav>` / `<aside>` landmarks | **ABSENT** | `<header>`, `<main>` and labelled `<section>`s exist; `<nav>` and `<aside>` do not |
| A.15 separate assertive region | **ABSENT** | polite region only; nothing can be urgent |
| `A11Y-STATE-001` Current State View | **ABSENT** | — |
| `A11Y-REV-001` Review Mode | **ABSENT** | — |
| A.16 flood control | **ABSENT** | announcements are unaggregated |
| A.23 Shortcut Manager | **ABSENT** | shortcuts are hard-bound and unrebindable |
| A.26 keyboard splitter resize | **PARTIAL** | resize exists in layout editing; no `role="separator"` semantics |
| A.28 widget accessibility contract | **ABSENT** | headings and labels are correct but undeclared, so nothing enforces them |
| A.36–A.51 cognitive layer | **ABSENT** | — |
| A.59–A.69 AAC | **ABSENT** | — |
| A.86/A.87 axe gate | **ABSENT** | browser QA is hand-written; no axe |
| A.70 accessibility preferences | **ABSENT** | — |

Notably, `A11Y-BASE-001` is already structurally satisfied: none of the
accessibility behaviour above sits behind a developer setting. `AETOS_AUTOMATION`
governs gameplay automation only.

## The A-track

### A0 — Accessibility Foundation  ← NEXT. Blocks M17.

Addendum A.4, A.7, A.8, A.13, A.15, A.19, A.23, A.52, A.53, A.70, A.86.

```text
accessibility/ subsystem split out of aetos.js
AetosFocusManager
AetosShortcutManager        rebindable, conflict table, restore defaults
AetosAnnouncementManager    priorities, polite + urgent regions
accessibility preferences   granular schema, local-only (A.70, A.72)
semantic shell              <nav>, <aside>, ordered headings
skip links                  A11Y-NAV-001
reduced-motion CSS          prefers-reduced-motion, presentation intensity
contrast tokens             audited against 4.5:1 / 3:1
axe harness                 @axe-core/playwright, dev-only (A.86)
audit pass over M4-M16
```

**Gate:** no serious/critical axe violations in the default workspace; keyboard
-only walkthrough of everything built through M16 passes; every existing
announcement routed through the manager.

**Explicitly out of scope:** flood control and Review Mode. Those need the log
store, which is A4.

### A1 — Widget framework accessibility contract  (retrofits M6, M7)

Addendum A.26, A.27, A.28, A.97.

```text
accessibility metadata required in every widget definition
registry rejects a widget that omits it
semantic heading enforcement
keyboard splitter with role="separator" and value semantics
accessible tabs where tabs exist
A.97 definition-of-done checklist wired into the milestone template
```

**Gate:** every one of the twelve existing widgets declares its contract, and
the registry test fails if one does not.

### A2 — Current State View and semantic values  (retrofits M8, M16)

Addendum A.9, A.77, A.78, A.80.

```text
Current State View          A11Y-STATE-001, navigable snapshot, not a live region
resource state_text         A11Y-VIS / A.77
action description + state  A.78
compact braille status      A11Y-BRL-002, "HP 82/100" not prose
threshold rounding          A11Y-BRL-005, no millisecond flooding
relationship as text        A.80, already partly done in M11
```

### A3 — Accessible map completion  (retrofits M9)

Addendum A.29.

```text
AetosAccessibleMap as a first-class surface, not a description string
exit list as buttons          A11Y-MAP-002
route preview, enumerated     A11Y-MAP-003  (largely built)
POI list, searchable          A11Y-MAP-004
SVG hidden from the a11y tree A11Y-MAP-005
```

**Gate:** A.98's mapper rule — the mapper does not pass until the accessible map
passes.

### A4 — Transcript, log store and Review Mode  → **merged into M17**

Addendum A.10, A.11, A.12, A.16, A.17, A.18.

M17 was "rich chat + event history". That *is* this work, so they are one
milestone rather than two that would fight over the same code.

```text
AetosLogStore separate from console DOM
categorised, prioritised events    A.11
bounded history, 5000 events       A.12, centralised constant
virtualization never evicts focused/reviewed nodes
flood control                      A.16, aggregation and burst summary
Review Mode                        A11Y-REV-001, pause, count, summarise
review navigation                  A.18, prev/next tell, chat, event
```

### A5 — Cognitive and orientation layer  (new, after M17)

Addendum A.36–A.51.

```text
Reorient Me                  A11Y-COG-001, facts only
no intention inference       A11Y-COG-002 -- a hard MUST NOT
How I Got Here               A11Y-COG-003, authoritative room changes only
Walk Back                    A.40, ordinary movement commands, stops on failure
Session Resume               A11Y-COG-004, "Last known" until sync
user-requested reminders     A11Y-COG-005, never spontaneous
personal task board          A.45
universal search             A11Y-COG-006, extends the M15 palette
Focus Mode / Quiet Mode      A.47, A.48
predictable layout           A11Y-COG-007, auto-switching defaults OFF
stable help location         A.50 -- already true, now guarded
```

### A6 — Media accessibility  → **merged into M18**

Addendum A.58, A.79, A.84.

M18 is audio and multimedia. Captions and volume controls ship *with* it, not
after it. `A11Y-MEDIA-001` — no gameplay-essential information exists only in
audio — is a gate on M18, not a follow-up.

### A7 — AAC and simplified presentation  (new, after M19)

Addendum A.51, A.59–A.69.

```text
concept model separate from text, symbol and command   A.60
AetosSymbolProvider, pluggable packs                   A.62
no bundled symbol artwork without verified rights      A.63
symbol + text by default                               A.64
Picture Communication widget                           A.65
sentence strip, keyboard operable                      A.66
text preview before sending                            A.67
deterministic mappings, no generative inference        A.69 -- hard MUST NOT
simplified workspace                                   A.51
```

Placed after M19 (themes) because the simplified workspace and symbol
presentation both depend on the theme layer.

**Gate:** A.94 — human AAC review before any claim of AAC support.

### A8 — Assistive-technology validation  (replaces M30, feeds M31)

Addendum A.30–A.35, A.85, A.87–A.99.

```text
axe across every major view       A.87
keyboard-only, mouse unplugged    A.88
NVDA, 35-task script              A.89
JAWS, core task set               A.90
Orca on Firefox and Chromium      A.91
refreshable braille, real device  A.92, A.35
cognitive scenario testing        A.93
AAC human review                  A.94
400% zoom / 320px reflow          A11Y-VIS-001
contrast and reduced motion       A.99 matrix
```

**Requires people, not tooling.** A.85 and A.101 both say automated testing
cannot substitute. A.92 names Meris as the intended braille tester. A.94 needs
someone familiar with AAC. Neither role can be filled by this project alone, and
**both are open dependencies on the release**, recorded here as such.

**A.95 is binding:** "takes too many keystrokes", "focus jumps", "braille keeps
losing position" are defects even when every automated test passes.

**A.100 is binding:** no conformance claim ships ahead of its evidence. Until A8
completes, the README says *"Designed toward WCAG 2.2 AA"* and nothing stronger.

## Revised milestone order

```text
[x] M16  Inventory + equipment + target + effects
[ ] A0   Accessibility Foundation                      <-- NEXT, blocks M17
[ ] A1   Widget accessibility contract                 (retrofits M6, M7)
[ ] A2   Current State View + semantic values          (retrofits M8, M16)
[ ] A3   Accessible map completion                     (retrofits M9)
[ ] M17  Rich chat + event history + Review Mode       (absorbs A4)
[ ] A5   Cognitive and orientation layer
[ ] M18  Audio + multimedia + captions                 (absorbs A6)
[ ] M19  Themes  (+ contrast validation, A11Y-VIS-003)
[ ] A7   AAC + simplified workspace
[ ] M20  PWA + touch gestures  (+ A.57 pointer targets)
[ ] M21  Developer inspector
[ ] M22  Widget SDK  (documents the A.28 contract)
[ ] M23  Server-described manifest  (+ A.76 importance_hint)
[ ] M24  Reconnect hardening
[ ] M25  Performance hardening
[ ] M26  Security hardening
[ ] M27  Configuration validation
[ ] M28  Documentation
[ ] M29  Compatibility matrix
[~] M30  WITHDRAWN -- superseded by the A-track (A.106)
[ ] A8   Assistive-technology validation
[ ] M31  Release candidate
[ ] M32  Upstream PR
[ ] M33  Voice input + speech accessibility
```

## Per-milestone gate, from here on

Every milestone from A0 onward closes against A.97's definition of done, and its
`notes/` record states the answers rather than implying them. A milestone note
that does not address A.97 is not a completed milestone.

Accessibility defects are classified by A.96. **No `A11Y-BLOCKER` may remain at
release; no known `A11Y-HIGH` may remain without explicit release review.**

## Open questions this addendum settles, and one it does not

**Settled.** The M30 question — "when does accessibility get looked at" — is
answered: continuously, with A8 as validation rather than discovery.

**Still open.** M33 (voice) still sits after M32 (the upstream PR) while the
PR description lists voice as part of the solution. Addendum A does not touch
voice, so that decision remains outstanding. It should be settled before A8,
because voice input is an accessibility surface and A8 would otherwise validate
an interface that is about to gain a major new input mode.
