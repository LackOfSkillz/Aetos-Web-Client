# D4 — Static AST discovery

Status: **COMPLETE**

Verification: 1708 Python tests OK (1679 → 1708: 29 new in
`test_discovery_static.py`, D0's static tests updated where the API changed).
Eight deliberate breakages, all caught. `evennia aetos discover` run against the
lab game, which is where the one real defect turned up. `black` and
`isort --profile black` clean.

D0 proved a game's source could be read without importing it, and built the
allowlist, the depth limit and the symlink containment. D4 is the rest of
Addendum B's static pass.

## Why a static pass at all, now that D3 reads live characters

They fail in opposite conditions, which is the whole argument for having both:

- A **brand-new game** has a Character typeclass and no characters. The runtime
  pass returns nothing.
- A game **mid-edit** has source that will not import, and a game that sets
  everything from a table in a loop has source that says nothing. The static
  pass returns nothing.

Neither is offered alone.

## What D4 added to the parse

D0 recognised two forms, `self.db.hp = 100` and `self.attributes.add("hp", 100)`.
The rest of B.23's list:

- **`hp = AttributeProperty(100)`** — a declaration, recognised by the *called
  name* rather than by following the import, because following an import means
  resolving modules and resolving means importing. A categorised one is reported
  and not suggested: the grammar cannot reach a category.
- **A read** — `if character.db.mana > 0`. Weaker evidence than an assignment,
  and said so in the evidence line: it says the attribute is expected to exist,
  not what it holds. Often the only evidence in a game whose values are set from
  a table.
- **`class CmdAttack(Command): key = "attack"`** — where a game with no
  characters keeps its commands. Always LOW: source says the class exists, not
  that any character has it. Matched by base-class *name*, so `MuxCommand` and a
  game's own `CombatCommand` count.
- **`character.stats.get("health")`** — recognised in order to be **refused**
  (B.66). A binding cannot call anything, so discovery names the handler and
  points at a provider rather than inventing an expression that will not
  resolve.

## Actions now arrive from two directions, and merge by strength

`add_action` kept whichever action arrived first, which made the result depend on
scan order: the static pass runs first, so its LOW would have beaten the live
command set's MEDIUM. It now keeps the stronger claim and joins the evidence, so
the lab's `setres` reads *"world/aetos_demo_cmds.py:14, class CmdSetResource;
setres in DefaultCharacter"* — the file to open, and the fact that a character
really has it.

## The ceilings, and saying so (B.53, B.56)

`MAX_FILES` 2000, `MAX_FILE_BYTES` 512KB, `MAX_TOTAL_BYTES` 20MB, `MAX_NODES`
200,000. Each has a test, and each hit produces a note naming what was left:

```text
Discovery stopped after scanning 2000 files (7314 KB). 413 files were not
scanned. Raise the ceiling in discovery/roots.py if that is wrong.
```

**Nothing is left out silently.** A scan that quietly truncates teaches a
developer that the attribute they were looking for does not exist, which is worse
than a slow scan and much worse than an error.

One addition to B.25's denylist: **a source file whose own name looks like a
credential is skipped unread.** `world/api_keys.py` is ordinary Python inside an
approved root, so the walk would otherwise read it and quote lines from it into a
report somebody pastes into an issue. The name is the only warning available
before reading — B.46's reasoning applied to a file rather than an attribute.

## What running it against the lab game found

The suite passed before this run. Then the report said:

```text
world/aetos_demo_cmds.py reads values through character.args, a handler...
world/aetos_demo_cmds.py reads values through character.caller, a handler...
```

Neither is a handler. **Inside a Command, `self` is the command object**, so
`self.args` and `self.caller` are Evennia's own plumbing — and discovery was
advising a developer to write a provider for a feature they never wrote. Advice
about a thing that does not exist is worse than no advice, because they will go
looking for it.

Two fixes, deliberately overlapping:

1. **Scope.** Handler detection now walks scoped rather than flat, and drops
   `self` from the receivers inside a class whose base name ends in `Command`. A
   handler on a typeclass is still found through `self`.
2. **Evennia's own members** — `args`, `caller`, `location`, `sessions`, `ndb`
   and the rest — are never a game's handler, whatever the receiver is called.

The mutation check then found the overlap honestly: removing (2) did *not* fail
the command test, because (1) already covers that case. It fails
`test_evennias_own_members_are_never_a_game_handler`, which is the test that
actually guards it. Recorded because "the mutation was caught by a different
test than I aimed at" is the kind of thing worth knowing about a suite.

After the fix the lab report has no handler notes at all, which is correct: the
lab keeps its demo values in plain attributes.

## One deliberate behaviour change to a D0 test

`self.db.stats.hp = 1` used to yield nothing, on the rule that the scan does not
claim three levels. It still does not claim `db.stats.hp` — but it now yields
`db.stats`, because the line is a *read* of `db.stats` and that attribute is real,
two levels deep, and bindable. The test asserts the expression list exactly, so
the narrower claim is pinned rather than implied.

## Considered and deliberately not done

- **Following imports** to confirm that `AttributeProperty` is Evennia's and that
  a `Command` base really is one. Following an import means resolving a module,
  which means importing it, which is the one thing this pass exists not to do.
  Matching the name over-reports slightly, and over-reporting a candidate the
  developer can ignore is the safe direction.
- **Reading `server/conf/settings.py`** to say "you already have this binding".
  It stays out, for D0's reason: it is the first step of a tool that edits it.
- **Evaluating a constant** to learn a default, through `ast.literal_eval`. The
  kind is taken from the syntax instead. The gain is small and the habit is the
  one that ends in an evaluator.

## Accessibility — definition of done (A.97)

Not applicable: server-side developer tooling with no player interface. The
output is plain text with no colour, no box drawing and no cursor addressing.

## Known gap

The symlink-escape test **skips on Windows**, where creating a symlink needs
privileges this account does not have. The containment code is exercised by the
`commonpath` tests, which do run; the end-to-end symlink case is unverified here
and would run on Linux CI.
