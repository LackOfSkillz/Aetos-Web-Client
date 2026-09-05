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
[ ] M30  Accessibility review
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
