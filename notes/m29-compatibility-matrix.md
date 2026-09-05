# M29 -- Compatibility matrix

Status: **COMPLETE**

Verification: 1199 Python tests OK (up from 1168). axe clean at every severity.
Focus indicator checked live with a real Tab press.

## The matrix is computed, not written

A compatibility claim is a promise, and M28 had just finished showing what
happens to a promise nobody checks. So the matrix is not prose: it is a table of
platform features with the version of each engine that first shipped them, and
the floor is derived from what the stylesheets actually contain.

```text
Chrome / Edge   87     November 2020
Firefox         75     April 2020
Safari / iOS    14.1   April 2021
```

`tests/test_compatibility.py` scans the CSS, computes those three numbers, and
fails if `docs/compatibility.md` disagrees. Adding a feature with a later
baseline fails the build until either the feature goes or the published floor
moves.

**The floor is set by CSS, not by JavaScript**, and that is the interesting
result. `gap` on a flex container costs Safari 14.1; `inset` costs Chrome 87;
`clamp()` costs Firefox 75. Nothing in the JavaScript comes close, because the
client is ES5 plus promises — which is not nostalgia. A syntax the browser cannot
parse takes the whole file with it and cannot be feature-detected around. A
layout feature it lacks makes the spacing wrong. One of those is a white page and
the other is ugly.

## The finding: a fallback that removed the thing it was falling back to

```css
/* This is not graceful degradation. It is a way to lose both. */
.aetos-skiplink:focus,
.aetos-skiplink:focus-visible { outline: 3px solid; }
```

A comma-separated selector list is all-or-nothing in CSS. One selector the
browser does not recognise invalidates the **entire rule**, including the parts
it understands perfectly well. So on a browser without `:focus-visible` — Safari
before 15.4, March 2022 — that rule vanished, taking the plain `:focus` styling
with it.

And the main indicator, covering every focusable element in the client, had no
`:focus` form at all. The result on such a browser: focus fell back to whatever
the browser drew by itself, which is not the 3px 3:1 indicator A11Y-FOCUS-004
requires. That is a WCAG 2.4.7 failure, not a cosmetic difference — and it was
silent, because the author's browser supports the selector.

Now three separate rules: `:focus` for everybody, `:focus-visible` for browsers
that have it, and `:focus:not(:focus-visible)` to quieten pointer focus. That
third rule is itself discarded by browsers without the selector, which is exactly
right — they keep the always-on ring rather than losing it. Such a browser shows
the indicator more often than necessary, and that is the correct direction to
fail in: a keyboard user who cannot see focus cannot navigate at all; a mouse
user who sees one ring too many is mildly annoyed.

## The second finding: an accommodation that could not be switched off

A0's reduced-motion rule respects an explicit player choice, and its comment says
why: *"The explicit choice wins over the system setting in BOTH directions. A
player may want motion their OS is suppressing, and overriding them 'for their
own good' is the same paternalism pointed the other way."*

M4 had already put a blanket rule in the other stylesheet — every element,
unconditionally, whenever the OS asks for reduced motion. It ignored the
preference entirely, so a player who deliberately chose full motion still had it
removed.

The principle was written down, agreed, and defeated by a rule written eight
months earlier that nobody revisited. Deleted, not duplicated.

The M4-era test that pinned it (`test_reduced_motion_is_respected`) now asserts
against the rule that actually reads the preference — and it briefly passed on my
own explanatory comment, which is the prose-match defect this project keeps
producing. Caught because I checked what the assertion was matching.

## Mid-milestone: the defect Gary reported

Running a macro produced lines of raw markup on screen:

```text
<span class="color-002"><a id="mxplink" href="#" onclick="Evennia.msg(...)">setres</a>
```

The canonical event carried one text field, `originalText` — what the server
sent, markup included, because Evennia renders ANSI colour to HTML server-side.
The console's sanitiser handles that correctly. Four other places did not:

- **Display rules** matched, substituted and computed highlight offsets against
  the markup. The console renders `displayText` with `textContent`, on the
  documented assumption that it is plain — so the moment any rule touched a
  coloured line, the player was shown the tags. The console's own comment says
  the offsets are "computed against plain text"; that was a description of the
  intent, never of the code.
- **The history panel** assigned `originalText` to `textContent`
  unconditionally, so *every* coloured line showed as markup there.
- **History search** matched the markup: "span" matched every coloured line,
  while a word split by a colour change matched none.
- **Review Mode's announcement** included the markup, so a screen reader read
  "span class equals color hyphen zero zero two" before every coloured line.

**Triggers were the one place that got it right**, and their comment says exactly
why: matching against HTML would make a player's pattern depend on colour codes
they never see. Four other places had the same requirement, and each either
solved it separately or not at all. That is the shape worth remembering: the
knowledge existed in the codebase, in a comment, next to a correct
implementation, and did not spread.

Fixed by deriving the plain rendering **once**, in `normalize`, and carrying it
on the event as `plainText`. `originalText` is untouched and is still what the
console sanitises, so colour is preserved. The derivation is guarded on the text
containing `<` at all, because most lines contain no markup and M25 had just
taken a DOM round trip off that path.

Proven end to end in the client: a highlighted coloured line now renders
`setres  You are danger: badly hurt.` with a real `<mark>` and no tags.

## Accessibility -- definition of done (A.97)

- **Keyboard-findable / operable:** unchanged; the focus fix restores an
  indicator that was missing on older browsers.
- **Accessible name / steals focus:** unchanged.
- **Announces?** Review Mode now announces words instead of tag names.
- **Colour alone?** No.
- **axe:** clean at every severity after the CSS changes.
- **Human AT testing:** at A8. Two items go with it: whether the extra focus
  rings on an older browser are a nuisance in practice, and cross-browser
  verification generally.

## Not built here

- **No cross-browser test run.** One Chromium is available and everything else in
  the matrix is labelled "expected from feature support data. Not run." That
  labelling is the deliverable — a matrix that does not distinguish tested from
  assumed is worse than none, because it reads as evidence.
- **No polyfills.** They would raise the floor's complexity to lower its number,
  and the degradation is already acceptable.
- **No `@supports` blocks.** Nothing currently needs one; the two features with
  meaningful fallbacks are handled by CSS's own cascade rules.
