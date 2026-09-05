# E0 -- Formal event pipeline contract

Status: **COMPLETE**

Verification: 534 Python tests OK (up from 508). axe clean. Gate proven live
against a deliberately hostile presenter.

First stage of the E-track. **Blocks M17**, and does.

## What was built

```text
static/aetos/js/events/
├── canonical_log.js    what happened, before anyone decided how to show it
└── pipeline.js         the order, made enforceable
```

```text
validate → normalize → state → log → automation → presentation → announce
```

## The ordering change, and why it was not already right

Before E0 the text path was:

```javascript
emitter.on("text", function (args) {
    consoleWidget.append(payload);   // presentation
    triggers.onText(...);            // automation
});
```

Presentation first, automation second. That worked -- but only because nothing
yet transformed text on its way to the console.

The moment E2 adds display filters, that order means **a filtered line never
reaches the trigger that was watching for it**. The player hides combat spam and
their flee trigger silently stops working, and the connection between the two is
invisible: an automation broken by an unrelated display setting, with no error
anywhere.

That is the single most common bug in clients that treat gagging as deletion,
and it is why C.24 puts E0 before M17 rather than after. Fixing an ordering
assumption is cheap now and expensive once the canonical log, Review Mode and
four kinds of display rule are built on top of it.

## The gate, proven rather than promised

> A presentation filter cannot alter state, canonical history, or trigger input.

Enforced by handing every reader stage a **copy**:

```javascript
runStage("automation", copyFor(event));
runStage("presentation", copyFor(event));
runStage("announce", copyFor(event));
```

Verified live with a presenter that deliberately rewrites the text, changes the
category and injects structured data:

```text
canonical text intact              ✓
canonical category intact          ✓
automation saw canonical text      ✓
returned event intact              ✓
log immune to reader mutation      ✓
```

A copy is cheap and it is the whole mechanism. The alternative -- trusting every
future widget author to remember not to mutate what they were handed -- is not a
guarantee, it is a hope with a test suite.

## Only one thing writes state

`observe("state", ...)` and `observe("log", ...)` **throw**. Those stages have
exactly one implementation each, and letting a game register a second writer to
authoritative state is precisely what this file exists to prevent.

Everything after `log` is a reader. That is not a convention; it is the
registration API refusing.

## Announcements are independent of presentation (C.10)

The announce stage runs from the canonical event, not from whatever the console
decided to display. A line hidden from view is still announced if the player's
announcement settings say it should be.

Those are two different decisions and conflating them means a visual preference
silently degrades an accessibility one -- a player who hid combat spam and then
needs to know what killed them must still be told.

## Failure is contained

An observer that throws costs its own stage and nothing else. Verified: a
presenter that threw did not prevent the announce stage from running, and did
not corrupt the record.

The reason is not tidiness. A defect in a decorative third-party widget must not
silently disable an accessibility feature somebody depends on.

## The canonical log

Bounded at 5,000 events, in **one** constant -- the number is a guess until
somebody profiles a real session, and a guess repeated in five files is a guess
that can no longer be corrected in one place.

Readers get copies. A reader that could mutate the record by holding a reference
will eventually do so, and the resulting bug is untraceable: the record is
simply wrong, with nothing to say when it changed.

Evicted events are **counted**, not silently discarded. A player who scrolls to
the top of their history is entitled to know the history does not start there.

Ids keep counting across a `clear()`. Reusing them would let a stale reference
resolve to a *different* event, which is worse than a gap in the numbering.

M17 builds the reading surfaces -- paging, search, filtering, Review Mode. E0's
job was only to establish that the record exists and that nothing downstream can
rewrite it.

## Deliberately not extensible

The pipeline is not a general event bus and a game cannot add a stage. The order
*is* the contract, and a third-party stage between state and automation would
break the only guarantee the module exists to make.

## Degradation

If `pipeline.js` fails to load, the console still renders and triggers still
fire, in the fallback path's own state-before-automation order. Losing the
ordering guarantee is bad; losing the game output is worse.

## Accessibility -- definition of done (A.97)

Mostly not applicable: E0 adds no interface. What it does add is structural
protection for two accessibility properties that were previously only
conventions.

- **Announces?** It routes announcement candidates; the announcement manager
  still decides. No new live region.
- **Steals focus?** No; no DOM at all.
- **Preserves review position?** This is the milestone that makes review
  position *possible* -- a canonical record is what Review Mode reviews.
- **Independent of visual filtering?** Yes, and now provably. That is C.10, and
  it was the requirement most at risk of being lost when display rules land.
- **axe:** clean (unchanged; no interface).
- **Human AT testing:** not for E0 itself. E1's capture and replay is what makes
  the announcement behaviour built on this testable at all.
