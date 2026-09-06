# A10 — Two modes

Status: **COMPLETE**

Verification: 1284 Python tests OK (up from 1249). axe clean at every severity in
standard mode, accessible mode, and accessible mode at high contrast. The full
switch cycle exercised live.

Gary's direction, verbatim: *"lets make the default mode and the accessable mode
a toggle so we dont have to try to be everything to everybody"*.

## What changed from A9

A9 shipped the toggle as a **disclosure**: it showed and hid the options panel,
and every accommodation stayed applied either way. I chose that reading in
`questions.md` 6 because it cannot strand anybody, and flagged the sharper one as
the open question.

This is the sharper one. **Standard mode now genuinely stops the governed
accommodations applying.** The two interfaces are separate, and neither is
compromised to accommodate the other.

## The one decision that makes it safe

**The mode masks. It never erases.**

Switching to standard leaves every stored value exactly as it was; `effective()`
builds a *view* over them and never assigns into the record. Switching back
restores the interface somebody spent time building rather than handing them a
fresh one to rebuild.

That is the whole difference between a mode and a reset, and it is what makes the
hazard survivable. The hazard is real and I still believe it: somebody flicks the
switch to look, the type shrinks and the contrast drops, and they cannot find the
control again. Three things answer it, and all three had to be there:

1. **`Ctrl+Shift+A` works in both modes**, and is said out loud at the moment it
   becomes relevant rather than in documentation nobody is reading right then.
   Leaving accessible mode announces: *"Standard mode. Contrast, Text size, Quiet
   mode no longer applied, and nothing was erased. Press Control Shift A to bring
   them back."*
2. **The switch is never governed by the mode.** Same place, same words, 32px in
   both — measured, not assumed.
3. **Nothing is erased**, so the way back is one keystroke.

## The subtle part: three options must not revert

A preference may only be reverted by the mode if **its default is the standard
experience**, so that reverting *removes* an accommodation rather than imposing
one. Three of the panel's eleven options fail that test:

| Option | Default | Why reverting would be wrong |
|---|---|---|
| `pointer.gestures` | **on** | Somebody with a tremor turns them off. Reverting switches them back on for the person who most needed them off. |
| `audio.muted` | **off** | Muting is the accommodation. Reverting starts playing sound at somebody. |
| `cognitive.reorientEnabled` | **on** | Reverting *adds* a feature. A mode switch is not for that. |

They stay in the panel, because they belong there, and they survive the switch
untouched. Verified live: with all three set and the mode switched to standard,
all three held while contrast, scale and quiet mode reverted.

Getting this backwards is invisible in review and obvious to whoever it happens
to — standard mode would have been actively hostile to exactly three of the
people it is meant to leave alone. It is recorded as
`revertsInStandardMode: true|false` on each entry, with the reasoning above it.

`visual.motion` is worth one line of its own: its default is `"system"`, so
reverting hands the decision back to `prefers-reduced-motion`. Somebody whose
operating system asks for less motion still gets less in standard mode.

## One seam, not twenty

`effective()` is applied at `notify()` **and** at the priming call in
`subscribe()`, so every consumer honours the mode without knowing a mode exists.
`get()` and `value()` still answer "what did the player choose", which is what
the panel and Settings need in order to show it.

Priming was worth getting right on its own: `subscribe()` primed with `get()`,
so a client started in standard mode would have applied the accommodations once
at boot and masked them from the next change onward — accessible-looking until
somebody touched something.

## Three things I got wrong, all found by measuring

- **`min-height: var(--aetos-target)`** on the mode switch does nothing.
  `--aetos-target` is deliberately `0px` on a fine pointer and only becomes 44px
  under `pointer: coarse`. The rule read as a guarantee and was a no-op.
- **`min-height: 28px` in `aetos.css`** also did nothing: `accessibility.css`
  sets 24px on every button at equal specificity and loads later, so it won. Now
  in `accessibility.css`. Then the `.aetos-root` prefix was dropped while moving
  it, which lost on *specificity* instead: `.aetos-statusbar__button--mode` is
  (0,1,0) and `.aetos-root button` is (0,1,1). Now
  `.aetos-root .aetos-statusbar__button--mode` at (0,2,0), winning on
  specificity rather than on position.
- **The shell dropped the announcement priority.** It passed a fixed
  `{ priority: "normal" }` and ignored what the caller asked for, so the one
  message somebody needs to hear — how to get back — would have arrived in the
  quietest category there is.

The first two were caught by reading the button's rendered height rather than the
stylesheet. The measured value was 24px twice while the CSS said otherwise.

## What did not change

The baseline. Keyboard operation, focus management, landmarks, accessible names,
the announcer, colour never carrying meaning alone, the two live regions — all
unconditional in both modes, and still listed in the panel under "Always on" so
that somebody deciding whether to switch can see what was never off.

`preferences.js` opened with *"NOT AN ON/OFF SWITCH. There is no accessibility
mode here"*. That header is now rewritten rather than left to contradict the
code: there **is** a mode, it governs the optional layer, and for the baseline
the original sentence is still exactly true.

## Accessibility -- definition of done (A.97)

- **Keyboard-findable / operable:** the switch is an ordinary button at the top
  right, *outside* the navigation landmark, plus `Ctrl+Shift+A` in both modes,
  plus a palette command. The Options button beside it has its own.
- **Accessible name:** `role="switch"` with `aria-checked` -- it announces "on"
  and "off", which is what it does. `aria-pressed` would say "pressed" (the act
  rather than the state) and `aria-expanded` would claim it merely reveals a
  panel while it changes the whole client.
- **Announces?** Both directions. Leaving announces at `important` and names what
  stopped, that nothing was erased, and the way back.
- **Steals focus?** Only on entering accessible mode, into the panel just asked
  for.
- **Colour alone?** No — the on state is `aria-checked`, the thumb's *position*
  in the track, and a border, as well as a colour. Under Windows High Contrast,
  where background and border colours are discarded, the position is what is
  left.
- **axe:** clean at every severity in standard mode, accessible mode, and
  accessible mode at high contrast.
- **Human AT testing:** A8, and this changes what A8 should test. The protocol
  now needs a pass in *each* mode, and the specific question of whether somebody
  who cannot read the standard interface can still find the way back.

## Not built here

- **No confirmation dialog on switching off.** The announcement names what
  stopped and how to return; a confirm on every switch is friction on the control
  that most needs to feel cheap to try.
- **No per-game default mode.** A game deciding its players start in accessible
  mode is a decision about them rather than by them, and § 2.3 keeps this in the
  browser regardless.

---

## Four corrections after the first version, all from Gary

**1. "the button in the upper right only presents layout options that has
accessibility options, I want a toggle that switches between default mode and
accessibility mode"**

The switch also opened the options panel, so flipping it *presented a panel of
options* — which is what it looked like, because that is what it did. A control
that does two things is read as whichever one you notice first.

Now they are two controls: a switch that changes the mode and nothing else, and
an **Options** button beside it. Switching the mode does not open the options;
opening the options does not change the mode. Verified live in all four
combinations.

**2. A switch, not a button.** `role="switch"` with `aria-checked` announces "on"
and "off", which is what this does; `aria-pressed` says "pressed", which is the
act rather than the state. It has a visible track and thumb, and the **thumb's
position** carries the state so it survives being unable to tell the colours
apart. Moved out of the `<nav>` landmark as well — it is not navigation, and
sitting among Edit Layout and Help was part of why it read as a third button.

**3. "we need to make sure we give text size options... having to zoom the
browser is janky", and "that option should be in both modes".**

This corrected the governance table. `visual.scale` was marked as reverting, so
switching to standard mode reset somebody's text size to 100%. That is wrong for
a different reason from the other three exceptions: theirs is that reverting
would impose an accommodation's opposite, and this one's is that **being able to
set the size of text was never an accommodation to begin with.** It is a basic
property of a text interface.

So text size survives the switch, appears in both panels, and has three palette
commands — `Larger text`, `Smaller text`, `Reset text size` — because somebody
who cannot read the screen should not have to read a settings panel first. The
step is clamped to the schema range and announced as a percentage rather than as
"larger", which tells somebody who cannot see the result nothing.

**4. "we should have a standard control panel and an accessibility control panel
where we expose more settings."**

Which is what the split produces. Same host, two lists, chosen by mode:

```text
Display options            Accessible mode options
(standard mode)            (adds to the same list)
-----------------------    ---------------------------
Text size                  Contrast
Orientation help           Motion
Touch gestures             Visual detail
Mute all sound             How much is announced
                           Quiet mode
                           Focus mode
                           Picture and word board
```

An earlier version hid the Options button entirely in standard mode, reasoning
that there was nothing to configure there. That reasoning was wrong in exactly
the way the text-size correction exposes: standard mode has four options, one of
which is the one people ask for most.

## Two more defects found in the corrections

- **The switch reported the wrong state.** After splitting the mode from the
  options, `aria-checked` was still being set from `isOpen()` — which had
  quietly come to mean "the options are showing". It read correctly only when
  the two happened to agree, which is exactly how a defect like that survives a
  quick look. Found by reading the code back rather than by using it.
- **The thumb never moved.** It was absolutely positioned and shifted with
  `left`, and `left` was being ignored outright — not losing a cascade; an
  inline `left: 18px !important` did nothing either. Rebuilt on flex layout with
  `margin-left: auto`, which has nothing to override and nothing to position
  against, and measured moving 16px. That is the fourth thing in this milestone
  that read as a guarantee and did nothing, and the fourth found by measuring the
  rendered element rather than reading the stylesheet.
