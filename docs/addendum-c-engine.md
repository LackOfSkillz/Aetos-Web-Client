# Aetos Web Client — Engineering Blueprint Addendum C

## Easy Integration, Discovery, and Mature Client Engine Enhancements

**Status:** Normative engineering specification
**Revision:** 1
**Tracks:** D-track (developer integration) and **E-track** (client engine)
**Normative language:** MUST, MUST NOT, SHOULD, SHOULD NOT, MAY

> Staging is in [`notes/roadmap.md`](../notes/roadmap.md).
> Addendum C supersedes the D-track staging in
> [Addendum B](addendum-b-discovery.md) where the two differ, and adds the
> E-track. Addendum B's `DISC-` and `BIND-` requirements remain in force.
>
> **Licensing boundary:** the engine ideas here are informed by a review of
> Genie5, which is **GPL-3.0**. Aetos is BSD-3-Clause for Evennia upstreaming.
> **No Genie5 source, fixtures or implementation may be copied** — architecture
> and behaviour patterns only. See
> [`decision-005`](../notes/decision-005-genie5-clean-room.md).

---

## C.1 Why Aetos is not a traditional MUD client

Aetos has two structural advantages, and the architecture must not squander them
by imitating clients that lack them.

```text
Traditional client              Aetos Web Client

server text                     Evennia game state
    ↓                               ↓
parser                          provider / binding
    ↓                               ↓
infer game state                structured Aetos protocol
    ↓                               ↓
client                          authoritative client state
                                    ↓
                                multiple presentations
```

A traditional client must *reconstruct* the game by parsing prose. Aetos
*receives* what the server already knows. Every design decision follows from
that difference.

> **Aetos does not need to become better at guessing what the server meant. It
> needs to become exceptionally good at receiving what the server actually
> knows, helping developers expose that knowledge easily, preserving it
> correctly, presenting it flexibly, and giving maintainers the tools to
> reproduce and diagnose everything that happens afterwards.**

### The two promises

**Integration.** Install Aetos and ordinary Evennia already works. Tell Aetos
where your custom data lives and richer UI appears. If you do not know where to
start, Discovery helps you find it. Write a provider only when your game is
genuinely complex enough to require Python.

**Engine.** Structured state is authoritative. Automation observes it.
Presentation may transform how information is shown but never alters what
actually happened.

## C.2 Permanent product layers

```text
                    GAME DEVELOPMENT
                  Aetos Discovery
                        │  inspect / suggest
                        ▼
       AETOS_BINDINGS  ──┴──  Custom Providers
                        ▼
                 Provider Registry
─────────────────────────────────────────────────
                     GAMEPLAY
                  Evennia Server
                        ▼
                  Aetos Protocol
                        ▼
                Protocol Normalizer
                        ▼
                Authoritative State
             ┌──────────┼──────────┐
             ▼          ▼          ▼
        Canonical   Automation   Derived
          Log        Observers    State
             └──────────┬──────────┘
                        ▼
                Presentation Layer
             ┌──────────┼──────────┐
             ▼          ▼          ▼
           Visual  Screen Reader  Braille / AAC
```

Discovery is developer tooling. Bindings and providers are server integration.
Client state is authoritative only as a transient representation of
server-provided state. **Presentation is never authoritative.**

---

# Part 1 — Easy Integration

## C.3 Level 0 — zero configuration

A pristine Evennia game keeps: console, command input, rooms and descriptions,
exits, visible entities, inventory, basic actions, local graph mapping, route
walking, layouts, workspaces, player-local tools, and the accessibility
foundation.

**No genre-specific subsystem may be invented.** A game with no resource system
MUST NOT receive a fake Health resource.

## C.4 `AETOS_BINDINGS` (BIND-001 … BIND-008)

- **BIND-001.** Bindings answer *where does this game already store the
  information Aetos needs*. They do not answer *how should this value be
  calculated*. Calculations belong in providers.
- **BIND-002.** No import, no provider class, and ordinarily no feature flag.
- **BIND-003.** A valid binding implies its feature. So does a custom provider.
  `AETOS_FEATURES` remains an explicit override, and an explicit `False` MUST
  win.
- **BIND-004.** Resolution order: explicit `AETOS_PROVIDERS` → declarative
  provider from `AETOS_BINDINGS` → existing default. **A custom provider always
  wins**, so a game can graduate one subsystem at a time.
- **BIND-005.** Initial safe root is `db`. Syntax: `db.hp`, `db.stats.health`,
  `db.resources.mana.current`. `ndb` MAY be added given a concrete requirement.
- **BIND-006.** Forbidden: `()`, `[]`, arithmetic, `lambda`, `import`, `exec`,
  `eval`, dunders, method calls, conditional expressions, assignment. These MUST
  fail: `db.hp + 10`, `stats.get("health")`, `db.hp if db.alive else 0`,
  `db.items[0]`, `__class__.__mro__`.
- **BIND-007.** The implementation MUST NOT use `eval()` or `exec()`. Traversal
  is explicit and allowlisted.
- **BIND-008.** Errors must be readable by an inexperienced developer, naming
  the feature, entry, field and path in plain language. A traceback MAY also be
  logged, but must not be the primary explanation.

> **The permanent rule.** Bindings describe *location*; providers describe
> *behaviour*. Do not expand the binding language until it becomes a hidden
> programming language.

Schemas for resources, equipment, target, effects and actions are as specified
in [Addendum B](addendum-b-discovery.md) §B.13–B.17.

## C.5 Discovery (DISC-001 … DISC-004)

Server-side developer assistant. Not gameplay.

- **DISC-002.** Executes on the game server or development environment, never as
  a player browser feature.
- **DISC-003.** The player protocol MUST NOT expose source scanning, arbitrary
  attribute listing, typeclass inspection, global command inspection, file
  reading or system discovery.
- **DISC-004.** The AST scanner MUST NOT import, execute, instantiate, call, or
  evaluate arbitrary AST. A hostile file containing `os.system(...)` stays
  inert.

Passes, scan roots, exclusions, path containment, scan bounds, redaction, the
candidate model and confidence levels are as specified in Addendum B
§B.19–B.31 and §B.53–B.57.

## C.6 The ambiguity rule — project-wide

> **When evidence cannot distinguish between multiple valid interpretations,
> Aetos declines to guess.**

Applies to Discovery, map identity, voice entity resolution, AAC mappings,
target matching, provider diagnostics and entity disambiguation.

```text
Two possible maximum-health fields found.

  db.max_hp
  db.hp_cap

Aetos cannot determine which is correct.

Choose one:
```

**Never silently choose the first.** This is borrowed from mature mapper
behaviour and generalised: `unknown` is preferable to wrong, everywhere.

---

# Part 2 — Mature Client Engine

## C.7 The incoming pipeline (PIPE-001)

Canonical order, and it is normative:

```text
evennia.js
    ↓
Protocol Validation
    ↓
Protocol Normalization
    ↓
Authoritative State Update
    ↓
Canonical Event Log
    ↓
Automation Observers
    ↓
Derived Presentation
    ↓
Widgets
    ↓
Announcement Candidate Generation
    ↓
Announcement Queue
    ↓
Assistive Technology / User
```

Not every structured state event produces a transcript entry. The ordering rule
that matters:

> **State is updated before automation observes an event, and presentation
> filtering happens after canonical state and canonical history have been
> preserved.**

## C.8 Presentation cannot rewrite reality (PIPE-002)

Highlight, substitute, filter, hide, collapse and group MUST NOT alter
`AetosStore`, the canonical event, the canonical log, server state or provider
data.

## C.9 Automation must not depend on gagged presentation

Triggers observe canonical normalized events, not the visible view.

```text
Server:         "You drop your sword."
Canonical log:  "You drop your sword."
Trigger:        fires
Display filter: may hide the line from the current view
```

A trigger does not fail because the player chose to hide that text visually.
This is the single most common bug in traditional clients that treat gagging as
deletion.

## C.10 Announcement independence

Presentation filters MUST NOT implicitly suppress accessibility announcements.
Announcement behaviour is governed by event semantics, announcement settings,
priorities and the queue — not by whether the visual console currently shows the
line.

A player explicitly suppressing an announcement *category* is a different thing,
and is honoured.

## C.11 The outgoing pipeline

Every command-producing surface converges on `AetosCommandDispatcher`: keyboard,
button, context action, macro, map route, script, voice, AAC.

Text-input preprocessing such as alias expansion may happen before the
dispatcher. **No source gains special authority.** The final game action is an
ordinary Evennia command.

## C.12 Capture (`AetosProtocolCapture`)

Developer and testing infrastructure. Records a structured session so client
behaviour can be reproduced deterministically without recreating the original
game situation.

**MAY record:** protocol version, manifest, inbound normalized events, relevant
text events, relative timestamps, outbound commands, connection and reconnect
markers, sync boundaries.

**MUST NOT automatically record:** browser-local notes, relationships, macros,
aliases, scripts, accessibility preferences, AAC preferences, private reminders,
passwords, authentication secrets.

Format: versioned JSON Lines, relative milliseconds from capture start.

```json
{"t":0,"kind":"meta","protocol":1}
{"t":14,"kind":"in","type":"aetos_sync","payload":{}}
{"t":2022,"kind":"out","command":"north"}
```

Levels: *State Only*, *State + Text*, *Full Developer Protocol*. Default to the
minimum needed to debug.

Before export, captures run through sanitisation and the developer sees a
summary of what the file does and does not contain.

## C.13 Replay (`AetosProtocolReplay`)

Replay feeds capture records through **the same client seams as live data**
after transport. There must never be a parallel "fake UI" code path — a test
harness that exercises different code from production tests the harness.

Modes: real time, 2×, 4×, instant, **step**. Step matters most for accessibility
and state debugging.

Mandatory use cases: browser regression tests, announcement queue testing,
Review Mode testing, reconnect testing, resource threshold testing, map
transitions, widget state, provider payload reproduction, screen-reader bug
reproduction.

Given the same capture, client version and test profile, replay SHOULD produce
identical normalized state transitions. Clock-dependent features use an
injectable test clock.

Markers (`"NVDA interrupted here"`) may be added; they do not affect replay.

## C.14 Non-destructive presentation rules (RULE-001)

Categories: **Highlight**, **Substitute**, **Filter**, **Collapse**.

Every text event retains `originalText`. Presentation derives `displayText`,
`displaySpans`, `hiddenInView`, `collapsed`.

```javascript
{
  id: "evt-123",
  originalText: "The rain falls steadily.",
  presentation: { displayText: "Rain continues.", hiddenInView: false }
}
```

**Hidden is not deleted.** A filtered event remains available to search, Review
Mode, canonical history and developer capture. This matters most for
accessibility and cognitive recovery: a player who hid combat spam and then needs
to find out what killed them must still be able to.

Colour MUST NOT become the sole carrier of meaning in a highlight rule.

If a substitution would invalidate structured spans or entity links, the system
either rebuilds them safely or drops the affected metadata. **Never attach stale
offsets to altered text.**

Rules stay line/event oriented until M17's canonical log provides a safe rolling
buffer. Multi-line matching, if added, must be bounded, opt-in per rule, and
must never scan an unbounded transcript.

Prefer clearer terms over the traditional word *gag* in the UI; documentation may
note the equivalence for experienced MUD users.

## C.15 Automation groups

A group organises aliases, triggers, timers, macros, scripts and display rules —
e.g. Combat, Exploration, Crafting, Roleplay, Building.

```text
effective = rule.enabled AND group.enabled
```

One primary group per rule initially; simple mental models matter.

**A workspace MUST NOT silently enable automation.** Default is no automatic
automation-state change. A future optional prompt may ask.

Group toggles are fully keyboard operable and expose state programmatically. The
player must always be able to see which groups are active and which rules are
suppressed because their group is off.

## C.16 Unified validator (`AetosValidator`)

One validator across Aetos Script, triggers, regexes, aliases, macros, bindings,
generated provider metadata, automation groups and configuration.

Severity: `ERROR` (prevents save), `WARNING` (allows save, behaviour suspicious),
`INFO`.

**Script validation** checks syntax, unknown constructs, unknown built-ins,
argument counts, forbidden operations and detectably unbounded constructs. It
must not claim to prove runtime correctness.

**Regex validation** is defensive, because JavaScript has no universal safe
timeout for regex execution: limit pattern length, limit test-input length, warn
on obviously dangerous nested repetition, run test matching in a Web Worker where
practical, and apply execution budgets. **No regex rule receives the entire
unbounded transcript.**

**Whole-corpus validation.** Maintain corpora of valid, invalid, edge-case and
malicious scripts, bindings, rules and pathological regexes. Every parser change
runs the corpus — rather than waiting for a runtime failure to find the
regression.

Expose *Validate All Local Automation*, run locally, no upload.

## C.17 Diagnostic reports (`AetosDiagnosticReport`)

**MAY contain:** Aetos/Evennia/protocol versions, browser information, active
provider class names, binding keys, enabled features, manifest capabilities,
widget list, connection state, provider errors, binding validation errors,
recent normalized event *types*, relevant stack traces.

**MUST NOT contain:** passwords, tokens, notes, relationships, macros, aliases,
scripts, chat history, tells, private reminders, AAC history, accessibility
preferences, raw game source.

Including game output requires an explicit, reviewable opt-in. The developer sees
the complete report before any external action. Opening a GitHub issue may
prefill text but **MUST NOT** automatically submit it.

## C.18 Developer inspector (M21)

Exposes: protocol, providers, bindings, manifest, widgets, state summary, recent
event types, errors, validation, generate diagnostic report, capture session,
replay session.

**It MUST NOT become a general-purpose arbitrary server-object browser.**

## C.19 Mapper

Evennia dbrefs make identity easy compared with a parsed MUD, so Aetos prefers
authoritative room identity from the server. Where identity is unavailable and
multiple candidates remain, `unknown` is preferable to wrong (C.6).

Optional weighted edges:

```python
{"from": "#42", "to": "#85", "command": "climb cliff",
 "cost": 8, "available": True, "reason": "Difficult climb"}
```

Without cost, edge cost is 1. With costs, weighted shortest path; Dijkstra
suffices.

**The client MUST NOT infer** skill, class, guild, weather or roundtime
restrictions unless the provider supplies them.

Route execution stays: one ordinary command → wait for authoritative state
transition → confirm expected progress → send next. On deviation or failure,
**stop**.

**No genre-specific auto-recovery.** Aetos core does not automatically stand,
retreat, swim, climb, open doors or fight blockers. Those are game decisions.

## C.20 Widget SDK

Versioned contract, declared identity, declared subscriptions, declared
accessibility metadata (already shipped in A1), clean lifecycle, failure
isolation, capability declaration.

**No arbitrary remote plugin marketplace.** Downloading and executing
third-party JavaScript brings code trust, supply chain, signing, update, sandbox
and RCE problems that the core contrib does not need. The SDK targets
game-bundled and developer-authored widgets.

A widget failure must not destroy the client: catch, disable the widget, log,
show a recoverable placeholder, preserve the others.

## C.21 Accessibility interaction

Everything here inherits Addendum A. Specifically:

```text
display filters do not destroy reviewable history
automation groups are keyboard operable
diagnostics do not expose accessibility choices
capture/replay can reproduce announcement behaviour
weighted maps retain nonvisual route equivalents
validator output is semantically structured
Discovery CLI errors are understandable
```

Capture and replay are release-quality tooling rather than debugging
convenience precisely because they make announcement prioritisation, pacing,
backlog, flood protection, Review Mode and status verbosity **testable**.

## C.22 Invariants

**Privacy.** The server tells Aetos about the game. Player personalisation stays
local unless an ordinary command intentionally communicates it. Discovery
inspects developer-owned game implementation, not player profiles.

**Security.** No feature may create a path by which browser JavaScript reads
arbitrary server files; a player requests arbitrary server inspection; binding
syntax executes Python; source scanning executes source; diagnostics
automatically upload private data; remote plugin code executes without explicit
game ownership; or display rules mutate authoritative state.

---

# Part 3 — Tracks

## C.23 D-track

```text
D0  Discovery architecture spike
D1  AETOS_BINDINGS foundation
D2  Declarative providers
D3  Runtime + structural discovery
D4  AST discovery
D5  Setup wizard + generation
D6  Hardening + documentation + usability validation
```

## C.24 E-track

```text
E0  Formal event pipeline contract        ← before M17
E1  Capture + replay                      ← before or alongside M17
E2  Canonical log / non-destructive presentation rules
E3  Automation groups
E4  Unified validator
E5  Diagnostic reporting
E6  Advanced mapper metadata + widget SDK contract hardening
```

**E0 and E1 come before M17.** M17 builds the canonical log and Review Mode, and
those two decisions determine the foundation that highlights, filters,
accessibility announcements, replay testing and all future diagnostics sit on.
Building M17 first means rebuilding it.

**E0 gate:** a presentation filter cannot alter state, canonical history, or
trigger input — proven by test.

**E1 gate:** one captured room/resource/combat sequence reproduces the same
Aetos state transitions with no live server.

**E2 gate:** hidden or substituted output remains fully recoverable from
canonical history.

**E3 gate:** group state never changes automatically without explicit player
configuration.

## C.25 Acceptance tests

**Developer UX (§121).** Give an Evennia developer unfamiliar with Aetos a test
game with `db.hp`, `db.hp_max`, `db.mana`, `db.mana_max`, Aetos installed, and
the README. Task: make Health and Mana appear. **No coaching.** They must find
Discovery, run it, understand the evidence, test the bindings, generate and
install configuration, reload, and see correct resources.

> **If provider inheritance is required, the Easy Button has failed.**

**Architecture (§122).** This must remain valid:

```text
health     complicated custom handler   → custom provider
mana       simple db attributes         → declarative binding
equipment  no custom system             → absent
map        default Evennia rooms        → default provider
```

**No subsystem forces another's integration style.**

**Fresh Evennia.** Discovery against a pristine game finds entities, inventory,
map and actions by default and discovers **no** resources, equipment, target or
effects. It must not invent genre systems.

**Hostile source.** A fixture containing `raise RuntimeError(...)` or
`open("owned.txt", "w").write(...)` must produce no side effect.

**Pipeline ordering.** State updates before trigger evaluation; canonical log
preserves original text; a filter does not remove the canonical event; a
substitution does not rewrite the original; announcement processing is
independent of visual hiding.

## C.26 Documentation order

```text
1. Install Aetos Web Client
2. Level 0: it already works
3. Easy Button: run Discovery
4. Level 1: AETOS_BINDINGS
5. Level 2: custom providers
6. Advanced diagnostics
```

**Do not lead with inheritance.**

Recommended README wording:

> A stock Evennia game works without custom code. For richer systems, tell Aetos
> where your data already lives with `AETOS_BINDINGS`. If you do not know where
> to start, run the server-side Aetos Discovery helper and review the
> integrations it finds. When your data requires calculations or unusual game
> logic, use the full provider API.
>
> The Aetos Web Client never scans or guesses your game model during normal
> player operation. Discovery is an optional development-time helper, not a
> gameplay subsystem.

## C.27 Final rule

> **Aetos should make the simple thing almost effortless without making the
> advanced thing impossible.**

```text
For developers                    For players
ordinary Evennia   → nothing      server truth
simple custom data → bindings         ↓ canonical structured state
complex mechanics  → providers        ↓ canonical history
                                      ↓ automation and presentation
For debugging                         ↓
problem happens once              visual / keyboard / screen reader
    ↓ capture it                            / braille / AAC
    ↓ replay it
    ↓ validate it
    ↓ diagnose it
    ↓ fix it permanently
```
