# A13 — tiles, drilling down, and a slider that could not be dragged

Status: **COMPLETE**

Verification: 1561 Python tests OK, 371 accessibility checks OK (368 → 371 with
a new `dragging` check), `black` and `isort --profile black` clean.

Gary, on the A12 panel:

> *"I liked the screen with tiles when you first got to accessibility, but
> theres no way to get back once you pick one. then the options are layed out ok
> but I liked the tiles and then opening a box for that specific setting so if
> you are visually impaired, its easy to see choices and drill down into those
> choices. also the text size slider is janky... for every increment I have to
> reclick the slider and move in one click, wait one click wait. also once
> options are selected I dont see them on the main screen."*

Four separate defects, and all four were real.

## The slider could not be dragged, and nothing we own could see that

This is the one worth keeping.

Every `input` event wrote a preference, every write notified subscribers, and
the panel's subscriber calls `render()`, which begins `host.textContent = ""`.
So dragging the text-size slider **destroyed the element being dragged**, on the
first pixel of movement. The browser had nothing left to send pointer events to,
the gesture ended, and the next increment needed a fresh click.

Measured, with the fix reverted, across one twelve-step drag:

| | Broken | Fixed |
|---|---|---|
| distinct values | **2** | 12 |
| value went | **1.0 → 0.9** | 1.0 → 1.6 |
| focus ended on | **nothing** | the slider |

It moved *backwards*. A rebuilt slider registers the pointer as a fresh click at
the gesture's origin, which was left of where the drag started — so dragging
right made the text smaller.

**Not one automated gate could see it.** axe found a correctly named,
correctly roled, correctly valued `<input type="range">` and was right about all
of it. The keyboard walk reached it and operated it, because arrow keys do not
care whether an element survives a pointer gesture. The accessibility tree had it
exactly as it should be. NVDA read it correctly.

That is the same shape as A0's scrolling region — a thing every check called
correct and no person could operate — and it is the second time this project has
met it. **State and structure are not use.** A12 added the first gate that
measures legibility; this adds the first that measures whether a gesture
destroys its own target.

The fix is a flag: the panel does not repaint for writes it made itself. The
subscription stays, because Settings, the command palette and the keyboard
shortcuts all write the same preferences and a panel showing stale state is
worse than no panel. It is lowered in a `finally`, because a stuck flag would
leave the panel permanently blind to outside changes — a worse bug, and a silent
one.

## Tiles, and a way back out of everything

The panel is now two screens.

**The hub** is one tile per setting, each carrying its name *and its current
value* — "Text size / 150%", "Contrast / High contrast". The value is the half
that matters: it turns a settings screen into an answer to "what is on". The
tile's accessible name carries both halves too, so a screen reader user gets what
a sighted person gets from looking.

**The detail screen** is one setting with room: a large legend, the explanation,
and every choice visible at once as a native radio group. A `<select>` shows one
option at a time in small text and hides the rest behind an interaction, which is
the wrong control for somebody who drilled in *because* reading small text is
hard.

Radios rather than dropdowns is not a retreat from A0's native-control rule. That
rule exists because native controls arrive keyboard-operable, announced with
their value, and understood by every assistive technology — and a radio group is
all of those, arrow-key operable and announced as "2 of 4", with no ARIA at all.

There is **no preview pane**, deliberately. Every one of these applies
immediately to the whole client, so the preview is the client. A sample of text
beside the real thing would be a second, smaller, less honest version.

### Three ways back, because there were none

- out of a setting: a back button, **first in the DOM** so Tab reaches it first
- back to the starting points: *"Show the starting points again"*, which clears
  `shell.preset` and changes nothing else — looking at the tiles again is not a
  request to lose your text size
- out of the panel: closing it returns to the hub, so reopening never drops
  somebody into a detail screen they have no memory of leaving open

A screen you can enter and not leave is the worst thing an accessibility panel
can be, because the person stuck in it is the person least able to guess a way
out.

## What is on, without opening anything

A strip under the status bar, only when there is something to say: *"In use:
Contrast: High contrast · Text size: 150% · Visual detail: Reduced"*. Each item is
a button that opens that setting, so it doubles as the shortest route to changing
one's mind.

It lists, in standard mode, **only what is still applying** — which is the
genuinely confusing case. Somebody who switched to standard and kept their text
size should see that their text size is still theirs and their contrast is not.

## Three more defects the work turned up

- **The strip was outside every landmark.** `#aetos-accessibility-host` sits
  between the header and `<main>` and is in no landmark, so a bare `<div>` put
  its buttons outside all of them. axe's `region` rule caught it — and **only at
  250% text**, because that is the one view in the sweep where a setting is away
  from default and the strip is on screen at all. The new panel scans added in
  A12 are what made it visible.
- **`:has()` would have shipped unnoticed.** The first version marked the chosen
  radio with `:has()`, which needs Chrome 105 and Firefox 121 against a published
  floor of Chrome 87 and Firefox 75. The compatibility gate did not object,
  because **it only knows the features listed in its own table** — so it cannot
  actually protect the floor, only the parts of it somebody remembered. Replaced
  with a class set from JavaScript; the gap in the gate is recorded here.
- **A tile claiming a target floor it did not have.** The first version had a
  comment saying it was "comfortably past the 24px floor" and no declaration to
  that effect — the same house defect A12 found three times. Now stated.

## One thing that looked like a defect and was not

Four screenshots came back with an empty console and no side panels. It looked
like the redesign had broken the client.

It had not. The screenshot script waited 500ms after applying a preset, and a
text-scale change needs both a repaint and the responsive manager's re-measure
to follow it. Measured directly, the console had 468 characters and fourteen
widgets throughout. The wait is now 1600ms and the reason is in the script.

Worth recording because the instinct was to write it up as a regression, and
the check took two minutes.

## What this still does not answer

Whether any of it is bearable. `docs/a8-tester-protocol.md` still needs a person,
and A12's note still applies: nothing here says whether hearing these sentences,
or making these choices, all evening, is tolerable.
