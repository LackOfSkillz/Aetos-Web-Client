# Aetos Web Client — Engineering Blueprint Addendum B

## Server-Side Discovery and Easy Game Integration

**Status:** Normative roadmap addendum
**Track:** D-track — Developer Discovery & Easy Integration
**Applies to:** Server-side contrib integration tooling only
**Does not apply to:** Player-facing Aetos Web Client behaviour

> Staging is in [`notes/roadmap.md`](../notes/roadmap.md) under "Addendum B".
> Requirement IDs beginning `DISC-` are release requirements for this track.
>
> The parent engineering blueprint is held outside this repository; see the note
> in [Addendum A](addendum-a-accessibility.md).

---

## B.1 Purpose

The Aetos provider architecture is intentionally generic. Aetos does not know
whether a game stores health as:

```text
db.hp
db.health
stats.health.current
traits["health"]
combat.resources.hp
```

and it must never guess at runtime.

That architecture is correct for an advanced developer, but **writing a provider
class should not be the minimum skill required to integrate a simple Evennia
game.**

This addendum introduces two developer-facing integration layers above the
existing provider system:

```text
LEVEL 0     Zero configuration    →  Stock Evennia data
LEVEL 1     AETOS_BINDINGS        →  Simple declarative game integration
LEVEL 2     Aetos Providers       →  Arbitrary Python integration
```

A fourth component assists the developer in reaching Levels 1 or 2: **Aetos
Discovery**, a server-side game-development assistant. Its purpose is to inspect
a developer's own Evennia game, identify likely integration points, explain the
evidence, allow review, and generate either declarative `AETOS_BINDINGS` or
starter provider code.

Aetos Discovery never becomes part of ordinary player operation.

## B.2 Permanent architectural boundary

```text
Aetos Discovery   =  server-side developer integration helper
AETOS_BINDINGS    =  simple server-side integration configuration
Aetos Providers   =  advanced server-side integration API
Aetos Web Client  =  player-facing client
```

These layers must remain separate.

## B.3 Normative discovery requirements

- **DISC-001 — Server-side only.** Discovery MUST execute entirely on the
  Evennia game server or development environment. It MUST NOT execute in the
  player's browser.
- **DISC-002 — Not part of the player protocol.** The protocol MUST NOT expose a
  general-purpose discovery operation. There must be no player message such as
  `aetos_discover_game`, `aetos_scan_source` or `aetos_list_attributes`.
  Ordinary connected players must have no route into Discovery.
- **DISC-003 — No source-code transmission.** Game source MUST NOT be sent to
  the client. A future browser-based developer interface may receive a sanitised
  result (`{"candidate": "db.hp", "category": "resource", "confidence": "high",
  "source": "typeclasses/characters.py:42"}`) but MUST NOT receive the
  surrounding Python. Initial implementation SHOULD remain server-side only.
- **DISC-004 — Suggest, never assume.** Discovery produces *candidates*. It MUST
  NOT silently decide that `hp` means health, that `target` means a combat
  target, or that `effects` are buffs. Developer confirmation is required before
  generated configuration treats a candidate as accepted.
- **DISC-005 — No automatic mutation.** Initial Discovery MUST NOT modify
  `server/conf/settings.py`, `typeclasses/`, `commands/`, `world/`, or any other
  active game source. Discovery generates output; the developer applies it.
- **DISC-006 — Existing architecture remains authoritative.** Generated
  integrations MUST use the existing provider architecture. Simple cases
  generate `AETOS_BINDINGS`; complex cases generate starter provider classes.
  Discovery MUST NOT create a second runtime integration mechanism.

## B.4 AETOS_BINDINGS

The D-track introduces `AETOS_BINDINGS`, the easy integration API. The central
rule:

> **Bindings describe where data is. Providers describe how data is
> calculated.**

Bindings MUST therefore remain deliberately limited.

## B.5 Basic resource binding

```python
AETOS_BINDINGS = {
    "resources": {
        "health": {
            "label": "Health",
            "value": "db.hp",
            "maximum": "db.hp_max",
        },
        "mana": {
            "label": "Mana",
            "value": "db.mana",
            "maximum": "db.mana_max",
        },
    },
}
```

No provider class, no provider import, and normally no feature flag.

## B.6 Automatic feature enablement

A valid binding for a feature SHOULD automatically expose that feature:

```text
AETOS_BINDINGS["resources"] exists          → resource capability enabled
custom AETOS_PROVIDERS["resources"] exists  → resource capability enabled
```

`AETOS_FEATURES` remains available as an advanced explicit override. An explicit
`AETOS_FEATURES = {"resources": False}` MUST win.

## B.7 Provider precedence

```text
1. Explicit custom AETOS_PROVIDERS entry
2. AETOS_BINDINGS entry
3. Existing Aetos default provider
```

A project can begin with bindings and graduate to custom code without changing
unrelated configuration.

## B.8 Binding resolver

Implement `AetosBindingResolver`, suggested location
`contrib/aetos_webclient/bindings/resolver.py`. Initial supported grammar:

```text
db.name
db.name.child
```

Possible future extension to `ndb.name` only if a concrete use case warrants it.

## B.9 Binding security

The resolver MUST NOT use `eval()` or `exec()`, and MUST NOT permit arbitrary
Python expressions. Forbidden:

```text
db.hp + 10
db.hp if db.alive else 0
stats.get("health")
foo()
__class__      __dict__      __globals__
[expression]
import ...
```

Method calls are not part of bindings. If a calculation is required, the
developer must use a provider.

## B.10 Safe resolution

`db.hp` resolves as character → attribute handler → `"hp"`. Each component of a
dotted path is traversed through explicitly permitted lookup behaviour. Dunder
names MUST be rejected. Unknown roots MUST be rejected. Unresolvable values MUST
degrade safely.

## B.11 Binding errors

Errors MUST be written for inexperienced developers. Not
`AttributeError at descriptor ...` but:

```text
Aetos binding could not be resolved.

Resource:  health
Field:     value
Path:      db.hp

The current Character does not have an Attribute named "hp".

Check the path or run Aetos Discovery again.
```

A broken binding MUST NOT crash a player session.

## B.12 Declarative providers

Bindings are implemented through ordinary providers:

```text
DeclarativeResourceProvider
DeclarativeEquipmentProvider
DeclarativeTargetProvider
DeclarativeEffectProvider
DeclarativeActionProvider
```

These MUST subclass the existing provider interfaces. The browser does not care
whether data came from a default, a binding or a custom provider.

## B.13 Resource bindings

Minimum schema as in B.5. Optional fields may include `state_text`, `display`,
`thresholds` and `units`:

```python
"health": {
    "label": "Health",
    "value": "db.hp",
    "maximum": "db.hp_max",
    "state_text": "db.health_state",
    "thresholds": [
        {"at": 0.25, "level": "warning", "message": "Health is low."},
    ],
}
```

Accessibility behaviour such as threshold announcement remains the client's
responsibility. The developer declares data and meaning.

## B.14 Equipment bindings

```python
AETOS_BINDINGS = {
    "equipment": {
        "Head": "db.equipment.head",
        "Body": "db.equipment.body",
        "Right Hand": "db.equipment.right_hand",
        "Left Hand": "db.equipment.left_hand",
    },
}
```

If a path resolves to an Evennia object, the declarative provider derives safe
generic fields (id, display name). If it resolves to `None`, the slot is empty.
Complex handlers should use custom providers.

## B.15 Target binding

```python
AETOS_BINDINGS = {
    "target": {"object": "db.current_target"},
}
```

Optional future shorthand may allow `"resources": "same"` to reuse compatible
resource bindings against the target object, implemented only if it can remain
unambiguous.

## B.16 Effects binding

```python
AETOS_BINDINGS = {
    "effects": {
        "source": "db.effects",
        "fields": {
            "id": "id",
            "label": "name",
            "remaining": "remaining",
            "duration": "duration",
            "description": "description",
        },
    },
}
```

Bindings may map fields. They do not execute calculations.

## B.17 Declarative actions

```python
AETOS_BINDINGS = {
    "actions": {
        "character": [
            {"label": "Talk", "command": "talk {target}"},
            {"label": "Follow", "command": "follow {target}"},
        ],
    },
}
```

Initial placeholder language SHOULD contain only `{target}`. No embedded Python
expressions.

## B.18 Discovery architecture

```text
contrib/aetos_webclient/
├── bindings/
│   ├── resolver.py      validation.py
│   ├── resources.py     equipment.py
│   ├── target.py        effects.py
│   └── actions.py
└── discovery/
    ├── engine.py        runtime.py     source.py
    ├── commands.py      heuristics.py  confidence.py
    ├── report.py        generate.py
    └── tests/
```

The architecture must remain:

```text
Discovery → candidate model → review → binding/provider generation
```

## B.19 Discovery passes

Three evidence sources, ordered from strongest practical game knowledge to
increasingly heuristic:

```text
PASS 1   Runtime Evennia inspection
PASS 2   Evennia structural metadata
PASS 3   Static source analysis
```

Results from multiple passes may reinforce one candidate.

## B.20 Pass 1 — runtime inspection

Developer initiated, against a developer-selected representative Character. It
SHOULD examine typeclass, Attributes and their values/types, Tags, handlers,
location, contents and known object relationships.

```text
db.hp             82       int
db.hp_max        100       int
db.current_target Goblin   Object
```

This creates strong evidence.

## B.21 Runtime inspection boundaries

Runtime inspection MUST NOT dump passwords or session secrets, inspect arbitrary
Accounts without developer request, walk the entire database automatically, or
inspect every object in the game. Initial discovery focuses on specifically
selected representative objects.

## B.22 Pass 2 — Evennia structural inspection

May inspect `BASE_CHARACTER_TYPECLASS`, the loaded Character class, CmdSets,
Commands and their keys and aliases, typeclass inheritance, Attributes, Tags and
known handlers. Commands may become candidate context actions.

## B.23 Pass 3 — static Python analysis

Optional source discovery SHALL use Python's standard `ast` module. It parses;
it MUST NOT execute scanned source. Patterns of interest include:

```python
self.db.hp = 100
character.db.mana
hp = AttributeProperty(100)
class CmdAttack(Command): key = "attack"
self.db.current_target = target
```

AST findings are evidence, not accepted configuration.

## B.24 Source scan allowlist

Default scanning restricted to game-code directories: `typeclasses/`,
`commands/`, `world/`. Other directories require explicit inclusion.

## B.25 Source scan denylist

Discovery MUST NOT automatically scan `.env`, `.git/`, virtual environments,
`logs/`, database files, SSH keys, TLS private keys, credentials, secret files,
backup directories, `node_modules/`, or anything outside the game project. The
scanner must resolve and validate paths before reading. Path traversal outside
the approved root is forbidden.

## B.26 No source execution

The scanner MUST NOT import scanned modules to inspect them, exec scanned code,
eval AST expressions, instantiate discovered classes, or call discovered
functions. Static discovery is static. Runtime inspection uses already-running
Evennia objects through a separate subsystem.

## B.27 Candidate model

```python
DiscoveryCandidate(
    category, identifier, suggested_label, paths,
    evidence, confidence, source_locations, warnings,
)
```

```text
Category:    resource
Identifier:  hp
Label:       Health
Paths:       value = db.hp, maximum = db.hp_max
Confidence:  HIGH
Evidence:
  - both attributes exist on selected Character
  - both are numeric
  - names form a current/maximum pair
  - current value <= maximum
  - both referenced in Character source
```

## B.28 Confidence levels

`HIGH`, `MEDIUM`, `LOW`. Confidence MUST be explainable. Never present a numeric
percentage implying scientific precision.

- **HIGH** — runtime object contains both values, both numeric, clear
  current/max naming pair, consistent source references.
- **MEDIUM** — resource-like numeric value exists but maximum missing; command
  exists but target semantics uncertain; collection appears effect-like but
  shape unclear.
- **LOW** — name appears only in source; semantic meaning uncertain; field name
  resembles a known pattern but runtime evidence is absent.

Low-confidence findings should not be selected by default.

## B.32 Genre neutrality

Discovery may recognise naming patterns as heuristics, not game semantics
(`hp/max_hp`, `health/health_max`, `mana/max_mana`). It should also use
*structural* pairing so nontraditional games yield `hull_integrity /
hull_capacity`, `oxygen / oxygen_max`, `reactor_output / reactor_capacity`,
`morale / morale_limit`.

The runtime client remains genre neutral regardless.

## B.33 Explanation is mandatory

Every suggestion must answer: what did Aetos find, where did it find it, why
does it think it may matter, how confident is it, and what will accepting it
generate? The developer must never be asked to blindly trust the scanner.

## B.34 Developer entry point

The desired experience is a single obvious server-side command:

```text
evennia aetos discover
```

If Evennia's contrib/launcher architecture requires a different mechanism, D0
determines the cleanest supported implementation. Whatever is chosen,
documentation MUST expose one canonical easy command, and the implementation
MUST remain self-contained in the contrib.

## B.35–B.40 The wizard

An interactive server-side walkthrough: choose runtime inspection, source scan
or both; select a representative Character by dbref, key or current puppet;
review each candidate with its evidence and confidence; edit a candidate without
editing Python; **test** the binding before generating anything; accept or
ignore.

```text
Possible resource found
-----------------------
Suggested name:  Health
Current:         db.hp
Maximum:         db.hp_max
Test values:     82 / 100

Evidence:
  ✓ both attributes exist
  ✓ both are numeric
  ✓ names appear related
  ✓ current <= maximum

Confidence: HIGH

Use this integration?   [Y] Yes  [E] Edit  [N] Ignore  [?] Explain
```

The test operation catches integration mistakes before the developer opens a
browser.

Command discovery may suggest context actions, but because the presence of a
command does not prove when or against what it should appear, action discovery
should be more conservative than numeric-resource discovery.

## B.41–B.44 Generation

Accepted simple candidates generate `AETOS_BINDINGS` formatted to Evennia
project conventions.

Discovery must recognise when a candidate cannot safely fit a binding —
`character.stats.get("health").current` requires a method call — and say so:

```text
This resource cannot be represented using a safe Aetos binding.

Reason:
  The value is produced through a method call.

Recommended integration:
  Custom AetosResourceProvider
```

For such cases Discovery MAY generate a starter provider, which MUST be labelled
**STARTER CODE — REVIEW BEFORE USE**, because static analysis cannot guarantee
the generated integration matches developer intent.

Generated artifacts MUST be written outside active game source:

```text
aetos-discovery/
├── report.txt
├── suggested_bindings.py
└── suggested_provider.py
```

Nothing generated is imported automatically.

## B.45–B.46 Report and redaction

A persistent human-readable report SHOULD include game path, timestamp, selected
objects, files scanned and skipped, candidates with confidence and evidence,
accepted and ignored suggestions, warnings and generated outputs.

Values whose names resemble credentials (`password`, `passwd`, `secret`,
`token`, `api_key`, `private_key`, `credential`) MUST NOT be printed. Even if
encountered accidentally, report `<redacted>`. They must never become
integration candidates.

## B.47–B.48 No automatic apply

The initial D-track stops at **discover → review → validate → generate**. It
does not include apply, rewriting settings, modifying typeclasses or committing
changes. This is intentional.

A future `evennia aetos apply` MAY be considered only after Discovery has proven
stable, and would require a separate specification covering backups, diff
preview, idempotency, rollback and source-modification safety.

## B.49 Developer experience goal

```text
Install → evennia aetos discover → select test Character → inspect →
review → test bindings → generate → paste into settings → reload → UI appears
```

The beginner should not need to understand providers unless Discovery determines
the game actually requires one.

## B.50–B.51 Documentation progression

Teach integration in this order: zero config → run Discovery → use
`AETOS_BINDINGS` → write a provider only when needed. The existing provider
example moves under "Advanced".

Replace wording equivalent to *"Aetos never reaches into your data directly"*
with:

> The Aetos Web Client never guesses, scans, or assumes your game's data model
> during gameplay. You explicitly bind game data to Aetos fields or supply a
> provider. The optional server-side Aetos Discovery tool can inspect your game
> during development and suggest those bindings for you.

This accurately distinguishes runtime behaviour from developer tooling.

## B.52 Discovery does not change runtime privacy

Discovery has no effect on the player privacy rule. It creates no player
tracking, no server-side Aetos profiles, and no notes, relationship, macro or
accessibility storage. It analyses developer-owned game implementation data, not
player personalisation.

## B.53–B.57 Security and robustness

The threat model must include path traversal, symlink escape, secret-file
access, arbitrary Python execution, malicious source files, dunder traversal,
unsafe generated code, database-wide enumeration, large source trees, memory
exhaustion, recursive structures, unexpected descriptors and sensitive Attribute
values.

AST parsing must open text, parse, inspect and discard. It must not evaluate
constants through unsafe means.

The scanner MUST resolve real paths: a symlink inside `world/` pointing outside
the game root MUST NOT permit scanning outside the approved project.

Configurable ceilings SHOULD exist for maximum files scanned, individual file
size, total source bytes, AST complexity and candidate count. If limits are hit,
say so — do not silently truncate:

```text
Discovery stopped after scanning 2,000 files.
413 files were not scanned.
```

One unparseable Python file MUST NOT abort the run:

```text
commands/legacy.py
Could not parse: SyntaxError at line 81
Skipped.
```

## B.58–B.66 Testing

Dedicated tests for the resolver, validation, each declarative provider, and
each discovery pass, plus:

- **Resolver security** — `__class__`, `__dict__`, `__globals__`, `method()`,
  `foo[0]`, `foo + bar`, `import`, `lambda`, semicolon and newline injection,
  path traversal. All must fail cleanly.
- **AST safety** — deliberately hostile fixtures containing
  `raise RuntimeError(...)`, `open("danger.txt", "w").write(...)` and
  `os.system(...)`. Discovery must parse them without executing any statement,
  and tests should prove the side effects never occur.
- **Secret scan** — fixtures including `.env`, `secret_settings.py`,
  `private.pem`, `.git/`, `venv/`, `logs/`, verified as not read by default.
- **Confidence** — deterministic and testable. `db.hp = 82` with
  `db.hp_max = 100` plus matching source references SHOULD be HIGH;
  `db.energy = 40` with no maximum must not be presented as an equivalent
  high-confidence pair.
- **Generated code** — must parse as Python, contain only accepted candidates in
  stable order, follow formatting conventions, and expose no redacted data.
- **Fresh Evennia** — a pristine game must yield no invented resources,
  equipment, target or effects, while the existing zero-config integration
  (entities, inventory, map, basic actions) remains. *This is the critical
  genre-neutrality test.*
- **Nontraditional game** — `hull_integrity/hull_capacity`,
  `oxygen/oxygen_capacity` should be identifiable without fantasy-specific
  names.
- **Complex game** — `character.stats.get("health").current` must not generate
  an unsafe binding; recommend a custom provider instead.

## B.67 D-track

```text
D0  Discovery architecture spike
D1  Safe AETOS_BINDINGS foundation
D2  Declarative provider suite
D3  Runtime + structural discovery
D4  Static AST discovery
D5  Interactive setup wizard + generation
D6  Hardening, docs and integration validation
```

Full task lists and gates are in [`notes/roadmap.md`](../notes/roadmap.md).

## B.68–B.71 Relationships to existing milestones

- **M21 (developer inspector)** remains separate. It MAY later consume sanitised
  Discovery information, but Discovery does not depend on it, and the
  authoritative engine stays server-side. This prevents the visual inspector
  from becoming an unrestricted server inspection interface.
- **M27 (configuration validation)** MUST validate `AETOS_BINDINGS`, custom
  providers, binding/provider conflicts, unsupported fields, invalid paths and
  unknown feature names. The validation system SHOULD be shared between startup
  validation, the Discovery wizard and generated-configuration testing — one
  schema, not three interpretations.
- **M28 (documentation)** must change the learning path from "write a provider
  first" to the B.50 progression.
- **M31 (release candidate)** testing must include a developer unfamiliar with
  Aetos: give them fresh documentation, a test game with hp/mana, and Aetos
  installed, and ask them to make health and mana appear. **Do not coach the
  tester.** If they cannot do it using the documented workflow, D-track
  usability is not complete.

## B.72 Definition of done

```text
[ ] server-side only
[ ] no player protocol exposure
[ ] no arbitrary code execution
[ ] no automatic source mutation
[ ] path boundaries enforced
[ ] sensitive data protected
[ ] suggestions explain evidence
[ ] confidence is explicit
[ ] false positives are rejectable
[ ] errors are beginner-readable
[ ] generated output is deterministic
[ ] generated Python parses
[ ] tests complete
[ ] documentation updated
[ ] fresh Evennia behaviour remains genre-neutral
[ ] existing provider API remains compatible
```

## B.73 Permanent easy-integration rule

> A new developer should not need to understand the Aetos provider API to expose
> simple game data.

And simultaneously:

> The Aetos binding language must never become a hidden programming language.

Therefore:

```text
Simple location of data                          → AETOS_BINDINGS
Calculation / transformation / unusual model     → custom provider
```

**Do not blur this boundary.**

## B.75 Final architectural statement

Aetos Discovery must never become a magical runtime scanner. The player-facing
client remains deterministic and explicitly configured. Discovery exists only
during development, to shorten the path between *"this is how my game works"*
and *"this is how the client should represent it"*.

```text
                 GAME DEVELOPMENT

Game source ──────────────┐
Runtime objects ──────────┤
Evennia metadata ─────────┤
                          ▼
                  Aetos Discovery
                          │
                  inspect + suggest
                          ▼
                  Developer Review
                          │
             ┌────────────┴────────────┐
             ▼                         ▼
      AETOS_BINDINGS            Custom Provider
             └────────────┬────────────┘
                          ▼
                   Provider Registry
                          ▼
                   Aetos Protocol
                          ▼
                  Aetos Web Client
                          ▼
                        Player
```

Discovery assists the developer. Bindings simplify common integrations.
Providers preserve unlimited extensibility. The client remains clean,
deterministic, genre-neutral, and unaware of how the integration was authored.
