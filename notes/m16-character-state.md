# M16 -- Inventory, equipment, target and effects

Status: **COMPLETE**

Verification: 409 Python tests OK. Live-verified in the lab: all four widgets
register; equipment, target and effects render nothing because the lab game
declares none of them, which is the point.

## The interesting decision: which of the four gets a default

Only inventory.

`contents` is a stock Evennia concept. Every game has it, `inventory` is a
default-cmdset command, and carrying things is not a genre assumption -- so
`DefaultInventoryProvider` gives a pristine game a working inventory panel with
no code at all.

The other three get nothing. Evennia models no equipment slots, no current
target and no effect list. Naming slots "head, chest, legs" is as much a genre
assumption as calling a resource "health", and it is the exact assumption this
project forbids. A game that has not said it has equipment shows **no panel**,
rather than an empty paper doll implying a system it does not have.

This mirrors the split already made for resources and actions in M8/M10, so the
rule is now consistent across all eight provider slots rather than case by case.

## A countdown is display, never authority

An effect's `remaining` counts down in the client for smoothness. When it
reaches zero the row is marked **expiring** -- it is not removed.

Only the server knows when an effect ends. A client that removed it on its own
clock would show a player as clean while the server still had them poisoned,
which is a lie at exactly the moment it matters most. Section 2.4 in one line.

`remaining` is also a **duration, not a timestamp**. The player's clock may be
minutes off the server's, and an absolute time would be silently wrong for them
in a way nothing would ever surface.

## Announcements are for events, not ticks

Gaining or losing an effect is announced. The second-by-second countdown is not,
and its element carries `aria-live="off"` explicitly rather than by omission.

A live region updating every second would make the client unusable with a screen
reader -- flooding it with the one piece of information the player can read
whenever they choose to.

The tracker diffs by id rather than by count, because an effect ending as another
begins leaves the count unchanged, and that is exactly the moment a player most
needs to be told. The first sync is treated as state on arrival rather than a
burst of events, so reconnecting mid-fight does not read out the whole condition
list as if it had all just happened.

## Empty slots are kept

"Nothing on your head" is information. Dropping empty slots would make a bare
character indistinguishable from a game with no equipment at all, and a blank
cell reads as nothing whatsoever to a screen reader -- so the slot says `empty`
in words, with the dimming and italics as a shortcut for sighted players rather
than the information itself.

Slot order is the provider's. Only the game knows whether its slots read
head-to-toe, by hand, or by importance.

## One renderer for both sets of bars

A target's resources go through the same normaliser and the same
`renderResource` as the player's own. A player who has learned to read one has
learned to read the other, and the two cannot drift apart into disagreeing about
thresholds or rounding.

The game's `relationship` on a target is kept structurally distinct from the
player's private tags from M11. One is authoritative and the other is a personal
reminder nobody else can see; they arrive by entirely different routes and must
never be confused.

## Carried items resolve against the character

`_attach_actions` took the character's *location* as its container. Carried
objects are not in the room, so reusing it unchanged would have produced empty
menus on every inventory item -- silently, with no error. It now takes an
explicit container, and a test asserts a held lamp offers **Drop** rather than
**Get**.

## Also in this milestone

In-client help (`help.js`), the licence, the project README, the changelog and
the contrib mirror. Recorded in the changelog rather than here.

## BUG FOUND AND FIXED -- accumulated patch damage in `aetos.js`

`Aetos.help` was null after wiring. The cause was not the new code: an earlier
milestone's patch script had replaced **every** occurrence of `queue:
commandQueue,` instead of the first, injecting an eight-line block of service
properties into the `macros` and `triggers` factory calls.

That damage had been sitting there through at least two milestones without
detection, because it was:

- syntactically valid, so `node --check` passed
- semantically inert, because the extra properties were simply ignored
- silent at runtime, because `var` hoisting made them `undefined` rather than
  throwing

It only surfaced when my own single-occurrence replace matched the *first*
injected block instead of the real export.

Fixed by removing both injected blocks and putting `help` on the real export.
Guarded by `TestServicesAreWiredOnce`, which asserts each exported service
appears exactly once in `aetos.js`.

**The lesson worth keeping:** every `str.replace` in a patch script needs an
explicit count. Three of this project's bugs have now come from service wiring
in this one file, and all three were invisible rather than loud.
