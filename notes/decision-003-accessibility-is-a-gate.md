# Decision 003 -- Accessibility is a gate, not a phase

Date: 2026-09-04
Status: **Accepted**, and **extended at M16 by Addendum A**
(blueprint revision 2, sections 45-52, 72)

> **Amendment.** [Addendum A](../docs/addendum-a-accessibility.md) supersedes
> the M30 references below. This decision argued that accessibility is a gate
> rather than a phase; Addendum A agrees and goes further, withdrawing M30
> entirely in favour of a foundation stage plus requirements inside every
> milestone, ending in validation.
>
> Everything else here stands unchanged and is strengthened rather than
> replaced. Where this document says "M30 remains in the plan as a verification
> pass", read **A8** -- which is that verification pass, with the scope the
> addendum defines.
>
> The one thing this decision got wrong is scope, not direction: it treated
> contrast and ARIA labels as safely fixable late. Addendum A's A11Y-BRL and
> A11Y-COG requirements show that braille review position and cognitive
> orientation are structural too, in the same way the mapper's text rendering
> was.

## Decision

Accessibility is a **completion criterion for every widget**, applied
continuously, not a review performed once at M30.

> No core Aetos widget is finished until it is usable without vision and usable
> without a mouse.

M30 remains in the plan, but as a *verification* pass over work that was already
built accessible -- not as the point at which accessibility gets added.

## Rationale

Revision 1 placed accessibility as a single late section. That ordering reliably
produces retrofits, because the expensive parts are structural rather than
cosmetic:

- The mapper needs a textual location/exits/landmarks rendering (section 47). That
  is a **data model** requirement. Discovering it at M30 means redesigning the map
  widget built at M9.
- Resources need announcement thresholds (section 48) in their schema at M8.
  Bolting them on later means every resource widget already assumed it announces
  everything, or nothing.
- Every drag interaction needs a keyboard equivalent (section 16). Designing drag
  first and keyboard later produces two divergent interaction models.

Contrast colours and ARIA labels can be fixed late. Data models and interaction
models cannot. So the gate has to be per-widget.

## Applies retroactively

This rule binds work already completed, not only future milestones. The M4 shell
was audited against it on adoption; see `phase-1-accessibility-audit.md`.

## Consequences

1. Every widget's tests include at least one assertion about non-visual operation
   (semantic role/label present, or keyboard path exercised).
2. A widget with no keyboard path is incomplete, regardless of how it looks.
3. No status may be conveyed by colour alone.
4. Aetos does not talk over assistive technology. Speech synthesis is off by
   default in screen-reader mode; semantic HTML and ARIA are the primary output
   channel (sections 52, 100).
5. Voice input (M33) is an accessibility *enhancement* and never a substitute.
   Keyboard-only and screen-reader operation must be complete without it -- a
   browser lacking speech recognition must still be fully usable.

## Relationship to voice

Voice is explicitly not the accessibility story. It degrades to nothing where
unsupported (section 95), so anything that depended on it would break entirely on
those browsers. Keyboard-only and screen-reader support carry the requirement;
voice adds convenience on top.
