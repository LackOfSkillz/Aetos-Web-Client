# A3 -- Accessible map completion

Status: **COMPLETE**

Verification: 508 Python tests OK (up from 486). axe clean. Live-verified,
including a sync arriving while the search field had focus.

Retrofits M9.

## What M9 already had

Three of the five A11Y-MAP requirements were already met, which is what
[`decision-003`](decision-003-accessibility-is-a-gate.md) was for -- the mapper
was built with a text form from the start rather than having one added later.

```text
A11Y-MAP-001  current room stated              already met
A11Y-MAP-002  exits as buttons, named          already met
A11Y-MAP-005  SVG hidden from the a11y tree    already met
A11Y-MAP-003  route written out                MISSING
A11Y-MAP-004  places searchable                MISSING
```

## Routes are written out (A11Y-MAP-003)

Choosing a destination now produces an enumerated route:

```text
Route to Greyhaven Bank
3 steps
  1. north to North Road
  2. east to Market Row
  3. north to Greyhaven Bank
```

An `<ol>`, not a `<ul>`, because **the order is the information**. A screen
reader announcing "3 of 5" gives the player their position in the journey for
free; an unordered list throws that away.

The step count comes before the steps, because "five steps" is what decides
whether to go now and the list is what decides how.

**Not a confirmation step.** Clicking still walks. Adding a dialog to every
movement would punish everyone in order to satisfy a requirement about text, so
instead the route simply *becomes readable*: announced as a summary, and left in
the panel to be read at the player's own pace -- or checked afterwards to work
out why they ended up somewhere unexpected.

It is generated from **the same step list the walker executes**. A parallel
description could drift, and the one the player was reading would eventually be
the wrong one.

A route describes the map it was found on, so it is dropped when the current
room changes. Yesterday's route beside today's rooms is worse than no route.

## Places are searchable (A11Y-MAP-004)

A filterable list of everywhere the player could go, merging two sources:

- rooms the map has walked to, which the game supplied
- the player's own points of interest -- which since M11 are notes with a room
  subject and a `poi` flag, never leaving the browser

Merged because someone looking for "the bank" does not care which source it came
from. **Labelled** -- "(your note)" in words -- because one is the game's
knowledge and the other is the player's own, and blurring them would be the same
mistake as confusing a game relationship with a private tag. Said in words
rather than shown with an icon, because the visual marker is unavailable to
exactly the player this list exists for.

Sorted nearest first, with unreachable entries last. A POI on a room the map has
not reached is still worth listing, just not above the ones you can walk to --
and it renders as plain text rather than a disabled button, because a disabled
button suggests the route might exist.

The picture answers "what is around me" by being looked at. This answers it by
being read and filtered, which is the only form of the question available to
somebody who cannot see the picture, and is faster than the picture for anyone
hunting one specific place.

## THE A0 TEST CAUGHT MY OWN DEFECT, CORRECTLY

The first version of the search box re-rendered the entire widget on every
keystroke and then called `focus()` to put the player back in the field.

`test_no_server_driven_module_moves_focus` failed on `map.js`, and it was right
to. The `focus()` call was a workaround for a DOM being destroyed for no reason,
and it could not fix the real problem underneath: **a sync arriving while
someone was typing would rebuild the field under them**, and no amount of
restoring focus recovers a value that has already been thrown away.

Restructured to a stable skeleton (A11Y-FOCUS-005). The widget builds its
containers once at mount; updates refill them. The search input in particular is
**never replaced**, so nothing has to restore focus because focus never moves.

Verified live: typing filters the list with focus intact and the same DOM node,
and a sync pushed while the field had focus left both the focus and the typed
value untouched. Under the original design that sync would have destroyed both.

The listener is bound once behind a guard, because `update` runs on every sync
-- binding there unguarded would add a listener per sync, and a hundred syncs
later every keystroke would rebuild the list a hundred times.

**Worth keeping:** the A0 foundation paid for itself two milestones after
shipping, on a defect I introduced and would not otherwise have noticed. The
symptom is invisible to anyone testing with a mouse who is not also typing when
a sync happens to land.

## Announcements are categorised

Walking is `movement` / `important`. A route that cannot be found is `system` /
`important`. Nothing in the map is `critical` -- the interrupting region is for
the connection dropping, and "no route to that location" does not meet that bar.

## Accessibility -- definition of done (A.97)

- **Keyboard-findable / operable:** yes; every exit, landmark and place is a
  real button, and the search field is a labelled input.
- **Accessible name:** "Local map"; the search field has a visually hidden
  label, since an unlabelled search box is announced as "edit" and nothing else.
- **Graphical?** There is an SVG, but `graphicalOnly` stays **false**: the text
  form is generated from the same graph, so this is one dataset with two equal
  renderings rather than a picture with a caption.
- **Announces?** Yes -- movement and route failures, through the announcement
  manager, categorised.
- **Steals focus?** No, and now provably: zero `focus()` calls in the module.
- **Preserves review position?** Yes, for the search field specifically, which
  is the part a player is most likely to be reading when a sync lands.
- **Colour alone?** No; "(your note)" and distances are text.
- **200% / 400%:** lists and text; the SVG scales.
- **axe:** clean.
- **Human AT testing:** yes, at A8. The open question a machine cannot answer is
  whether the places list is genuinely faster than the picture for someone who
  uses it every session, or merely present.
