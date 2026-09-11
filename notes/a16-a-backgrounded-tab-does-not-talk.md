# A16 — a backgrounded tab does not talk

Status: **COMPLETE**

Verification: 1596 Python tests OK, 386 accessibility checks OK (380 → 386),
`black` and `isort --profile black` clean.

From research into Heydon Pickering's *Notifications* article — the one piece of
live-region guidance that comes with a concrete remedy rather than a principle.

## The problem

A MUD sits in a background tab for hours. A live region keeps firing while it
does, so a screen reader reading somebody's email is interrupted by a room
description from a game they are not currently playing.

> "we need to silence output for hidden tabs… Inactive live regions take
> `role="none"` and/or `aria-live="off"`."

He adds the caveat that some screen reader and browser pairings already do this
themselves — "However, you can't rely on all your users having these setups and
— where they don't — the experience is very off-putting."

## What was built

On `visibilitychange`, both regions take `role="none"` / `aria-live="off"`, and
are restored on return. Three decisions worth naming.

**The original attributes are captured, not assumed.** The two regions are not
symmetrical — polite is `role="status" aria-live="polite"`, urgent is
`role="alert"` with **no `aria-live` at all**. Restoring a hardcoded pair would
quietly give the urgent region an attribute it never had. A captured `null` is
restored by *removing* the attribute rather than writing the string.

**Nothing is queued.** Announcements that happen while hidden are simply not
announced. Replaying them would read twenty minutes of combat to somebody who
just came back. Nothing is lost either way: the console holds the transcript and
the history widget can search it — exactly the condition Heydon puts on dropping
notifications at all.

**Speech is deliberately not silenced.** `speech.js` is driven from the
announcer's `write()`, which still runs; only the region attributes change. The
asymmetry is the point: a screen reader user with the tab in the background is
reading a *different window* and must not be interrupted, whereas somebody using
Aetos's own read-aloud has very likely backgrounded the tab **in order to
listen**. Silencing that would break the main reason A15 exists.

It also applies the state at boot, not only on change — a tab can be in the
background from the start, opened in a new tab or restored on browser start-up,
and `visibilitychange` never fires for that.

## A bug in the first version, found by measuring

Messages arriving while hidden are still *written*. So the region came back
holding the last thing that happened while nobody was looking, and making it live
again can announce that stale line out of nowhere:

```text
restored: {"role":"status","live":"polite","text":"A cold hall."}   <- wrong
restored: {"role":"status","live":"polite","text":""}               <- fixed
```

Cleared *before* the role is restored, so the clearing itself happens while the
region is still inert.

## And three of my own tests failed against their own explanations

All three for the same reason, and it is the trap this project already has a
helper for: the block legitimately `push`es the original attributes it has to
restore, and the comment inside `restore` uses the word "speech" to explain why
speech is *not* silenced. Asserting a string is absent from source that documents
that very string fails every time. `_code_only()` strips comments first.

## What this does not cover

Whether the *rest* of the client should quieten in a background tab — timers,
sound, the reconnect banner. Only the announcement channel is addressed here.

## Two things this research found that were NOT built

- **Link contrast against surrounding text (3:1).** axe-core does not check it,
  and it looked like a real gap for a client rendering coloured ANSI text. It is
  not: `<a>` is **not on the sanitiser's allowlist**, so game text can never
  produce a link. The map's "links" are SVG strokes, and console marks already
  carry visually hidden text rather than colour alone. Building the check would
  have been a guard broader than its own justification.
- **Heydon's 2024 `<aside aria-label="Notifications">` wrapper**, which makes the
  live region re-readable as a landmark. Genuinely applicable — our announcements
  vanish with no way to hear them again — but it is a design change rather than a
  fix, so it is recorded rather than done.
