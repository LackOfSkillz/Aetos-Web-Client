# D6 — Hardening, documentation and validation

Status: **COMPLETE**. The D-track is finished.

Verification: 1774 Python tests OK (1749 → 1774: 25 new in
`test_discovery_hardening.py`), 386 browser accessibility checks OK — re-run
because D6 edits a client file. Five deliberate breakages of the new
documentation guards, all caught. `black` and `isort --profile black` clean.

The stage with the least new code in it. What is here is the set of tests that
say the D-track is a supported developer API rather than six stages that each
passed their own gate.

## The documentation defect D6 was for

The in-client help (F1 → For game developers) showed **the wizard's screen under
`evennia aetos discover`** — which is the one-shot report. The walkthrough is
`evennia aetos setup`. Its labels were wrong too: `Current:` where the wizard
prints `Value:`, and a choice line that no longer matched.

That text was written when the wizard was a plan. It described the thing
accurately and named the wrong command, which is the most expensive kind of
documentation error: a developer types what it says, gets a different screen,
and stops trusting the rest of the page.

**So documentation that names a command is now checked rather than trusted.**
Every `evennia aetos <word>` in the README and in the in-client help must be a
subcommand that exists, and the walkthrough example must sit under the command
that walks. Both fail if the other drifts.

## B.50: the learning path is inverted

The README taught providers first: *"For anything more, you write a provider."*
That was true when it was written and stopped being true at D1. It now opens
with four levels, and most games stop at the second:

| Level | What you write | When |
|---|---|---|
| 0 | nothing | a stock game already works |
| 1 | `AETOS_BINDINGS` | the value is on the character |
| 2 | `AETOS_UI` | rename, reorder, thresholds |
| 3 | a provider class | it has to be calculated |

Providers are now *"advanced, for values a setting cannot name"*, and there is a
test that the bindings section precedes them and that the providers heading says
so.

## B.51: runtime and tooling are different claims

*"Aetos never scans or guesses your game model during play"* became ambiguous
the moment a development-time inspector existed. Replaced with the addendum's
wording, which separates the two:

> The Aetos Web Client never guesses, scans, or assumes your game's data model
> **during gameplay**. You explicitly bind game data to Aetos fields or supply a
> provider. The optional server-side Aetos Discovery tool can inspect your game
> **during development** and suggest those bindings for you.

## The tests that close the track

- **Fresh Evennia (B.64)** — the critical genre-neutrality test, end to end: a
  pristine game yields nothing in every slot, the report says so in words, and
  the zero-configuration providers still answer. "Found nothing" and "broke
  everything" look identical from inside a discovery test unless the second half
  is asserted.
- **A game that is not fantasy (B.65)** — a ship's source with
  `hull_integrity`, `oxygen` and `reactor_output` goes through the real scan and
  pairs all three, and a second test reads the pairing modules and fails if a
  fantasy stat name has appeared in either.
- **A large project (B.63)** — 300 files over the ceiling: bounded, finished,
  and the note says how many were not scanned. A deep tree stops at the depth
  limit, and the file order is stable between runs.
- **Error messages (B.11)** — every refusal in the grammar is a sentence of more
  than four words, contains no regular expression or traceback, and names what
  to do instead. `AETOS_BINDINGS` is the setting for somebody who did not want
  to write Python.
- **Generated code (B.43)** — parses, double quotes, four-space indents,
  trailing commas, one final newline, no line over 99 characters. It cannot be
  checked with `black` here, because the contrib depends on Evennia and the
  standard library only, so the properties `black` would enforce are asserted
  directly.
- **Privacy (B.52)** — discovery adds no models and no migrations, exactly one
  file in the package opens anything for writing, and nothing in it calls a
  writer on a model, handler or queryset.

## A test of mine that was too blunt to be true

The privacy test first searched for `attributes.add(` as text, and failed —
because `static_scan` *documents* the `attributes.add("hp", 100)` form it
recognises. A substring search cannot tell a sentence about a call from a call.
It now asks the syntax tree: a `Call` whose function is a writer, on a receiver
that names a model, handler or queryset.

The same shape as the project's older lesson about comments: **a claim in a
comment is not a property of the code, and a string in the code is not a call.**

## What the D-track now is

```text
LEVEL 0   nothing              a stock game                 (M4-M16)
LEVEL 1   AETOS_BINDINGS       "my health is at db.hp"      (D1, D2)
LEVEL 2   AETOS_UI             names, order, thresholds     (M23)
LEVEL 3   a provider class     calculated values            (M4-M16)

evennia aetos discover   reads the game and suggests bindings   (D3, D4)
evennia aetos setup      walks them, tests each, generates      (D5)
```

**Gate met:** bindings and Discovery are documented, tested public developer
APIs. The README teaches them in the addendum's order, the in-client help
matches the commands that exist, and both are guarded by tests.

## Not done, and deliberately

- **`evennia aetos apply`** — writing into `settings.py`. B.47 puts it out of
  scope until discovery has proven stable, and it needs its own specification:
  backups, diff preview, idempotency, rollback.
- **Running `black` over generated output in the test suite.** It would make the
  contrib depend on a formatter to prove a property, and the property is
  checkable without it.
- **The symlink-escape tests still skip on Windows**, where this account cannot
  create one. They would run on Linux CI, and the containment logic is exercised
  by the `commonpath` tests either way.

## Accessibility — definition of done (A.97)

The tooling half is server-side with no player interface. The one client-facing
change is the in-client developer help text, which is ordinary prose in the
existing help widget: same headings, same landmarks, same keyboard path, and it
re-ran the browser accessibility suite (386 checks) rather than assuming a text
edit could not break one.
