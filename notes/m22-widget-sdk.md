# M22 -- Widget SDK

Status: **COMPLETE**

Verification: 1000 Python tests OK (up from 973). Failure isolation, the
version check and the inspector's report of switched-off widgets all exercised
live against deliberately hostile widgets.

Addendum C.20, plus A.28 for the accessibility half that shipped at A1.

## What was actually missing

C.20 lists six things: a versioned contract, declared identity, declared
subscriptions, declared accessibility metadata, a clean lifecycle, and failure
isolation.

Four of those shipped at M6 and A1. M22 added the version and the isolation,
and wrote the document — because "SDK" means a contract somebody outside this
repository can build against, and a contract nobody has written down is a set of
behaviours that change without notice.

## The defect: one bad widget took every widget after it

`definition.mount(context)` was unguarded, and widgets are mounted in a loop:

```javascript
registry.available(manifest).forEach(function (def) {
    layout.add(def.id);
});
```

So a game-authored widget throwing during mount aborted the loop, and **every
widget registered after it silently never appeared**. The client came up
half-built with nothing to say why.

Demonstrated in the lab before fixing it, rather than argued from the code:

```text
outcome:  LOOP ABORTED at first failure: mount exploded
mounted:  ["boom1"]              <- after1 and after2 never ran
broken widget left in layout:    (empty panel, no explanation)
```

That last line is its own problem. The half-mounted widget stayed in the layout
as a blank panel — and an empty panel is indistinguishable from a widget with
nothing to show. A player looking at a blank inventory cannot tell whether they
are carrying nothing or looking at something broken.

C.20's requirement is precise: *"catch, disable the widget, log, show a
recoverable placeholder, preserve the others."* None of the five held.

## What it does now

All five, verified live:

```text
outcome:            loop completed
mounted:            boom, after1, after2
survivors rendered: after1: mounted fine / after2: mounted fine
placeholder:        "boom stopped working and has been switched off.
                     The rest of the client is unaffected. Reason: mount exploded"
retry button:       yes
disabled:           [{id: boom, phase: mount, message: mount exploded}]
diagnostics:        1 recorded
```

A **mount** failure disables immediately: a widget that could not build itself
has nothing to retry with. **Update** failures are allowed three, because one
bad sync should not permanently cost a player a panel — but a widget failing
every update is not going to recover and its errors drown everything else.
Traced live:

```text
priming  1 failure   still running
set 1    2 failures  still running
set 2    3 failures  DISABLED
set 3-5  no further calls
```

Its subscriptions are released when it is disabled, so it stops consuming
events rather than failing invisibly forever.

`Try again` remounts from scratch rather than resuming, because whatever state
the widget had when it broke is exactly the state that broke it. Verified with a
widget that fails once and succeeds after: *"recovered on attempt 2"*.

Failures reach the diagnostic report, so a bug report carries which widget broke
and in which phase — otherwise the only record is a console line the reporter
has already scrolled past. The inspector lists them too, because a failed
widget's own panel says so only if you happen to be looking at that panel.

## BUG found while testing: the store's test seam delivered once

Writing the update-failure test surfaced a latent bug in the store.

```javascript
if (frameHandle !== null) { return; }
frameHandle = schedule(flush);
```

That conflates *"a flush is pending"* with *"the scheduler returned a
cancellable handle"*. `requestAnimationFrame` returns a number, so it worked in
a browser. An **injected** scheduler that runs synchronously returns
`undefined`, and `undefined !== null` is true — so every flush after the first
was silently skipped.

The injectable scheduler exists precisely so update behaviour can be tested
without animation frames, which a backgrounded browser does not run at all. A
seam whose whole purpose is testability, delivering exactly one update and then
going quiet, is a bad failure: it makes tests that *look* like they exercise
something exercise nothing.

Fixed with a separate `flushQueued` boolean. It took twenty minutes to find
because the symptom — "the widget stopped receiving events" — is exactly what a
correctly-disabled widget looks like.

## The versioned contract

`SDK_VERSION = 1`, optionally declared by a widget, checked at registration:

```text
sdkVersion 2  ->  "newer than this client supports (1) -- update Aetos"
sdkVersion 0  ->  "older than this client's contract (1) -- see docs/widget-sdk.md"
```

Optional because every widget Aetos ships omits it and none should have to
change when the number moves. Worth declaring for a game-bundled widget, because
such a widget outlives the Aetos release it was written for — and the failure it
would otherwise produce is a mount error in somebody else's game months later,
with nothing pointing at the cause. Declaring it turns that into one sentence
naming both numbers.

The version bumps only for a change that breaks a widget written against the
previous one. Adding an optional field does not bump it.

## No plugin marketplace, and that is not a gap

C.20 is explicit and I agree with it. Downloading and executing third-party
JavaScript brings code trust, supply chain, signing, update and sandboxing
problems, and the failure mode is remote code execution — in a client whose
entire security posture is that it asks for nothing the game did not offer.

A test asserts the widget layer contains no `import()`, no injected `<script>`,
no `eval`, no `new Function` and no `fetch`.

## The document is half the milestone

[`docs/widget-sdk.md`](../docs/widget-sdk.md). A contract nobody has written
down is a set of behaviours that change without notice, and "SDK" means
something a developer outside this repository can build against.

It covers the shortest working widget, the accessibility contract and why
registration throws without it, the lifecycle, subscriptions, capabilities,
sending commands, failure isolation, the version, and a pre-ship checklist.

It also carries the four accessibility mistakes this client has actually made,
stated as things not to repeat: an unfocusable scrolling region (four times), a
`role` on a `<ul>` that orphaned its items (twice), a second live region
competing with the transcript, and colour used as the only signal. Those are
more useful to a widget author than the rules they violate, because they are the
ones that look correct while being wrong.

## Accessibility -- definition of done (A.97)

- **Keyboard-findable / operable:** the failure placeholder's `Try again` is an
  ordinary button in the tab order.
- **Accessible name:** the placeholder names the widget that failed.
- **Announces?** Once, at `important`, when a widget is switched off. A panel
  that quietly turns into a paragraph is a change somebody using a screen reader
  would otherwise never notice.
- **Steals focus?** No.
- **Colour alone?** No — the placeholder uses the danger colour, but the
  sentence carries the meaning on its own.
- **axe:** unchanged; no new surface beyond the placeholder, which is two
  paragraphs and a button.
- **Human AT testing:** at A8. The open question is whether "switched off" is
  the right phrase or whether it sounds like the player did it.

## Not built here

No hot reload of widget code, and no sandboxing of widget JavaScript. Both are
real capabilities and both belong to the marketplace problem C.20 rules out: a
widget already runs with the client's full privileges because a game's own
developer put it there, and pretending otherwise with a partial sandbox would be
worse than being clear that it is not one.
