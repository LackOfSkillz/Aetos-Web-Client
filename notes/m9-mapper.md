# M9 -- Universal mapper

Status: **COMPLETE** (levels 0-1; levels 2-4 need game-supplied metadata)

Verification: 211 Python tests OK. Click-to-walk and route-stop verified live.

## What exists

- `map_layout.py` -- coordinate assignment, routing, and the non-visual
  surroundings description. Pure graph code, no DOM, fully unit tested.
- `static/aetos/js/map.js` -- SVG map, text map, click-to-walk.
- Route walking with failure detection in `aetos.js`.

## Server-side layout, deliberately

Blueprint section 58 lists map layout and pathfinding as Python-tested, and the
work is pure graph manipulation with no DOM involvement. Putting it on the server
makes it deterministically testable -- 36 tests covering determinism, stability,
collisions, disconnected components and routing -- rather than something only
observable through a browser.

## The properties that matter

**Deterministic.** The same graph always produces the same coordinates. Tested
against repeated runs, reversed input ordering, and default origin selection --
a provider may return rooms in any order, since database iteration order is not
guaranteed, and the layout must not depend on it.

A map that reshuffles itself between syncs is worse than no map, because the
whole value of a map is the mental model a player builds from it.

**Stable.** Adding a room does not move rooms already placed. Layout proceeds
breadth-first outward from the origin and never revisits a placement.

**Honest about failure.** Real MUD geography does not close squarely: three rooms
joined north/east/west cannot be drawn on a grid without a collision. Rather than
silently stacking them, the layout nudges deterministically and *records* the
conflict, and the widget says "Layout approximate here: N rooms do not fit the
grid." A map that quietly lies about the world is worse than one that admits
where it is guessing.

**Non-directional exits are handled, not rejected.** "enter the tent" has no
vector. The room is still placed and reachable, and flagged as non-geographic.

## The text map is not a caption

Blueprint section 47 requires every visual map to have a nonvisual equivalent.
That is easy to satisfy badly -- bolt a description onto a picture and let the
two drift apart.

Here the server generates the coordinates and the surroundings description from
the same graph in one pass, and both views render from the same store section.
Neither can silently disagree with the other.

The text map reads as prose, not coordinates: "Current location: Town Square.
Exits -- north: North Road, up: Limbo. Nearby -- Old Forest, 2 rooms away." A
player navigating by ear needs the destination name, not "(3, -1, 0)".

Both views are equally operable: clicking a room walks there, and so does
activating its entry in the text list, because both are real buttons calling the
same route function.

The SVG itself is `aria-hidden` -- the text beside it carries the same
information in a form assistive technology can actually use, so exposing the
picture too would only produce noise.

## Click-to-walk stops on failure

Blueprint section 22: a route must stop rather than continue blindly.

Success is detected structurally -- the room id after a step differs from the id
before it. That needs no cooperation from the game and no parsing of failure
messages in any particular language, which would have been fragile and
English-only.

Verified live: walking `south, nowhere, south` moved one room, then halted with
"Route stopped: could not go nowhere." The third command was never sent. Without
this, the remaining steps would fire from a room the player is not in and land
them somewhere they never chose.

The route also pauses on disconnect rather than dumping queued movement on
reconnect (section 60).

Routing is one-way-aware: Evennia exits are directional objects, so a route never
assumes a way back exists. Tested -- otherwise click-to-walk would happily send a
player into a one-way drop.

## Mapping levels

- **Level 0-1 complete**: ordinary rooms and exits, directional placement, Z
  levels, no game cooperation required.
- **Levels 2-4** (zone metadata, explicit coordinates, custom world maps) are
  provider work. A game supplying its own `positions` keeps them -- the layout
  step is skipped rather than overriding the game.

## Deferred

- Pan/zoom, fog of war, POIs and map notes -- M11 covers personal annotations.
- Only the current Z level is drawn; overlaying levels produces an unreadable
  tangle. A level switcher belongs with pan/zoom.
