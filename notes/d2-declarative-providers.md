# D2 — Declarative provider suite

Status: **COMPLETE**

Verification: 1496 Python tests OK, up from 1472. All five slots proved live
against the lab game's real database with `AETOS_PROVIDERS` emptied.

D2's gate: **each provider emits exactly the payload a hand-written one would,
through the same normalisers. The client must be unable to tell which integration
path supplied the data.**

D1 served `resources`, which was its own gate. D2 adds `equipment`, `effects`,
`target` and `actions` — and changed nothing else, because D1 left a table where
a chain of `if slot ==` would have been.

## Proved live, all five

Against the lab game's real database, with `AETOS_PROVIDERS` emptied so a binding
was the only possible source:

```text
providers:  {'resources': 'BoundResourceProvider', 'equipment': 'BoundEquipmentProvider',
             'effects': 'BoundEffectProvider', 'target': 'BoundTargetProvider',
             'actions': 'BoundActionProvider'}
features:   {'resources': True, 'equipment': True, 'effects': True,
             'target': True, 'actions': True}
equipment:  [{"slot": "weapon", "label": "Weapon", "item": {"id": "weapon",
              "name": "a rusty sword", ...}},
             {"slot": "head", "label": "Head", "item": null}]
effects:    [{"id": "poison", "label": "Poisoned", "kind": "harmful", "remaining": 30.0}]
target:     {"id": "name", "name": "a training dummy",
             "resources": [{"id": "health", "value": 6, "maximum": 10, ...}], "effects": []}
actions:    [{"label": "Attack", "command": "attack aetos_dev"}]
```

Every slot resolved to its bound provider, every feature flag derived itself, and
every payload came back in the shape its normaliser produces.

## The gate, and why equality *after* the normaliser is the honest test

M16 routed every slot through `character_state` and `resources` precisely so
there would be one shape. A declarative path producing a *nearly* identical dict
would be a second code path with a second set of bugs, and the first place they
would show is the accessibility surface — thresholds, announcements and labels
are all computed from the normalised shape.

So each payload is built twice, once from a binding and once from a hand-written
provider carrying the same data, and the two must be equal **after
normalisation**. Before it, two honest providers may legitimately differ in what
they omit; after it, a difference is a defect.

Each of those comparisons also asserts that the expected payload is non-empty.
Two empty lists are equal, and a gate that passes on nothing is the same defect
as a regex that matches nothing — which this project has already shipped once.

## Four slots, four rules that would be wrong if shared

**Equipment keeps its empty slots. Resources drop their absent ones.** These look
like the same decision and are opposites, deliberately. "Nothing on your head" is
information a player needs, and dropping empty slots would make a bare character
indistinguishable from a game with no equipment at all. A resource that will not
resolve is not *empty*, it is *absent* — the game never had that number for this
character — and a bar reading 0 says "you are dead".

**An effect is active when its value is truthy.** `db.poisoned = True` and
`db.poison_stacks = 3` both mean poisoned, and a game should not have to pick one
to suit Aetos. **Zero is not active**: a countdown that reached 0 has expired, and
an effect list that goes on showing it is one a player learns to distrust. This
is the rare place where Python's truthiness is exactly the rule wanted, which is
worth saying out loud because it usually is not.

**`target` has one reserved key.** It is the only slot that is a single object
rather than a list, so `name` supplies the identity and every other entry becomes
one of the target's resources — which go through the *same* resource normaliser
as the player's own, so a target's health bar and the player's cannot disagree
about thresholds or rounding.

No name, no target. Returning resources without a name would be worse than
returning nothing: a player would see a health bar belonging to something the
client could not name. And an empty dict is already what "nothing is targeted"
looks like everywhere else, so the widget hides itself with no special case.

**An action needs no resolver at all.** It is a label and an ordinary game
command, with one substitution: `{target}`, the name of the entity whose menu was
opened. That is a placeholder, not an expression — no operators, no attribute
reads, exactly one of it. A second placeholder would be the first step towards a
template language living in settings.py, and the D-track's whole argument is that
the first step is the one to refuse.

**Offering an action does not make it legal** (§ 2.4). The command travels the
ordinary command path and the server decides, exactly as if the player had typed
it. A binding cannot grant a permission, bypass a lock or skip a cooldown, and a
game that removes a command sees the action stop working without Aetos knowing
why. There is a test that what is sent is an ordinary command string and nothing
else.

## An `order` field that would have done nothing

The first draft of the schema gave every slot an optional `order`. It was removed
before it shipped.

Python dicts keep insertion order, so the order in settings.py is **already** the
order on screen. `order` would have been a second way to say the same thing, and
the two would eventually disagree — which is the "a control that appears to work
and changes nothing" defect this project keeps finding, except caught while it
was still a draft.

That prompted the generalisation: **every optional field the schema allows must
be read by some provider**, and there is now a test that walks
`BINDING_FIELDS` and fails on any field nothing consumes. A schema makes that
defect very easy to introduce — adding a key is one line and reading it is ten.

## What made this milestone cheap

D1 left `PROVIDERS` as a table rather than a chain of `if slot ==`, and
`provider_for` asking that table rather than knowing the answers. D2 is four
rows and four classes; precedence, feature derivation, validation, the startup
check and the error messages all applied to the new slots without being touched.

`None` is still a real answer from `provider_for`, and deliberately kept. A
future slot would be declarable and unserved for exactly as long as it took to
write its provider, and during that window a game gets the client it would have
had anyway rather than something half-built.

## Accessibility — definition of done (A.97)

No new interface, and that is the gate's whole point: every payload reaches the
widgets already built, already keyboard-operable and already tested. The
target's resources in particular go through the *same* normaliser as the
player's own, so a player who has learned to read one bar has learned to read the
other — which was M16's reason and is now also a binding's.

**Thresholds remain the limit.** A binding cannot declare them, so a resource
declared this way is never announced. A game wanting spoken announcements at
meaningful crossings still needs `AETOS_UI` or a provider. That is in the README
under "What a binding cannot do", stated rather than left to be discovered by
somebody who assumed the zero-code path was complete.

## Not built here

- **No `map` or `inventory` bindings.** A map is a graph and an inventory is an
  arbitrary-length list; neither is a set of named places a declaration can
  point at. Both already work out of the box on a stock game, which is the case
  bindings exist to cover.
- **No thresholds in a binding.** They need a list of objects, which is a step
  change in what a declaration is.
- **Discovery still only suggests `resources`.** It scans character attributes,
  and an attribute cannot say whether it is meant to be a bar or an effect. The
  other four are documented in the README instead of guessed at.
