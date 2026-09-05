# Milestone record template

Copy this for every milestone from A0 onward. Addendum A.97 requires that these
questions be *answered*, not merely considered — a record that does not address
them is not a completed milestone.

Answer "not applicable" freely where it is true, but say **why**. "N/A" alone is
indistinguishable from "we did not think about it", and the point of the
checklist is to make that difference visible six months later.

---

# M__ / A__ / D__ — <title>

Status: **COMPLETE** | **IN PROGRESS** | **BLOCKED**

Verification: <n> Python tests OK; <browser QA / axe results>.

## What was built

<What exists now that did not before.>

## The decision that shaped it

<The one choice a reader would otherwise question, and why it went that way.
If there wasn't one, say so — not every milestone has an argument in it.>

## Bugs found and fixed

<Especially the ones that were silent. A bug that threw is a footnote; a bug
that worked perfectly for its author and not for anyone else is the record.>

## Test defects corrected

<Where the test was wrong and the product was right. Recording these matters:
otherwise the next person reads a weakened assertion and assumes it was always
that loose.>

## Deferred

<What was consciously left, and to which stage.>

---

## Accessibility — definition of done (A.97)

| | |
| --- | --- |
| Can it be found with the keyboard? | |
| Does it have an accessible name? | |
| Does its semantic role match its purpose? | |
| Can it be operated without a mouse? | |
| If draggable, what is the non-drag operation? | |
| If graphical, where is the nonvisual equivalent? | |
| If dynamic, should it announce? | |
| If it announces, does it go through `AetosAnnouncementManager`? | |
| Can it steal focus? | |
| Does it preserve review position? | |
| Does it rely only on colour? | |
| Does it respect reduced motion? | |
| Does it survive 200% text resize? | |
| Does it survive 400% zoom / 320px reflow? | |
| Are touch targets large enough (24px min, 44px preferred)? | |
| Could it create excessive cognitive interruption? | |
| Can someone reorient after being interrupted? | |
| Does it expose private accessibility information? | |
| Has axe tested it? | |
| Has keyboard QA tested it? | |
| Does it require human assistive-technology testing? | |

### Issue classification (A.96)

Any accessibility defect found is recorded at one of these levels:

```text
A11Y-BLOCKER   Cannot complete a core game action.
A11Y-HIGH      Possible only with severe workaround, focus loss,
               or inaccessible information.
A11Y-MEDIUM    Usable but inefficient or confusing.
A11Y-LOW       Polish, verbosity, convenience.
```

No `A11Y-BLOCKER` may remain at release. No known `A11Y-HIGH` may remain without
explicit release review.

---

## Note for D-track stages

The D-track produces no player interface, so its A.97 answers are legitimately
"not applicable — server-side developer tooling". **State that explicitly in the
record** rather than deleting the section. A missing checklist and an
inapplicable one look identical in a diff.

D-stages carry their own gate instead — the `DISC-` requirements: server-side
only, no player protocol surface, no arbitrary code execution, no automatic
source mutation, path boundaries enforced, sensitive data redacted.
