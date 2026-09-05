# Changelog

All notable changes to the Aetos Web Client.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project has not yet cut a release; everything below is unreleased work
towards `0.1.0`, recorded by milestone so the reasoning stays attached to the
change. Each milestone has a fuller record in [`notes/`](notes/).

---

## [Unreleased]

### Addendum A — accessibility becomes architectural

**Added**

- [`docs/addendum-a-accessibility.md`](docs/addendum-a-accessibility.md), a
  normative accessibility specification covering WCAG 2.2 AA, NVDA/JAWS/Orca,
  refreshable braille, cognitive and executive-function support, and AAC.
  Requirement IDs beginning `A11Y-` are release gates.
- An **A-track** in the roadmap (A0–A8) interleaved with the feature
  milestones, with every `A11Y-` requirement assigned to a stage.
- An audit of the client at M16 against the addendum, recording what is already
  met with the evidence, and what is absent.

**Changed**

- **M30 "Accessibility review" is withdrawn.** A single late review is replaced
  by a foundation (A0), requirements inside every milestone, continuous axe and
  keyboard testing, and a final validation stage (A8) that validates an
  architecture rather than discovering its absence.
- **A0 blocks M17.** No further feature milestone starts until the foundation
  exists, because everything after it inherits the foundation's correctness.

**Recorded as a deviation**

- The addendum places the accessibility foundation immediately after clean
  Evennia setup and explicitly warns against retrofitting. It arrived at M16,
  with sixteen milestones built, so A0 *is* a retrofit. That is recorded
  openly rather than absorbed quietly, per the addendum's own rule that a MUST
  is never silently downgraded.
- Mitigating: accessibility has been a merge gate since `decision-003`, so the
  audit found `role="application"` absent, a single central announcer already in
  place, the transcript already non-live by explicit choice, no character-only
  shortcuts, and the dialog pattern already correct. The retrofit is narrower
  than the ordering implies.

**Open dependencies on release**

- A refreshable-braille tester on real hardware (an emulator does not
  substitute), and an AAC-familiar reviewer. Neither can be filled by tooling.

**Reconciled**

- The contrib README -- the file that ships with the client and the one an
  Evennia reviewer reads -- contained no mention of accessibility at all. It now
  documents what players get with no work from the game developer, what only the
  developer can supply (audio captions, `state_text`, action descriptions), and
  the honest conformance status.
- `decision-003` predated the addendum and still said M30 remained in the plan.
  Amended rather than reversed: the addendum agrees with the decision and goes
  further. The decision's one error was scope, not direction -- it assumed
  contrast and ARIA labels were safely fixable late, whereas braille review
  position and cognitive orientation turn out to be structural too.
- The M33 note still deferred to M30. It now points at A8, and records that
  voice sharpens the question rather than settling it: A8 would otherwise
  validate an interface about to gain an entire new input mode.
- Addendum A cites a parent blueprint held outside this repository, so its
  "section 76"-style references point somewhere a reader here cannot follow.
  Recorded as a known gap rather than left dangling.
- Added `docs/README.md` as an index.

---

### M16 — Inventory, equipment, target and effects

**Added**

- `AetosInventoryProvider`, `AetosEquipmentProvider`, `AetosTargetProvider` and
  `AetosEffectProvider`, with matching registry slots.
- `DefaultInventoryProvider`, reading ordinary `contents`. This is the only one
  of the four with a working default: carrying things is something every Evennia
  game has, so a pristine game gets an inventory panel with no code at all.
  Equipment slots, a current target and a buff list are genre decisions, so those
  three expose nothing rather than implying a system the game does not have.
- `character_state.py`, normalising all four sections. A provider is game code,
  so nothing it returns is trusted; one bad entry costs that entry, not the panel.
- Four client widgets in `character.js`. Inventory is ungated; the other three
  are gated on their capability flags.
- Carried items now carry their own context actions, resolved against the
  character rather than the room.

**Design notes**

- An effect's `remaining` is a *duration*, not a timestamp. The player's clock
  may be minutes off the server's, and an absolute time would be silently wrong
  for them.
- A countdown reaching zero shows the effect as **expiring**, never removing it.
  Only the server knows when an effect ends; a client that removed it on its own
  clock would show a player as clean while the server still had them poisoned.
- Effect gains and losses are announced; the second-by-second countdown is not.
  A live region updating every second would make the client unusable with a
  screen reader.
- Empty equipment slots are kept rather than dropped. "Nothing on your head" is
  information; omitting empty slots would make a bare character indistinguishable
  from a game with no equipment.
- A target's resources go through the *same* normaliser and the *same* renderer
  as the player's own, so the two can never disagree about thresholds or
  rounding.

**Tests** — 409 Python tests passing (up from 334).

---

### Documentation and release preparation

**Added**

- In-client help (`help.js`), opened with `F1` or from the command palette.
  Fifteen topics covering every feature, with worked examples and, for game
  developers, real provider and settings code.
  - Topics are gated on the same automation policy as the editors. A game that
    forbids scripting has no scripting topic — documenting a feature a player
    cannot use sends them looking for a button that is not there.
  - Every topic is individually registered in the palette, so searching for
    "privacy" reaches the privacy topic rather than a generic "Help" entry.
  - Two panes, both keyboard-operable; choosing a topic moves focus into the
    article so a screen-reader user lands on the content.
- `LICENSE` — BSD 3-Clause, matching Evennia's own so the contrib can be
  upstreamed without friction.
- Project `README.md` with hero shot, quick start, and an honest built/remaining
  split.
- `scripts/sync_contrib.py`, mirroring the working copy into
  `contrib/aetos_webclient/` so the published repository contains the actual
  client rather than only notes about it. `--check` fails on drift.
- This changelog.

**Changed**

- The contrib README's feature list, which had drifted three milestones behind
  the code, and its provider documentation, which listed four slots when there
  are eight.

---

### M15 — Command palette, automation editors, privacy panel

**Added**

- Command palette (`palette.js`), opened with `Ctrl+K` / `Cmd+K`, bound with
  capture at the document so it works from the game input.
- Editors for aliases, triggers, timers and scripts, clearing the UI work
  deferred from M12–M14.
- Privacy panel: counts read from storage rather than assumed, a statement of
  whether storage is persistent at all, and profile export/import.

**Design notes**

- The palette acts on the client and never sends game commands. The player
  already has a command line; a second one that looked similar but behaved
  differently would be a trap.
- Matching is subsequence, not substring — "elay" finds "Edit layout" — because
  a player half-remembers a name and types fragments of it.
- Clearing confirms with specifics: how many items, that it cannot be undone,
  that the game account is unaffected. "Are you sure?" without specifics is not
  informed consent.
- Import reports what it refused as well as what landed.

**Fixed**

- The palette and settings surfaces were defined *after* `window.Aetos` captured
  them, so `Aetos.palette` was null with no error — the same ordering fault as
  the M12 hotbar. Both are now guarded by tests.
- Overlays append to `<body>`, outside `.aetos-root`, so they did not inherit the
  client's font and rendered in the browser's default serif.

---

### M14 — Timers and Aetos Script

**Added**

- Scheduled timers.
- Aetos Script: tokenizer, parser and tree-walking interpreter. Not `eval` with a
  blocklist — the grammar has no property access, no indexing and no function
  definition, so there is nothing to escape from.
- Limits: 10,000 steps, 1,000 iterations per loop, 16 call levels, 250 ms
  runtime, 20,000 characters of source. These protect the player's own tab.

---

### M13 — Aliases and triggers

**Added**

- Alias engine with `$1`…`$9` and `$*` substitution, and no recursive expansion.
- Trigger engine on game output, plain text or regular expression, rate limited.

**Fixed**

- `$*` repeated the first argument: `tell $1 $*` on `tt Bob hello` produced
  "tell Bob Bob hello".
- A trigger never fired on its first match, because `lastFired[id] || 0`
  conflates "never fired" with "fired at time 0".

---

### M12 — Hotbars, macros and the command queue

**Added**

- Macros of up to five commands, a hotbar, and a visible cancellable queue that
  paces commands rather than flooding the server.

**Fixed**

- The hotbar was never registered: it was defined after `window.Aetos` captured
  it.

---

### M11 — Relationships, notes and personal points of interest

**Added**

- Private notes, relationship tags, map notes and POIs — all browser-local.

**Fixed**

- Saving a note wiped its tags, because a full replace treated an omitted field
  as an empty one. Saves now merge.

---

### M10 — Context actions

**Added**

- Context menus on every listed entity, reachable by right-click, the Context
  Menu key and Shift+F10 — the last two being the ones a keyboard user can press.
- Actions travel *with* the entity rather than in a parallel list, so a menu can
  never be rendered against the wrong target.

---

### M9 — Universal mapper

**Added**

- Local room graph built by walking visible exits, honouring `view` and `search`
  locks so secret exits stay hidden.
- A written description of the surroundings generated from the *same* graph as
  the picture, so the two cannot disagree.
- Route walking, sending ordinary movement commands one at a time.

---

### M8 — Generic resources

**Added**

- Resource meters for any numbers a game declares, with thresholds and spoken
  announcements on crossing.
- The number is always shown, not only the bar; severity is stated in words as
  well as colour.

---

### M7 — Workspaces, layout editing and the widget palette

**Added**

- Named workspaces, keyboard-operable layout editing, and a widget palette.

**Fixed**

- Every widget landed in `sidebar` because the registry's `normalize()` dropped
  `defaultRegion`.
- The console was squeezed to 303px: the workspace was a single flex row, so the
  bottom region sat beside `main`. Converted to CSS grid with named areas.
- Empty widgets rendered as empty boxes, because the layout manager and the
  widgets both wrote `panel.hidden`. Split into `hidden` (the player's choice)
  and `data-aetos-empty` (the widget's).

---

### M6 — Layout manager and widget registry

**Added**

- Widget registry with capability gating, and a region-based layout manager.

**Fixed**

- Widgets mounted after their data arrived stayed empty, because the store only
  notifies on change. `layout.add()` now primes on subscribe.

---

### M5 — Local storage and profile export/import

**Added**

- IndexedDB-backed storage across fifteen namespaces, scoped to the game's
  origin, with export and import of the whole profile as one JSON file.

---

### M4 — Client shell and first widgets

**Added**

- The Aetos shell, batched state store, and the first widgets.

**Fixed**

- Raw colour markup (`|wEvennia|n`) appeared in widgets: the Portal only converts
  the `text` outputfunc. Values are now split into `name` (plain, safe for
  commands) and `display` (HTML).
- `applySync` wiped the manifest, which arrives in its own message.
- The store used `requestAnimationFrame` alone, which does not run in a hidden
  tab, so subscribers never fired. Now a rAF/timeout race.
- The client did not fill the screen: `<html>` had no background and the root was
  sized at `100vh`. Also found the page carried no cache headers while embedding
  `browser_sessid`; a no-store directive was added.

---

### Phase 1 — Integration spike

**Added**

- Template override, static asset pipeline, versioned protocol and handshake,
  capability manifest, allowlist sanitiser.

**Fixed**

- `_classify` reported ordinary items as characters, because
  `hasattr(obj, "at_pre_puppet")` is true for every `DefaultObject`. A brass lamp
  appeared under "People Here". Now uses `settings.BASE_CHARACTER_TYPECLASS`.

**Corrected**

- `WEBCLIENT_TEMPLATE = "aetos"` does not work: `settings_default` builds
  `TEMPLATES` at import time. `AETOS_TEMPLATE_DIR` must be prepended to
  `TEMPLATES[0]["DIRS"]`.

---

### Phase 0 — Baseline

**Added**

- Clean-room lab against pristine Evennia 6.1.0, on a non-standard port.
- Interpreter detection parsing Evennia's own `requires-python`, so a developer
  is not forced to upgrade.
- Baseline test run, baseline screenshots, and an accessibility audit of the
  stock client to measure against.

**Decisions**

- [`decision-001`](notes/decision-001-python-version-policy.md) — develop on the
  latest Python, support anything Evennia supports.
- [`decision-002`](notes/decision-002-lab-port-allocation.md) — non-standard
  port, because other games run on this machine.
- [`decision-003`](notes/decision-003-accessibility-is-a-gate.md) —
  accessibility is a merge gate, not a later pass.
- [`decision-004`](notes/decision-004-self-contained-client.md) — self-contained.
  Eight CDN resources dropped, including two whose URLs were deprecated or
  unpinned. A ~20-line shim replaced jQuery for `evennia.js`'s single use of it.
