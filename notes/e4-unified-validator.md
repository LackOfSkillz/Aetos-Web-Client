# E4 -- Unified validator

Status: **COMPLETE**

Verification: 667 Python tests OK (up from 637). Every check verified live
against real automation.

## Why one validator and not six

Six would give six different answers to the same question. A regular expression
that is dangerous in a trigger is dangerous in a display rule, and a player who
has been told so once should not have to discover it again in a different dialog
with different wording.

One severity model, one set of regex bounds, one place to fix a message.

## It validates by running the real compiler

Script checking calls `AetosScripting.compile` -- the same compiler the
interpreter uses -- rather than approximating it.

A validator with its own idea of the grammar is a second grammar, and the two
will disagree eventually, always in the direction of accepting something that
then fails at runtime. Asserted by a test: `validator.js` contains no
`tokenize`, no `parse` and no interpreter.

## Unknown functions are found by walking the AST

Call nodes carry `{type: "call", name, line}`, so the check resolves real calls
rather than scanning text.

The payoff is visible in one case:

```text
definitelyNotAFunction()               -> warning, names the function
echo("call bogusFn() yourself")        -> no warning
if resource("health") < 0.3 then
  bogus(1)
end                                    -> warning, found while nested
```

A textual scan would have flagged the string. The walker is deliberately
structure-agnostic -- it walks whatever the parser produced rather than assuming
a shape -- because an AST change that silently stopped the check from finding
anything is how this sort of validation usually dies.

**A warning, not an error.** The known list is what *this* client supplies. A
script written against a newer Aetos and pasted into an older one should warn,
not be refused.

## Severity is a contract

```text
ERROR    structurally invalid. Save refused.
WARNING  legal and suspicious. Save proceeds; the player was told.
INFO     an interpretation worth stating, so nothing surprises later.
```

The distinction matters most for WARNING. A validator that refused everything it
disliked is one that players route around, and the player frequently knows
something it does not -- their game's rules, their own intent, a pattern that is
expensive but rare.

## What it refuses to claim

Static validation cannot prove a script does what the player meant, and cannot
prove one terminates. So it says so, explicitly, in an INFO on every script:

> Checked for syntax and known functions only. Whether the script does what you
> meant is something only running it will tell you.

A validator that says "looks fine" about something that then hangs the tab has
damaged the player's trust in everything else it says. The same reasoning shapes
the regex warnings: there is no complete detector for catastrophic backtracking,
the code says so in a comment, and that is *why* the finding is a warning while
the length bounds do the actual protecting.

## Messages that name the fix

```text
"tell hi" as an alias   -> "An alias replaces the first word only.
                            \"tell hi\" contains a space, so it would never match."
timer every 0.5s        -> "An interval under one second would flood the server.
                            Most games treat that as an attack."
timer every 5s          -> "Check your game's rules on automation before
                            leaving it running."
alias tt -> tt hello    -> "Aliases are not re-expanded, so this sends the same
                            word back to the game rather than looping."
```

That last one matters: saying it *would* loop would be a lie, and would teach
the wrong model of how aliases work.

## Whole-profile validation

"Validate automation" checks every trigger, alias, timer, script, display rule
and macro at once, reports counts per kind, and **names the offending items**. A
count without a location is a chore, not a report.

Entirely local. The dialog says so -- the player's automation lives in their
browser precisely so it stays there, and a validator that phoned home to check a
regular expression would be an odd exception to that.

## BUG: created before the engines it consults

`validator` was first created near the top of `boot()`, but it takes the six
engines **by value** and every one of them is defined later. `var` hoisting made
that silent rather than fatal: it would have captured six `undefined`s and
reported "0 items checked" forever.

Caught before shipping this time, by checking the line numbers rather than
assuming -- which is the difference between this and the four previous instances
of the same family. Guarded by a test asserting the validator is created after
every engine it names.

## BUG: engines disagree about being synchronous

`engine.all()` returns a Promise for the storage-backed engines and an array for
the in-memory ones. `validateAll` assumed arrays and threw.

Fixed by resolving the difference in one place rather than requiring every
engine to change -- and then fixed *again*, because coercing only the
synchronous branch left a promise resolving to a non-array to reach the loop and
throw there, a long way from the engine that caused it. Both branches now
coerce, and so does the consumption point.

Worth keeping: when normalising a difference between callers, normalise at every
point the value can arrive, not the first one that failed.

## Accessibility -- definition of done (A.97)

- **Keyboard-findable / operable:** a palette command opening a dialog; results
  are a labelled, focusable list.
- **Announces?** Yes, once, on completion -- "3 problems found" or "Everything
  checks out." Not per finding, which would be a flood.
- **Colour alone?** No. Severity is the word `ERROR` or `WARNING` in the text,
  not a tint.
- **Steals focus?** No.
- **Cognitive load?** Reduced: one action replaces opening six editors to check
  whether anything is broken.
- **axe:** clean.
- **Human AT testing:** yes, at A8. The open question is whether the findings
  read usefully when there are twenty of them -- a list that is technically
  complete and practically unreadable is a failure a machine will not report.
