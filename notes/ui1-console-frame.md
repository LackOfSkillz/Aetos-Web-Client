# UI1 — One frame, one scrollbar

Status: **COMPLETE**

Verification: 1355 Python tests OK (up from 1314). axe clean at 1280x800 -- 13
checks, 0 failures, including the high-contrast pass. Measured live at 70%, 100%,
150% and 250% text.

Gary's change order, from a screenshot of the client at a larger text size with
most of the scrollbars circled in red:

> *"first move the text input and send button into the actual text output frame.
> then next lets find a way to minimize all the scrolling. I upped the text size
> and its creating a scroll bar maze from hell. lets figur out how to accomodate
> larger text without the need to doom scroll"*

and, separately:

> *"our ui needs to be slick, clean and beautiful to look at"*

## The composer

It was a `<footer>` at the bottom of the whole client — the full height of the
workspace away from the text it answers, with every panel of instrumentation in
between. It is now the bottom edge of the console's own frame.

That is Gary's instruction, and it is also the truer reading of the interface.
What you type is a reply to what you have just read. Inside the frame they are
one object; the console scrolls above a composer that never scrolls away from it.

The prompt glyph is a real `<span aria-hidden="true">`, not `::before`.
Generated content is exposed to some screen readers, and "greater than sign"
before every command is noise.

## The maze had four causes, and only one of them was scrollbars

**1. Nested scroll containers.** A region scrolled, every panel body inside it
scrolled, and some lists inside those scrolled again — three deep, and none of
them telling you where you were. The inner two were defensive rather than needed:
panels are `flex: 0 0 auto` and already grow to their content. The inner
scrollbars only ever appeared once something *else* had squeezed the panel below
its content, and the answer to that is to stop squeezing it.

**2. A resized panel got a fixed `height`.** A fixed height is a lid: content
taller than it clips and grows a scrollbar. It is now `minHeight`, a floor. The
resize control still does what it is for — the panel simply never gives back less
room than its content needs.

**3. Seven `font-size` declarations were in `px`.** The text scale sets
`font-size` on `.aetos-root`, so everything in `em` grows with it and everything
in `px` does not. Turning the text up grew the game output and left every panel
title, status-bar button, dialog title and label at its original size. The
interface did not merely look ragged — half of it silently ignored the setting.
Now guarded generally: no stylesheet may pin a `font-size` in pixels. A
`max(16px, …)` floor is still allowed and still tested for, because it names a
minimum rather than replacing the scaling value.

**4. The responsive breakpoints were in pixels**, and pixels do not know the text
got bigger. At 250% text an 800px client still called itself "desktop" and kept
three columns, so each was a handful of characters wide with a scrollbar down the
side of it. This was the actual cause of the screenshot.

The breakpoints are really about **how much text fits**, and width alone only
answers that while the text stays one size. They are now compared against the
width expressed in the client's own rendered text — `width × (14 / fontSize)` —
so "phone" means *one column is the only honest option here*, which is a
statement about the text and the space together. Browser zoom comes out right for
free, because zoom scales both terms.

Measured live: 70% → wide, 100% → desktop, 150% → tablet, 250% → phone, on the
same 800×450 window.

### The gap that would have made all of that do nothing

The responsive manager watches the root element's **size**. Changing the text
size changes only what is *inside* it, so the `ResizeObserver` never fires. The
new arithmetic was correct and unreachable: the client kept three columns at 250%
text until something else happened to resize the window.

`applyVisual` now asks the layout to look again. Found by turning the text up and
watching nothing happen — the fifth time in this project that reading the code
would not have shown it.

### The stacked layout, at a size that needs it

A strip that scrolls has a min-content height of zero, so a grid short of space
squeezed the phone strips to nothing and cut every panel through the middle of
its first line. They now have a floor in `em`, and the workspace scrolls when the
stack genuinely does not fit.

That last part is deliberate and is not a retreat from the brief. WCAG 1.4.10
asks that content reflow without scrolling in *two* directions. One vertical
scrollbar on the page is the reflow working; three nested ones are the failure it
is about.

## "Slick, clean and beautiful"

One idea, spent in one place: **the transcript is the page and everything else is
margin.**

Every widget used to be a bordered, filled card — including the console, so the
thing a MUD client exists for had exactly the same visual weight as the sound
widget. Boxes inside boxes inside a bordered status bar is why it read as a debug
dashboard.

- The console slab is now the **only framed object on the page**.
- Side panels sit on the background, separated from each other by a hairline.
- The status bar is a row with a rule under it, not a second raised surface.
- Scrollbars are thin and in the client's own palette. There are fewer of them,
  and the ones that remain were being drawn in the browser's default light grey —
  three bright bars down a dark client, which is a large part of why the
  screenshot read as a maze even where the scrolling was legitimate.

**No colour token changed.** The palette is contrast-validated and stays exactly
as it is; what changed is what carries a border and a surface.

## The part that would have been easy to skip

Unframed panels are a *decoration* decision, and they are the wrong one for
anybody who needs an edge to find an edge. Both `prefers-contrast: more` and the
client's own high-contrast setting put the surfaces, the borders, the composer's
field outline and the full-width scrollbars back.

Not "also acceptable": for those two audiences the boxed layout is the better
one, and there is a rule that says so rather than leaving them with a prettier
client they cannot parse.

## Accessibility — definition of done (A.97)

- **Keyboard-findable / operable:** unchanged. The skip link still targets
  `#aetos-input`, which moved but kept its id; the field keeps its label; tab
  order now reaches the composer immediately after the log it belongs to, which
  is shorter than before.
- **Accessible name:** unchanged. The prompt glyph is `aria-hidden`.
- **Announces?** Nothing new to announce. The layout change announcement that
  already existed now also fires when the text size crosses a breakpoint, which
  is the correct behaviour and was previously impossible.
- **Steals focus?** No.
- **Colour alone?** No new meaning is carried by colour. The single frame is a
  border, and the panel separators are rules.
- **axe:** clean at four viewports (see below), 13 checks each -- including the
  high-contrast, minimal-stimulation pass, the settings dashboard, the themes
  panel, the picture board, the inspector and Edit Layout.
- **Human AT testing:** A8, unchanged. Nothing here alters the semantics a screen
  reader sees except the composer's containing section.

## The help overlay, and the gate that could not see it

Running axe at 800x600 rather than at 1280x800 turned up a **serious** violation
the wide run had never been able to see:

    scrollable-region-focusable (serious: .aetos-help__section > pre)

**The first reading was wrong.** A measurement taken mid-transition said the help
content column had collapsed to 12px, and that looked like a reflow failure in
the grid. Measured properly at a real 800x600 viewport the overlay is fine --
nav 224, content 546, and the examples fit -- except for one example long enough
to overflow its column. The rule was reporting exactly what it said.

**The content is right to scroll.** An example is `white-space: pre` and scrolls
sideways rather than wrapping, and several of them are column-aligned tables:
wrapping `resources   what your game measures` would destroy the alignment that
makes it readable. WCAG 1.4.10 allows precisely that -- content requiring a
two-dimensional layout. What it does not allow is a region only a mouse can
scroll.

So every example is now focusable, with `role="group"` and a name. Three
decisions inside that:

- **Every example, not the overflowing ones.** Whether one overflows depends on
  the window width and the player's text size and changes under both, so a
  `tabindex` set from a measurement would be a control that is sometimes there --
  and invisible at whatever width the person who wrote it happened to use.
- **`role="group"`, not a bare `aria-label`.** ARIA prohibits naming an element
  with the generic role, so a label on a plain `<pre>` is dropped by some screen
  readers and flagged by axe as a prohibited attribute. One violation traded for
  another.
- **`group`, not `region`.** `region` is a landmark, and an article with eight
  examples would add eight landmarks that mean nothing.

### The defect the fix would have introduced

Help's focus trap collected `button, input, [tabindex='-1']` -- the three kinds
of focusable element it happened to contain. That list went stale the moment
something was added, and something just was. An example sitting after the last
button would have been skipped entirely: Tab from that button matched `last` and
wrapped straight back to `first`, past the thing it should have reached next.

A focus trap whose idea of "focusable" is narrower than the browser's does not
trap focus, it loses it.

### The more useful finding: one viewport is not a pass

This gate ran at 1280x800 and only at 1280x800 for its whole life, and came back
clean every time. Every rule about overflow, reflow and target size depends on
how much room there is, so a result is only ever a result *for the viewport it
was measured at*.

`qa-axe.js` now records the viewport and the rendered text size in its results,
rather than leaving them to whoever remembers, and its header names the four
views to run. Because the client's breakpoints are measured in text rather than
pixels, 1280x800 at 200% text is a fourth view and not a repeat of the first.

All four are clean:

| View | Layout | Result |
|---|---|---|
| 1280x800 | desktop | 13 passed, 0 failed |
| 800x600 | tablet | 13 passed, 0 failed |
| 390x844 | phone | 13 passed, 0 failed |
| 1280x800 at 200% text | phone | 13 passed, 0 failed |

## Not built here

- **No change to the phone carousel.** Its per-panel vertical scroll is a second
  axis inside a horizontal strip, and it predates this work. It is the one
  remaining place with two scrollbars by design.
- **No new palette.** Asked for beauty, the tempting move is a new colour scheme;
  the colours were already validated and were not the problem. Layout and
  hierarchy were.
