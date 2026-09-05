# Aetos Web Client — Engineering Blueprint Addendum A

## Accessibility, Assistive Technology, Cognitive Support, and AAC

**Status:** Normative engineering specification
**Applies to:** All phases of the Aetos Web Client
**Parent document:** Aetos Web Client Complete Engineering Blueprint
**Conformance target:** WCAG 2.2 Level AA minimum, plus selected AAA/best-practice requirements defined below
**Primary desktop assistive-technology target:** NVDA and JAWS on Windows
**Secondary desktop target:** Orca on Linux
**Additional target:** Refreshable braille
**Additional accessibility domains:** Low vision, motor access, deaf/hard-of-hearing access, cognitive/executive-function support, AAC/picture-supported communication

> Staging, requirement-to-milestone mapping, and current compliance status are
> in [`notes/roadmap.md`](../notes/roadmap.md) under "Addendum A". This document
> is the requirement text; the roadmap is where it is scheduled.

---

## A.1 Purpose

This addendum changes accessibility from a late-stage review item into a
foundational architectural requirement of the Aetos Web Client.

The previous blueprint's concept of a final accessibility phase is superseded.
Accessibility SHALL be designed, implemented, and tested during every feature
phase. A feature is not considered complete merely because it works visually
with a mouse.

For each applicable feature, completion requires:

```text
Visual operation
Keyboard operation
Semantic accessibility
Screen-reader operation
Focus correctness
Low-vision compatibility
Reduced-motion compatibility
Cognitive-accessibility review
Automated accessibility tests
Manual assistive-technology review where applicable
```

The design goal is not: *The Aetos Web Client technically works with a screen
reader.*

The design goal is: **A person using a screen reader, refreshable braille
display, keyboard-only navigation, magnification, reduced-stimulation
interface, or picture-supported communication should be able to use the same
full Aetos Web Client without being forced into an inferior secondary client.**

## A.2 Normative language

The terms MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY are normative.

- **MUST** means required for release.
- **SHOULD** means expected unless a documented technical reason prevents implementation.
- **MAY** means optional.

Claude or any implementation agent MUST NOT silently downgrade a MUST
requirement. If a requirement cannot be implemented, it MUST be recorded as an
explicit unresolved engineering issue.

## A.3 Accessibility baseline

### A11Y-BASE-001 — Accessibility is not a developer toggle

Core accessibility behavior MUST NOT be disableable by the MUD developer. The
following are always part of the Aetos Web Client:

```text
semantic HTML
keyboard accessibility
focus management
accessible labels
non-drag alternatives
screen-reader-compatible structure
text alternatives
contrast requirements
local accessibility preferences
reduced-motion support
```

A developer may decide whether gameplay systems such as scripting or automation
are allowed. A developer does not decide whether a player gets an accessible
interface.

### A11Y-BASE-002 — WCAG target

The Aetos Web Client MUST target WCAG 2.2 Level AA. Selected AAA requirements
defined by this document SHOULD also be treated as product requirements where
practical.

```text
Normal text contrast             >= 4.5:1
Large text contrast              >= 3:1
Required non-text/UI contrast    >= 3:1
Text resize                      >= 200%
Reflow test                      320 CSS px equivalent / 400% zoom
Minimum pointer target           >= 24 x 24 CSS px
Preferred pointer target         >= 44 x 44 CSS px
```

The visual map may use two-dimensional scrolling because maps are inherently
spatial, but all essential map information MUST have a nonvisual alternative.

## A.4 Fundamental architecture

Accessibility SHALL be implemented as a first-class subsystem.

```text
static/aetos/js/
│
├── accessibility/
│   ├── accessibility.js
│   ├── preferences.js
│   ├── announcer.js
│   ├── focus.js
│   ├── shortcuts.js
│   ├── review.js
│   ├── orientation.js
│   ├── cognitive.js
│   ├── map_access.js
│   ├── aac.js
│   └── audit.js
│
└── widgets/
```

```text
static/aetos/css/
│
├── accessibility.css
├── high-contrast.css
├── reduced-motion.css
└── print-or-export.css
```

Core objects:

```text
AetosAccessibilityManager
AetosAnnouncementManager
AetosFocusManager
AetosShortcutManager
AetosReviewController
AetosOrientationController
AetosCognitiveSupport
AetosAccessibleMap
AetosAACController
```

Accessibility code MUST subscribe to the same canonical Aetos state store as
visual widgets. It MUST NOT independently scrape rendered screen text to
reconstruct game state when structured state already exists.

## A.5 Native HTML first

### A11Y-DOM-001

Use native semantic HTML whenever a native element correctly represents the
intended behavior: `<button>`, `<input>`, `<label>`, `<nav>`, `<main>`,
`<section>`, `<article>`, `<ul>`, `<ol>`, `<table>`, `<dialog>`.

Do not implement `<div class="button">` when `<button>` will work.

## A.6 Do not turn the whole client into an ARIA application

### A11Y-DOM-002

The root Aetos Web Client MUST NOT use `<body role="application">` or equivalent
whole-client application semantics. The normal browser document model SHALL
remain available.

This preserves NVDA, JAWS, and Orca navigation by heading, landmark, list, list
item, button, edit field, form control, table, link, and region.

Localized ARIA application/widget patterns MAY be used only where necessary.

## A.7 Top-level semantic structure

The default client MUST expose meaningful landmarks.

```html
<header>Game/session identity</header>
<nav aria-label="Aetos navigation">Primary navigation</nav>
<main id="aetos-main">Current game workspace</main>
<aside aria-label="Character and context">Optional contextual information</aside>
```

Every visible major widget MUST be represented by a labeled semantic region:

```html
<section aria-labelledby="room-heading">
    <h2 id="room-heading">Current Location</h2>
</section>
```

Widgets SHOULD use `h2` for top-level widget headings and `h3` for subsections.
Heading levels MUST remain logically ordered. Visual CSS size MUST NOT determine
semantic heading level.

## A.8 Skip navigation

### A11Y-NAV-001

The beginning of the document MUST provide keyboard-visible skip links.
Minimum:

```text
Skip to command input
Skip to current state
Skip to game output
Skip to navigation
Skip to accessibility/help
```

These links MAY remain visually hidden until keyboard focused. No browser
`accesskey` dependency is required.

## A.9 Current State View

### A11Y-STATE-001

The Aetos Web Client MUST implement a Current State View, separate from
historical game output. Its purpose is to answer "What is true right now?"
without searching scrollback.

It SHOULD include structured sections when available:

```text
Current Location
Description
Exits
Players
NPCs
Objects
Character Status
Effects
Target
Active Route
Important Current Alerts
```

### A11Y-STATE-002

The Current State View MUST NOT automatically announce every state mutation. It
is primarily a navigable snapshot. Significant changes may separately generate
controlled announcements through the Announcement Manager. This prevents
duplicated speech.

## A.10 Raw game transcript

### A11Y-LOG-001

The game transcript MUST remain completely reviewable as text. The visual log
and underlying event history MUST NOT be an inaccessible canvas.

### A11Y-LOG-002 — Do not make all output automatically live

The complete transcript MUST NOT blindly announce every appended line through an
unrestricted live region. Room descriptions, combat spam, chat, resource
changes, system messages and ambient text can arrive faster than speech can
reasonably process.

A separate Announcement Manager MUST determine what is automatically announced.
The complete text remains available for manual review.

### A11Y-LOG-003

The transcript SHOULD be represented as a labeled semantic region. The
transcript itself is not required to be `aria-live`. Where `role="log"` is used,
its live-region behavior MUST be consciously controlled and tested rather than
assumed.

## A.11 Transcript data model

```javascript
{
    id: "evt-...",
    timestamp: 0,
    category: "combat",
    priority: "normal",
    text: "...",
    source: null,
    structuredData: null
}
```

Categories SHOULD include: `room`, `movement`, `tell`, `chat`, `combat`,
`system`, `resource`, `effect`, `inventory`, `target`, `command`, `media`,
`other`.

## A.12 Transcript performance and accessibility

Visual virtualization MUST NOT make historical content inaccessible. Implement
`AetosLogStore` separately from the `ConsoleWidget` DOM.

Suggested initial bounded event history: **5,000 events**. This value MUST be
centralized and configurable after profiling.

The accessible Review interface SHOULD render manageable chunks, initially **100
events per review page**, with controls for previous, next, jump to latest,
search and filter.

If a DOM element currently holds keyboard focus or is actively being reviewed,
virtualization MUST NOT remove it until focus/review leaves that element.

## A.13 Announcement Manager

### A11Y-ANN-001

Implement `AetosAnnouncementManager`. All automatic assistive-technology
announcements MUST pass through it. Widgets MUST NOT create independent
`aria-live` regions without explicit architectural approval. This prevents
dozens of widgets from competing for speech.

## A.14 Announcement priorities

Internal priorities: `critical`, `important`, `normal`, `background`, `silent`.

```text
Connection lost                critical
Authentication/session issue   critical
Direct tell                    important
Room transition                important
Normal chat                    normal
Combat                         normal
Resource updates               background
Decorative ambient update      silent
```

These are defaults, not gameplay truths. The player MUST be able to customize
announcement behavior locally.

## A.15 Live region implementation

```html
<div id="aetos-announcer-polite" role="status" aria-live="polite" aria-atomic="true"></div>
<div id="aetos-announcer-urgent" role="alert" aria-atomic="true"></div>
```

The assertive/alert region MUST be used sparingly. Gameplay spam MUST NOT be
routed through the urgent region. Default automatic announcements SHOULD be
polite.

## A.16 Announcement flood control

Because browser applications cannot reliably determine when a screen reader has
finished speaking, Aetos MUST NOT attempt to synchronize against speech
completion. Use deterministic client-side burst control.

```text
Normal aggregation window     500 ms
Flood threshold               5 announceable events/sec
Flood duration trigger        2 sec
Flood summary interval        2 sec
```

Instead of announcing twelve individual combat lines, Aetos MAY announce
`Heavy combat activity. 12 additional combat events.` while retaining every
individual line in the transcript.

Direct tells and critical system messages SHOULD bypass normal combat
aggregation. All constants MUST live in one configuration object for
user-testing adjustment.

## A.17 Review Mode

### A11Y-REV-001

Implement explicit Review Mode. When entered:

```text
low-priority automatic announcements pause
new events continue entering the log
important event counts are tracked
the user's review position remains stable
```

When leaving Review Mode, Aetos MUST NOT dump the entire delayed queue through
the screen reader. Instead announce a summary such as `17 events occurred while
reviewing. 2 tells. 11 combat events. 4 other events.` then offer *Review missed
events* and *Resume live play*.

## A.18 Recent event review

Implement keyboard-operable review actions: previous/next event, previous/next
tell, previous/next chat message, latest event, search history.

These MUST be accessible from menus/buttons even if no keyboard shortcut is
configured. When Review Mode has focus, simple local arrow navigation MAY be
used because keys then apply only to that focused component.

## A.19 Focus management

### A11Y-FOCUS-001 — No unsolicited focus theft

Normal server events MUST NOT change DOM focus. This includes combat updates,
room contents updates, map updates, health updates, incoming chat, incoming
tells, target changes, weather updates, effects added, animations and audio
events.

### A11Y-FOCUS-002

The command input SHOULD retain focus after sending a command unless the user
deliberately moved elsewhere.

### A11Y-FOCUS-003

Opening a user-requested modal dialog MUST move focus into the dialog. Closing
it MUST restore focus to the control that opened it, unless the invoking element
no longer exists. Modal keyboard behavior MUST follow the WAI-ARIA dialog
pattern: Tab cycles inside, Shift+Tab reverse cycles, Escape closes where safe.

### A11Y-FOCUS-004

Focused controls MUST never be completely obscured by Aetos-created overlays,
sticky bars, or panels. Visible keyboard focus MUST be clearly perceivable.
Aetos SHOULD target a focus indicator equivalent to at least a 2 CSS-pixel
perimeter and 3:1 state contrast.

## A.20 DOM stability

### A11Y-FOCUS-005

Do not replace large DOM subtrees merely because one value changed. Avoid
`widget.innerHTML = renderWholeWidget()` for every health update.

Preferred: update only the changed semantic node, preserve stable element IDs,
preserve focus, preserve review position. This is especially important for
assistive technology virtual cursors and braille review.

## A.21 Keyboard access

### A11Y-KEY-001

All Aetos functions available with pointer input MUST have keyboard
equivalents: opening, closing, moving and resizing widgets; switching
workspaces; opening context menus; selecting entities; editing macros; using
maps; creating notes; managing reminders; AAC composition.

## A.22 Single-key shortcuts

### A11Y-KEY-002

The Aetos Web Client MUST NOT ship global character-only shortcuts such as
`M = Map`, `I = Inventory`, `H = Help`.

NVDA and JAWS use many single characters for structural web navigation. WCAG 2.2
requires character-only shortcuts to be disableable, remappable to include
non-printable keys, or active only while the relevant component has focus.

## A.23 Shortcut Manager

Implement `AetosShortcutManager`. Every shortcut MUST support: view, rebind,
disable, restore default, conflict warning.

Maintain a known-conflict table for browser, NVDA, JAWS, Orca and operating
system shortcuts. This table is advisory; users MAY override warnings.

**No feature may exist only behind a shortcut.**

## A.24 Accessible context menus

Anything activated by right-click MUST also support the keyboard Context Menu
key, Shift+F10, and a visible Actions button or equivalent.

This applies to players, NPCs, items, map rooms, inventory items, notes and
relationships.

## A.25 Drag-and-drop layout

### A11Y-LAYOUT-001

Dragging is never the only method for repositioning a widget. Every widget's
layout menu MUST provide, where applicable:

```text
Move before...
Move after...
Move to workspace...
Move left / right / up / down
Reset position
```

## A.26 Keyboard resizing

Resizable pane boundaries MUST support keyboard resizing. Where a focusable
splitter is used, follow WAI-ARIA window-splitter semantics as practical:
`role="separator"`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`,
`aria-controls`, accessible label.

Keyboard: arrows resize, Home minimum, End maximum, Enter collapse/restore where
applicable.

The APG splitter pattern remains less mature than some APG patterns, so actual
NVDA/JAWS/Orca testing is mandatory rather than assuming specification
compliance equals usability.

## A.27 Tabs

Tabbed widgets MUST implement `tablist`, `tab`, `tabpanel`, `aria-selected`,
`aria-controls` and `aria-labelledby`. Keyboard interaction MUST follow the APG
Tabs Pattern.

## A.28 Widget accessibility contract

Every Aetos widget definition MUST include accessibility metadata:

```javascript
{
    id: "inventory",
    displayName: "Inventory",

    accessibility: {
        landmarkLabel: "Inventory",
        heading: "Inventory",
        description: "Items currently carried by your character",
        keyboardOperable: true,
        liveUpdates: false
    }
}
```

A widget MUST declare whether it contains auto-updating information, requires
live announcements, supports keyboard interaction, contains graphical-only
presentation, and has a text/nonvisual alternative.

## A.29 Map accessibility

The visual mapper MUST NOT be considered sufficient accessibility for map
information. Implement `AetosAccessibleMap` alongside the graphical mapper.

- **A11Y-MAP-001 — Current room.** Expose current room name, zone/area if
  available, available exits, adjacent known destinations, current floor/Z
  level, current route.
- **A11Y-MAP-002 — Exit representation.** An accessible exit list such as
  `North — Market Road`. Each navigable exit MAY be a button that sends the
  ordinary movement command.
- **A11Y-MAP-003 — Route preview.** A path MUST have a textual equivalent,
  enumerated step by step.
- **A11Y-MAP-004 — Accessible POI list.** POIs MUST be searchable/listable
  independently of the visual map.
- **A11Y-MAP-005.** A canvas/SVG map MAY be hidden from the accessibility tree
  if its complete meaningful information is exposed through the accessible map
  interface. It MUST NOT expose thousands of useless graphical nodes to a screen
  reader simply for technical completeness.

## A.30 Screen-reader primary target

```text
Windows 11
NVDA current stable
Chrome / Firefox / Edge
```

NVDA supports Browse Mode, structural single-letter navigation, Elements List
navigation, review modes, and refreshable braille.

## A.31 JAWS target

```text
JAWS 2026
Chrome / Edge / Firefox where practical
```

JAWS testing MUST specifically include Virtual Cursor navigation, Quick
Navigation Keys, heading list, form controls, regions, tables, dialogs, live
announcements and keyboard context menus.

## A.32 Linux target

```text
Orca
Firefox
Chromium/Chrome
```

NVDA through Wine is NOT the baseline Linux test configuration.

## A.33 Odilia

Odilia MAY be included as an experimental Linux test target. Failure
specifically in Odilia SHALL NOT initially block Aetos release unless the same
defect is reproducible in standards-conforming browsers or other assistive
technology.

## A.34 Braille requirements

Braille is not to be treated merely as "speech turned off." NVDA allows a
braille display to follow either focus/caret or the review cursor.

- **A11Y-BRL-001.** Unexpected focus changes are prohibited.
- **A11Y-BRL-002.** Status strings SHOULD have compact equivalents:
  `HP 82/100`, `Mana 40/60`, `Poisoned`, `RT 3s` — rather than verbose prose.
- **A11Y-BRL-003.** Changing resources MUST update the smallest practical DOM
  node.
- **A11Y-BRL-004.** Review Mode MUST preserve review position.
- **A11Y-BRL-005.** A high-frequency value such as milliseconds of cooldown MUST
  NOT continuously flood the accessibility tree. Round values or announce
  thresholds instead: `5 seconds, 4 seconds, ... ready` rather than
  `4.973, 4.941, 4.902 ...`.

## A.35 Braille testing

At least one actual refreshable braille display MUST be included in pre-release
human testing. An emulator or visual Braille Viewer does not fully substitute
for actual display use.

Required tasks: review room description, review current state, review history,
enter command, read resource status, navigate inventory, read a tell during
combat, open notes, reorient, use map route.

## A.36 Cognitive / executive-function architecture

Implement `AetosOrientationController` and `AetosCognitiveSupport`. The purpose
is to reduce working-memory burden, reduce disorientation, make recovery after
interruption easy, provide user-controlled reminders, reduce unnecessary
interruptions, and preserve predictable interfaces.

## A.37 Reorient Me

### A11Y-COG-001

Implement a permanent Reorient Me action, accessible from every workspace. It
produces a concise orientation summary using facts, not inferred intention:
current location, how the player arrived, exits, people present, character
state, recent actions, pinned reminders, active route.

## A.38 No intention inference

### A11Y-COG-002

Aetos MUST NOT infer "You were trying to...", "You wanted to...", or "Your
objective is..." from command history.

Only display: objectives supplied explicitly by the game, tasks entered
explicitly by the player, recent factual actions, and current factual state.

## A.39 How I got here

### A11Y-COG-003

Maintain a local successful-movement breadcrumb history. Prefer authoritative
room/state changes over assuming a typed movement command succeeded.

Expose: *How I Got Here*, *Show route*, *Walk back*, *Clear breadcrumb*.

## A.40 Walk back

Walk Back MAY calculate an inverse route. It MUST use normal Evennia movement
commands and MUST stop if movement fails. The server remains authoritative. No
accessibility function bypasses game movement rules.

## A.41 Session resume

### A11Y-COG-004

After a configurable idle threshold or fresh browser return, Aetos MAY offer a
Resume Card showing last known location, recent activity and pinned reminders.

Before a fresh authoritative `aetos_sync` is received, cached values MUST be
labeled **Last known**. After synchronization they may be labeled current.

## A.42 User-controlled reminders

### A11Y-COG-005

Reminders MUST be created only at the user's request. Aetos MUST NOT
spontaneously create behavioral reminders such as "Did you remember to talk to
everyone?" unless the player explicitly enabled such a checklist.

## A.43 Reminder types

Local reminders MAY support: manual pinned reminder, remind when I return here,
remind next session, remind after duration, remind when tagged entity appears.
All reminder data remains client-local.

## A.44 Orientation checklist

Optional local checklist covering current room, exits, people, visible objects,
current objective, pinned notes and active route.

Player controls: `disabled`, `manual only`, `after long idle`, `when entering
unfamiliar location`, `always`. Default: **manual only**.

## A.45 Personal task board

Implement an optional local task list:

```javascript
{ id, text, completed, pinned, createdAt, locationId, tags }
```

Tasks are player-created. They are not game quests unless the player manually
chooses to represent one that way.

## A.46 Universal search

### A11Y-COG-006

The Command Palette / search system MUST permit cross-feature search across
notes, player tags, map notes, POIs, tasks, recent history, commands, locations,
Aetos settings and help. This reduces the need to remember which subsystem
contains information.

## A.47 Focus Mode

Focus Mode SHOULD reduce the displayed interface to a user-selected essential
set — by default Current State, Game Output, Command Input, Current Task and
Critical Resources.

Focus Mode MUST NOT delete state or change the game. Exit must be obvious and
keyboard accessible.

## A.48 Quiet Mode

Quiet Mode controls interruptions rather than layout. It SHOULD suppress
low-priority announcements, optional animations and optional UI sounds; retain
complete game text and important/critical events; and count deferred events.

On exit: summarize deferred events; do not replay the entire backlog
automatically.

## A.49 Predictable layout

### A11Y-COG-007

A game event MUST NOT silently rearrange the player's workspace by default.
Automatic workspace switching defaults to **OFF**. Preference options: never
switch automatically, ask before switching, switch automatically.

## A.50 Stable help location

Help, accessibility, Reorient Me, and command input navigation MUST remain
available in predictable locations regardless of workspace.

## A.51 Simplified workspace

Provide a prebuilt optional simplified layout (Game, People, Map, My Character,
Talk, Help). This is not an inferior client; it is a simplified presentation of
the same underlying capabilities.

## A.52 Reduced stimulation

Accessibility preferences MUST include presentation intensity: `Rich`,
`Standard`, `Reduced`, `Minimal`.

Reduced/Minimal MUST suppress unnecessary pulsing, glowing, screen shake,
animated transitions, background motion, decorative movement and rapid state
animation.

## A.53 System reduced-motion setting

CSS and JavaScript MUST respect `@media (prefers-reduced-motion: reduce)` unless
the user explicitly overrides it.

## A.54 Flashing

Aetos SHOULD avoid flashing effects entirely. Under no circumstance may the
interface deliberately exceed WCAG flash thresholds. Combat alerts SHOULD use a
static shape, border, icon, text, or sound where enabled instead of flashing.

## A.55 Low vision

- **A11Y-VIS-001.** All text MUST support browser zoom to at least 200% without
  loss of functionality. The interface MUST be tested at 400% zoom / 320 CSS
  pixel equivalent width.
- **A11Y-VIS-002.** Use responsive sizing (`rem`, `em`, percentage, flexbox,
  grid, `clamp()`) rather than rigid pixel dimensions.
- **A11Y-VIS-003.** Themes MUST meet contrast requirements. Theme validation
  MUST be part of theme acceptance. A custom theme that fails minimum
  accessibility requirements MUST produce a developer/user warning.

## A.56 Color

Color MUST NOT be the only meaning carrier. Not `green player = friend` /
`red player = enemy`, but `Friend — icon + label + optional color`.

## A.57 Pointer and motor access

All interactive controls MUST meet at least the WCAG AA pointer target
requirement. Aetos SHOULD design major touch controls around the enhanced
44×44 CSS pixel target wherever practical.

Functions MUST NOT require dragging, double clicking, precision pointer
placement, multi-point gestures, or hover-only activation without an
alternative.

## A.58 Media accessibility

- **A11Y-MEDIA-001.** No gameplay-essential information may exist only in audio.
  Media descriptors SHOULD contain `url`, `category`, `caption`, `description`,
  `decorative`.
- **A11Y-MEDIA-002.** Player controls MUST include mute all, music volume,
  ambience volume, effects volume, UI volume, stop all audio.
- **A11Y-MEDIA-003.** Decorative media may be marked `decorative: true` and
  should not generate unnecessary accessibility announcements.

## A.59 Picture-supported communication / AAC

Implement an AAC architecture as a first-class extension point. W3C WAI-Adapt is
designed to associate textual concepts with AAC symbols and emphasizes that
different AAC users may know different, mutually unfamiliar symbol sets.

## A.60 AAC concept model

Aetos SHALL separate semantic concept, display text, symbol rendering, and
command generation.

```javascript
{
    id: "help",
    label: "Help",
    waiAdaptConcept: null,
    category: "communication",
    commandTemplate: null
}
```

If an appropriate published W3C AAC Registry ID exists, it MAY be stored as
`waiAdaptConcept`. **Aetos MUST NOT invent W3C concept IDs.**

## A.61 WAI-Adapt alignment

Where valid concept mappings exist, rendered controls MAY include the
`adapt-symbol="..."` attribute. Because WAI-Adapt implementation support is
still emerging, the Aetos Web Client MUST NOT depend on the browser rendering
the symbol automatically. Aetos provides its own symbol-provider layer while
aligning semantics with WAI-Adapt where practical.

## A.62 Symbol provider

```javascript
AetosSymbolProvider.getSymbol(concept) -> { src, alt, license, attribution }
```

The player may select a local symbol pack. If no symbol exists, show the text
label. **Never guess a replacement symbol.**

## A.63 Symbol licensing

The core contrib MUST NOT bundle third-party AAC symbol artwork unless
redistribution rights are verified. Concept identifiers and mappings may be
bundled where legally permitted. Symbol imagery requires explicit licensing
review.

## A.64 Icons plus text

Default communication controls MUST show **symbol + text**, not symbol alone. A
player MAY configure symbol-focused presentation.

## A.65 Picture Communication widget

Initial categories: Common, Movement, People, Actions, Social, Questions,
Feelings, Objects, Combat, Custom.

Example concepts: I, you, want, need, help, yes, no, stop, look, go, north,
south, east, west, talk, friend, trade, take, give, eat, drink.

Only concepts with known meanings and appropriate mappings are included.

## A.66 Sentence strip

Selected concepts form an ordered sentence strip: `[I] [want] [help]`.

The sentence strip MUST be keyboard operable: add concept, remove concept, move
left, move right, clear, preview, send. Drag-and-drop MAY exist visually but
MUST NOT be required.

## A.67 AAC output safety

Before sending communication, the Aetos Web Client SHOULD show the generated
textual message with *Send*, *Edit Text* and *Cancel*. This prevents an
incorrect concept-to-text mapping from silently speaking for the player.

## A.68 AAC transport

AAC composition ultimately generates normal game input, e.g. `say I want help`.
The server does not need an AAC subsystem and is not automatically informed that
the player uses AAC.

## A.69 No AI intent guessing

The initial AAC implementation MUST NOT use generative AI to guess player intent
or automatically rewrite arbitrary MUD prose into symbols. Mappings must be
deterministic. This restriction may only be revisited as a separately reviewed
optional capability.

## A.70 Accessibility profiles

The accessibility system MUST NOT be a simple on/off switch. Preferences are
granular:

```javascript
{
    version: 1,

    screenReader: {
        announcementMode: "selective",
        announceRoom: true,
        announceTells: true,
        announceChat: true,
        announceCombat: false,
        announceResources: "thresholds",
        reviewModeBehavior: "pause-normal"
    },

    braille: {
        compactStatus: true,
        preserveReviewPosition: true
    },

    keyboard: {
        singleKeyShortcuts: false,
        conflictWarnings: true
    },

    cognitive: {
        reorientEnabled: true,
        orientationChecklist: "manual",
        quietMode: false,
        automaticWorkspaceSwitching: "never"
    },

    visual: {
        scale: 1.0,
        contrast: "standard",
        motion: "system",
        stimulation: "standard"
    },

    aac: {
        enabled: false,
        symbolPack: null,
        showTextWithSymbols: true
    }
}
```

## A.71 Accessibility must work without a profile

Semantic HTML and keyboard access are always active. Selecting a Screen Reader
profile merely adjusts announcement behavior, verbosity and convenience
settings. It does not "turn accessibility on."

## A.72 Privacy

All accessibility preferences MUST remain local by default, in IndexedDB or the
established Aetos local-storage abstraction. No accessibility profile is
persisted on the MUD server.

## A.73 No screen-reader fingerprinting

The Aetos Web Client MUST NOT attempt to detect NVDA, JAWS, Orca, braille
hardware or AAC usage and report that to the MUD.

## A.74 No accessibility telemetry

The Evennia contrib MUST NOT transmit accessibility usage analytics. Examples
that MUST NOT be reported: `screenReader=true`, `braille=true`,
`cognitiveProfile=true`, `aac=true`, friend tags, notes, reminders.

## A.75 Local data dashboard

The existing Aetos Privacy & Local Data UI MUST include accessibility
preferences, AAC preferences, local reminders, task board and orientation
history — with export, import, clear category and clear all.

## A.76 Protocol accessibility metadata

The server does not need the player's accessibility preferences. The server MAY
provide richer semantic metadata:

```json
{
    "type": "aetos_state",
    "category": "room",
    "importance_hint": "important",
    "text": "You enter the Rusty Dragon.",
    "entity_id": "#123"
}
```

`importance_hint` is advisory. The local player preference always determines
automatic announcements.

## A.77 Resource accessibility metadata

```json
{
    "id": "health",
    "label": "Health",
    "value": 82,
    "maximum": 100,
    "units": null,
    "state_text": "healthy"
}
```

A resource gauge MUST expose equivalent accessible value information.

## A.78 Action accessibility metadata

```json
{
    "id": "trade",
    "label": "Trade",
    "description": "Request a trade with Captain Renn",
    "command": "trade captain",
    "aac_concept": null
}
```

Buttons MUST expose accessible name, description where necessary, disabled
state, and pressed/selected state where applicable.

## A.79 Media metadata

Meaningful media SHOULD include caption, description, category and decorative
flag. No caption can be automatically invented reliably by the Aetos Web Client.
This is one area where a game developer must provide adequate source metadata.

## A.80 Relationships and notes accessibility

Friend / Neutral / Enemy / custom-tag systems MUST be represented textually, not
only as a green or red border. Context actions MUST be keyboard accessible.

## A.81 Macros accessibility

Macro editor fields MUST be explicitly labeled (`Macro name`, `Command 1 of 5`,
… `Delay between commands`, `Keyboard shortcut`).

A macro button accessible name SHOULD include its configured label. Command
contents SHOULD be available through description/details rather than spoken
every time the button receives focus.

## A.82 Automation accessibility

Alias, trigger, timer and script editors MUST be keyboard operable. Visual rule
builders MUST have equivalent semantic controls — conventional labeled controls,
not only visual blocks connected by lines.

## A.83 Command input

The command input MUST have an explicit label, be keyboard reachable, remain
stable in the DOM, support standard editing keys, and not hijack screen-reader
quick navigation unexpectedly.

## A.84 Visual auto-updates

Moving, blinking, scrolling, or auto-updating UI that is not essential MUST be
pausable, stoppable, hideable, or otherwise user-controlled where WCAG requires
it. Quiet Mode and reduced-motion settings SHALL be part of this solution.

## A.85 Testing architecture

Three mandatory layers: automated testing, manual developer testing, and human
assistive-technology testing. **Automated testing alone is insufficient.**

## A.86 Automated testing

Development QA SHOULD use Playwright and `@axe-core/playwright` as
development-only tooling. These are NOT runtime dependencies for people
installing the Evennia contrib. A game developer does not need Node or
Playwright to use Aetos.

## A.87 Automated accessibility gate

Every major view SHOULD have an automated accessibility test: default
workspace, Current State, Game Output, Map, Inventory, Notes, Relationships,
macro editor, trigger editor, Settings, Accessibility settings, AAC board,
Reorient Me, dialog states, context menus, mobile view.

CI requirement: **no known serious/critical axe violations in supported baseline
states.** An axe pass does NOT automatically mark the feature accessible.

## A.88 Keyboard-only test

Every feature MUST be manually usable with the mouse unplugged, screen reader
off, keyboard only. The tester must be able to log in, find the command input,
move between major areas, execute commands, open the map, use inventory, open
context actions, move and resize widgets, edit a macro, open notes, change
settings, and return to the game.

## A.89 NVDA manual test

Primary release-gate screen-reader test, with current stable NVDA:

```text
1.  Open the Aetos Web Client.
2.  Identify the page/client.
3.  Locate command input.
4.  Determine current room.
5.  Jump directly to exits.
6.  Determine players present.
7.  Determine NPCs present.
8.  Review visible items.
9.  Send command.
10. Review previous output.
11. Receive combat spam.
12. Receive a tell during combat.
13. Find the tell quickly.
14. Enter Review Mode.
15. Confirm live output does not destroy review.
16. Exit Review Mode.
17. Open inventory.
18. Open context menu from keyboard.
19. Open map.
20. Determine current room nonvisually.
21. Generate route.
22. Review route.
23. Execute route.
24. Open Reorient Me.
25. Determine how current location was reached.
26. Add local reminder.
27. Search reminder.
28. Open macro editor.
29. Create three-command macro.
30. Execute macro.
31. Move widget without pointer.
32. Resize widget without pointer.
33. Enable Quiet Mode.
34. Open Accessibility settings.
35. Return to command input.
```

## A.90 JAWS manual test

Repeat the core NVDA task set with JAWS, emphasising Virtual Cursor, Quick
Navigation Keys, regions, headings, form controls, dialogs, live regions and
output review.

Mudlet currently documents limitations with JAWS reading its output window,
demonstrating that nominal "screen-reader support" does not guarantee practical
compatibility. **The Aetos Web Client MUST NOT claim JAWS compatibility until
actual JAWS testing succeeds.**

## A.91 Orca test

Required core test: Firefox + Orca, Chromium + Orca. Test structural navigation,
forms, landmarks, live announcements, output review, keyboard layout.

## A.92 Braille human test

The designated accessibility tester, initially Meris if she remains willing,
SHOULD perform the primary real-device braille evaluation.

Record: task, keystrokes, speech output, braille output, focus behavior, review
position behavior, confusion point, workaround required, severity.

## A.93 Cognitive human test

Do not simply ask "Is this accessible?" Use scenario tasks:

```text
You have been away for 20 minutes.
Without reading the entire scrollback:

Where are you?
How did you get here?
Who is present?
What were your most recent actions?
Do you have a reminder?
How do you return to a known location?
```

## A.94 AAC human review

Before claiming useful AAC support, have at least one person familiar with
AAC/picture-supported communication review concept organization, symbol
assumptions, the sentence strip, text preview, symbol-set behavior, terminology
and cognitive load. **Do not claim AAC expertise solely from standards
compliance.**

## A.95 Accessibility review gate

For accessibility-sensitive milestones, human feedback SHALL be treated as
engineering input. Feedback such as "takes too many keystrokes", "focus jumps",
"braille keeps losing position", "this label makes no sense", "this conflicts
with NVDA", or "I cannot tell where I am" is a usability defect **even if
automated tests pass**.

## A.96 Issue classification

```text
A11Y-BLOCKER   Cannot complete core game action.
A11Y-HIGH      Action possible only with severe workaround,
               focus loss, or inaccessible information.
A11Y-MEDIUM    Usable but inefficient/confusing.
A11Y-LOW       Polish, verbosity, convenience issue.
```

No A11Y-BLOCKER may remain for release. No known A11Y-HIGH should remain without
explicit release review.

## A.97 Feature definition of done

Every new widget/feature MUST answer:

```text
Can it be found with keyboard?
Does it have an accessible name?
Does its semantic role match its purpose?
Can it be operated without a mouse?
If draggable, what is the non-drag operation?
If graphical, where is the nonvisual equivalent?
If dynamic, should it announce?
If it announces, through AetosAnnouncementManager?
Can it steal focus?
Does it preserve review position?
Does it rely only on color?
Does it respect reduced motion?
Does it survive 200% text resize?
Does it survive 400% zoom/reflow?
Are touch targets large enough?
Could it create excessive cognitive interruption?
Can someone reorient after being interrupted?
Does it expose private accessibility information?
Has axe tested it?
Has keyboard QA tested it?
Does it require human AT testing?
```

## A.98 Implementation order

**Accessibility Foundation — immediately after clean Evennia setup.** Before
rich widgets: semantic page shell, skip links, focus manager, shortcut manager,
announcement manager, accessibility preferences, reduced-motion CSS, contrast
tokens, automated axe harness.

**Widget Framework Phase.** Before calling the widget framework complete: widget
accessibility contract, semantic headings, keyboard focus, accessible tabs,
keyboard layout manipulation, keyboard resizing.

**State/Resource Phase.** Current State View, resource semantic values,
threshold announcement support.

**Mapper Phase.** Does not pass until visual map, accessible map, exit list,
route text, POI list and keyboard navigation all work.

**Personal Tools Phase.** Accessible notes, relationships, tasks, reminders,
Reorient Me, How I Got Here, Session Resume.

**Automation Phase.** Accessible macro, alias and trigger editors; accessible
visual automation representation.

**Media Phase.** Caption metadata, mute/volume controls, reduced stimulation.

**Accessibility Expansion Phase.** AAC framework, picture communication widget,
sentence strip, symbol packs, simplified workspace, Focus Mode, Quiet Mode.

**Release Hardening.** Complete axe, keyboard, NVDA, JAWS, Orca, braille,
zoom/reflow, contrast, reduced motion, cognitive task testing, AAC review.

## A.99 Required test matrix

```text
                           Chrome   Edge   Firefox

Keyboard / Windows           X       X       X
NVDA / Windows               X       X       X
JAWS / Windows               X       X       X
400% zoom                    X       X       X
Reduced motion               X       X       X

Orca / Linux                 X               X

Braille + NVDA               at least one browser
Braille + JAWS               where tester/equipment permits

Mobile VoiceOver             SHOULD
Android TalkBack             SHOULD
```

Mobile screen readers SHOULD become release requirements when the mobile/PWA
phase is declared production-ready.

## A.100 No false conformance claims

Do not advertise "WCAG 2.2 AA compliant", "Fully accessible", "JAWS
compatible", "Braille compatible" or "AAC compatible" until appropriate testing
supports that statement.

Preferred pre-certification wording: **"Designed toward WCAG 2.2 AA and tested
with supported assistive technologies."**

## A.101 Known technical limitations

**Browser mediation.** Aetos cannot directly control everything NVDA, JAWS, Orca
or a braille display does. It controls DOM semantics, focus, ARIA, timing of
live-region updates, keyboard behavior and presentation. The browser and
assistive technology determine final speech/braille behavior.

**Speech completion.** A browser application cannot reliably determine that a
screen reader finished speaking. Flood management is therefore approximate and
event-based.

**Assistive-technology variance.** Behavior that works in NVDA + Firefox may
differ in JAWS + Edge. Manual matrix testing is mandatory.

**Rich server information.** Aetos can make ordinary Evennia significantly more
accessible. It cannot invent structured information the game does not expose.

**AAC maturity.** WAI-Adapt and AAC concept standards provide strong
architectural guidance, but implementation support is still evolving. Aetos MUST
implement its own fallback rendering.

**Symbol licensing.** AAC symbol artwork may have different licenses. Aetos
cannot simply collect proprietary symbol sets and redistribute them.

**User testing.** Automated accessibility tooling cannot substitute for actual
screen-reader, braille, cognitive-accessibility and AAC user testing.

## A.102 Core product rule

**One structured game state, multiple equally legitimate presentations.**

```text
SERVER STATE:
Captain Renn is present.

             │
             ├── Visual player/NPC card
             ├── Screen-reader list item
             ├── Braille-friendly text
             ├── Context-action target
             ├── Relationship/notes target
             └── AAC/picture-supported recipient
```

These are not different game states. They are different interfaces to the same
state.

## A.103 Final acceptance standard

The accessibility work succeeds only when a user can perform ordinary gameplay
without having to understand the visual layout.

A tester using NVDA or JAWS should be able to know where they are, know who is
present, know what exits exist, understand current character state, review what
happened, find important communication, enter commands, navigate maps, use
inventory, use contextual actions, create macros, read notes, manage reminders,
recover after interruption, customize the interface, operate layouts and obtain
help — **without sighted assistance**.

A braille user should be able to review that same information without repeated
unexpected position loss. A keyboard-only user should be able to perform every
Aetos operation without pointer input. A user with low vision should be able to
enlarge and simplify without losing functionality. A user who benefits from
reduced stimulation should be able to remove unnecessary motion, interruptions,
sounds and clutter.

A user who loses focus or becomes disoriented should have explicit tools to
determine: Where am I? How did I get here? What is happening now? What did I
recently do? What did I ask the client to remind me about? How can I get back to
something familiar?

A person using picture-supported communication should have a deterministic,
user-controlled path from familiar concepts/symbols to ordinary game
communication without the client pretending to understand intent it does not
actually know.

**And none of those accommodations should require the player to disclose a
disability to the MUD operator.**

## A.104 Engineering directive to implementers

Do not build the visual interface first and retrofit this specification
afterward. Implement semantic structure and interaction behavior concurrently
with every visual component.

Do not substitute "ARIA added" for usability testing. Do not substitute "axe
passes" for screen-reader testing. Do not substitute "NVDA can technically reach
it" for efficient interaction.

Do not remove an accessibility requirement because GoldenLayout or another
third-party UI library makes it inconvenient. The abstraction layer exists
specifically so the Aetos Web Client can correct deficiencies in its
dependencies. Where the current layout library prevents compliance, implement
the missing accessible behavior in `AetosLayoutManager`, replace that portion of
the library's behavior, or ultimately replace the library.

**The accessibility architecture belongs to the Aetos Web Client.** It is not
delegated to the layout library, browser, Evennia, or assistive technology.

## A.105 Research baseline for future engineers

Consult the current editions of: WCAG 2.2; WAI-ARIA 1.2; the WAI-ARIA Authoring
Practices Guide; W3C Cognitive Accessibility Supplemental Guidance; WAI-Adapt
and its Symbols Module; the W3C AAC Symbols Registry; the NVDA current stable
User Guide; current Freedom Scientific JAWS documentation and training; GNOME
Orca documentation; current Mudlet accessibility documentation; genericMud
accessibility behavior and documentation; Playwright accessibility testing
guidance; and axe-core documentation.

Standards and assistive technologies change. Version-specific workarounds MUST
be revalidated rather than carried forward indefinitely.

## A.106 Addendum effect on master blueprint

This addendum supersedes the original concept of a single "Phase 30 —
Accessibility Review" with:

```text
Accessibility Foundation
        ↓
Accessibility requirements inside every implementation phase
        ↓
Continuous automated testing
        ↓
Continuous keyboard testing
        ↓
Assistive-technology milestone testing
        ↓
Final accessibility validation
```

The final accessibility review remains. It is now the final validation of an
accessibility architecture that has existed since the beginning, rather than the
first time accessibility is seriously examined.

## A.107 Final definition

The Aetos Web Client is to be engineered so accessibility is not an alternate
presentation bolted onto a graphical MUD client. **Accessibility is one of the
mechanisms by which the graphical client is built.**

> Aetos Web Client should not merely allow disabled players to play despite the
> interface. It should use the flexibility of a structured web client to give
> each player an interface that works with the way they perceive, navigate,
> remember, communicate, and interact with the game.

Requirement IDs beginning `A11Y-` are release gates, not suggestions.
