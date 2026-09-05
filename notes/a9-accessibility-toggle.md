# A9 -- The accessibility toggle and its feature picker

Status: **COMPLETE**

Verification: 1222 Python tests OK (up from 1199). axe clean at every severity
with the panel open, including in high contrast. Exercised live: the toggle, the
picker, persistence across a reload, and the claim that closing the panel changes
nothing.

Gary's direction, verbatim: *"the accessibility ui and the standard ui should be
a toggle and if its toggled on you can choose the accessibility features you
want."*

## Nothing here is new except the ability to find it

Every option this panel shows has worked since the A-track built it, and every
one is in Settings. The problem is that they sit across five groups of a panel
reached from the command palette, so a player who needs three of them has to know
they exist, know they are separable, and go looking.

Granularity was the right call and it created a discovery problem. A9 is the
answer to that problem and nothing else. It adds one visible control that says
**Accessibility**, in the status bar, in a word rather than an icon — an icon
here would be a symbol somebody has to recognise before they can ask for help
reading symbols.

## The line, which is the real deliverable

A0 deliberately built the preference schema with **no master switch** (A.70), and
that reasoning holds exactly here. The toggle governs the optional, opinionated
layer — contrast, motion, stimulation, text size, announcement verbosity, quiet
and focus modes, orientation help, the picture-and-word board, gestures, mute.
Eleven controls, each independent, no preset and no bundle.

It does not govern, and must never govern: keyboard operation, focus management,
landmarks, accessible names, the announcer, colour never carrying meaning alone,
target sizes. **A client that is only operable by keyboard when a box is ticked
is not an accessible client with a toggle; it is an inaccessible client with an
apology.**

Those are not merely excluded — the panel **lists them**, under "Always on", with
a sentence saying they are how the client is built rather than options. Somebody
deciding whether to turn accessibility "on" deserves to know what was never off.
Without that, the toggle implies the client was inaccessible until they found it.

Both lists are code, in `preferences.js`, so the roadmap's table is now the
thing the panel is built from rather than a description of it.

## Toggling changes what is offered, never what is on

The open question I logged for Gary was whether "toggled off" hides the panel or
switches the accommodations off. Built as the first reading, which is the one
that cannot strand anybody: somebody who flicks a switch labelled "accessibility"
to see what the standard interface looks like, and then cannot read the screen
well enough to find the switch again, is stuck.

So closing the panel writes exactly one preference — its own — and says so out
loud: *"Accessibility options hidden. Nothing you chose was changed."* A test
asserts the toggle function contains exactly one write.

If Gary wants the sharper reading, the change is small, and it needs a
confirmation naming what is about to switch off plus a shortcut that works
regardless of state. The question stays open in `questions.md`.

## Three things found while building it

**The panel depended on the command palette.** I created it inside `if (palette)`
because that is where the palette command belongs, which would have meant a
client without the palette module had no accessibility panel either. An
accessibility feature that depends on an optional convenience is not a baseline
of anything. Creation moved out; only the palette *entry* stayed in.

**A feature reachable only by a key nobody would guess.** The shortcut manager
refuses a shortcut that does not name an existing palette command — "no feature
may exist only behind a shortcut" — and I registered the shortcut without the
palette entry. The shortcut worked, so nothing threw and nothing looked wrong;
the feature was simply missing from the one place built for finding things. Its
own rule caught it, one layer later than it would have liked to.

**`var` hoisting, nearly.** The first version referenced `accessibilityPanel`
from a registration that ran before the assignment. It would have worked, because
the reference is inside a deferred callback — but that is the M21 defect's exact
shape, where a hoisted `undefined` was hidden by a defensive guard. Moved the
creation above its uses so the question does not arise.

## Accessibility -- definition of done (A.97)

- **Keyboard-findable / operable:** the toggle is an ordinary button in the
  status-bar `nav`, in the natural tab order (verified: it sits directly after
  Help). Every control in the panel is a native input, select or range.
- **Accessible name:** the panel is a `region` labelled "Accessibility options".
  Each control has a `<label>` and an `aria-describedby` sentence — described
  rather than labelled, because merging them makes an accessible name three lines
  long that is read out in full on every focus.
- **Announces?** Each change announces at `normal`. The toggle announces both
  states, and the closing message says nothing was changed.
- **Steals focus?** Only on opening, and only into the panel the player just
  asked for. It is a region rather than a dialog: it does not cover the game,
  does not trap focus, and need not be dismissed — somebody adjusting contrast
  should be able to watch the room description change while they do it.
- **Colour alone?** No. Every state is a word.
- **axe:** clean at every severity, panel open and closed, standard and high
  contrast.
- **Human AT testing:** at A8, and this is now part of what A8 validates — which
  is why the stage was scheduled before it. Two specific questions for that
  stage: whether "Always on" reads as reassurance or as clutter, and whether the
  panel's position between the status bar and the workspace is where somebody
  expects to land after activating the toggle.

## Not built here

- **No preset bundles.** The direction said "choose the features you want", and a
  preset is the thing granularity was chosen over.
- **No duplication of Settings.** The same preferences, one more way in. Both
  surfaces write the same store and the panel re-renders when anything else
  changes a value, because a picker showing stale state tells the player their
  accommodation is off when it is on.
- **No removal of the options from Settings.** Somebody who learned them there
  keeps them there.
