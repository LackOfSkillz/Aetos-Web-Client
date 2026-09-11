# A12 — accessible UI/UX research, and the axis the suite cannot see

Status: **RESEARCH — no code changed**

Gary, looking at the client with the accessibility panel open:

> *"this doesnt feel accessible to me, but I dont have this particular
> challenge so its hard for me to tell, but what we have now 'feels' like we are
> way off the mark"*

He is right, and the reason is worth more than the fix.

## The suite passes. It passes on a different axis.

Everything we own is green. 288 automated checks, 0 failures. NVDA speaks the
mode switch correctly as a switch with its state. axe is clean across 144 scans
including nine overlays per view. Reflow to 320px holds.

And measured against WCAG 2.5.8 — including the ones I expected to fail — the
client **passes there too**. Twelve controls are under 24×24 CSS px, and every
one of them satisfies the spacing exception: nearest centre-to-centre distance
113–161px for the panel checkboxes, 24px for the stacked ranges. No violation.

So the automated answer to "is this accessible" is yes, and the felt answer is
no. Both are true, because every gate we built measures **machine-readable
correctness** — does a control have a name, a role, a state; can a program reach
it, and can a screen reader say it. That is one axis.

The other axis is **legibility, density and effort**: what a sighted person with
low vision, dyslexia, ADHD or a tremor actually meets. We have one gate touching
it (`reflow`), and it only asks whether things fit.

That is the whole gap. Not a defect list — a blind spot with a passing test
suite sitting on top of it, which is the most expensive kind.

## Measured, at 1920×1080, panel open

| | Measured | Reference |
|---|---|---|
| Typefaces in use | **1** — `Cascadia Mono`, on all 86 text-bearing elements | — |
| Panel controls in one section | **11** | COGA: ~7 per section |
| Panel prose | **242 words**, 5 columns, 575px — **53% of the viewport** | — |
| Console line length | **127 characters** | WCAG 1.4.8: ≤80 |
| Target floor on a fine pointer | **`--aetos-target: 0px`** | 2.5.8: 24px (we pass on spacing) |

Measurement scripts: `browser-qa/a11y/scratch-legibility.js`,
`browser-qa/a11y/scratch-spacing.js`, `browser-qa/a11y/scratch-console.js`.

### Two things in the first draft of this note were wrong

Both were the measurement, not the client, and both are the same mistake the
suite has already made once — so they belong in the record rather than quietly
edited out.

**"Console line height is `normal` (~1.2)."** It is not; `.aetos-console` has
had `line-height: 1.5` all along. My script fell back to a `[class*='console']`
selector when `.aetos-console__output` did not match, and caught the widget
*wrapper* instead. That is exactly finding 4 in `a11y-suite.md` — measuring the
switch's label instead of its thumb — repeated within a fortnight.

**"127 characters, because `max-width: 120ch`."** The 127 is real. The
attribution was wrong: the 120ch cap applies only under
`data-aetos-size="wide"`, and a 1920×1080 monitor computes as `desktop`
(effective width 1680 against an 1800 boundary). So the cap was not being
generous — it was not firing at all. That makes it a worse defect than the note
first claimed, and it also meant raising the type floor would have pushed `wide`
further out of reach.

A note written before re-checking would have recorded one defect that does not
exist and mis-diagnosed another.

## The finding that matters most: the mode is empty

`accessible` and `standard` measured **byte-identical** — same fonts, same sizes,
same target list, same everything.

My first instinct was that this was my harness being wrong, and I checked before
writing it down. It is not wrong. `DEFAULTS` in `preferences.js` sets every
governed visual preference to its standard value: `contrast: "standard"`,
`scale: 1`, `motion: "system"`, `stimulation: "standard"`, `quietMode` and
`focusMode` off. The mode masks preferences, and by default there is nothing to
mask.

So the sequence for a new player who needs help is:

1. Find the switch.
2. Flip it. **Nothing happens.**
3. Press *Options*.
4. Read 242 words across five columns.
5. Make eleven decisions, in a vocabulary they have not been taught, about
   accommodations they may not have names for.
6. *Then* get an accessible client.

Every one of those steps is correct in isolation and the sum is backwards. We
put the whole configuration burden on exactly the person least able to spend it,
and we did it in the name of not presuming. A10's instinct — "so we don't have
to try to be everything to everybody" — was right about *modes* and got applied
to *defaults*, where it does the opposite of what it intended.

Screenshot 1 is what step 4 looks like, and it is why the client "feels way off
the mark" while every gate is green.

## What the research actually says

### Monospace is not the easy call I expected

The obvious read is "one monospace face for 242 words of prose is wrong", and
the mainstream sources agree: [Vision Australia][va] says avoid monospaced
typefaces for long passages, and [APA Style][apa] says monospace is never a good
choice for readability.

But [Rello & Baeza-Yates][rello], measuring dyslexic readers directly, found
**monospaced fonts significantly improved reading performance** — alongside sans
serif and roman, against serif, proportional and italic.

So the two populations want opposite things, and any single answer we pick is
wrong for somebody. That kills "switch the UI to a proportional face" as a fix
and replaces it with something that fits what this client already is: **make it a
choice**, defaulted sensibly, in a preference layer we have already built. The
same is true of the specialised dyslexia faces — a 2016 peer-reviewed study found
OpenDyslexic and Dyslexie gave no improvement over Arial, so shipping one as *the*
answer would be decoration.

### Density has a number

COGA's guidance is explicit: [reduce the number of links and options to seven in
any one section][coga], one idea per paragraph, one point per sentence. We have
eleven controls and 242 words in one section, in five columns, so the reading
order zig-zags across the full width of a 1920px screen.

### 2.5.8 passing on spacing is not the same as being easy to hit

We satisfy the criterion because the controls are far apart, not because they are
big. A 20×20 checkbox and a 16px-tall range are still 20 and 16 for somebody with
a tremor. `--aetos-target` is deliberately `0px` unless `pointer: coarse`, which
means **a mouse user gets no floor at all** — and the CSS comment above the
checkbox claims "a target big enough to hit without fine pointing (A.57)" at
1.25rem/20px.

That is the fourth time in this project a comment has asserted a floor that
measurement does not support. It is becoming the house defect and is worth
naming as one.

## What was built

Status: **COMPLETE.** 1541 Python tests OK, 320 accessibility checks OK
(up from 288 — see below), `black` and `isort --profile black` clean.

1. **The mode does something.** Five starting points, in a person's words, asked
   once. A preset is a bulk write of ordinary preferences, so `effective()` —
   the delicate part of A10 — is untouched and never learns presets exist.
2. **Two faces.** Proportional for the client's prose, monospace for the console,
   the map and the command input. `visual.typeface` puts prose back, because the
   evidence splits and any single answer is wrong for somebody.
3. **The options are grouped.** Four sections of four or fewer, each a `group`
   named by its heading, against eleven controls in one five-column grid.
4. **A target floor on every pointer.** 24px, and the rules that use it moved out
   of the `pointer: coarse` block where they had always been dead. Every slider
   thumb went 16px → 24px, keyed on the element so the six volume sliders were
   fixed too rather than only the one I was looking at.
5. **The reading line is bounded in characters**, unconditionally: 127 → 84.

### And the gap is now a gate

`npm run a11y` grew a **`legibility`** check — the first thing in this suite that
measures the axis Gary was looking at rather than the one we built for. Line
length, leading, target size without the spacing exception, and how many
decisions are on screen at once, across three viewports × two scales × two
modes.

**288 → 368 checks**, 0 failures.

Two of my own mistakes in writing it, both caught by running it rather than
reading it:

- it measured whatever was on screen, and the accessibility panel is never open
  in an ordinary view — so the density assertion **never ran once** across
  thirty-six views while printing "ok". It now opens the panel and puts it back.
- `MIN_TARGET` was used only in the failure *message*; the detection had `< 24`
  hardcoded inside the page function, so changing the constant changed nothing.
  Found by deliberately setting the thresholds to values that must fail and
  checking that all three branches actually fired.

The second is the more useful lesson: **a threshold that does not reach the
measurement is a comment**, and it reads exactly like a working guard.

### Four more defects the work turned up

- **axe had never scanned the accessibility panel.** It was in none of the nine
  overlays the check opens, and the list looks exhaustive — every other dialog is
  there. Now scanned in both states, chooser and options: **+32 checks, all
  clean.**
- **`--aetos-text-dim` was used four times and defined nowhere.** With no
  fallback the declaration is invalid at computed-value time, so those elements
  rendered at full strength by accident. A test now fails on any custom property
  used but never defined.
- **Three headings sized in `rem`.** Text scale is a multiplier on the client's
  own font-size; `rem` resolves against the browser root, which that multiplier
  deliberately never touches. At 150% the group headings in the accessibility
  panel were *smaller* than the labels beneath them. Same bug in the grid floors:
  an 18rem column stays 288px while the text inside it reaches 40px.
- **`<select>` does not inherit `font`.** So the dropdowns rendered at browser
  default whatever the scale said — the one control whose purpose is choosing an
  accommodation was the one ignoring it.

## What I am not claiming

- No WCAG failure was found. I went looking for one and did not find it, and
  saying otherwise would be the "wrong in the direction of alarm" mistake this
  project has already met four times.
- 127 characters and `line-height: normal` are **judgement calls against a AAA
  criterion**, not violations. 1.4.8 is AAA and we target AA.
- I have not tested any of this with a person. Nothing here changes that A8
  still needs Meris.

## Sources

- [Vision Australia — Typography in Inclusive Design, Part 2][va]
- [APA Style — Accessible typography][apa]
- [Rello & Baeza-Yates — Good Fonts for Dyslexia][rello]
- [W3C COGA — Making Content Usable][coga]
- [W3C WCAG 2.2 SC 2.5.8 — Target Size (Minimum)][tsm]

[va]: https://www.visionaustralia.org/business-consulting/digital-access/blog/typography-in-inclusive-design-part-2
[apa]: https://apastyle.apa.org/style-grammar-guidelines/paper-format/accessibility/typography
[rello]: https://dyslexiahelp.umich.edu/wp-content/uploads/2014/02/good_fonts_for_dyslexia_study.pdf
[coga]: https://w3c.github.io/coga/techniques/index.html
[tsm]: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
