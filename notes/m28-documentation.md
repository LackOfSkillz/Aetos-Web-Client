# M28 -- Documentation

Status: **COMPLETE**

Verification: 1168 Python tests OK (up from 1156). The three new help topics
confirmed live in the client, and the feature reference regenerated from them.

## What a documentation milestone is actually for

The README's closing paragraph listed ten things as *still to come*:

> an accessibility foundation and assistive-technology validation, rich chat and
> event history, audio and multimedia with captions, themes, a PWA shell and
> touch gestures, a developer inspector, a documented widget SDK, a
> server-described advanced UI manifest, picture-supported communication, and
> voice input

**Nine of the ten had shipped.** Only voice was genuinely outstanding.

This is the file that ships with the contrib and the first thing an Evennia
reviewer reads. It was correct when it was written and had been quietly wrong for
nine milestones, describing software that no longer existed in that form.

It is the same shape as M24's `page-has-heading-one`: a true statement that
stopped being true, in a place where being wrong produces no error and no
symptom. Documentation does not fail loudly. That is the whole problem with it.

## What was actually wrong

**The features list.** Rewritten to describe what ships, in four sections rather
than one, because the client has grown past a single bullet list.

**A section recommending an unbuilt setting.** "Teaching Aetos about your game"
opened with *"tell Aetos where your data already lives with `AETOS_BINDINGS`"* and
*"run the server-side Aetos Discovery helper"*. Neither exists. Nothing reads
`AETOS_BINDINGS`; there is no management command in the contrib at all. A reader
following the documentation top-down would have written a settings block that
does nothing, with no error — and M27's startup checks deliberately do not warn
about a setting no code consumes, because a check for one would be a promise the
code does not keep.

Bindings are still mentioned, in a blockquote that says plainly that they do not
exist and that setting them does nothing. Deleting the mention would lose the
design; leaving it as an example would keep the trap.

**Three settings with no documentation at all.** `AETOS_UI`, `AETOS_DIAGNOSTICS`
and `AETOS_CSP` were readable by the code and absent from the README. There is
now a table of every setting with a link to where each is described in full.

**Three player features with no help topic.** Review Mode and history search,
automation groups, and installing the client / what happens offline. All three
have real interfaces that a player has no way to discover. Written and added; the
feature reference regenerated from them.

**Markdown that only worked in one of its two renderers.** One topic used
`**bold**`. The same string is rendered as markdown on the website, where it
worked, and as `textContent` in the client, where it showed the asterisks. One
source with two renderers means the markup has to be what *both* understand,
which is none.

## The tests are the point

Prose cannot be tested for quality. It can be tested for having become false, and
these are the three ways this documentation can:

- **A settings example that no longer validates.** Every `AETOS_*` assignment in
  a fenced Python block is parsed out and run through the same validator the
  server uses. Parsed rather than executed — a README is text, and running it to
  check it would make the suite do whatever a future editor pasted in.
- **A shipped feature described as forthcoming.** Each phrase is paired with a
  file that exists only once the feature does. And **voice is pinned in both
  directions**: the test fails when voice ships and the README still promises it,
  which is the only mechanism that would have caught the other nine.
- **The generated reference falling behind its source.** Every help topic title
  must appear as a heading in `features.md`, with the regeneration commands in
  the failure message.

Plus two guard tests, because the failure mode of a test like this is passing
while checking nothing: the settings-example test asserts it found at least four
examples, and the forthcoming test asserts every path it checks actually exists.

## One tooling fix

`export_help_docs.js` reads the **published mirror**, not the Evennia work tree —
correctly, since somebody who cloned this repository has no `evennia/` directory.
The cost is that editing `help.js` and running the exporter regenerates from the
last mirrored copy and reports success. That happened here.

It now compares the two and refuses to run when they differ, naming
`sync_contrib.py` as the fix. Verified by triggering it.

## Accessibility -- definition of done (A.97)

The README's accessibility section gained the A-track work and one sentence that
matters more than the rest:

> **This is not a claim of AAC support.**

The picture-and-word board is described as what it is — a symbol-supported way to
compose commands — and the honest-status section now says explicitly that it has
not been reviewed by anyone who works with augmentative and alternative
communication, and that Aetos will not describe itself as supporting AAC until it
has. A.94 and A.100 require that, and a documentation milestone is exactly where
a claim like that would have crept in.

The same section now states what a clean axe run is worth: it finds missing
names, broken roles and unreachable regions, and cannot tell whether a label
means anything or whether a braille display keeps its place.

- **Keyboard-findable / operable:** three new help topics, reachable the same way
  as the other twenty.
- **Announces / steals focus / colour alone:** unchanged.
- **axe:** not re-run. Nothing axe examines changed except help content rendered
  through the existing renderer. Recorded as a deliberate omission.

## Lab hazard addendum

A third and nastier variant of the stale-asset trap: `?v=` is computed from the
*source* file's mtime while `/static/` serves the *collected* copy. Request the
page in the window between those two updates and the browser caches stale content
under a new, correct-looking version — after which "check `?v=` changed" gives a
false all-clear. Recorded in `lab-hazard-001` with the ordering that avoids it and
the one incantation that recovers from it.
