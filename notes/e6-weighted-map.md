# E6 -- Mapper metadata and weighted routing

Status: **COMPLETE**

Verification: 1066 Python tests OK (up from 1036). Both routing implementations
exercised live against the same fixtures and found to agree on every one.

Addendum C.19. E6's widget-SDK half (versioned contract, failure containment)
shipped at M22.

## What a game can now say about an edge

```python
{"from": "#42", "to": "#85", "command": "climb cliff",
 "cost": 8, "available": True, "reason": "Difficult climb"}
```

Both fields optional, and the defaults are chosen so that a game which adopts
neither is completely unaffected.

## Without costs, this is exactly the search it replaced

The property that mattered most. Every edge defaults to cost 1, so the cheapest
route is the one with fewest moves — which is what breadth-first search already
produced. Not an approximation of the old behaviour: the same behaviour, reached
by a more general route.

Dijkstra, as C.19 permits and as is genuinely sufficient here: `edge_cost`
clamps costs non-negative by construction, so nothing more elaborate buys
anything.

Three cheap moves now beat one expensive one, which is the case a move-counting
search gets wrong and the entire reason weighting exists.

## Silence means available

`available` absent is an ordinary exit. Treating silence as "blocked" would
empty the map of every game that has not adopted the field — the same
progressive-enhancement rule the manifest follows.

Routing excludes a shut door. **Describing the map does not.** A player is
entitled to know a door exists and is closed, and a map that silently omits it
looks like a map with a missing room, which is a worse thing to be looking at.

The layout also keeps unavailable edges, and that distinction is worth stating:
**position is geography, availability is a state of the door.** Dropping a shut
door from the layout would move rooms around on the map whenever one closed.

## The ambiguity rule, in the one place it bites

C.19 forbids inferring skill, class, guild, weather or roundtime restrictions.
C.6 says `unknown` is preferable to wrong.

So when a route fails, Aetos repeats the game's own reason verbatim:

> "No route to that location. The gate is barred."

and where the game supplied none, says only the first sentence. A guessed
explanation — "you probably need a key", "the weather may be blocking this" —
is exactly the confident error that costs a player their trust in the whole
map, and once lost that is not recoverable by being right afterwards.

A test strips comments from `map_layout.py` and fails on the words `skill`,
`guild`, `weather`, `roundtime`, `climb`, `swim`, `stand` and `retreat`
appearing in executable code.

## Two implementations, pinned together

The server routes and so does the client — the latter so that clicking a room
needs no round trip. Two shortest-path implementations that can disagree are
worse than one, because the disagreement surfaces only as a route that fails
halfway.

Verified live rather than only asserted structurally. The same fixtures through
both:

```text
                    server          client
weighted            east, north     east, north
uniform (no costs)  north, east     north, east
one exit barred     north, east     north, east
longer-but-cheaper  3 moves         north, north, north
cost absent         1               1
cost true           1               1
cost -5             1               1
cost 1e308          10000           10000
cost 8              8               8
unreachable         None            null
```

Three of those defaults are worth naming:

- **`true` is not a cost of 1.** In Python `True` is an int, so it would have
  meant 1 by accident. Right by accident is wrong as a habit, and both sides
  refuse it explicitly.
- **A negative cost is refused.** It would let a route improve by walking in
  circles, which Dijkstra cannot express and no game means.
- **Costs are clamped at 10000.** Not a judgement about what "expensive" means
  — arithmetic hygiene. A cost of `1e308` makes every comparison in the search
  meaningless, and a provider returning a bad number should not be experienced
  by a player as a map that silently stops routing.

Ties break on room id on both sides, because a map that suggests a different
equally-good route on each sync is one nobody can follow.

## A deliberate non-optimisation

The client uses a linear scan for the cheapest unsettled room rather than a
binary heap. A map is tens of rooms, not thousands; a heap here would be more
code to get wrong for a saving nobody could measure.

Written down rather than left implicit, so the next person reads a decision
instead of an oversight. If a game ever ships a map large enough to notice, the
fix is a heap and none of the tests change.

## Accessibility -- definition of done (A.97)

- **Keyboard-findable / operable:** no new controls. Route walking is unchanged
  and still goes through the ordinary command queue.
- **Announces?** The failure message, at `important` — including the game's
  reason where there is one, which is the accessibility-relevant improvement
  here: "no route" is uninformative to everyone and worse for somebody who
  cannot see the map to work out why.
- **Steals focus?** No.
- **Colour alone?** No — a blocked exit is reported in words.
- **axe:** unchanged; no new UI surface.
- **Human AT testing:** at A8. The open question is whether reading out one
  blocked reason is right when several exits are shut, or whether it should
  name the direction too. Naming it is more precise and longer, and I do not
  know which wins when somebody is mid-journey.

## Not built here

Route execution is unchanged, and deliberately: one ordinary command, wait for
the authoritative state transition, confirm progress, send the next; stop on
deviation. C.19 restates that, and M12's queue already does it.

No auto-recovery of any kind — no standing, retreating, swimming, climbing or
door-opening. Those are game decisions, and a client that guessed at them would
be making them badly on games it knows nothing about.
