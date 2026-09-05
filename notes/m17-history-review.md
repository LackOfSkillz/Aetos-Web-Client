# M17 -- Rich chat, event history and Review Mode

Status: **COMPLETE**

Verification: 593 Python tests OK (up from 560). Flood control, Review Mode and
history filtering all verified live.

Absorbs A4. Built on E0's pipeline and canonical log, which is why those came
first.

## What was built

```text
protocol.MSG_EVENT / state.push_event   a game may categorise its own output
accessibility/announcer.js              burst aggregation (A.16)
events/review.js                        Review Mode and channel navigation
history.js                              filterable, searchable transcript
```

## Categories come from the game, never from guessing

The tension worth naming: A.11 wants categorised events, and C.6 forbids
guessing. Both hold, because **the game says**.

Aetos cannot tell a tell from a shout by reading the words. Any regex that tried
would be wrong on every game that phrases things its own way -- which is all of
them, since phrasing is most of what distinguishes one MUD from another.

So `push_event(session, text, category="tell")` exists, and a game that never
calls it is not punished: its output arrives as "other", search and review by
time still work, and only review *by channel* is unavailable. A test sweeps the
client for text-matching that would infer a category.

An unknown category becomes "other" rather than being rejected. A typo should
cost the categorisation, not the message.

## Flood control (A.16)

A browser cannot know when a screen reader has finished speaking. There is no
event for it on any platform. So Aetos does not attempt to synchronise against
speech -- it counts.

```text
first 2s of a burst   spoken individually
then                  "Heavy activity. 21 chat events."
a tell mid-flood      "Renn says: hello."          <- never aggregated
after quiet           "Activity settled. 15 chat events. A bird sings."
later                 "All quiet now."             <- verbatim again
```

What is dropped is the *reading aloud* of each line, never the line. Every one
is in the transcript and the history. And speech is serial: a queue growing
faster than it drains does not inform anybody, it means the player hears a
minute-old message and cannot interrupt it.

**Tells and critical messages bypass aggregation.** Someone speaking to you
directly is the thing you most need to hear during a fight, and precisely what a
naive rate limiter buries.

## THREE BUGS IN MY OWN FLOOD CONTROL

All found by testing, none by reading.

**"Heavy activity. 1 chat event."** `lastSummaryAt` started at zero, so the
interval had already elapsed and the very first suppressed event tripped a
summary of one. Both useless and faintly absurd. The clock now starts when
aggregation starts.

**A burst that never ended.** I pushed the current event into the rate window
*before* testing whether the window was empty -- which it therefore never was.
The consequence was that a message minutes after a fight was still announced as
"heavy activity". Now the window is pruned and counted before the current event
joins it.

**A summary silently overwritten.** The end-of-burst summary was written to the
live region, and then the message that ended the burst was written to the same
region in the same tick. A live region only announces its latest text, so the
summary vanished without trace. It is now carried and prefixed onto that
message: *"Activity settled. 15 chat events. A bird sings."*

The third is the interesting one, because the code looked right and the region
contained the right thing at two separate moments. Only the sequence was wrong,
and only a test that read the region after each step could see it.

## Review Mode (A.17)

Entering pauses low-priority announcements and holds the reading position.
Leaving **summarises rather than replaying**:

> "Resumed. 2 events occurred while reviewing: 1 combat event, 1 tell."

Reading seventeen held announcements in a row is worse than the interruption
they were held to avoid. The client reports; the player chooses.

The summary counts from the **canonical log**, not the announcement queue, so it
counts what *happened* rather than what would have been *spoken*. A player who
has muted combat still wants to know a fight occurred.

Critical still gets through. Review is not a mute -- somebody reading their
combat log should still be told the connection dropped, because everything they
are reading just became potentially stale.

Navigation is by channel (A.18): previous/next tell, chat, combat, system, plus
latest and search. Running out says so, because a key that appears not to work
is worse than one that explains itself.

`Ctrl+Shift+R`, deliberately not `Ctrl+R` -- which reloads the page and would
lose the very session being reviewed.

## The history widget

Reads the canonical log rather than the console, so it shows what happened
rather than what is currently displayed. That distinction becomes load-bearing
at E2: a line filtered out of the console is still here, because hiding is a
display choice and this is not the display.

**Paged, not virtualised.** A.12 forbids virtualisation that evicts a focused or
reviewed node, and the simplest way to honour that is not to virtualise. A
hundred rows renders instantly and nothing can be evicted from under a reader
because nothing is evicted.

The channel is a word, not a colour -- the player most likely to be reading
history rather than the console is the one least able to rely on a tint.

**Driven by events, not by state.** Subscribing to a store section would have
been the easier wiring and the wrong one: the history would redraw when *state*
changed rather than when an *event* arrived, which are different things and only
coincidentally correlated. It registers a refresh hook the shell drives from the
pipeline instead, throttled to 250ms, because a history that stutters during a
fight is a history nobody reads during a fight.

## Lab hazard: background tabs throttle timers

My first flood-control test drove a burst with `setTimeout` at 100ms and timed
out repeatedly. The browser pane was hidden, and background tabs clamp timers to
roughly one per second -- so a burst above five per second is **unreachable** in
a hidden tab.

Not a product bug, and the same hazard M4 hit with `requestAnimationFrame`.
Rewritten to inject a fake clock, which is deterministic, instant, and the
reason the announcer takes `services.now` in the first place.

## Test defects corrected (three more)

- `test_the_console_observes_the_presentation_stage` located its target as *the
  first* presentation observer. M17 added a second one, so the assertion
  silently started testing the wrong thing. Now located by its own body.
- A 300-character window overran into the next block and matched
  `createElement` there. Now bounded by the following statement.
- `assertNotIn("replay", ...)` on a file whose prose says "summarise rather than
  replay" -- a test that fails on a file describing itself. Replaced with an
  assertion about what `exit()` actually does.

That is now the third, fourth and fifth time this project has written a
structural test as a loose textual search and had it match the wrong thing. The
pattern is clear enough to state as a rule: **anchor on something that cannot
appear in prose, and bound the window by a following landmark rather than a
character count.**

## Accessibility -- definition of done (A.97)

- **Keyboard-findable / operable:** history has labelled search, filter buttons
  with `aria-pressed`, and paging controls; Review Mode has a shortcut and four
  palette commands.
- **Accessible name:** "Event history", distinct from the heading.
- **Announces?** The history never does -- `aria-live="off"`, same rule as the
  Current State View. Review Mode announces only what the player asked for,
  at `important` so it is heard while everything else is paused.
- **Steals focus?** No; typing rebuilds only the rows.
- **Preserves review position?** That is the entire feature.
- **Colour alone?** No -- channels and filter state are words plus
  `aria-pressed`.
- **axe:** clean.
- **Human AT testing:** yes, and this is one of the highest-value surfaces for
  it. Whether the flood thresholds are *right* cannot be settled by a machine:
  5/sec and 2s are the addendum's starting numbers, not findings, and only
  somebody playing a real fight with a screen reader can say whether the
  summaries land at a useful rhythm.
