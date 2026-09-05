# M20 (partial) -- Resolution-aware layout

Status: **Layout complete** (PWA and touch gestures remain in M20 proper)

Brought forward from M20 because the client was not adapting to viewport size.

Verification: 289 Python tests OK; 239 browser QA checks OK, with the responsive
suite run at phone, tablet, desktop and wide viewports.

## Measured, not assumed

Breakpoints come from a `ResizeObserver` on the client's **own root element**,
not `window.innerWidth`.

Those are not the same number. A browser side panel, a devtools dock, a
scrollbar, or an embedding frame all make the element narrower than the window,
and a layout that trusts the window lays out for space it does not have. That is
precisely the class of fault that produces a client which does not fill its
container -- so this is the fix for the underlying problem, not just for one
screen size.

Observing the element also means one code path handles a window resize, a device
rotation, and a panel opening.

The breakpoint is published as `data-aetos-size` on the root. The *decision*
stays in one place; the *styling* stays in the stylesheet. JavaScript never sets
pixel values that later fight a media query.

## Four sizes, chosen by where the layout stops working

| Size | Width | Layout |
|---|---|---|
| phone | <= 700 | one column; side regions become swipeable strips |
| tablet | <= 1100 | two columns; aside folds under sidebar |
| desktop | <= 1800 | three columns |
| wide | > 1800 | three columns, console capped at a readable measure |

`data-aetos-short` is tracked separately: a phone in landscape is short, not
narrow, and needs different rules.

## Nothing is hidden to save space

On a phone the side panels are the **only** non-visual route to exits and room
contents, so hiding them would remove a screen-reader user's only way to know
where they are (sections 46, 53). They stack instead.

First attempt capped them at 18vh and stacked vertically. The QA suite caught
that the map ended up below the fold of a short box -- reachable only by
noticing that the box scrolled. They are now **horizontally swipeable strips**
with scroll snapping, so every widget is one familiar gesture away.

The console has a floor of 45vh on phone. Without it, several panels squeeze the
game text -- the thing the player is actually reading -- down to a few lines.

## Wide screens get a readable line, not a longer one

Extra width on a large monitor goes to the side columns and to centring the
console at `120ch`, rather than into a 250-character line of game text. A longer
line is not a better one.

## Touch sizing asks about the pointer, not the screen

`@media (pointer: coarse)`, not a width query. A touchscreen laptop needs large
targets at desktop width; a phone driven by a mouse does not. Targets are 44px,
and the command input is at least 16px so iOS does not zoom the page on focus
and strand the player zoomed in.

## Fluid rather than stepped

Spacing, type and column width use `clamp()`, so the client looks deliberate at
every size rather than only at the sizes someone remembered to test. Both ends
are bounded: text never shrinks below readable, never grows cartoonish.

## QA note

The responsive suite passes at whatever size the browser happens to be, and is
run at four sizes. That is deliberate -- a page cannot resize its own window, so
the breakpoint *decision* is tested directly as a pure function while the
*application* is asserted against the live layout.

It also revealed that Playwright's requested viewport and the actual
`innerWidth` differ; the suite compares the declared breakpoint against the
measured width rather than against the requested one, so it cannot be fooled by
that.
