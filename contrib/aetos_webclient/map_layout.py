"""
Aetos map layout and routing.

Turns a room/exit graph into coordinates a client can draw, and finds routes
between rooms. Deliberately implemented server-side in plain Python: it is pure
graph work with no DOM involvement, and blueprint section 58 requires map layout
and pathfinding to be covered by the Python test suite.

**No game cooperation is required.** The algorithm reads only room ids, exit
directions and destinations -- things every Evennia game already has. A game that
supplies real coordinates can do so through its own map provider; this is what
happens when it does not.

Three properties matter more than prettiness:

* **Deterministic.** The same graph must always produce the same coordinates.
  A map that reshuffles itself between syncs is unusable, and worse for a player
  building a mental model of the world than no map at all.

* **Stable.** Adding a room must not move the rooms already placed. Layout
  proceeds outward from the origin in breadth-first order, so earlier placements
  are never revisited.

* **Honest about failure.** Rooms whose direction implies an already-occupied
  cell are marked rather than silently stacked, so a client can show that the
  geometry is approximate instead of drawing a confident lie.

"""

from collections import deque

#: Unit vectors for the directions Evennia games conventionally use.
#:
#: Aliases are included because games abbreviate. An exit named anything else --
#: "enter the tent", "portal" -- simply has no vector, which is handled rather
#: than treated as an error: not every connection is spatial.
DIRECTION_VECTORS = {
    "north": (0, -1, 0),
    "n": (0, -1, 0),
    "south": (0, 1, 0),
    "s": (0, 1, 0),
    "east": (1, 0, 0),
    "e": (1, 0, 0),
    "west": (-1, 0, 0),
    "w": (-1, 0, 0),
    "northeast": (1, -1, 0),
    "ne": (1, -1, 0),
    "northwest": (-1, -1, 0),
    "nw": (-1, -1, 0),
    "southeast": (1, 1, 0),
    "se": (1, 1, 0),
    "southwest": (-1, 1, 0),
    "sw": (-1, 1, 0),
    "up": (0, 0, 1),
    "u": (0, 0, 1),
    "down": (0, 0, -1),
    "d": (0, 0, -1),
}

#: Opposites, used to describe a route in reverse and to name the way back.
OPPOSITE_DIRECTIONS = {
    "north": "south",
    "south": "north",
    "east": "west",
    "west": "east",
    "northeast": "southwest",
    "southwest": "northeast",
    "northwest": "southeast",
    "southeast": "northwest",
    "up": "down",
    "down": "up",
}

#: Cap on rooms placed in one layout pass.
MAX_LAYOUT_ROOMS = 500

#: Cap on route length, so a pathological graph cannot produce an endless walk.
MAX_ROUTE_LENGTH = 100


def direction_vector(direction):
    """
    Return the unit vector for a direction name.

    Args:
        direction (str): Exit name, e.g. "north" or "ne".

    Returns:
        tuple or None: (dx, dy, dz), or None if the name is not directional.

    """
    if not direction:
        return None
    return DIRECTION_VECTORS.get(str(direction).strip().lower())


def opposite_direction(direction):
    """
    Return the opposite of a direction name.

    Args:
        direction (str): Direction name.

    Returns:
        str or None: The opposite, or None if there is no meaningful one.

    """
    if not direction:
        return None
    return OPPOSITE_DIRECTIONS.get(str(direction).strip().lower())


def _adjacency(rooms, exits):
    """
    Build a room-id keyed adjacency map.

    Args:
        rooms (list): Room dicts with an `id`.
        exits (list): Link dicts with `from`, `to` and `direction`.

    Returns:
        dict: room id -> list of (direction, destination id), sorted.

    """
    known = {room["id"] for room in rooms}
    links = {room_id: [] for room_id in known}
    for link in exits:
        source = link.get("from")
        target = link.get("to")
        if source in known and target in known:
            links[source].append((link.get("direction") or "", target))
    # Sorting makes traversal order independent of the input ordering, which is
    # what makes the whole layout deterministic.
    for room_id in links:
        links[room_id].sort()
    return links


def assign_coordinates(rooms, exits, origin=None):
    """
    Assign 3D grid coordinates to rooms by walking directional exits.

    Args:
        rooms (list): Room dicts, each with at least an `id`.
        exits (list): Link dicts with `from`, `to` and `direction`.
        origin (str, optional): Room id to place at (0, 0, 0). Defaults to the
            lowest room id, so the result does not depend on input order.

    Returns:
        dict: Layout with `positions`, `conflicts` and `components`.

    """
    if not rooms:
        return {"positions": {}, "conflicts": [], "components": 0}

    links = _adjacency(rooms, exits)
    room_ids = sorted(links)

    start = origin if origin in links else room_ids[0]

    positions = {}
    occupied = {}
    conflicts = []
    components = 0

    # Every component gets its own pass, offset so components never overlap. A
    # disconnected area is common (a separate zone, an unlinked build), and
    # dropping it would silently hide rooms the player can see.
    remaining = deque([start] + [room_id for room_id in room_ids if room_id != start])

    while remaining and len(positions) < MAX_LAYOUT_ROOMS:
        seed = remaining.popleft()
        if seed in positions:
            continue

        components += 1
        # Offset each additional component well clear of the previous ones.
        seed_position = (0, 0, 0) if components == 1 else (0, 0, 0)
        if components > 1:
            max_x = max((pos[0] for pos in positions.values()), default=0)
            seed_position = (max_x + 3, 0, 0)

        positions[seed] = seed_position
        occupied[seed_position] = seed

        frontier = deque([seed])
        while frontier and len(positions) < MAX_LAYOUT_ROOMS:
            current = frontier.popleft()
            base = positions[current]

            for direction, destination in links[current]:
                if destination in positions:
                    continue
                vector = direction_vector(direction)
                if vector is None:
                    # Non-directional exit ("enter tent"). Place it adjacent so
                    # it is still reachable on the map, and record that its
                    # position is not geographic.
                    candidate = _first_free(base, occupied)
                    conflicts.append(
                        {"room": destination, "reason": "non-directional", "via": direction}
                    )
                else:
                    candidate = (base[0] + vector[0], base[1] + vector[1], base[2] + vector[2])
                    if candidate in occupied:
                        # Two rooms claim one cell. Common in real MUD geography
                        # (loops that do not close squarely). Nudge rather than
                        # stack, and record it so the client can show that the
                        # layout is approximate here.
                        conflicts.append(
                            {
                                "room": destination,
                                "reason": "occupied",
                                "wanted": list(candidate),
                                "by": occupied[candidate],
                            }
                        )
                        candidate = _first_free(candidate, occupied)

                positions[destination] = candidate
                occupied[candidate] = destination
                frontier.append(destination)

    return {
        "positions": {room_id: list(pos) for room_id, pos in positions.items()},
        "conflicts": conflicts,
        "components": components,
    }


def _first_free(around, occupied):
    """
    Find the nearest unoccupied cell to a point.

    Searches in a deterministic spiral so the same conflict always resolves the
    same way; a nudge that varied between syncs would make the map appear to
    move on its own.

    Args:
        around (tuple): The desired (x, y, z).
        occupied (dict): Cells already taken.

    Returns:
        tuple: A free (x, y, z).

    """
    if around not in occupied:
        return around
    for radius in range(1, 32):
        for dx in range(-radius, radius + 1):
            for dy in range(-radius, radius + 1):
                if max(abs(dx), abs(dy)) != radius:
                    continue
                candidate = (around[0] + dx, around[1] + dy, around[2])
                if candidate not in occupied:
                    return candidate
    # Pathological density. Stack rather than loop forever; the conflict was
    # already recorded by the caller.
    return around


def find_route(rooms, exits, start, goal):
    """
    Find the shortest route between two rooms.

    Breadth-first, so the result is the fewest moves rather than the shortest
    distance -- which is what a player actually walks.

    Args:
        rooms (list): Room dicts.
        exits (list): Link dicts.
        start (str): Room id to start from.
        goal (str): Room id to reach.

    Returns:
        list or None: Ordered list of `{"direction", "to"}` steps, an empty list
            if already there, or None if no route exists.

    """
    if start == goal:
        return []

    links = _adjacency(rooms, exits)
    if start not in links or goal not in links:
        return None

    previous = {start: None}
    frontier = deque([start])

    while frontier:
        current = frontier.popleft()
        for direction, destination in links[current]:
            if destination in previous:
                continue
            previous[destination] = (current, direction)
            if destination == goal:
                return _rebuild_route(previous, goal)
            frontier.append(destination)

    return None


def _rebuild_route(previous, goal):
    """
    Walk the breadth-first tree back to the start.

    Args:
        previous (dict): destination -> (source, direction).
        goal (str): The reached room id.

    Returns:
        list: Ordered steps from start to goal.

    """
    steps = []
    cursor = goal
    while previous.get(cursor):
        source, direction = previous[cursor]
        steps.append({"direction": direction, "to": cursor})
        cursor = source
        if len(steps) > MAX_ROUTE_LENGTH:
            break
    steps.reverse()
    return steps


def describe_surroundings(map_data, room_lookup=None):
    """
    Build the non-visual description of the player's surroundings.

    Blueprint section 47 requires every visual map to have a nonvisual
    equivalent. This is not a caption added to a picture: it is generated from
    the same graph the picture is drawn from, so the two cannot disagree.

    Args:
        map_data (dict): Map payload with `rooms`, `exits` and `current`.
        room_lookup (dict, optional): Pre-built id -> room dict.

    Returns:
        dict: `location`, `exits` and `landmarks`, ready for a client to render
            as text.

    """
    rooms = map_data.get("rooms") or []
    exits = map_data.get("exits") or []
    current = map_data.get("current")

    lookup = room_lookup or {room["id"]: room for room in rooms}
    here = lookup.get(current)

    described_exits = []
    for link in sorted(exits, key=lambda item: (item.get("direction") or "")):
        if link.get("from") != current:
            continue
        destination = lookup.get(link.get("to"))
        described_exits.append(
            {
                "direction": link.get("direction") or "",
                "to": link.get("to"),
                # A player should hear where an exit leads, not just that it
                # exists, when the destination is already known.
                "name": (destination or {}).get("name"),
            }
        )

    # Rooms beyond the immediate exits, nearest first, so a player can orient
    # without walking. Distance comes from the provider's own breadth-first walk.
    landmarks = []
    immediate = {entry["to"] for entry in described_exits}
    for room in sorted(rooms, key=lambda item: (item.get("distance", 0), item.get("id", ""))):
        if room.get("id") == current or room.get("id") in immediate:
            continue
        landmarks.append(
            {
                "id": room.get("id"),
                "name": room.get("name"),
                "distance": room.get("distance", 0),
            }
        )

    return {
        "location": (here or {}).get("name"),
        "exits": described_exits,
        "landmarks": landmarks,
    }
