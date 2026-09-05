# M4 -- Aetos shell: console, input, surroundings widgets

Status: **COMPLETE** (pending full-suite reconfirmation)

## What exists

Zero-configuration experience (blueprint section 11) on a pristine game:

| Capability | Status |
|---|---|
| Game output with ANSI colour | done |
| Command input (keyboard + button) | done |
| Room title and description | done |
| Exits, as clickable/keyboard buttons | done |
| Room contents split into People / Items | done |
| Local graph map data | done (data only; visual widget is M9) |
| Connection status | done |
| Command history | not yet -- M4 follow-up |
| Hotbar / layout editing / themes / notes | later milestones |

## How state reaches the client

A pristine Evennia game has no hooks that call into Aetos, so requiring push
would break the zero-configuration promise. The client therefore **requests**:

```
connect -> aetos_hello -> aetos_manifest -> aetos_request_sync -> aetos_sync
```

and re-requests after each command it sends, debounced at 200ms so a burst of
commands costs one request rather than one per command.

A game wanting true push calls `state.push_sync(session)` from its own typeclass
hooks. That is an opt-in improvement, never a requirement.

## Design decisions

**Everything interactive is a real `<button>`.** Not a styled div. Tab reach and
Enter/Space activation come free from the platform, which is the cheapest possible
way to satisfy the keyboard-only requirement (blueprint section 50). Verified: 6
focusable elements, 0 non-semantic clickables.

**Plain and display forms are separate.** Provider names may carry Evennia colour
markup. An exit button sends `entry.name`, which is markup-stripped plain text --
exactly what a player would type. Rendering uses `entry.display`, which is HTML.
Conflating them would send markup into a command the server cannot parse.

**Empty widgets hide rather than render empty.** A game with no items shows no
"Items Here" panel. Showing empty boxes would contradict the progressive-
enhancement promise that unknown features simply do not appear.

**Sidebar stacks on narrow viewports rather than hiding.** Hiding it would remove
the only non-visual route to exits and room contents on a phone.

## BUG FOUND AND FIXED -- items classified as people

The entity provider classified a **brass lamp as a character**, listing it under
"People Here".

Cause: `_classify` tested `hasattr(obj, "at_pre_puppet")` on the assumption that
only character-like typeclasses define puppet hooks. In fact `at_pre_puppet` is
defined on `DefaultObject` (evennia/objects/objects.py:2120), so **every object in
the game has it** and the test matched everything.

Fix: classify against the game's own `settings.BASE_CHARACTER_TYPECLASS` via
`is_typeclass(..., exact=False)`. This is genre-agnostic -- it uses whatever the
game configured rather than any class Aetos hardcodes -- and a game with a custom
character typeclass is classified correctly.

Regression tests added in `tests/test_providers.py::TestEntityClassification`,
including one that repoints `BASE_CHARACTER_TYPECLASS` to prove the classification
follows the setting rather than a hardcoded class.

Found only because the shell was exercised against real game objects. The unit
tests passed throughout -- `EvenniaTest.obj1` and `char2` happened to sit either
side of the faulty predicate in a way that hid it.

## Second bug -- raw colour markup in widgets

Room descriptions rendered as literal `|wEvennia|n`.

Cause: Evennia's Portal converts markup to HTML only for the `text` outputfunc.
Anything Aetos sends in its own messages arrives raw.

Fix: `state.py` converts with Evennia's own `text2html.parse_html`, producing the
same `color-NNN` classes `ansi.css` already styles, so widget colour matches the
console exactly.

## Lab world

A small demo world now exists in `aetos_testgame` for QA: Limbo -> Town Square ->
North Road, plus a brass lamp. Not part of the contrib. Blueprint section 68's
example game is a later deliverable.

Note: the first attempt gave Town Square two exits both named "north", which is
ambiguous to Evennia's own parser. That was bad test data, not an Aetos defect.

## Outstanding

- [ ] Full Evennia suite reconfirmation with M3/M4 code present
- [ ] Command history (up/down recall)
