# M25 -- Performance hardening

Status: **COMPLETE**

Verification: 1102 Python tests OK (up from 1085). axe clean at every severity.
Before-and-after measured live in the lab; the harness is committed as
`browser-qa/qa-performance.js` so the numbers can be taken again rather than
believed.

## The headline finding: the bound was causing the problem

The console keeps 5000 lines. That cap exists, in as many words in the original
comment, so that "unbounded output is a reliable way to make a long session
unresponsive".

`append` did three things per line: read `scrollHeight` to decide whether the
player was following the output, add a node, then write `scrollTop`. Interleaved,
a read after a mutation forces the browser to lay out the whole scrollback --
once per line. And `scrollTop = scrollHeight` over a list held at its maximum is
the most expensive possible version of that write.

So the cap kept memory flat and made latency quadratic. Measured against a full
console: **68ms per line**. A 200-line burst -- one `help`, one long room
description, one busy combat round -- froze the client for **thirteen seconds**.

That is the part worth keeping. The bound was not merely failing to help; it was
the thing making the client slow, and it was doing so while carrying a comment
explaining that it was there to prevent exactly this.

## What changed

Lines are built into a pending batch and added on the next animation frame: one
geometry read, one `appendChild` of a fragment, one `trim`, one scroll write, per
frame, however many lines arrived in it. That is the rate the screen updates at
regardless, and considerably faster than anybody reads.

Two details that are not incidental:

- **The `atBottom` measurement moved to flush time, and it is now more correct
  than it was.** It answers "was the player at the bottom when this batch
  landed" rather than "was the player at the bottom before each individual line",
  which during a burst meant the answer was recomputed from a document the
  previous line had just changed.
- **A `setTimeout` backstop runs alongside the animation frame, not instead of
  it.** A backgrounded tab runs no frames. Without the timer the lines would sit
  in memory -- not lost, the canonical log has them -- but absent from a console
  somebody may be reading in another window with a screen reader. `flush` is
  idempotent, so whichever fires first does the work.
- **A burst larger than `MAX_PENDING` (500) flushes itself synchronously.** A
  rAF-only batch has an obvious failure mode: an environment where frames never
  run and the batch grows without limit. This is also the path that works where
  `requestAnimationFrame` does not exist at all.

### The second defect: the history widget redrew per event

`pipeline.observe("presentation", ...)` called every registered history
refresher for every event. A refresh filters the **entire** canonical log -- up
to 5000 events, each with a substring test when a search is active -- and
rebuilds a page of DOM.

Same shape as the console defect: per-line work whose cost was set by how long
the player had been playing. Coalesced to once per frame.

**Not skipped when the widget is hidden**, though that would save more. The
layout has no "became visible" signal to redraw on, and a widget that quietly
stops updating with no way to be told to start again is a worse bug than the one
being fixed. Recorded here rather than done.

### The third: 55 render-blocking scripts

Every one of the client's 55 scripts sat in `<head>` with no `defer`. The body
was not parsed and nothing was painted until all of them had downloaded and run.
On localhost that was 390ms of a 730ms startup; on any connection with real
latency, with six connections per host against 55 files, it is most of the
startup.

All of them now carry `defer`. **`defer`, not `async`**: execution order is
load-bearing -- the accessibility subsystem must exist before anything that
announces -- and `async` explicitly does not preserve it. The inline script that
defines `wsurl` and `cuid` stays as it is; inline scripts run at parse time,
which is before every deferred script.

After the change the document reaches `domInteractive` *before the last script
has finished downloading*, which is the structural point and does not depend on
the machine.

I could not measure a throttled cold load in this browser pane, so the startup
improvement is stated as an ordering change rather than a number. Recorded as
such rather than quoting a cached-load figure that would flatter it.

## Numbers

Driving real events through the real pipeline -- canonical log, automation,
display rules, console -- rather than calling `append` directly, so that cost
moved between stages would still show up.

```text
                          before      after
200 lines, empty log       520ms     27-37ms
1000 lines              10 005ms       150ms
200 lines after 1200     3 824ms     43-46ms
per line at the cap       68.2ms  0.28-0.73ms
```

Some growth with scrollback length remains and is expected: laying out a
5000-node list costs more than laying out an empty one, and trimming the
overflow is real work. What is gone is growth of the old kind, where the cost of
a line was set by how long the session had been running.

Behaviour verified unchanged: output still pins to the bottom when the player is
following it, and still does *not* yank the view when they have scrolled up to
read.

## What I did not do

- **No virtualised scrollback.** It would let the cap rise, but it breaks native
  find-in-page and text selection across the boundary, and both matter more to
  this client's users than a longer scrollback does.
- **No minification or bundling.** Core-only dependencies (§ constraints); a
  build step is exactly what Aetos does not have. `defer` gets most of the
  benefit with none of the cost.
- **No visibility gating of widget redraws**, as above.

## Accessibility -- definition of done (A.97)

- **Keyboard-findable / operable:** no new controls.
- **Accessible name:** unchanged.
- **Announces?** Nothing new. The console remains `role="log"` with
  `aria-live="off"`, so batching changes nothing about what is spoken -- the
  announcer is a separate channel and was not touched.
- **Steals focus?** No.
- **Colour alone?** Not applicable.
- **axe:** clean at every severity.
- **Human AT testing:** at A8. One question for it: whether batching to a frame
  changes how a screen reader's own review cursor behaves when it is parked in
  the console during heavy output. My expectation is that it improves it --
  fewer, larger mutations -- but that is a prediction, not a result.

## Lab hazard addendum

`navigate` to a URL the pane already has loaded does not reload it. Two
measurements were taken against stale code before I noticed, and both looked
like "the fix does nothing" rather than like a tooling problem -- which is the
dangerous shape. Forcing `location.href` with a unique query string is reliable.
Added to `notes/lab-hazard-001-test-suite-vs-live-server.md`.
