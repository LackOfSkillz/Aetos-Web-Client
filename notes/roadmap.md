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
[x] M18  Audio + multimedia + captions  (absorbs A6)
[x] M19  Themes + contrast validation (+ High Contrast ships in core)
[x] M20  Mobile + responsive UI + PWA + gestures
[x] M21  Developer inspector  (visual designer not built -- see notes)
[x] M22  Widget SDK + failure isolation
[x] M23  Server-described UI manifest
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

Two coherent readings, to settle before A8 (see Addendum A):

- **Ship M33 before M32.** The PR then matches its own description, and voice gets
  reviewed with everything else. Costs a later PR.
- **Ship M33 as a follow-up.** Smaller first PR, easier review. Then the initial PR
  description must not claim voice.

The accessibility *architecture* is independent of this and stays before the
release candidate either way. Since Addendum A that architecture is the A-track
rather than a single review, which sharpens the question rather than settling it:
voice is a new **input mode**, and validating an interface at A8 that is about to
gain one is validating something that will not exist for long.

Voice remains an accessibility *enhancement*, not the accessibility story itself.
Keyboard-only and screen-reader support must not depend on it -- a browser
without speech recognition must still be completely usable.

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

### A0 — Accessibility Foundation  ✅ COMPLETE

Record: [`a0-accessibility-foundation.md`](a0-accessibility-foundation.md).
467 Python tests OK; axe clean on six views. Two real keyboard defects found
and fixed, plus a third introduced by the first fix and caught by the same gate.

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

### A1 — Widget framework accessibility contract  ✅ COMPLETE

Record: [`a1-widget-contract.md`](a1-widget-contract.md). 484 Python tests OK.
A.26 (splitter) and A.27 (tabs) recorded as not applicable, with tests that fail
if that changes.

_(retrofits M6, M7)_

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

### A2 — Current State View and semantic values  ✅ COMPLETE

Record: [`a2-current-state-view.md`](a2-current-state-view.md). 486 Python tests
OK. Found and fixed a silent M16 data loss: `inventory` and `equipment` were
never in the client store's section allowlist, so both panels had been empty
since they shipped.

_(retrofits M8, M16)_

Addendum A.9, A.77, A.78, A.80.

```text
Current State View          A11Y-STATE-001, navigable snapshot, not a live region
resource state_text         A11Y-VIS / A.77
action description + state  A.78
compact braille status      A11Y-BRL-002, "HP 82/100" not prose
threshold rounding          A11Y-BRL-005, no millisecond flooding
relationship as text        A.80, already partly done in M11
```

### A3 — Accessible map completion  ✅ COMPLETE

Record: [`a3-accessible-map.md`](a3-accessible-map.md). 508 Python tests OK.
Three of the five A11Y-MAP requirements were already met by M9. A0's focus test
caught a defect I introduced here -- a search box that rebuilt itself on every
keystroke -- two milestones after that foundation shipped.

_(retrofits M9)_

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

### A4 — Transcript, log store and Review Mode  ✅ COMPLETE (as M17)

Record: [`m17-history-review.md`](m17-history-review.md). 593 Python tests OK.
Three bugs found in my own flood control, all by testing rather than reading --
including a summary silently overwritten because a live region only announces
its latest text.

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
[x] A0   Accessibility Foundation                      -- 467 py, axe clean
[x] A1   Widget accessibility contract                 -- 484 py
[x] A2   Current State View + semantic values          -- 486 py
[x] A3   Accessible map completion                     -- 508 py
[x] E0   Event pipeline contract                       -- 534 py
[x] E1   Capture + replay                              -- 560 py
[x] M17  Rich chat + event history + Review Mode       -- 593 py
[x] E2   Non-destructive presentation rules            -- 615 py
[x] E3   Automation groups                             -- 637 py
[x] E4   Unified validator                             -- 667 py
[x] E5   Diagnostic reporting                          -- 688 py
[x] A5   Cognitive and orientation layer               -- 727 py
[x] M18  Audio + multimedia + captions  (absorbs A6)   -- 791 py
[x] M19  Themes + contrast validation                  -- 830 py
[x] A7   AAC architecture + simplified workspace       -- 885 py
         (A.94 human AAC review outstanding -- questions.md 3)
[x] M20  PWA + touch gestures                          -- 940 py
         (service worker unverified live -- lab-hazard-003)
[x] M21  Developer inspector                           -- 973 py
[x] M22  Widget SDK + widget failure isolation         -- 1000 py
[x] M23  Server-described UI manifest                  -- 1036 py
[ ] E6   Mapper metadata  (SDK half done at M22)       <-- NEXT
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


---

# Addendum B — Server-Side Discovery and Easy Game Integration

Normative specification: [`docs/addendum-b-discovery.md`](../docs/addendum-b-discovery.md).
Requirement IDs beginning `DISC-` are release requirements for the D-track.

A **parallel developer track**, deliberately separate from the M and A tracks so
it does not muddy the player-facing roadmap. Nothing in the D-track changes what
a player sees or what the client does at runtime.

## The problem it solves

The provider architecture is correct and it is also a wall. Aetos must never
guess whether a game keeps health at `db.hp`, `db.health`,
`stats.health.current` or `traits["health"]` — but *writing a Python class*
should not be the minimum skill required to put a health bar on screen.

So three levels, not one:

```text
LEVEL 0   Zero configuration   stock Evennia data          (built, M4–M16)
LEVEL 1   AETOS_BINDINGS       "my health is at db.hp"     (D1, D2)
LEVEL 2   Aetos Providers      arbitrary Python            (built, M4–M16)
```

plus **Aetos Discovery**, a server-side tool that inspects the developer's own
game and suggests which bindings to write.

## The line that must not be crossed

```text
Bindings describe WHERE data is.
Providers describe HOW data is calculated.
```

`db.hp` is a location. `character.stats.get("health").current` is a method call
and therefore a provider's job. Discovery must detect that difference and say
so, rather than growing the binding grammar until it becomes an undocumented
programming language with no debugger (B.73).

## What Discovery is not

Worth stating plainly, because "a tool that scans your game" invites the wrong
mental model:

- **Not a runtime scanner.** It runs during development, never during play
  (`DISC-001`).
- **Not reachable by players.** No protocol message exposes it; there is no
  route in from a connected session (`DISC-002`).
- **Not a code reader for the browser.** Game source is never transmitted to the
  client (`DISC-003`).
- **Not an autoconfigurator.** It writes to `aetos-discovery/`, never to
  `settings.py` or `typeclasses/`. The developer applies the output
  (`DISC-005`).
- **Not an executor.** Static analysis parses with `ast` and discards. It never
  imports, execs, instantiates or calls the code it reads (B.26).

The last one carries a real security obligation: Discovery reads files a
developer may have downloaded from anywhere. It must be safe to point at hostile
source, and that is tested with fixtures containing `os.system(...)` and
file-writing statements which must never run (B.60).

## Where it sits relative to the existing tracks

**Placement: after A0, before or alongside M21.** A0 is done, so D0 may begin
whenever it is scheduled.

The D-track is *not* a blocker for the A-track or the M-track, and neither
blocks it. Its one hard ordering constraint is that D6 lands with M27
(configuration validation) and M28 (documentation), because those milestones
must describe and validate bindings rather than pretending providers are still
the only integration path.

## D-track stages

### D0 — Discovery architecture spike

```text
confirm the canonical server-side command entry point
define the discovery package boundary
define the candidate data model
define the binding schema
define approved scan roots
define the security model
prove AST parsing without imports
prove representative runtime Character inspection
```

**Gate:** no browser dependency; no player protocol surface; no source mutation;
no source execution; architecture reviewed against Evennia contrib constraints.

The open question D0 must settle is the entry point. `evennia aetos discover` is
the experience the addendum asks for (B.34), but Evennia's launcher may not
support contrib-supplied subcommands. Whatever mechanism is chosen, the
documentation exposes **one** canonical command, and the implementation stays
self-contained in the contrib.

### D1 — Safe AETOS_BINDINGS foundation

```text
AETOS_BINDINGS setting
AetosBindingResolver          db.name and db.name.child only
AetosBindingError             beginner-readable
schema validation
provider precedence           custom > binding > default
automatic feature derivation  a binding implies its capability
```

**Gate:** a health bar appears from nothing but

```python
AETOS_BINDINGS = {
    "resources": {
        "health": {"label": "Health", "value": "db.hp", "maximum": "db.hp_max"},
    },
}
```

with no custom Python class anywhere.

The security tests are the substance of D1, not an afterthought: `__class__`,
`__globals__`, `method()`, `foo[0]`, `foo + bar`, `lambda`, `import`, and
semicolon and newline injection must all fail cleanly (B.59). A resolver that
quietly accepts one of those has reintroduced `eval` with extra steps.

### D2 — Declarative provider suite

```text
DeclarativeResourceProvider    DeclarativeEquipmentProvider
DeclarativeTargetProvider      DeclarativeEffectProvider
DeclarativeActionProvider
```

**Gate:** each emits exactly the payload a hand-written provider would, through
the same `character_state` and `resources` normalisers. The client must be
unable to tell which integration path supplied the data — and since M16 already
routes everything through those normalisers, this is a matter of feeding them
rather than of a second code path.

### D3 — Runtime and structural discovery

```text
representative Character selection    Attribute inspection
safe value/type inspection            typeclass inspection
CmdSet and command discovery          candidate pairing
evidence generation                   confidence engine
redaction
```

**Gate:** a known test game produces explainable candidates, with no suggestion
presented as certain.

Redaction is a hard requirement rather than a nicety: anything whose name
resembles a credential is reported as `<redacted>` and never becomes a candidate
(B.46). Runtime inspection reads a live game's Attributes, and a developer
running a tool against their own server should not have it print secrets to a
report file.

### D4 — Static AST discovery

```text
allowlisted directory scanner    real-path containment
AST parsing, never execution     AttributeProperty recognition
.db access recognition           Command subclass/key recognition
source-location evidence         scan bounds
syntax-error containment
```

**Gate:** hostile test source cannot execute; secret and excluded directories
are never read; a symlink inside `world/` pointing outside the game root does
not escape the project.

One unparseable file must not abort the run — it is reported and skipped (B.57).
A tool that dies on the first legacy file is a tool nobody finishes running.

### D5 — Setup wizard and generator

The canonical workflow, end to end: choose runtime/static/both, select a
representative object, scan, review each candidate with its evidence, explain,
edit, **test the binding**, accept or ignore, generate.

Output to `aetos-discovery/`: `report.txt`, `suggested_bindings.py`,
`suggested_provider.py`. Nothing activated automatically.

**Gate:** an inexperienced Evennia developer can go from a custom
`db.hp`/`db.hp_max` Character to a working resource meter without writing a
provider.

The test step is what makes this more than a code generator. Resolving the
binding against a live Character before generating anything catches the mistake
at the point it is cheap, rather than after a reload against a silent empty
widget.

### D6 — Hardening, documentation and validation

Integrates with M21, M27, M28, M29 and M31.

```text
security review           path and symlink tests
large-project test        fresh Evennia test
unusual game-data test    error-message review
README rewrite            in-client developer help update
provider-reference update generated-code formatting
integration walkthrough
```

**Gate:** bindings and Discovery are supported public developer APIs.

## The test that matters most

**Fresh Evennia (B.64).** Point Discovery at a pristine game and it must find
no resources, no equipment, no target and no effects — because that game has
none — while the zero-config integration it already has (entities, inventory,
map, basic actions) keeps working.

A discovery tool that manufactures a health bar for a game with no health system
has failed in exactly the way this whole project is built to avoid. Genre
neutrality is not preserved by the client alone if the tooling in front of it
invents genres.

The companion test is the nontraditional one (B.65): `hull_integrity` /
`hull_capacity` and `oxygen` / `oxygen_capacity` must be discoverable through
*structural* pairing, not because someone added them to a list of fantasy stat
names.

## Effect on the documentation

The current README says Aetos "never reaches into your data directly". That
stays true of the runtime and becomes ambiguous once a development-time
inspector exists, so B.51 replaces it with a statement that distinguishes the
two:

> The Aetos Web Client never guesses, scans, or assumes your game's data model
> during gameplay. You explicitly bind game data to Aetos fields or supply a
> provider. The optional server-side Aetos Discovery tool can inspect your game
> during development and suggest those bindings for you.

The integration learning path inverts (B.50): zero config → run Discovery → use
bindings → write a provider only when the game actually needs one. The existing
provider example moves under "Advanced" rather than being the first thing a
newcomer meets.

## Revised track summary

```text
M-track   player-facing features           M17 onward
A-track   accessibility                    A1 next
D-track   developer integration            D0 next, independent
```

```text
[x] A0   Accessibility Foundation
[x] A1   Widget accessibility contract
[x] A2   Current State View + semantic values
[x] A3   Accessible map completion
[x] A5   Cognitive and orientation layer
[x] A7   AAC architecture + simplified workspace
[ ] A8   Assistive-technology validation          <-- next on the A-track
[ ] D0   Discovery architecture spike           <-- next on the D-track
[ ] D1   Safe AETOS_BINDINGS foundation
[ ] D2   Declarative provider suite
[ ] D3   Runtime + structural discovery
[ ] D4   Static AST discovery
[ ] D5   Interactive setup wizard + generation
[ ] D6   Hardening, docs and integration validation   (with M27, M28)
```

The D-track has no accessibility gates of its own, because it produces no player
interface. Its A.97 answers are all "not applicable — server-side developer
tooling", and that should be stated in each D-stage record rather than left to
inference.


---

# Addendum C — Mature Client Engine (E-track)

Normative specification: [`docs/addendum-c-engine.md`](../docs/addendum-c-engine.md).

Adds the **E-track** and refines the D-track. Addendum B's `DISC-` and `BIND-`
requirements remain in force; where staging differs, C wins.

## Licensing boundary — read this first

The engine ideas come from a review of **Genie5, which is GPL-3.0**. Aetos is
**BSD-3-Clause**, deliberately, so it can be upstreamed into Evennia — which is
BSD-3-Clause too.

Those licences are not compatible in that direction. **Ideas and research only;
no Genie5 source, fixtures or implementation.** Recorded as
[`decision-005`](decision-005-genie5-clean-room.md), which also lists what is
deliberately *not* borrowed and why.

The easy trap is not copy-paste. It is reading an implementation and then
writing "the same thing" from memory, so the reference is documented behaviour
rather than code.

## Why this track exists

Aetos receives structured state from a server that already knows the answer. A
traditional client reconstructs the game by parsing prose. Most mature MUD
client engineering solves the reconstruction problem — and importing those
solutions would mean importing the problem.

What *is* worth taking is what those clients learned about everything
downstream of the data: ordering, preservation, reproducibility and diagnosis.

## E0 and E1 come before M17. This is the important scheduling change.

M17 builds the canonical log and Review Mode. Those two decisions determine the
foundation that highlights, filters, accessibility announcements, replay testing
and every future diagnostic will sit on.

Building M17 first means building it on an unspecified pipeline and then
rebuilding it. A0 already showed how much cheaper it is to fix an ordering
assumption before there are twelve things depending on it.

## The pipeline contract (E0)

```text
evennia.js
    ↓  Protocol Validation
    ↓  Protocol Normalization
    ↓  Authoritative State Update
    ↓  Canonical Event Log
    ↓  Automation Observers
    ↓  Derived Presentation
    ↓  Widgets
    ↓  Announcement Candidate Generation
    ↓  Announcement Queue
    ↓  Assistive Technology / User
```

Two rules carry the whole track:

**State is updated before automation observes an event.** A trigger that fires
on stale state is a trigger that acts on a world that no longer exists.

**Presentation filtering happens after canonical state and history are
preserved.** Which produces the rule that catches the most common bug in
traditional clients:

```text
Server:         "You drop your sword."
Canonical log:  "You drop your sword."
Trigger:        fires
Display filter: may hide the line from view
```

A trigger must not fail because the player chose to hide that text. Hiding is a
presentation choice; it is not deletion, and it is not a fact about the game.

The same reasoning protects accessibility: a visual filter must not silently
suppress an announcement. A player who hid combat spam and then needs to know
what killed them must still be able to find out.

## E-track stages

### E0 — Formal event pipeline contract  ✅ COMPLETE

Record: [`e0-event-pipeline.md`](e0-event-pipeline.md). 534 Python tests OK.
The gate is proven live: a presenter that rewrites text, changes category and
injects data alters nothing. Before E0 the console rendered *before* triggers
ran -- which would have meant a filtered line never reaching the trigger
watching for it, once E2 lands.

```text
incoming pipeline specification      canonical state boundary
outgoing command specification       canonical log boundary
automation boundary                  presentation boundary
announcement boundary                tests proving ordering
```

**Gate:** a presentation filter provably cannot alter state, canonical history
or trigger input.

Also freezes the outgoing side: keyboard, button, context action, macro, map
route, script, voice and AAC all converge on one dispatcher, and **no source
gains special authority**. That is §2.4 restated as an architectural boundary
rather than a promise.

### E1 — Capture and replay  ✅ COMPLETE

Record: [`e1-capture-replay.md`](e1-capture-replay.md). 560 Python tests OK.
Gate proven: a captured room/resource/combat sequence reproduced an identical
state snapshot with no live server. **M17 is now unblocked.**

```text
versioned JSONL format    capture API        sanitisation
export flow               replay engine      speed control + step mode
browser QA integration
```

**Gate:** one captured room/resource/combat sequence reproduces the same state
transitions with no live server.

Replay feeds records through **the same seams as live data**. A parallel
"fake UI" path would test the harness rather than the client.

This is release-quality tooling, not debugging convenience, because it is what
makes announcement prioritisation, pacing, backlog, flood protection and Review
Mode *testable at all* — none of which can be exercised reliably against a live
game.

Captures never automatically include notes, relationships, macros, aliases,
scripts, accessibility preferences, AAC preferences or credentials, and are
sanitised before export with a summary of what the file does and does not
contain.

### E2 — Canonical log and non-destructive presentation rules  ✅ COMPLETE

Record: [`e2-presentation-rules.md`](e2-presentation-rules.md). 615 Python tests
OK. Gate proven live: a filtered line is not drawn, and is still logged, still
searchable, and still seen by automation. The rule editor is deferred to E3,
which needs the same surface for grouping.

After M17 establishes canonical log storage.

```text
Highlight    Substitute    Filter    Collapse
original-text preservation
Review Mode integration
search integration
```

**Gate:** hidden or substituted output remains fully recoverable from canonical
history.

Every event keeps `originalText`. A substitution that would invalidate
structured spans either rebuilds them or drops the metadata — **never stale
offsets on altered text**.

### E3 — Automation groups  ✅ COMPLETE

Record: [`e3-automation-groups.md`](e3-automation-groups.md). 637 Python tests
OK. Also closes E2's deferred display-rule editor, which was the point of
deferring it -- both editors needed the same group field.

```text
group model            effective enabled-state logic
group UI               workspace suggestion hooks
import/export support
```

**Gate:** group state never changes automatically without explicit player
configuration.

`effective = rule.enabled AND group.enabled`. A workspace must not silently
enable automation — a player switching to a Combat layout has not consented to
their combat triggers turning on, and finding out otherwise mid-fight is the
kind of surprise that gets people killed in-game and banned out of it.

### E4 — Unified validator  ✅ COMPLETE

Record: [`e4-unified-validator.md`](e4-unified-validator.md). 667 Python tests
OK. Script checking runs the real compiler and walks the real AST, so a
function name inside a string is not mistaken for a call.

```text
validator API      severity model (ERROR / WARNING / INFO)
script validation  binding validation
regex warnings     whole-profile validation
test corpora
```

Integrates with M13, M14, the D-track bindings and M27.

Regex needs defensive design specifically because JavaScript has no universal
safe timeout for regex execution: bounded patterns, bounded test input, warnings
on nested repetition, a Web Worker where practical, and **no rule ever receives
the unbounded transcript**.

Whole-corpus validation means every parser change runs against stored valid,
invalid, edge-case and malicious samples — rather than waiting for a runtime
failure to find the regression.

### E5 — Diagnostic reporting  ✅ COMPLETE

Record: [`e5-diagnostics.md`](e5-diagnostics.md). 688 Python tests OK. Leak test
run live against six sentinel values -- note text, alias expansion, tell
content, two accessibility preference keys and "password" -- **zero leaks**.

```text
sanitised report generator     provider diagnostics
binding diagnostics            manifest diagnostics
copy/download flow             review-before-GitHub flow
```

Reports carry versions, provider class names, binding keys, features, widget
list, connection state, errors and recent event **types**. They never carry
notes, relationships, macros, scripts, chat, tells, reminders, AAC history,
accessibility preferences or credentials.

Including game output is an explicit opt-in. Opening a GitHub issue may prefill
text and **must not** submit it.

### E6 — Mapper metadata and widget SDK hardening

```text
optional edge cost         optional availability
weighted pathfinding       ambiguity rule tests
versioned widget contract  widget failure containment
```

Dijkstra suffices. Without cost metadata, every edge costs 1.

The client must not infer skill, class, guild, weather or roundtime
restrictions, and Aetos core performs **no genre-specific auto-recovery** — no
automatic standing, retreating, swimming, climbing or door-opening. Those are
game decisions, and a client that guesses them is a client that is wrong in a
new game.

**No remote plugin marketplace.** Downloading and executing third-party
JavaScript brings code trust, supply chain, signing, update, sandbox and RCE
problems the core contrib does not need.

## The ambiguity rule, project-wide

> When evidence cannot distinguish between multiple valid interpretations, Aetos
> declines to guess.

Discovery, map identity, voice resolution, AAC mappings, target matching,
provider diagnostics, entity disambiguation.

```text
Two possible maximum-health fields found.
  db.max_hp
  db.hp_cap
Aetos cannot determine which is correct.
```

**Never silently choose the first.** `unknown` is preferable to wrong, and this
generalises a lesson from mapper behaviour into a project-wide invariant.

## Revised order

```text
[x] A0   Accessibility Foundation
[x] A1   Widget accessibility contract
[x] A2   Current State View + semantic values
[x] A3   Accessible map completion
[x] A5   Cognitive and orientation layer
[x] A7   AAC architecture + simplified workspace
[ ] A8   Assistive-technology validation          <-- next on the A-track
[ ] A3   Accessible map completion

[ ] E0   Event pipeline contract                  <-- BEFORE M17
[ ] E1   Capture + replay                         <-- BEFORE M17
[ ] M17  Rich chat + event history + Review Mode

[ ] D0   Discovery architecture spike             <-- next on the D-track
[ ] D1..D6

[ ] A5   Cognitive and orientation layer
[x] M18  Audio + multimedia + captions
[x] M19  Themes + contrast validation
[x] A7   AAC architecture + simplified workspace
[x] M20  PWA + touch gestures
[ ] E6   Mapper metadata + widget SDK hardening   (with M22, M23)
[ ] M21..M29
[ ] A8   Assistive-technology validation
[ ] M31  Release candidate
[ ] M32  Upstream PR
[ ] M33  Voice input
```

Four tracks now run in parallel and only one hard ordering constraint has been
added: **E0 and E1 precede M17**.

## Two acceptance tests worth quoting

**The Easy Button either works or it does not.** Give a developer unfamiliar
with Aetos a game with `db.hp`/`db.hp_max`, the README, and no coaching. They
must reach working resource meters.

> If provider inheritance is required, the Easy Button has failed.

**No subsystem forces another's integration style.** This must stay valid:

```text
health     complicated custom handler   → custom provider
mana       simple db attributes         → declarative binding
equipment  no custom system             → absent
map        default Evennia rooms        → default provider
```

## The rule the whole addendum reduces to

> Aetos should make the simple thing almost effortless without making the
> advanced thing impossible.

And, for the engine half:

> Aetos does not need to become better at guessing what the server meant. It
> needs to become exceptionally good at receiving what the server actually
> knows, preserving it correctly, presenting it flexibly, and giving maintainers
> the tools to reproduce and diagnose everything that happens afterwards.
