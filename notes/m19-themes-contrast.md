# M19 -- Themes and contrast validation

Status: **COMPLETE**

Verification: 830 Python tests OK (up from 791). axe clean on the themes list
and on the contrast report rendered in its failing state. Theme switching,
accommodation override and the validator all exercised live.

Addendum A.55, `A11Y-VIS-003`.

## What the requirement actually asks for

> Themes MUST meet contrast requirements. Theme validation MUST be part of
> theme acceptance. A custom theme that fails minimum accessibility
> requirements MUST produce a developer/user warning.

Three separate things, and the middle one is the interesting one. "Validation
must be part of acceptance" is not satisfied by shipping a checker somebody can
run; it has to happen at the moment a theme is saved.

## The finding: Aetos's own default theme failed

The first thing the validator did was fail the theme the client has shipped
since M4.

```text
--aetos-border is 1.37:1 against --aetos-bg
   -- panel borders against the background needs at least 3.0:1.
```

That is not a marginal miss. A panel differs from the page background by
**1.09:1** -- effectively nothing -- so the border is the *only* thing
separating one region from another. At 1.37:1 there were no visible panel edges
at all for anyone with reduced contrast sensitivity. The layout the client is
built around simply was not there for them.

Raised to `#616c7d`: 3.38:1 against the background, 3.11:1 against a panel.

Nobody caught it in a year of looking at this client, and that is the point. **A
palette chosen by eye passes for the person who chose it.** That is not a
criticism of anyone's judgement -- it is what having particular eyes means. The
author of an illegible theme is, necessarily, somebody who could read it. The
only way to catch this is to compute it.

`--aetos-focus` was also undeclared in the default theme, relying on a
`var(--aetos-focus, var(--aetos-accent))` fallback. It is declared now, because
**a token the validator cannot find is a token nobody checks.**

## The second finding: a theme could strip an accommodation

The test I wrote asserting that accessibility presets win found that they did
not.

A theme sets its colours **inline** on the document element via
`style.setProperty`, and an inline declaration beats any `:root` rule in the
cascade. So a player who had turned on high contrast and then chose a theme
would have silently lost the accommodation. The theme would simply win, and
nothing would say so.

Fixed with `!important` on every token in the high-contrast block. High contrast
is a *need*; a theme is a *preference*; a preference does not overrule a need.

I also wrote a test asserting themes are created before the accessibility layer,
which was both false and beside the point -- the two write to different things,
so JavaScript ordering decides nothing. It was replaced with one that asserts
the cascade, because a guarantee resting on initialisation order is a guarantee
that breaks the next time somebody reorders a file.

## Warn, do not refuse

A11Y-VIS-003 says "warning", and that is the right call rather than a
convenient reading of it.

A player who wants a theme Aetos considers unwise is entitled to have it.
Blocking the save would mean a tool overruling somebody about their own eyes,
which is a worse failure than the one being prevented -- and it would push
people towards not using the theme system at all, where nothing is checked.

What they are not entitled to is not being told. So the report names every
failing pair, its ratio, and **what that pair is for**:

```text
--aetos-text-muted is 2.10:1 against --aetos-panel
   -- secondary text on a panel needs at least 4.5:1.
```

A ratio alone tells an author they are wrong without telling them what to
change. It also says that an exported theme reaches other people, who did not
choose those colours.

Verified live against a plausible grey-on-grey palette: 11 of 11 pairs failed,
all eleven sentences produced, theme saved.

## Eleven named pairs, not every combination

Deriving pairs from the token list would produce dozens that never appear
together on screen, and a validator reporting failures nobody can see is one
people learn to ignore.

The muted colour is checked against **both** surfaces, because that is where
contrast themes usually fail: it is chosen to recede, and then recedes past
legibility.

Borders and the focus ring are checked at 3:1 as non-text elements, because they
carry structure. AA thresholds, not AAA -- committing to 7:1 would rule out most
legible palettes and push games towards ignoring the system entirely, which
helps nobody.

## A theme may only change colours

An allowlist of ten tokens. Not spacing, not type size, not the target size, not
the radius.

A theme that could ship CSS could hide content, override a focus ring, animate
something the player asked not to be animated, or reintroduce every
accessibility defect the client spent a year removing. Restricted to colours, a
bad theme is *illegible* -- visible, reported and reversible -- rather than
*broken*, which is none of those.

Two further consequences fall out of that:

- Switching themes **removes** tokens the new theme does not set, rather than
  leaving them behind. Otherwise one colour from the previous theme is stranded
  in the new one -- a combination neither author looked at, and therefore one
  nobody validated.
- Validation runs on `getComputedStyle`, not on what a theme declares. A theme
  setting six of ten tokens inherits the other four, so checking only the
  declared ones would miss exactly the failures partial themes cause.

"Default" sets nothing at all: it means "whatever the stylesheet says", so
removing a theme restores the shipped look exactly rather than a copy that can
drift from it. Built-in themes cannot be deleted, because a player who deleted
the only theme they could read would have no way back.

## Two implementations of one formula

Python for the shipped themes at test time, JavaScript for a player's own at
save time. The check genuinely has to happen in both places.

Duplication is a real cost, so they are pinned together: a test asserts both
require the same eleven pairs, both use the same two thresholds, both accept hex
only, and both use the WCAG luminance coefficients. Plus fixture ratios both are
held to. A validator that passes in one place and fails in the other would be
worse than either alone.

Hex only, in both. Supporting `rgb()`, `hsl()` and `color-mix()` would mean
reimplementing a CSS colour parser in order to reject one of them -- and **every
format that cannot be checked is a format a failing theme can hide in.**

## A naming collision, removed

M18 and A5 introduced `data-aetos-focus` for Focus Mode, which reads as the
focus *ring* -- especially now that `--aetos-focus` is a real token two lines
away. Renamed to `data-aetos-focus-mode` while it was still only in this repo.

## Accessibility -- definition of done (A.97)

- **Keyboard-findable / operable:** "Themes" and "New theme" in the palette's
  Comfort group; the editor is the standard dialog with labelled text fields.
- **Accessible name:** every field is labelled with its human name, not its
  variable name -- an editor reading `--aetos-text-muted` is an editor for
  whoever wrote it. Each theme's Delete button names its theme.
- **Announces?** The theme name on switching, and the contrast outcome on save,
  both at `important`.
- **Steals focus?** No.
- **Colour alone?** No -- and this is the one dialog where that mattered most.
  The active theme is `aria-pressed`, not a highlight, and the contrast report
  is sentences rather than red and green dots. A colour-coded warning about
  colour would be its own joke.
- **axe:** clean, including the report rendered in its failing state. That state
  is now in the QA suite, because a panel whose content only exists when
  something is wrong is a panel nobody has ever actually checked.
- **Human AT testing:** at A8. The open question is whether a theme editor is
  usable at all without sight -- the ratios make it *possible*, which is more
  than most clients offer, but ten hex fields is a poor way to build a palette
  for anyone. A set of pre-validated palettes to start from would probably serve
  better than the editor does.

## Not built here

No colour picker widget. `<input type="color">` is not keyboard-operable in any
consistent way across browsers and offers nothing to a screen reader, so hex
text fields are the accessible choice even though they look less friendly.

No theme sharing or gallery. Export already carries themes with the rest of the
profile (M5), and a gallery would mean distributing colour schemes whose
contrast Aetos vouches for only at the moment they were saved.
