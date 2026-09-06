# D0 — Discovery architecture spike

Status: **COMPLETE**

Verification: 65 new tests, 1421 total, all passing. `evennia aetos discover` run
against the lab game and returning its two demo attributes with evidence from
both scans.

D0's job is to settle four things and prove two. The four are the entry point,
the package boundary, the candidate model and the security model; the two proofs
are that a game's source can be read without importing it, and that a live
Character can be inspected. D1 builds the resolver against these decisions and
D2 the declarative providers.

## The open question, answered: `evennia aetos discover` works

`questions.md` 4 flagged this as a promise the README was already making and that
might not be keepable. It is, and without extending Evennia at all.

Evennia's launcher handles a fixed list of operations itself and passes
**everything else to Django's management-command dispatch with the command line
intact**. So a management command named `aetos` in an installed app *is*
`evennia aetos`, and Aetos is already an installed app — it has to be, or none of
its templates or static files load. No settings entry, no launcher patch, no
change upstream.

Proved before anything was designed around it: a five-line probe command printed
`PROBE OK subcommand='discover'` on the first try.

### One trap worth recording

Evennia does have a real extension hook, `run_custom_commands`. Its **docstring
names the setting `CUSTOM_EVENNIA_LAUNCHER_COMMANDS` while its code reads
`EXTRA_LAUNCHER_COMMANDS`.** Following the documentation gets you nothing, and it
fails silently: the missing attribute is caught, the hook returns `False`, the
command falls through to Django, and Django reports an unrelated "unknown
command". Not the route taken here, and written into `management/commands/aetos.py`
so the next person does not spend an hour on it.

## Two scans, and neither is optional

Evennia attributes are **database rows, not class members**. `caller.db.reputation = 0`
typed once in a command creates an attribute that exists on every character
afterwards and appears in no typeclass.

- **Static** (`ast.parse`, no imports) sees what somebody wrote. It works on a
  brand-new game with no characters, and on a game whose code is mid-edit.
- **Runtime** (read-only, capped sample) sees what actually exists. It sees the
  attributes no source mentions.

A new game has source and no characters. A game that sets everything from
commands has characters and nothing in its typeclass. Each candidate records
which scan found it, and one found by both says so.

## The security model, which is most of the work

Every plausible way to make discovery *more capable* makes it less safe, and each
one has a test saying no:

| Tempting | Why not |
|---|---|
| Import the typeclass and use `dir()` | Importing runs module-level code: a connection, ten seconds, or a raise on a game mid-edit. The whole static scan is `ast.parse` on text. |
| Evaluate the right-hand side to learn the value | That is `eval` on the game's source. The kind stays `unknown`; the runtime scan answers it instead. |
| Follow the symlink | Developers symlink `world/` at a shared checkout. Discovery would report another project's source as this game's. |
| Write the settings block out for them | A tool that edits settings.py has to be trusted before it is understood. It prints. |
| Create a character to inspect when none exist | It would leave an object in the game. It says "no characters exist yet" instead. |
| Read `server/conf/settings.py` | The one file a scan obviously wants, and the beginning of a tool that edits it. |

Containment is checked **after resolving, not before**: `os.path.join(gamedir, "world")`
looks contained no matter where `world` leads. And `commonpath` rather than
`startswith`, because `startswith` says `/game-backup` is inside `/game`.

There is no player-facing surface at all — no inputfunc, no manifest key, no
protocol message — and a test asserts the discovery package imports none of the
client. The easiest version of this feature to build by accident is one where a
player can ask the server to enumerate its own internals.

## The grammar is the security boundary of the whole D-track

`AETOS_BINDINGS` is written by the game's own developer, so this is not a defence
against a hostile author — somebody who can edit settings.py can already run
anything. It is a defence against **the resolver becoming an expression
evaluator**, which is what happens the first time somebody adds "just method
calls" to make one game work. Every addition looks small and the sum is `eval`
with extra steps.

Two forms, nothing else:

```text
db.<name>
db.<name>.<name>
```

Method calls, subscripts, arithmetic, dunders and statements are each excluded
with the reason written down, and Addendum B.59's list has a test entry each.

### The grammar shipped with the hole it exists to prevent

The first pattern was `^db\.[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)?$`
— anchored at both ends, which is the mistake I was watching for.

**It accepted `db.__class__`.** A dunder *is* an identifier: it starts with an
underscore and continues with word characters, so an identifier whitelist admits
every one of them, and `db.__class__` is the first step of every
attribute-traversal escape there is.

Caught by the test written from B.59's list on the first run. Each segment now
carries `(?!__)`; a single leading underscore stays allowed, because
`db._internal` is an ordinary attribute name a game may want on screen.

That is the second time in this project a rule read as a guarantee and did
nothing, and the first time a test caught it before a person did.

## A second thing that read as a guarantee

`MAX_DEPTH = 2` bounded the walk one level deeper than it claimed. Depth was
counted in **separators** rather than path components, so `world/a` was depth 0
and everything below it was off by one — the scan reached `world/a/b/c` while the
constant said it stopped at `world/rules/melee`. Found by walking a four-deep
tree and looking at the result, not by reading the code.

## The candidate model

A **candidate** is evidence for a decision the developer has not made yet, not a
binding. Four things it must carry:

- **The expression**, already in the grammar. Printing `hp` and leaving the
  developer to write `db.hp` moves the error rather than removing it.
- **Where it was found** — `world/aetos_demo.py:40`, or `on 4 of 4 characters
  sampled`. The first thing anybody does with a generated settings block is check
  one line of it, and a suggestion with no provenance cannot be checked.
- **Which scan found it.** A static hit is a line somebody wrote; a runtime hit
  is a value that exists right now and may be a leftover.
- **A partner, when there is one.** `db.hp` alone is a number; `db.hp` with
  `db.hp_max` is a health bar, and finding the pair is most of discovery's value.

**Pairing runs after both scans**, because the pair can be split between them —
`hp` in the typeclass and `hp_max` set from a command is an ordinary way for a
game to end up.

**Pairing is by structure, never by a name list.** A game with `db.oxygen` and
`db.oxygen_max` wants a bar as much as one with `hp`, and a list of English
resource words is a guess about somebody else's game that is wrong in every other
language. There is a test that no such list appears.

Confidence is **words, not a number**. "0.7" for a runtime hit and "0.8" for a
static one implies the difference is 0.1 of something.

## The output is the product

What is printed is a settings block in the exact shape `AETOS_BINDINGS` takes,
with the evidence beside it as comments, and there is a test that parses the
output and `literal_eval`s it to the dictionary it claims — so "correct if
pasted unchanged" is measured rather than intended. (Parsed and `literal_eval`ed
rather than `exec`ed: a test that executed generated output would pass on output
that also did something else.)

**The label is the one field discovery invents**, and the report says so once. A
comment on every line is noise, and noise is what gets pasted without reading.
`hp` becomes `"Hp"` and not `"Health"` — expanding it would be a guess that is
right often enough to stop people checking.

## Accessibility — definition of done (A.97)

Discovery has no user interface. It is a terminal command a developer runs, its
output is plain text with no colour, no box drawing and no cursor addressing, and
it has no player-facing surface at all. There is nothing here for a screen reader
to get wrong that is not already the terminal's job.

Recorded rather than skipped, because "not applicable" is a claim and this is
what makes it one.

## The command ships before the thing it configures, and says so

Discovery prints an `AETOS_BINDINGS` block. **Nothing reads `AETOS_BINDINGS`** --
the resolver is D1. So the tool as it stands hands a developer a settings block
that will do nothing when pasted, which is precisely the "a control that appears
to work and changes nothing" defect this project keeps finding, except that this
time the project would have generated it for them.

Two things answer it, and neither is documentation nobody reads at the moment it
matters:

- **The command says so in its own output**, above the block, every time.
- `report.BINDINGS_ARE_LIVE` is a constant, so the day D1 lands there is one
  obvious thing to flip and the paragraph disappears.

The README was updated in the same pass. It had a "Not yet built: bindings and
discovery" note that was now half wrong, and half-wrong documentation is worse
than the version that was simply behind.

The M28 test that guarded the old state -- *"`evennia aetos discover` was in the
README as a working command; there is no management command in this contrib at
all"* -- inverts rather than being deleted. Its purpose survives unchanged: the
README may not document a command that does not exist.

## Not built here

- **No `--typeclass` argument.** A game whose characters use several typeclasses
  under-reports at runtime. The fix belongs with D1, once there is something to
  bind.
- **No comparison with existing settings.** Discovery does not read settings.py,
  so it cannot say "you already have this". The developer is looking at both.
- **No resolver.** Nothing here turns an expression into a value; that is D1, and
  the security tests there are its substance.
