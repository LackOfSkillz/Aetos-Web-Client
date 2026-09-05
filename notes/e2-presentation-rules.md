# E2 -- Non-destructive presentation rules

Status: **COMPLETE**

Verification: 615 Python tests OK (up from 596). axe clean, including one
finding fixed. Gate proven live.

## The gate

> Hidden or substituted output remains fully recoverable from canonical
> history.

Two events ingested with a filter, a highlight and a substitute rule active:

```text
console lines drawn              1     the rain line was filtered from view
canonical log grew by            2     both were recorded
automation saw the filtered line true  a trigger would still fire on it
findable by search               1
canonical text                   "The rain falls steadily."   -- unaltered
highlight                        <mark>orc</mark>, announced "Enemy: orc"
```

That is the whole milestone. Hiding is a display decision; it is not a fact
about the game, and it is not deletion.

## Four kinds, one rule

`highlight`, `substitute`, `filter`, `collapse`. Each produces **presentation
metadata** -- `displayText`, `spans`, `hiddenInView`, `collapsed` -- and none of
them can touch the canonical event, the store, or what a trigger saw.

E0 already made that structurally true by handing the presentation stage a copy.
This file is careful anyway: `present()` builds a fresh result object and never
writes to the event it was given. Defence in depth for a property that is very
hard to notice losing -- a filter that quietly broke a trigger would look like
the trigger being broken.

The word *gag* is avoided in the interface. It names the wrong mental model, and
the wrong mental model is precisely the bug.

## Substitution drops spans rather than adjusting them

A replacement that changes length invalidates every offset computed against the
original. Carefully recomputing them is where this kind of code goes wrong, so
it does not: the spans are dropped.

**Never stale offsets on altered text.** A highlight pointing at the wrong words
asserts something false about which part mattered, which is worse than no
highlight at all.

## Colour is not the meaning

A rule stores a **style token**, not a colour. The theme decides what it looks
like -- a rule storing `#ff0000` would be unreadable in a high-contrast theme
and unchangeable by one.

And every highlight carries a label, rendered as visually hidden **text** rather
than an `aria-label`. The mark reads as "Enemy: orc".

## AXE FINDING: `aria-label` on a roleless element

My first version put the label in `aria-label` on the `<mark>`. axe reported
`aria-prohibited-attr` as *incomplete* -- it could not determine whether the
attribute would be honoured.

That is a fair description of what actually happens: `<mark>` carries no
implicit role, and `aria-label` on a roleless element is not reliably supported
across screen readers. "Probably announced" is not a standard worth shipping for
the only channel that conveys the highlight to a non-visual reader.

Replaced with a visually hidden `<span>` inside the mark. Real text in the DOM
is announced by everything, everywhere, with no ARIA involved. The incomplete
finding is gone.

## TWO BUGS, BOTH FROM ASSUMING AN API

**`storage.put` takes three arguments**, not two. The object store's `keyPath`
is `"key"`, which the backend fills in from the key argument; a two-argument
call writes a record with no key and IndexedDB rejects it outright. That one at
least failed loudly.

**`storage.all` returns `{key, value}` wrappers**, not the values. Reading the
wrapper produced objects with no `kind`, which `normalizeRule` then discarded --
so **every rule silently vanished on load while `save()` reported success**.
Rules appeared to save and then simply did not exist.

Both were avoidable by reading one existing caller -- `notes.js` does
`rows.map(row => row.value)` three lines from where I would have looked. Worth
remembering: when using an internal API for the first time, read a working
caller before reading the signature.

## LAB BUG: adding a namespace needs a schema bump

`display_rules` was added to `NAMESPACES` and the first write threw
`NotFoundError: One of the specified object stores was not found.`

IndexedDB creates object stores **only during a version upgrade**. A new
namespace on an unchanged `DB_VERSION` works perfectly on a fresh browser and
fails on every existing install -- and it fails on the player's machine, not on
the developer's, which is the worst possible distribution of that failure.

Bumped 1 -> 2. The upgrade handler already created only missing stores, so the
bump loses nothing. Guarded by a tripwire test pinned to the current
(namespace count, version) pair: adding a namespace now fails the suite, and the
fix is to bump the version -- which is the moment to remember why.

## Lab hazard, again: stale static and a stale page

Two separate staleness problems bit during this milestone.

`evennia reload` does not always re-run `collectstatic`, so an edited file can
be correct on disk and stale in `server/.static`.

Worse, `location.reload(true)` in the browser pane did **not** re-execute the
new script: the fetched bytes were correct while the running page still had the
old function. Navigating to a fresh URL fixed it.

The diagnostic that settled it was fetching the script from inside the page and
comparing it against the running behaviour. When a verified change appears to
have no effect, check what the page is *executing*, not what the server is
*serving*.

## Deferred

A rule **editor** is not built. Rules can be created through
`Aetos.displayRules.save()` and are stored, applied and listed in the privacy
panel, but there is no dialog for them yet.

That is a real gap against the project's own rule that no feature should exist
only behind a console, so it is recorded rather than glossed: the editor belongs
with E3, which adds automation groups and will want the same editing surface for
grouping rules. Building one editor for both is better than building one now and
rebuilding it in a fortnight.

## Accessibility -- definition of done (A.97)

- **Keyboard-findable / operable:** no new controls yet (see Deferred).
- **Announces?** No. Rules change how the console draws; announcements are
  decided independently, which is C.10 and is now also enforced by the pipeline.
- **Steals focus?** No.
- **Colour alone?** No -- style tokens plus a text label, and the mark is
  underlined as well as tinted so it survives a high-contrast theme.
- **Preserves review position?** Yes; rules never touch the log or history.
- **axe:** clean, after fixing the `aria-prohibited-attr` finding above.
- **Human AT testing:** yes, at A8. The open question is whether a highlight
  announcing "Enemy: orc" mid-sentence helps or interrupts -- a person reading a
  combat log will know within a minute, and no automated check ever will.
