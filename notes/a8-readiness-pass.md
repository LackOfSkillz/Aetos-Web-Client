# A8 readiness pass

Status: **COMPLETE**

Verification: 1499 Python tests OK. The readiness gate reports 38 passing and
0 failing at four viewports; axe re-run clean after the `panel.js` fix.

Gary, 2026-09-06, asked whether the two A8 testers exist. The answer was better
than either option offered:

> *"Lets test everything we can and get it as ready for testing as we are able
> to. I want it to be ready for a human tester as much as we can before I ask
> her to test."*

Which changes A8 from a **waiting state** into a **work item**. A human tester's
time is the scarcest thing this project will ever spend, and it must not go on
discovering that task 26 opens nothing.

## What was built: a gate that walks the tester's own document

`browser-qa/qa-a8-readiness.js` reads `docs/a8-tester-protocol.md` task by task
and answers one question per task: **is there something there — does it open, is
it named, does it close, and does focus come back where it started?**

Every task lands in one of four buckets, and the distinction is the whole point:

| Bucket | Count | Meaning |
|---|---|---|
| `ok` | 38 | verified working, in this browser, right now |
| `needs-session` | 13 | the destination is sound; showing real data needs a puppeted character |
| `needs-human` | 13 | judgement. Keystrokes, whether focus "jumps", whether braille loses its place |
| `FAIL` | **0** | a destination missing or broken |

**The gate is that nothing is `FAIL` when the tester sits down.** `needs-human`
is not a gap — it is the protocol working as designed, and A.95 reserves exactly
those questions for a person.

Clean at 1280×800, 1280×720, 800×600 and 390×844.

It also **puts the client back** and says whether it managed to. It changes the
mode, the contrast and the text size on the way through, and leaving any of that
behind would hand the next person — very possibly the tester — an interface they
did not choose. Reported rather than merely attempted, because "I restored it" is
a claim.

## What the first run found

Four failures. **Three were the probe being wrong, and one was real** — which is
roughly the ratio to expect and the reason a readiness pass has to be *run*
rather than reasoned about.

### The real one: `setMode("standard")` turned accessible mode ON

```javascript
var next = wanted === undefined ? !isAccessible() : !!wanted;
```

`!!"standard"` is `true`. A function named `setMode`, whose parameter is called
`wanted`, accepted the name of a mode and did the opposite.

**No player could reach it.** Every call site inside the client passes nothing
and toggles, which is how it survived A9, A10 and four milestones after them. It
was found by the first caller from *outside* the client — this gate — falling
into it on its first run, which is what an outside caller would do.

It now understands `"accessible"` and `"standard"`, still toggles on a bare call,
still accepts booleans, and **refuses anything else with `null`** rather than
guessing. `null` and not `false`, because a successful switch to standard mode
already returns `false` and a caller cannot be asked to tell those apart.

This is the recurring defect of this project wearing an API's clothes: it looked
like it worked, and did the opposite.

### The three that were my fault, and are worth recording anyway

- **A viewport of zero by zero.** The gate reported the mode switch off-screen at
  large text — measured in a hidden browser pane, where `innerWidth` is `0`. A
  result computed from a viewport that does not exist is worse than no result,
  because somebody acts on it. **The gate now refuses to run** and says to bring
  the window forward. This one matters beyond A8: any layout measurement taken
  through a hidden pane has been meaningless, and nothing said so.
- **A landmark rule stricter than the specification.** It demanded a name on
  every landmark and flagged two that need none: the sole `<header>`, where there
  is no second banner to distinguish it from, and the composer's `<footer>`,
  which sits inside a `<section>` and is not a landmark at all. The real rule is
  *uniqueness*, and being stricter than the spec produces findings a tester would
  chase and a reviewer would reject.
- **Two APIs called wrongly.** `profile.toJson()` serialises a profile it is
  handed; `exportProfile()` is the one that builds it. And every read of the
  player's own tools — macros, aliases, notes — returns a **Promise**, so the
  first draft asked whether a Promise contained a macro. Both threw, which is why
  they were found; the versions written with `||` or a truthiness test would have
  reported four features working while checking nothing.

## What was demonstrated that had never been demonstrated

The protocol's §8 said, in the repository, in writing:

> *synthetic keystrokes in our test harness do not reach the page reliably, so
> nobody has actually driven this client without a pointer.*

**That was wrong.** They reach the page perfectly well once the window has focus
— one real click establishes it, exactly as a real user's window focus would.

So the keyboard path is now walked rather than assumed: **33 focus stops, every
one with an accessible name, in a sane order, wrapping from the last back to the
first.** The command input sits immediately after the game output, which is where
a reply belongs — UI1's frame change showing up in the tab order.

What that does *not* establish is whether the journey is worth making. Thirty-
three stops is a number, not a verdict, and §8 now says so.

## The same trap, twice in one day

A guard that greps source for a forbidden construct cannot tell an explanation
from an instruction — and the explanation is usually right beside it.

- The D1 resolver test searched for `getattr(` and failed on the resolver's own
  docstring explaining why it does not use `getattr`.
- The `setMode` test searched for `!!wanted` and failed on the comment recording
  that `!!wanted` had been removed.

Twice in two files is a shape, not an accident. Both now strip comments (or
parse) before asserting. Any test of the form *"this string must not appear in
the source"* fails the moment somebody documents the fix, which is the moment it
is least deserved.

## What the tester document now says

- It opens by saying the readiness pass happened, what it proves, and — carefully
  — what it does not. *"That is deliberately not the same as saying it works."*
- §8's false claim is replaced with what is actually known.
- There is a new section telling the tester what to do if something is simply
  broken: report it in one line, because it means the gate has a blind spot, and
  that is a bug in our preparation rather than in their testing.

## Accessibility — definition of done (A.97)

This milestone *is* the accessibility work, so the usual questions land oddly.
The one that applies:

- **Does it change anything a player meets?** One thing: `setMode` now accepts
  the names of the modes. No shipped control's behaviour changed, because none
  of them passed an argument.
- **axe:** re-run after the `panel.js` change. 13 checks, 0 failures, at
  1280×800.

## What is still not ready, and cannot be made ready by me

The 13 `needs-human` items, unchanged and unchangeable: JAWS, Orca on two
browsers, refreshable braille on hardware, the cognitive scenarios, the AAC
review, and every question of the form *"was that bearable"*. A.35, A.85, A.93,
A.94 and A.101 each say so explicitly, and this pass does not weaken any of them.

The 13 `needs-session` items need a logged-in character. They are checked as far
as a logged-out client allows — the surface exists and is named — and no further.
**A pass over those with a real character is the one piece of readiness work
still outstanding**, and it needs somebody who can log in.
