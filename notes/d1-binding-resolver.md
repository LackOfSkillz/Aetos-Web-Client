# D1 — Safe AETOS_BINDINGS foundation

Status: **COMPLETE**

Verification: 1472 Python tests OK, up from 1421. The gate proved live against
the lab game's real database, with the resources provider deliberately removed.

D1's gate is one sentence: **a health bar appears from nothing but**

```python
AETOS_BINDINGS = {
    "resources": {
        "health": {"label": "Health", "value": "db.hp", "maximum": "db.hp_max"},
    },
}
```

**with no custom Python class anywhere.** `TestTheGate` is that sentence, run.

## Proved live, not only in tests

The lab's `AETOS_PROVIDERS` was temporarily reduced to `{"media": ...}` — no
resources provider at all — and the binding above pointed at the attributes the
lab's characters already had:

```text
character:           1 aetos_dev
AETOS_PROVIDERS:     {'media': 'world.aetos_demo.DemoMediaProvider'}
resources provider:  BoundResourceProvider
features.resources:  True
raw:                 [{'id': 'health', 'label': 'Health', 'value': 72, 'maximum': 100}]
normalized:          [{'id': 'health', 'label': 'Health', 'value': 72,
                       'minimum': 0, 'display': 'gauge', 'thresholds': [],
                       'maximum': 100}]
```

Real database, real settings, real typeclass, no provider class. The lab was
restored afterwards, because its demo provider also declares thresholds and
announcements, which a binding deliberately cannot.

**`energy` was declared and did not appear, which is correct.** That character has
no `energy` attribute, so the binding omitted the resource rather than showing a
bar at zero. A bar reading 0 says "you are dead"; a missing bar says "not
available", and only one of those was true.

## The resolver is three steps, and that is the whole design

1. The expression is **re-validated at use**, not only at startup. A caller that
   built one by concatenation is refused rather than trusted, and there is no
   path into the traversal that skips the check — asserted by a test that reads
   the order of the two statements.
2. The first name is read through `character.attributes.get(name)` — Evennia's
   own handler, by name.
3. A second name is **a key in a mapping. Nothing else.**

Step 3 is the one with a decision in it. `db.stats.hp` could plausibly mean "the
`hp` attribute of whatever is stored at `stats`", and that reading is rejected:
it would have the resolver calling `getattr` on an arbitrary object, which runs
the game's `__getattr__`, which is the thing this design exists to avoid. A dict
lookup on a real `Mapping` cannot run anything. Games store
`character.db.stats = {"hp": 50}` constantly, so the useful case is covered, and
a game storing an *object* there has outgrown a declaration.

### The security tests are the substance, and they are not grammar tests

B.59's list is checked twice over. The grammar decides what may be *written* —
and D0 shipped that with the hole it existed to prevent. The resolver decides
what happens when one is *read*, and that is tested against a `_Tripwire` object
that records every `__call__`, `__getattr__` and `__getitem__` it receives.

The distinction matters: **a grammar test proves what was refused, and only a
tripwire proves what was not called.** Every rejected expression is fed to the
resolver with a tripwire behind every attribute, and the assertion is that the
object was never touched at all.

## Errors are for somebody who did not want to write Python

That is who `AETOS_BINDINGS` is for, so telling them their value "did not match
`^db\.(?!__)[A-Za-z_]...`" is telling them to go and find somebody who did.

Each failure is *recognised* rather than merely rejected, because "you cannot
call a method here" is a fix and "invalid" is a puzzle:

| Written | Told |
|---|---|
| `db.hp()` | looks like a method call; a computed value wants a provider |
| `db.stats[0]` | use a second dotted name: `db.stats.hp` |
| `hp` | must start with `db.` — that is where `character.db.hp = 50` puts things |
| `db.hp + 1` | a binding is a place, not a sum |
| `db.__class__` | names a Python internal |
| `db.a.b.c` | two levels only, on purpose |

A test asserts that no message ever contains a regular expression, and that every
one names the slot and the key.

**The declaration is validated as a whole and refused as a whole.** A game that
misspelled one binding and shipped the other three has a client that half works,
and "half of my bars appeared" is much harder to debug than "Aetos refused it and
told me which line".

## Two rules that had to be written down before they could be got right

**Precedence: custom > binding > default.** A provider class always wins over a
binding for the same slot. The case that needs it is a developer mid-migration:
getting both, or getting the binding while they are still editing the class,
would be a bad surprise in either direction. It is the order somebody would
guess — the more specific thing wins — and it is stated in one place.

**A binding implies its capability.** Declaring `AETOS_BINDINGS["resources"]` and
then having to remember `AETOS_FEATURES = {"resources": True}` is exactly the
second step that makes a zero-code feature feel broken.

But **an explicit setting wins, in both directions.** The derivation fills in a
flag the game did not state; it never overrides one it did. A game that declared
bindings and then set `"resources": False` is turning the widget off on purpose —
mid-migration, or behind a launch date — and a helpful override would be Aetos
arguing with it. That required tracking which keys the game actually *stated*,
rather than reading the merged result, because the merged result cannot tell an
explicit `False` from the default.

## The schema moved, and that was the point of noticing

D0 defined the grammar in `discovery/`, because that is where it was being
written. D1 moved it to `bindings/`.

Left where it was, the **live client would have imported a development-time
source scanner in order to read a setting.** The dependency now runs one way —
discovery imports the binding schema, nothing in `bindings` imports discovery —
and a test walks the package's imports to keep it that way. Easy to fix now,
permanent in a year.

## A quiet failure, and what makes it acceptable

`bound_slots()` swallows a validation error and returns nothing. That is
deliberate: it is called while a player is connecting, and a typo in settings.py
must not turn into a failed login for everybody on the game.

That trade only works if the developer is told somewhere else, so `AETOS_BINDINGS`
joins the startup-check table — reported at `evennia start` and `evennia reload`,
by name, with the message the runtime itself would have raised. There is a test
that the check fires, not merely that the setting is in the table.

## Two guards inverted rather than deleted

- **M28's "no setting is documented that nothing reads"** required the README
  *not* to show an `AETOS_BINDINGS` example. The resolver exists now, so the same
  principle requires the opposite — and the example is parsed out of the README
  and run through the real validator, because a README example the shipped code
  would refuse is the worst kind.
- **D0's "the README says the setting does nothing"** is now "the README no
  longer says that". Stale documentation that undersells is still stale: a
  developer reading "setting it does nothing at all" would write a provider class
  they no longer need.

D0's `BINDINGS_ARE_LIVE` flag is **deleted**, not set to `True`. A constant with
one possible value is a note about history wearing a switch's clothes.

## And one guard that had silently stopped covering things

`test_the_settings_table_lists_every_setting_the_client_reads` scanned the
contrib root and `providers/__init__.py` by hand. D1 read `AETOS_BINDINGS` from a
new subpackage, where the guard would not have looked — so it would have passed
while covering one setting fewer. Now recursive.

A test that silently stops covering something is worse than one that fails,
because nobody finds out.

## Accessibility — definition of done (A.97)

No new interface. A binding produces the same normalised resource payload a
hand-written provider does, goes through the same `normalize_resources`, and
renders through the same widget — so the thresholds, announcements, labels and
colour rules are the ones already built and already tested. A test asserts the
payload shape rather than trusting that, because the accessibility surface is
computed *from* the normalised shape and a subtly different dict would diverge
there first.

**What a binding cannot declare is thresholds**, and that is worth stating
plainly rather than leaving to be discovered: a resource with no thresholds is
never announced. A game that wants spoken announcements at meaningful crossings
still needs `AETOS_UI` or a provider. That is a real limitation of the
zero-code path and it is in the README.

## Not verified here

**The bar has not been seen drawn in a browser from a binding.** Resources only
render for a puppeted character, which needs a login, and I do not authenticate.
The server half is proved live end to end, and the payload is byte-identical in
shape to a provider's — which the widget already renders and is tested on — but
"I saw it" is a stronger claim than "the payload is right", and this project has
been caught by exactly that gap before. Worth thirty seconds of Gary's time.

## Not built here

- **The other four slots.** `equipment`, `target`, `effects` and `actions`
  validate, are suggested by discovery, and fall through to the stock default.
  D2 serves them, and adds four entries to one table.
- **Thresholds in a binding.** They need a list of objects, which is a step
  change in what a declaration is. `AETOS_UI` already declares them.
- **No caching of the parsed setting.** It is a small dict read once per
  handshake, and a cache would be one more thing to invalidate on reload.
