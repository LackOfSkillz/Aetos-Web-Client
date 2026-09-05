# M10 -- Context actions and accessible context menus

Status: **COMPLETE**

Verification: 232 Python tests OK; 119 browser QA checks OK
(24 context menu, 22 resources, 38 layout, 35 storage).

## What exists

- `DefaultActionProvider` -- zero-configuration actions using only stock Evennia
  commands.
- Per-entity action attachment and validation in `state.py`.
- `static/aetos/js/menu.js` -- the accessible context menu.
- `browser-qa/qa-context-menu.js` -- 24 checks, keyboard-first.

## Actions travel with their entity

Each entity carries its own `actions` list rather than the client looking up a
parallel table. A lookup mismatch would let a menu render against the wrong
target -- invisible until a player acts on the wrong thing, which in a MUD can
mean attacking the wrong character.

## The default action set is real, not invented

Blueprint section 11 promises basic context actions with zero custom game code,
while section 10 forbids inventing data. Both are satisfiable because `look`,
`get` and `drop` genuinely exist in every stock Evennia install -- they are
default-cmdset commands, not genre assumptions.

`get` and `drop` are offered exclusively rather than together: which one is
useful depends on where the object is, and offering both would always show one
that cannot work. Exits offer traversal by their own name.

Note the asymmetry with resources, which is deliberate: there is no genre-neutral
way to guess what a game's resources are, so `resources` still defaults to
exposing nothing. Actions are different because stock commands exist.

A game replacing the action provider replaces it wholesale, so this default can
never fight a game's own menus. Tested: pointing the slot at the inert base class
removes every menu.

## Accessibility is the hard part, not the menu

A right-click menu is trivial and excludes everyone who cannot right-click.
Blueprint section 51 requires the Context Menu key and Shift+F10 as well, so the
ARIA menu pattern is implemented properly:

| Requirement | Implementation |
|---|---|
| Three ways to open | contextmenu event, `ContextMenu` key, `Shift+F10` |
| Trigger announces itself | `aria-haspopup="menu"`, `aria-expanded` maintained |
| Menu is identifiable | `role="menu"` with an `aria-label` naming the target |
| Items are identifiable | `role="menuitem"` |
| Focus enters the menu | first item focused on open |
| **Focus returns** | to the trigger on Escape, Tab, or activation |
| Arrow navigation | Up / Down / Home / End |
| Tab exits | roving tabindex -- exactly one item tabbable |
| Only one menu | opening a second closes the first |

**Focus return is the part that matters most.** A keyboard user whose focus is
dropped to the document has to tab through the entire interface to get back
where they were. It is not a nicety; without it the menu is technically operable
and practically unusable.

The one deliberate exception: clicking elsewhere dismisses the menu *without*
returning focus, because the user is looking somewhere else on purpose and
yanking focus back would fight them.

The trigger also shows a marker so the affordance is not mouse-discoverable
only -- a right-click menu nobody knows exists helps no one.

## Server authority unchanged

Every menu item sends ordinary command text. Offering an action does not make it
legal: a game that removed `get`, or locked a particular object, behaves
correctly without Aetos knowing anything about it. Tested that every generated
command is plain text and nothing is a privileged call.

## QA note

The first run of the context-menu suite reported zero triggers. That was a race
in the test, not a defect: store notifications are batched, so state arriving is
not the same moment as the DOM reflecting it, and the suite queried immediately
after login. A settle wait fixed it. Worth remembering when writing further
browser QA -- "the data is there" and "the DOM shows it" are different instants.

## Deferred

- Right-click on map rooms (the map has its own click-to-walk; a menu there
  belongs with M11's map notes and POIs).
- Relationship actions (Friend / Neutral / Enemy) -- M11, since they need local
  storage rather than server data.
