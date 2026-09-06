"""
Reading the attributes a game's characters actually have.

WHY THE STATIC SCAN IS NOT ENOUGH. Evennia attributes are database rows, not
class members. `caller.db.reputation = 0` typed once in a command creates an
attribute that exists on every character from then on and appears in no
typeclass, so source parsing cannot see it. On a game that has been played for a
while, most of what is worth showing is in this category.

WHY THIS ONE IS NOT ENOUGH EITHER. A brand-new game has a Character typeclass
and no characters, and this scan returns nothing at all. The two are merged and
each candidate says which found it.

READ-ONLY, AND THAT IS NOT INCIDENTAL. This runs against a live game's database,
possibly a production one, from a command a developer is trying out for the first
time. It queries and it reads; it does not create a character to inspect, does
not touch an attribute to see what happens, and does not write a marker
anywhere. A discovery tool that modified the game it was describing would be
unusable exactly where it is most wanted.

It is also **capped**. A game with fifty thousand characters is not fifty
thousand times more informative than one with ten -- attribute *names* repeat,
and the names are what discovery is after. Reading a bounded sample keeps the
command something a developer runs casually on a live server.

"""

from django.conf import settings

from evennia.contrib.base_systems.aetos_webclient.discovery.candidates import Candidate

#: How many characters to read.
#:
#: Enough that an attribute set by one feature on some characters is seen, small
#: enough that this stays a query a developer can run on a live game without
#: thinking about it. Newest first, because a half-built feature's attributes are
#: on the characters somebody made while building it.
SAMPLE_SIZE = 25

#: Values that say nothing.
#:
#: An attribute holding `None` on every character sampled is either unset or
#: dead. It is still reported -- it may be exactly the feature being built -- but
#: it cannot claim a kind, and claiming `unknown` is the honest answer.
EMPTY = (None, "", [], {}, ())


def _kind_of(value):
    """
    What a live value is.

    Args:
        value: The attribute's value.

    Returns:
        str: One of `candidates.KINDS`.

    Notes:
        `bool` before `int`, as in the static scan and for the same reason.
        Evennia wraps saved lists and dicts in saver types, so this tests for
        the behaviour (`items`, `__iter__`) rather than the exact class -- a
        `_SaverDict` is a dict for every purpose discovery has.

    """
    if isinstance(value, bool):
        return "boolean"
    if isinstance(value, (int, float)):
        return "number"
    if isinstance(value, str):
        return "text"
    if hasattr(value, "items") or (hasattr(value, "__iter__") and not isinstance(value, str)):
        return "collection"
    return "unknown"


def sample_characters(limit=SAMPLE_SIZE):
    """
    A bounded sample of the game's characters, newest first.

    Args:
        limit (int, optional): How many to read.

    Returns:
        list: Character objects, possibly empty.

    Notes:
        Filtered on the configured base character typeclass rather than on
        "everything in the database", because a game's rooms and objects have
        attributes too and a report that mixes them is a report about nothing in
        particular.

        A game whose characters use several typeclasses will under-report here,
        and that is recorded rather than solved: the fix is a `--typeclass`
        argument, which is a D1 concern once there is something to bind.

    """
    from evennia.objects.models import ObjectDB

    path = getattr(settings, "BASE_CHARACTER_TYPECLASS", None)
    query = ObjectDB.objects.all()
    if path:
        query = query.filter(db_typeclass_path=path)
    return list(query.order_by("-id")[:limit])


def scan_characters(characters=None, limit=SAMPLE_SIZE):
    """
    Candidates from the attributes live characters carry.

    Args:
        characters (list, optional): Characters to read. Defaults to a sample.
        limit (int, optional): Sample size when `characters` is not given.

    Returns:
        tuple: `(candidates, problems)`.

    Notes:
        One candidate per attribute *name*, not per character: the same `hp` on
        twenty characters is one thing to bind. The evidence names how many
        carried it, which is the number that tells a developer whether they are
        looking at a real feature or at one character somebody experimented on.

    """
    if characters is None:
        characters = sample_characters(limit)

    seen = {}
    problems = []
    counted = 0

    for character in characters:
        counted += 1
        try:
            attributes = character.attributes.all()
        except Exception as error:  # pragma: no cover - defensive
            # A single unreadable character must not end the scan. Naming it in
            # the report is more use than a traceback, because the developer can
            # go and look at that object.
            problems.append("could not read attributes of #%s (%s)" % (character.id, error))
            continue

        for attribute in attributes:
            key = getattr(attribute, "key", None)
            if not isinstance(key, str) or not key.isidentifier():
                # Evennia allows attribute keys that are not identifiers. They
                # cannot be written in the binding grammar, so suggesting one
                # would produce a line that does not work.
                continue
            if getattr(attribute, "category", None):
                # Categorised attributes are a different lookup and the grammar
                # has no way to say them. Out of scope rather than forgotten.
                continue

            record = seen.setdefault(key, {"count": 0, "kind": "unknown"})
            record["count"] += 1
            if record["kind"] == "unknown":
                try:
                    value = attribute.value
                except Exception:  # pragma: no cover - defensive
                    continue
                if value not in EMPTY or isinstance(value, bool):
                    record["kind"] = _kind_of(value)

    candidates = [
        Candidate(
            expression="db.%s" % key,
            name=key,
            origin="runtime",
            evidence="on %d of %d character%s sampled"
            % (record["count"], counted, "" if counted == 1 else "s"),
            kind=record["kind"],
            confidence="likely" if record["kind"] == "number" else "possible",
        )
        for key, record in sorted(seen.items())
    ]

    if not counted:
        problems.append(
            "no characters exist yet, so only the typeclass source could be read. "
            "Run this again once somebody has played."
        )

    return candidates, problems
