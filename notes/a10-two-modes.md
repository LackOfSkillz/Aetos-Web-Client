# A10 — Two modes

Status: **COMPLETE**

Verification: 1265 Python tests OK (up from 1249). axe clean at every severity in
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
  in `accessibility.css`, above the rule it has to beat, at 32px.
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

- **Keyboard-findable / operable:** the switch is an ordinary button in the
  status-bar `nav`, plus `Ctrl+Shift+A` in both modes, plus a palette command.
- **Accessible name:** unchanged; `aria-pressed` replaces `aria-expanded`,
  because it switches which interface you are in rather than revealing a panel.
- **Announces?** Both directions. Leaving announces at `important` and names what
  stopped, that nothing was erased, and the way back.
- **Steals focus?** Only on entering accessible mode, into the panel just asked
  for.
- **Colour alone?** No — the on state is `aria-pressed`, a border and an underline
  as well as a colour.
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
