# M23 -- Server-described UI manifest

Status: **COMPLETE**

Verification: 1036 Python tests OK (up from 1000). axe clean. Declaration,
ordering and the pending gauge all exercised live against the lab game.

Addendum A.76 and A.77 were already met (`importance_hint` at the E-track,
resource `state_text`/`units` at M8), so this milestone is the manifest half.

## What was actually missing

The manifest had `resources`, `widgets`, `actions`, `map` and `media` as empty
placeholders — declared at protocol v1 "so the shape is stable" and never
populated by anything. M23 fills the first one and adds `panels`.

A game can now say what its interface *is*:

```python
AETOS_UI = {
    "resources": [
        {"id": "health", "label": "Vitality", "order": 1,
         "thresholds": [{"at": 0.25, "label": "badly hurt", "level": "critical"}]},
        {"id": "stamina", "label": "Stamina", "order": 2},
    ],
    "panels": {"resources": {"title": "Vitals"}},
}
```

## Description, not data — and why the line matters

`AETOS_UI` says a resource called `health` exists, what to call it, where it
sits and when it is worth announcing. It says **nothing about where the number
comes from**.

The other side of that line is the D-track (`AETOS_BINDINGS`), which is about
sourcing values from a game's own model. Keeping them apart means a game can
describe its interface today, without Discovery, and adopt bindings later
without rewriting any of it.

Tests enforce the boundary: a descriptor carrying `value` drops it, a
`bindings` section is refused outright, and the module is asserted never to
touch `.db.`, `.attributes`, `search_object` or a character class.

It also cannot escalate. `features` and `automation` sections are refused, so a
UI description cannot switch on a capability — that would be a second,
less-examined route to a decision `AETOS_FEATURES` already owns.

## Two things a provider cannot do

**A gauge can exist before its first value.** Verified live:

```text
before any values:  Stamina waiting | Vitality waiting | Focus waiting
after two arrive:   Stamina 40/100  | Vitality 82/100  | Focus waiting
```

Without this the panel is blank until the first sync, so a player on a slow
link — or reconnecting mid-fight — cannot tell whether the game has no health
bar or has not spoken yet. `Focus` is declared in the lab and no provider
supplies it, which is exactly the case that stays pending indefinitely and
should.

"waiting" rather than a zero or a spinner, because **a zero is a value**, and
showing one for a health bar that has merely not loaded is the worst available
wrong answer. Pending gauges are never announced either: announcing "waiting"
is announcing the absence of news, which would fire on every reconnect.

**Order is stable.** Provider output is a list, and a game assembling it from a
dict gets whatever order the dict yields. A health bar that moves between second
and fourth place between syncs is not cosmetic for somebody navigating by
position or by screen reader.

Undeclared resources are kept and sorted last rather than dropped. A game that
adds a resource to its provider and forgets the declaration should see it appear
at the bottom, not vanish — the second failure is far harder to diagnose, and
the first is self-correcting.

## BUG: the wrong threshold keys were accepted silently

Found by using the feature rather than by reading it. I wrote the lab settings
from A.77's example:

```python
{"at": 0.25, "state_text": "badly hurt", "announce": "important"}
```

`state_text` is a field on a **resource**, not a threshold; the canonical
threshold shape has been `at`/`label`/`level` since M8. The normaliser did
exactly what it should for a provider — ignored what it did not recognise — and
produced:

```python
{"at": 0.25, "label": "", "level": "warning"}
```

A threshold that will never announce anything a player can act on, with nothing
anywhere to say why.

Fixed by rejecting unknown threshold keys, and an empty label, **in the settings
path only**. The asymmetry is deliberate and worth stating: a *provider* is game
code producing values at runtime, contained by `safe_call` and expected to be
imperfect; a *setting* is a developer typing a literal, where a wrong key is a
mistake they want told about. Tolerant at runtime, strict at configuration.

That is the same principle `AETOS_FEATURES` already followed, applied one level
deeper than anybody had thought to apply it.

## A malformed setting costs only itself

`build_manifest` raises loudly on a bad `AETOS_UI` — at the handshake, where a
developer sees it. `build_sync` catches the same error and carries on, because
one settings typo must not also empty the player's resource panel.

Loud where it will be read, contained where it would do damage.

## Test defect: reading the deployment again

`test_absent_settings_are_not_an_error` read the ambient settings, so it passed
until the lab game declared `AETOS_UI` — then failed while the code was correct.

Second instance of this exact shape (A5 had two). The fix is the same:
`override_settings(AETOS_UI=None)`, so the test asserts something about the code
rather than about whichever game dir happens to be running it.

## Accessibility -- definition of done (A.97)

- **Keyboard-findable / operable:** no new controls; the pending row is text.
- **Accessible name:** a declared resource without a label falls back to its id
  rather than to a blank — an unlabelled gauge is announced as "edit, blank" or
  worse, and the id is at least a word.
- **Announces?** Never for a pending gauge. Threshold crossings announce as
  before, through the existing tracker.
- **Steals focus?** No.
- **Colour alone?** No — the pending state is muted *and* says "waiting".
- **axe:** clean with three pending gauges rendered.
- **Human AT testing:** at A8. The open question is whether "waiting" is the
  right word or whether it implies something is wrong; "not yet sent" is more
  accurate and clumsier, and I do not know which a screen reader user would
  prefer to hear on every reconnect.

## Not built here

`widgets`, `actions`, `map` and `media` remain empty in the manifest. Each would
be a real feature rather than a placeholder to fill:

- `widgets` overlaps M22's SDK, where a game-bundled widget registers itself
  directly and needs no manifest entry.
- `actions` and `map` are already provider-supplied; a declarative layer for
  them belongs with the D-track's bindings, not ahead of it.
- `media` gained its provider at M18 and needs no description.

Declaring them empty is honest — the keys exist so a client can rely on the
shape — and filling them for symmetry would be inventing requirements.
