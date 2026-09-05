# Changelog

All notable changes to the Aetos Web Client.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project has not yet cut a release; everything below is unreleased work
towards `0.1.0`, recorded by milestone so the reasoning stays attached to the
change. Each milestone has a fuller record in [`notes/`](notes/).

---

## [Unreleased]

### M21 — Developer inspector

973 tests. Addendum C.18.
[`notes/m21-developer-inspector.md`](notes/m21-developer-inspector.md)

**Added**

- One panel showing what the client believes: connection, manifest, providers,
  bindings, widgets, state summary, recent event types, errors and validation.
- **Palette entries for capture and replay, which had none.** Both were built at
  E1 and reachable only as `Aetos.capture` from the console — which is to say,
  reachable by their author. Writing the C.18 coverage test is what found it.
- `Download capture`, which E1 also never had. A capture readable only from the
  console is one nobody attaches to a bug report, which was its whole purpose.

**The boundary C.18 draws**

- It reads only what the client already has — its own store, registry and log.
  No query field, no dbref lookup, no path from a developer's curiosity to a
  request the game did not expect. A test enumerates the services the module may
  read and fails on any other, which is stronger than "does not call `fetch`".

**What it says about absences**

- Withheld widgets name what they needed: `equipment (needs equipment)`. The
  difference between "three widgets are broken" and "three widgets are waiting
  for your game to declare something" is otherwise invisible.
- Missing bindings say *not implemented, D-track*; ungated providers name the
  setting; a missing handshake says the game may not have Aetos installed.

**Fixed**

- The registry never reached the inspector: the handover ran six hundred lines
  before the inspector was created, `var` hoisting made it `undefined`, and
  **my own defensive guard skipped it in silence** — the panel reported
  "Registry: not available" forever and nothing errored. A guard against a
  condition that should be impossible does not prevent it; it prevents you
  finding out about it. Removed the handover entirely by passing the registry
  directly, since it is already built by then.
- `scrollable-region-focusable` on a section list — fourth instance in the
  client, fourth caught by axe rather than by reading the code.

### M20 — PWA shell and touch gestures

940 tests. Addendum A.57. [`notes/m20-pwa-gestures.md`](notes/m20-pwa-gestures.md)

**Added**

- A service worker that caches the client's own static files and **nothing
  else** — not the transcript, not a sync payload, not a tell. Enforced
  structurally: the fetch handler declines anything that is not a same-origin GET
  under two known asset prefixes, so there is no branch that could cache a
  response from the game.
- An optional `urls.py` a game includes to make the client installable. Optional
  by construction — without it there is no PWA rather than a broken one.
- Four touch gestures, each duplicating a palette command and none of them the
  only way to do anything (A.57). Single pointer only; passive handlers so a
  gesture can never block a scroll; thresholds set for a tremor rather than a
  steady hand.
- The privacy panel's "clear all data" now clears the cache too.

**Deliberately not done**

- **No offline mode.** A MUD is a live connection. The worker's value is that a
  tunnel gets Aetos's reconnecting state instead of the browser's dinosaur — and
  "works offline" is exactly the claim a PWA invites and would be false.
- **No silent updates.** A new version waits and says nothing has changed yet.
  Reloading under somebody mid-fight or mid-sentence on the communication board
  would be a data-loss bug wearing a feature's clothes.
- **No push notifications or background sync.** Both need a server-side
  per-player subscription record, which blueprint 2.3 forbids.

**Fixed — a defect that had been there since A0**

- `Ctrl+K` named `palette.toggle` as the command it accelerates, and no such
  command was ever registered. The A.23 rule was checked by asserting the string
  `paletteCommand:` was present, which is spelling rather than substance. M20's
  gesture guard found it within a minute of first running, because that one
  checks the reference *resolves* against the live palette. Now a static test
  requires every shortcut and gesture reference to resolve.
- `gestures.js` accepted a `palette` service it never used; the wiring tripwire
  caught it.

**Not verified**

- The service worker has never been seen to register: the lab browser refuses
  all service workers, proven by serving the identical file from a second path.
  Endpoints, headers and version substitution are verified; the lifecycle is not.
  Scheduled for A8 — see
  [lab-hazard-003](notes/lab-hazard-003-no-service-workers.md).

### A7 follow-up — symbol packs, and a correction

895 tests. Prompted by Gary pointing out that free AAC symbol libraries exist.

**Corrected**

- A7 originally said the symbol sets AAC users know are all restrictively
  licensed. **That was wrong.** Checked properly: ARASAAC is CC BY-NC-SA (the
  NonCommercial clause genuinely does block bundling in a BSD-3 client that
  commercial games install), but **Mulberry is CC BY-SA 4.0 and its own
  documentation permits use "in any project or product, commercial or
  otherwise"**. Licensing was never the obstacle there.
- The real obstacle for Mulberry turned out to be **coverage**, which only
  showed up by going and looking: 3,436 symbols led by country flags, country
  maps and professions, with no symbol for `yes`, `no`, `stop`, `please`,
  `thank you`, `sorry` or `friend`. It is a vocabulary set to supplement a core
  board, not to be one — and bundling it would leave the six most urgent words
  as the only ones without a picture.
- The correction is kept in the source rather than quietly replaced, with a test
  asserting it stays. The wrong reason produced the right decision, which is
  exactly how a bad assumption survives to be repeated somewhere it matters.

**Added**

- `aac_mappings/` — bundled concept-to-symbol mappings containing no artwork,
  which is precisely what A.63 permits. Ships a verified Mulberry mapping: 33
  concepts, every one checked against the set's own index and then against the
  repository. Nothing guessed.
- `scripts/build_symbol_pack.py` — downloads the mapped artwork and writes a
  self-contained pack, keeping the licensing decision with whoever installs it.
  `--check` re-verifies every mapping without downloading.
- A **Symbol packs** panel that leads with coverage: it names every word the
  installed pack cannot illustrate, so a player finds out there rather than by
  hitting a blank key mid-sentence.
- Packs report whether they are **self-contained**. A pack of remote URLs tells
  its host, every time the board renders, that this browser is showing a
  communication board — a disclosure about disability made silently to a third
  party. Built packs inline their images and send nothing.

### A7 — AAC architecture and the simplified workspace

885 tests. Addendum A.51, A.59–A.69. Gate A.94 **outstanding**.
[`notes/a7-aac-simplified.md`](notes/a7-aac-simplified.md)

**Added**

- A concept model separating what is meant, what is on the key, what a word says
  in a sentence, what is drawn, and what is sent (A.60).
- A picture and word board with a sentence strip, a text preview and an ordinary
  game command as its output — `say i want help` goes through the same seam as
  anything typed, and the server is never told the player uses a board (A.68).
- A pluggable symbol provider (A.62), a simplified four-panel layout (A.51), and
  palette entries for both.

**What Aetos deliberately does not do**

- **Claim AAC support.** A.94 says standards compliance is not expertise. Until
  an AAC practitioner has reviewed the concept organisation and cognitive load,
  the honest description is "an architecture" — and a test asserts the source
  still says so, so making the claim means deleting a test explaining why not.
  `questions.md` §3 lists the five judgements a reviewer would be asked for.
- **Invent W3C concept identifiers.** Every `waiAdaptConcept` is null. An
  identifier is a claim that this concept *is* that published concept, and a
  plausible-looking invented one propagates into other tools as though checked.
- **Bundle symbol artwork.** Aetos ships *mappings*, which is the line A.63
  draws. Every key shows its word until a player installs a pack; a pack must
  state its licence or registration is refused, and the panel reports which
  words it cannot illustrate before anyone relies on it.
- **Guess a replacement symbol.** A symbol *is* the word for somebody using one,
  so a near-miss is a different word — and the player has no way to know it
  happened.
- **Infer anything.** No prediction, no phrase suggestions, no rewriting prose
  into symbols (A.69). A system that speaks for somebody has to be one they can
  predict completely.
- **Require a pointer.** Drag-and-drop is not implemented at all: A.66 permits
  it as an addition and forbids requiring it, and building the pointer version
  first is how a keyboard path becomes an afterthought nobody tests.
- **Remove anything in the simplified layout.** All sixteen widgets stay
  registered and all fifty-seven palette commands stay available. A "simple mode"
  that quietly took features away would be deciding what somebody is capable of
  because they asked for a calmer screen.

**Fixed**

- Sentences were built from key labels, so they read `say I Want Help` — which
  is what every public message somebody sent would have looked like. Key caps
  and speech are now separate fields.
- `aria-label` on the word grid sat on a plain `<div>`, which is prohibited and
  silently ignored — the grid was simply unlabelled, and axe reported it only as
  *incomplete* rather than as a violation.

### M19 — Themes and contrast validation

830 tests. Addendum A.55, `A11Y-VIS-003`.
[`notes/m19-themes-contrast.md`](notes/m19-themes-contrast.md)

**Added**

- Named themes, stored in this browser, plus a light theme (Paper) alongside
  the shipped dark one. A theme sets **colours only** — an allowlist of ten
  tokens, no spacing, no type size, no stylesheet. A theme that could ship CSS
  could hide content, override a focus ring, or reintroduce every accessibility
  defect the client spent a year removing; restricted to colours, a bad theme is
  illegible, which is visible and reversible, rather than broken, which is
  neither.
- A WCAG contrast validator over eleven named pairs, run at save time —
  `A11Y-VIS-003` requires validation to be part of *acceptance*, not to be a
  checker somebody could run.
- A theme editor and a contrast report that names each failing pair, its ratio
  and **what that pair is for**. A ratio alone tells an author they are wrong
  without telling them what to change.

**It warns; it does not refuse**

- A failing theme still saves. A player who wants a theme Aetos considers unwise
  is entitled to have it — blocking would be a tool overruling somebody about
  their own eyes, and would push people out of the theme system entirely, where
  nothing is checked at all. What they are not entitled to is not being told,
  and the warning notes that an exported theme reaches people who did not choose
  those colours.

**Fixed — found by turning the validator on Aetos itself**

- **The default theme failed contrast, and had since M4.** `--aetos-border` was
  1.37:1 against the background — and since a panel differs from the page by
  only 1.09:1, that border is the *only* thing separating one region from
  another. There were effectively no panel edges at all for anyone with reduced
  contrast sensitivity. Nobody caught it in a year of looking at this client,
  which is the point: a palette chosen by eye passes for the person who chose it.
- `--aetos-focus` was undeclared in the default theme, relying on a CSS
  fallback. A token the validator cannot find is a token nobody checks.
- **A theme could silently strip an accommodation.** Themes set tokens inline on
  the root, which beats a `:root` rule — so a player with high contrast on who
  chose a theme lost it, with nothing to say so. The high-contrast preset now
  uses `!important`: high contrast is a need, a theme is a preference, and a
  preference does not overrule a need.
- Renamed `data-aetos-focus` (Focus Mode, added in A5) to
  `data-aetos-focus-mode`, since `--aetos-focus` is now a real token two lines
  away.

### M18 — Audio, multimedia and captions

791 tests. Absorbs A6. Addendum A.58, A.79, A.84.
[`notes/m18-audio-captions.md`](notes/m18-audio-captions.md)

**Added**

- A `media` provider slot, so a game declares its sound the same way it
  declares resources or a map. Inert by default: Evennia models no media, and a
  client that invented some would be guessing at a game's art direction.
- `state.push_media()` for one-off sound, alongside ambient media from the
  provider. Ambient media is **state** and is diffed, so a sync every few
  seconds does not restart the music; one-off media is an **event** and is not,
  because a door slamming twice is two sounds.
- A Sound panel: per-category volume for music, ambience, effects, interface
  and voice, plus a master, mute-all and stop-all — all native `<input>` and
  `<button>` elements, because a custom slider a screen reader cannot operate is
  a volume control that does not exist for the person most likely to need it.
- A durable caption list, and images shown with their description as `alt`.
- `audio.*` accessibility preferences; palette entries for stop and mute.

**The gate**

- `A11Y-MEDIA-001`: every non-decorative sound is also **text**, emitted
  *before* any attempt to play it and regardless of whether that attempt
  succeeds. Muted, volume at zero, no speakers, missing file, autoplay blocked
  — the caption goes out in every case. Tying it to successful playback would
  mean the players who most need the text are the least likely to get it.
- Uncaptioned audio is **reported**, not swallowed. Aetos will not invent a
  caption: an invented description is confidently wrong to exactly the player
  who cannot check it. The server counts uncaptioned items so a developer sees
  a number rather than auditing a list.
- `A11Y-MEDIA-002`: a category with no volume slider is refused on the server
  rather than played uncontrollably.

**Security**

- Media URLs are checked against a scheme **allowlist** — `http`, `https`,
  relative. A denylist would have to anticipate every scheme a browser has ever
  supported. `data:` is excluded and backslashes are refused, because browsers
  treat them as forward slashes in some positions.

**Fixed**

- **Numeric preferences never persisted.** The preferences normaliser handled
  enums, one special-cased number, booleans and strings — so any *other* number
  fell through to the string branch and was silently discarded. Every volume
  slider would have appeared to work while nothing it set survived a reload.
  Replaced with a range table, plus a load-time warning and a test for any
  numeric default that lacks one.
- A partial provider dict passed to `build_sync` raised `KeyError` for any slot
  added since the caller was written. It now fills gaps from the defaults, so a
  new slot degrades to "this game exposes none of that".
- `role="region"` on the caption list orphaned every caption (`listitem`), the
  same mistake A0 made once while *fixing* a scrollable region. The wrong
  version looks more accessible than the right one.

### A5 — Cognitive and orientation layer

741 tests. Addendum A.36–A.51. [`notes/a5-cognitive-orientation.md`](notes/a5-cognitive-orientation.md)

**Added**

- **Reorient Me** (Ctrl+Shift+W). Reads back location, exits, who is present,
  character state, target and the last few commands sent — spoken *and* shown.
- **How I Got Here** and **Walk Back**. The trail is built from authoritative
  room changes, never from typed movement: a player who walked into a wall has
  not moved. Walking back sends ordinary movement commands through the ordinary
  queue and stops wherever the game stops it, or wherever a step has no
  unambiguous reverse.
- **Reminders and tasks**, stored in the browser. Pin one, attach one to a
  room, or hold one for the next session. A room reminder surfaces once per
  visit, and the mark clears on leaving.
- **Session resume**, labelled "Last known" until a sync arrives.
- **Universal search**: the palette now searches notes, reminders and what has
  been said, scored alongside its own commands. A history hit jumps in Review
  Mode, so the line is reachable even when a display rule has hidden it.
- **Focus Mode** (A.47) and a palette toggle for **Quiet Mode** (A.48), kept
  separate because a calmer screen and fewer interruptions are different needs.
- `reminders` storage namespace; `DB_VERSION` 2 → 3.

**Hard rules encoded**

- `A11Y-COG-002` — **no intention inference.** Aetos reports that you sent
  `look at Renn`; it never reports that you were investigating Renn. A client
  that guessed would be confidently wrong exactly when somebody was relying on
  it, and that costs the trust as well as the time.
- `A11Y-COG-005` — reminders are only ever created on request. Aetos never
  invents one and never builds a checklist out of your behaviour.
- Neither comfort mode can be set by the game.

**Fixed**

- **A schema upgrade could hang the entire client.** IndexedDB will not upgrade
  while a connection is open on the old version, and Aetos never listened for
  `versionchange` — so a player with two tabs open, reloading one after a
  release that added a namespace, got a tab where every local read hung
  forever, with no error. Indistinguishable from having lost their data. Fixed
  by closing on `versionchange`; the privacy panel now also distinguishes
  "blocked by another tab" from "this browser refuses to store anything",
  because those have completely different fixes.
- The reorientation summary joined a section's lines with a space, so it spoke
  as one unparseable run-on phrase.
- Ctrl+Shift+W spoke the summary while the palette entry spoke *and* showed it,
  so a sighted player pressing the shortcut saw nothing happen.
- `scrollable-region-focusable` in the history widget — a scrolling region a
  keyboard user could not scroll. Pre-existing; third instance of this defect in
  the client and the third caught by axe rather than by reading the code.
- Two tests asserted facts about the *deployment* rather than about the code,
  and so passed only in a game dir that had not installed Aetos.

### E5 — Diagnostic reporting

688 tests. Addendum C.17. [`notes/e5-diagnostics.md`](notes/e5-diagnostics.md)

**Added**

- A bug report a maintainer can act on: versions, browser, features, manifest
  capabilities, widgets, connection state, recent event **types**, and recorded
  errors.
- Optional `AETOS_DIAGNOSTICS` setting, letting a game include provider class
  names — its own internals, so its own decision. Off by default.

**Excluded by construction**

- The report is assembled from a fixed list of sources, none of which is the
  local data store, so there is no path by which a note reaches it.
- Accessibility preferences are excluded deliberately: a report saying
  `screenReader: true` would disclose a disability to whoever reads the issue,
  and nobody should have to choose between reporting a bug and keeping that to
  themselves.
- Nothing is sent. `issueUrl()` returns a URL and does not open it.

### E4 — Unified validator

667 tests. [`notes/e4-unified-validator.md`](notes/e4-unified-validator.md)

**Added**

- One validator across triggers, aliases, timers, scripts, display rules and
  macros. Six would give six different answers to the same question, and a
  player told once that a pattern is dangerous should not have to discover it
  again in a different dialog.
- Findings report counts and messages only — never patterns or commands — so
  they are safe to include in a diagnostic report.

### E3 — Automation groups

637 tests. [`notes/e3-automation-groups.md`](notes/e3-automation-groups.md)

**Added**

- One switch for a set of related automation. A rule runs only when both it and
  its group are enabled; turning a group on never re-enables a rule the player
  switched off themselves.
- The group list states how many rules each group currently suppresses, because
  "I turned it off" and "my group turned it off" have completely different
  fixes and a rule that silently does nothing is indistinguishable from a rule
  that is broken.

### E2 — Non-destructive presentation rules

615 tests. [`notes/e2-presentation-rules.md`](notes/e2-presentation-rules.md)

**Added**

- Highlight, substitute, filter and collapse rules. Presentation only: they
  produce metadata describing how a line should look and cannot touch the
  record, the store, or what a trigger saw.
- `display_rules` storage namespace; `DB_VERSION` 1 → 2.

**Gate proven live**

- A filtered line is not drawn, and is still logged, still seen by automation,
  and still searchable in history.

### M17 — Rich chat, event history and Review Mode

593 tests. Absorbs A4. [`notes/m17-history-review.md`](notes/m17-history-review.md)

**Added**

- A filterable event history reading the canonical log, so a line hidden by a
  display rule is still reachable.
- **Review Mode**: pause announcements and read back, with jump-to-previous and
  jump-to-next by category. Leaving summarises what arrived rather than
  replaying it.
- **Announcement flood control**: during a burst, a screen reader gets a
  summary rather than fifty individual interruptions — except for categories
  that are never aggregated, such as tells.

### E1 — Capture and replay

560 tests. [`notes/e1-capture-replay.md`](notes/e1-capture-replay.md)

**Added**

- Session capture to JSONL and replay through `pipeline.ingest` — the same seam
  the websocket uses. There is deliberately no second path: a harness that
  exercises different code from production tests the harness.

**Gate proven live**

- A captured sequence reproduced an identical state snapshot with no server
  running.

### E0 — Event pipeline contract

534 tests. **Blocked M17, and did.** [`notes/e0-event-pipeline.md`](notes/e0-event-pipeline.md)

**Added**

- A fixed, frozen stage order — validate, normalize, state, log, automation,
  presentation, announce — with only `state` and `log` permitted to write.
- A canonical log every later feature reads from, bounded, handing out copies.

**Gate proven live**

- Against a deliberately hostile presenter that tried to mutate the event.

### A3 — Accessible map completion

508 tests. Retrofits M9. [`notes/a3-accessible-map.md`](notes/a3-accessible-map.md)

**Fixed**

- The search box rebuilt the whole widget on every keystroke and then called
  `focus()`. Restructured to a stable skeleton — `A11Y-FOCUS-005`.

### A2 — Current State View and semantic values

486 tests. Retrofits M8 and M16. [`notes/a2-current-state-view.md`](notes/a2-current-state-view.md)

**Added**

- One widget answering *what is true right now*, degrading section by section
  so a missing widget means less to say rather than an error.

### A1 — Widget accessibility contract

484 tests. Retrofits M6 and M7. [`notes/a1-widget-contract.md`](notes/a1-widget-contract.md)

**Added**

- Every widget declares an accessibility contract; registration refuses one
  that does not. Three refusal cases verified live.

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

### Addendum C — mature client engine (E-track)

**Added**

- [`docs/addendum-c-engine.md`](docs/addendum-c-engine.md): a normative event
  pipeline contract, capture/replay tooling, non-destructive presentation rules,
  automation groups, a unified validator and sanitised diagnostics.
- An **E-track** (E0–E6) in the roadmap.
- [`decision-005`](notes/decision-005-genie5-clean-room.md) — Genie5 is a design
  reference, never a source.

**Changed — a scheduling decision, not a preference**

- **E0 and E1 now come before M17.** M17 builds the canonical log and Review
  Mode, and those decisions determine the foundation that display rules,
  accessibility announcements, replay testing and every future diagnostic sit
  on. Building M17 first would mean rebuilding it. A0 already demonstrated how
  much cheaper an ordering fix is before twelve things depend on it.
- The integration documentation now teaches in the order a newcomer needs it:
  zero config → Discovery → bindings → providers. The in-client developer help
  leads with the three levels instead of the provider class.

**The rules this establishes**

- **Presentation can never rewrite reality.** Highlight, substitute, filter,
  hide and collapse may not touch the store, the canonical event, the canonical
  log, server state or provider data.
- **A trigger fires on canonical text, not on what is visible.** Hiding a line
  is a display choice; it is not a fact about the game. This is the most common
  bug in clients that treat gagging as deletion.
- **A visual filter never silently suppresses an announcement.** A player who
  hid combat spam and then needs to know what killed them must still be able to
  find out.
- **Hidden is not deleted** — filtered events stay in search, Review Mode,
  canonical history and developer captures.
- **The ambiguity rule, project-wide:** where evidence cannot distinguish
  between valid interpretations, Aetos declines to guess. `unknown` beats wrong,
  and never silently choose the first candidate.

**Licensing**

- The engine ideas are informed by a review of Genie5, which is **GPL-3.0**.
  Aetos stays **BSD-3-Clause** for Evennia upstreaming, so this is ideas and
  research only. No Genie5 source, fixtures or implementation. The decision
  record also lists what is deliberately *not* borrowed: solutions to the
  text-reconstruction problem that Aetos does not have, because Evennia already
  holds authoritative structured state.

---

### A0 — Accessibility Foundation

First stage of the A-track. Blocked M17, and did.

**Added**

- An accessibility subsystem under `static/aetos/js/accessibility/`, loaded
  before everything else: preferences, announcement manager, focus manager and
  shortcut manager.
- Skip links, `<nav>` and `<aside>` landmarks, and a second (assertive)
  announcement region.
- `accessibility.css`: focus indicator, pointer targets, reduced motion,
  presentation intensity, a high-contrast palette and forced-colours handling.
- `browser-qa/qa-axe.js`, a development-only axe-core audit. Not a dependency of
  the contrib — a game developer needs no Node.

**Changed**

- **Every global keyboard shortcut moved out of its module.** `palette.js`,
  `help.js` and `workspaces.js` each bound their own key; all three now register
  with `AetosShortcutManager`. A key a module binds for itself cannot be listed,
  rebound or disabled, which leaves a player no recourse when it collides with
  their screen reader.
- Two rules are now enforced rather than encouraged, both by throwing:
  registering a bare character is refused (screen readers use single letters for
  structural navigation), and registering a shortcut without naming the palette
  command it accelerates is refused (no feature may exist only behind a
  keystroke).
- All announcements route through one manager with categories and priorities.
  Only connection and session failure reach the interrupting region. Combat is
  off by default; resources announce on thresholds only.

**Fixed — found by axe, invisible to a mouse**

- `scrollable-region-focusable`: the help article scrolls, and `tabindex="-1"`
  made it programmatically focusable but kept it out of the tab order — so a
  keyboard user could see there was more text and had no way to scroll to it.
- The same defect in the privacy panel's list.
- And a third, introduced by the first attempt at fixing the second:
  `role="group"` on the `<ul>` stripped its implicit list role and orphaned all
  fifteen `<li>` children. An accessibility fix is as capable of causing an
  accessibility defect as any other change.

**Tests** — 467 Python tests passing (up from 409). axe-core 4.13 clean across
six views including the high-contrast and minimal-stimulation presets.

---

### Addendum B — server-side discovery and easy game integration

**Added**

- [`docs/addendum-b-discovery.md`](docs/addendum-b-discovery.md), a normative
  specification for a declarative `AETOS_BINDINGS` layer and a server-side
  Discovery tool. `DISC-` IDs are release requirements.
- A **D-track** (D0–D6) in the roadmap, parallel to the M and A tracks and
  independent of both. It produces no player interface.

**Changed**

- The README's integration story inverts. It led with "write a provider class",
  which is correct and is also a wall; it now presents three levels — zero
  config, bindings, providers — with the provider example moved to Advanced.
- The claim that Aetos "never reaches into your data directly" was true of the
  runtime and became ambiguous once a development-time inspector was planned. It
  now distinguishes the two explicitly: the client never guesses during
  gameplay; Discovery is a separate server-side developer tool.

**The boundary this establishes**

- Bindings describe *where* data is; providers describe *how* it is calculated.
  `db.hp` is a location, `stats.get("health").current` is a method call. Keeping
  that line sharp is what stops the binding grammar becoming an undocumented
  programming language with no debugger.
- Discovery never runs during play, is unreachable from the player protocol,
  never transmits source to the browser, never modifies game files, and never
  executes the code it reads.
- Its hardest test is the one that sounds easiest: pointed at a pristine Evennia
  game it must find nothing at all.

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
