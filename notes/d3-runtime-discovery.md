# D3 — Runtime and structural discovery

Status: **COMPLETE**

Verification: 1679 Python tests OK (1606 → 1679: 72 new in
`test_discovery_runtime.py`, one added to D0's suite, and five of D0's updated
where Addendum B changed the answer). Ten deliberate breakages of the new code, each caught by a named test.
`evennia aetos discover` run against the lab game, read as a developer would read
it, and corrected three times on what that reading showed. `black` and
`isort --profile black` clean.

D0 proved a live character could be read. D3 is what makes the reading worth
trusting.

## What D0 already had, and what it was missing

D0's spike covered about a third of D3: a capped runtime scan, merging across
scans, pairing, and confidence in words. Against Addendum B it was missing:

| Requirement | D0 | D3 |
| --- | --- | --- |
| B.46 redaction | **absent** — `db.api_token` would have been a candidate | refused by name, before the value is read |
| B.65 nontraditional pairs | `hull_capacity` did not pair; nor did `max_hp`, B.32's own example | ceiling words, prefixes, stems, structure |
| B.28 levels | two words, no reasons | HIGH / MEDIUM / LOW, each with reasons and warnings |
| B.20 representative | newest 25 only, **exact typeclass path** | `--character`, `--typeclass`, subclasses included |
| B.20 values | kind only | the value, rendered without running its code |
| B.22 structure | none | lineage, `AttributeProperty`, handlers, commands |
| categorised attributes | skipped **silently** | reported, with the provider route |

## A D0 bug: every kind went into `resources`

D0's report filed text and true/false attributes under `resources`. The resolver
cannot turn `'the Brave'` into a number, so that bar never draws: a pasted setting
that silently does nothing. That is the defect this project has now found five
times in its own client, and discovery would have been generating it for other
people.

Numbers go to `resources`, flags to `effects`, game objects to `target`. Text and
collections have no slot that shows them as they are, so they are listed under
the block and never placed in it.

The target case was checked end to end rather than assumed: D2's target provider
resolves `db.current_target` to the object, and the normaliser turns it into the
object's name. A test binds a real Goblin and reads back `"Goblin"`.

## The confidence engine

`confidence.py` is B.28 made executable, and the scans no longer decide anything.
In D0 each scan stamped its own guess and the merge kept the more optimistic one.

- **HIGH** — a live character carries a value *and* its ceiling, both numbers,
  one name directly extends the other, and the value was never above the ceiling.
- **MEDIUM** — real but incomplete.
- **LOW** — seen only in source, or its meaning is a guess. **Printed commented
  out** (B.28: not selected by default), so pasting the block unchanged activates
  only what discovery could justify.

B.28's own two examples are tests: `hp` 82 of 100 with source references is HIGH,
and `energy` 40 with no maximum is not.

**One D0 test changed because the spec changed the answer, not to make it
pass.** D0's report test used a pair seen only in source and expected it
selected. B.28 makes that LOW. The test now supplies live readings, and its
docstring says why.

## Reading values without running them

B.20 wants `db.hp 82 int`. The obvious way to show a value is `repr()`, which is
a method call on an object of the game's choosing. `values.py` never calls one:
numbers and text are formatted from the value, a game object is shown by its
`db_key` and `id` columns, a collection by its size only (its contents are where
a nested `password` would be), anything else by its type's name.

My first version used `hasattr(value, "items")`. That goes through the
instance's own `__getattr__`, which is the game's code. Replaced with
`isinstance` against the ABCs, which look at the type. Checked rather than
assumed: Evennia's saver types really do inherit `MutableMapping` and
`MutableSequence`.

## The structural pass

`structure.py` reads classes Evennia already loaded, with `vars()` on each class
in the MRO, never `getattr()`. A descriptor read with `getattr` runs, and an
`AttributeProperty` read that way would go to the database.

**Handlers produce advice, never a binding.** B.66's complex game keeps health at
`character.stats.get("health").current`. That is a call; the grammar cannot
express one and never will. Discovery names the handler and points at a
provider.

"The game's own" means outside Evennia's core. `evennia.contrib.*` counts as the
game's: a game that added the traits contrib chose that feature exactly as it
would have chosen its own code.

## What running it against the lab game found

The unit tests passed on the first run. That deserved suspicion, not relief, and
three of the fixes below came from reading the real output the way a developer
would.

**1. Commands were silently lost.** The report had no actions, although the lab
adds one. Under a management command, the character's command set failed to
import, and **Evennia does not raise: it substitutes an empty set keyed
`_CMDSET_ERROR`**. Discovery read that as "this game has no commands".

The cause: the launcher calls `evennia._init()` whenever the database exists
(that is what `evennia shell` gets), but not before handing a command to Django.
Without it `evennia.default_cmds` is still `None`, and the game's cmdset module
fails on import. The command now calls `evennia._init()`, after checking that it
starts no service, binds no port and touches no reactor. It builds the API and
sets SQLite connection pragmas, the same as every `evennia shell`. And an
`_CMDSET_ERROR` set is now **reported out loud**, so the next cause of it cannot
be silent either.

**2. `setres <name> <value>` was suggested as a target action at MEDIUM.** The
warning beside it, "assumes the argument is the thing the menu was opened on",
was exactly right. A usage line with two arguments cannot take a menu's subject
as its whole input, so the argument *count* now matters, and two or more is LOW.

**3. The target's health was offered as the player's.** `target_hp` /
`target_max` paired through their shared stem and were selected. They are the
target's bar, in D2's documented target convention. A shared stem is weaker
evidence than one name extending the other, so it is now its own kind of pairing,
capped at MEDIUM. Where a text `<stem>_name` sits beside it, the report points at
the target slot. It says what it sees; it does not move the entry.

**4. `poison` paired with `poison_left` by structure, from one character.**
`poison_left` is rounds remaining. "Never below it" on a single reading proves
nothing. Structure alone now needs two readings.

After those, the lab report pasted unchanged produces exactly one thing, the
health bar, and offers the rest commented out, each with its reason.

## Tests that passed for the wrong reason

Every new test was then checked by breaking the code it guards. Three were
weaker than they looked:

- **The credential test could not fail.** Its fake raised `AssertionError` on a
  value read, and the scan wraps value reads in `except Exception`. The scan
  would have swallowed the very alarm the test relied on. It now *records* reads,
  and a counterfactual test shows the fake does notice an ordinary one. This is
  the project's rule about negative assertions, met again: *a negative assertion
  is satisfied by nothing happening.*
- **The LOW-selection test covered the easy branch.** It only checked a slot
  where everything was LOW, which is commented out whole by a different line.
  The case that matters, a LOW entry inside an active slot, had no test.
- **The subclass test named the exact class.** An exact-path filter passed it
  too. It now names a parent.

One mutation was itself wrong: breaking the two-argument branch sent the command
down a different branch that is *also* LOW, so nothing observable changed. A
realistic regression, two arguments treated like one, was tested directly and
caught.

## Considered and deliberately not done

- **Suggesting text attributes as target names.** D2 documents
  `"value": "db.target_name"` as the target's name, so a text attribute *can* be
  one. But then every `db.title` and `db.race` is a target-name candidate. The
  report lists text under the block and, where the stem matches, the warning
  above points at it.
- **Instantiating the command set when no character exists**, to read commands
  anyway. That runs `at_cmdset_creation`, which is game code, for an object that
  does not exist. Discovery says there was no character to read instead.
- **Evaluating lock functions** to decide whether a command is staff-only. A
  lock function is game code too. The lock *string* is read against
  `PERMISSION_HIERARCHY`.

## Accessibility — definition of done (A.97)

Not applicable: server-side developer tooling with no player interface. The
output is plain text with no colour, no box drawing and no cursor addressing, so
there is nothing for a screen reader to get wrong that is not already the
terminal's job.
