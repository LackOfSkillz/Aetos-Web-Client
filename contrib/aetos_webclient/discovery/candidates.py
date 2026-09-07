"""
The candidate data model.

A **candidate** is one answer to "here is something on your character that might
be worth putting on screen". It is not a binding and must never be mistaken for
one: a binding is a decision, and a candidate is evidence for a decision the
developer has not made yet.

WHAT A CANDIDATE HAS TO CARRY, and why each field is not optional:

- **The expression**, already in D1's grammar. A report that prints `hp` and
  leaves the developer to write `db.hp` has moved the error rather than removed
  it.
- **Where it was found.** `typeclasses/characters.py:42` or `Character #4`. A
  suggestion with no provenance cannot be checked, and the first thing anybody
  does with a generated settings block is check one line of it.
- **How it was found**, static or runtime. These have genuinely different
  reliability: a static hit is a line somebody wrote, a runtime hit is a value
  that exists right now on one character and may be a leftover from a
  half-finished feature.
- **A partner, when one was found.** `db.hp` alone is a number. `db.hp` with
  `db.hp_max` is a health bar, which is what the developer actually wanted, and
  finding the pair is most of discovery's value.

WHAT A CANDIDATE DOES NOT CARRY: a label the developer would want to read. The
scan knows the attribute is called `hp`; it does not know the game calls it
"Vitality". The report suggests `"label": "Hp"` and says plainly that the label
is the one field it has guessed, so it is the first thing to fix rather than the
thing nobody notices is wrong.

"""

from dataclasses import dataclass, field, replace

#: How confident the scan is, in words rather than a number.
#:
#: A number invites arithmetic on evidence that does not support it -- "0.7" for
#: a runtime hit and "0.8" for a static one implies the difference is 0.1 of
#: something. Two words, each meaning a specific thing:
#:
#:   likely   -- found with a partner, or with a numeric literal assignment
#:   possible -- found, and it might be internal bookkeeping
CONFIDENCE = ("likely", "possible")

#: What a value looks like, as far as the scan can tell. `unknown` is honest and
#: common: a static scan sees `self.db.hp = starting_hp` and cannot say what
#: `starting_hp` is.
KINDS = ("number", "text", "boolean", "collection", "unknown")

#: Attribute names that are never suggested.
#:
#: Evennia and common game code keep bookkeeping in attributes, and a report
#: that opens with `db.prelogout_location` buries the two lines the developer
#: wanted. Excluded from the *suggestion*, not from the scan -- `--all` still
#: shows them, because the exclusion list is a guess and the developer may be
#: looking for exactly one of these.
UNINTERESTING = frozenset(
    {
        # Evennia's own bookkeeping. These are on every character of every game,
        # so without this the first four lines of every report are identical and
        # tell the developer nothing about their own game.
        "prelogout_location",
        "last_puppet",
        "creator_id",
        "creator_ip",
        "_sessid",
        "_saved_contents",
        # Real object properties, but not attributes a binding reaches, and each
        # already has a place in the client that is not a resource bar.
        "desc",
        "aliases",
        "permissions",
        "locks",
        "cmdset",
        "tags",
        "home",
    }
)

#: Suffixes that mark an attribute as the ceiling of another one.
#:
#: `hp` + `hp_max` is the pairing this exists for. Ordered longest-first so
#: `hp_maximum` is not matched as `hp_max` plus a stray `imum`.
MAXIMUM_SUFFIXES = ("_maximum", "_max", "max", "_total", "_cap")


@dataclass(frozen=True)
class Candidate:
    """
    One attribute discovery thinks might be worth showing.

    Frozen, because a candidate is a record of what was observed. Anything that
    wants to change one is deriving a *new* observation, and `dataclasses.replace`
    makes that visible at the call site rather than letting a scan quietly edit
    another scan's findings.

    Attributes:
        expression (str): The binding expression, e.g. `db.hp`. Always valid
            against `schema.EXPRESSION_PATTERN`.
        name (str): The attribute name, e.g. `hp`.
        origin (str): `"static"` or `"runtime"`.
        evidence (str): Where it was found, in words a developer can go and check.
        kind (str): One of `KINDS`.
        maximum (str or None): A partner expression that looks like this one's
            ceiling, e.g. `db.hp_max`.
        confidence (str): One of `CONFIDENCE`.

    """

    expression: str
    name: str
    origin: str
    evidence: str
    kind: str = "unknown"
    maximum: str = None
    confidence: str = "possible"

    @property
    def interesting(self):
        """
        Whether this belongs in the default suggestion.

        Returns:
            bool: False for known bookkeeping and for names starting with an
                underscore, which is the convention for exactly that.

        """
        return not (self.name.startswith("_") or self.name in UNINTERESTING)

    @property
    def looks_like_a_resource(self):
        """
        Whether this is the shape of a thing that belongs on a bar.

        Returns:
            bool: True when there is a paired maximum, which is the only
                evidence strong enough to say so without guessing at the name.

        Notes:
            Deliberately not "is it called hp, mana, stamina or health". A name
            list is a guess about somebody else's game, it is wrong in every
            language but English, and a game with `db.oxygen` and `db.oxygen_max`
            wants a bar just as much.

        """
        return bool(self.maximum)


@dataclass
class CandidateSet:
    """
    Everything one run of discovery found, merged across both scans.

    Not a plain list, because merging is the part with a decision in it: the
    same attribute found statically and at runtime is *one* candidate with two
    pieces of evidence, not two rows that make the report look twice as
    productive as it was.

    Attributes:
        candidates (dict): Keyed by expression, so a merge is a lookup.

    """

    candidates: dict = field(default_factory=dict)

    def add(self, candidate):
        """
        Record a candidate, merging it with any existing one.

        Args:
            candidate (Candidate): The observation to record.

        Returns:
            Candidate: The stored candidate, which may be a merge.

        Notes:
            The merge keeps the *stronger* claim on every field, and says both
            origins. A static scan that saw `self.db.hp = 100` knows the kind is
            a number; a runtime scan that read `None` off a fresh character does
            not. Taking the last write would make the result depend on scan
            order, which is not something a developer should have to know about.

        """
        existing = self.candidates.get(candidate.expression)
        if existing is None:
            self.candidates[candidate.expression] = candidate
            return candidate

        merged = replace(
            existing,
            origin=(
                existing.origin if existing.origin == candidate.origin else "static and runtime"
            ),
            evidence="%s; %s" % (existing.evidence, candidate.evidence),
            kind=existing.kind if existing.kind != "unknown" else candidate.kind,
            maximum=existing.maximum or candidate.maximum,
            confidence=(
                "likely" if "likely" in (existing.confidence, candidate.confidence) else "possible"
            ),
        )
        self.candidates[candidate.expression] = merged
        return merged

    def pair_maximums(self):
        """
        Attach each candidate's ceiling, where one is present.

        Returns:
            int: How many pairs were made.

        Notes:
            Run after both scans rather than during either, because the pair can
            be split between them -- `hp` written in the typeclass and `hp_max`
            set from a command is an ordinary way for a game to end up.

            The maximum itself stays in the set. It is a real attribute and a
            developer may want it shown on its own; the report is what decides
            not to list it twice.

        """
        by_name = {candidate.name: candidate for candidate in self.candidates.values()}
        paired = 0

        for name, candidate in sorted(by_name.items()):
            if candidate.maximum:
                continue
            for suffix in MAXIMUM_SUFFIXES:
                partner = by_name.get(name + suffix)
                if partner is None:
                    continue
                self.candidates[candidate.expression] = replace(
                    candidate,
                    maximum=partner.expression,
                    confidence="likely",
                )
                paired += 1
                break

        return paired

    def suggestions(self, include_all=False):
        """
        The candidates worth putting in a report, in a stable order.

        Args:
            include_all (bool, optional): Include bookkeeping attributes that
                are normally filtered out.

        Returns:
            list: Candidates, paired ones first, then alphabetically.

        Notes:
            A candidate that is another one's maximum is not listed on its own
            when its partner is listed, or every health bar appears in the
            report twice and the developer deletes one at random.

        """
        chosen = [
            candidate
            for candidate in self.candidates.values()
            if include_all or candidate.interesting
        ]
        ceilings = {candidate.maximum for candidate in chosen if candidate.maximum}
        chosen = [c for c in chosen if c.expression not in ceilings]
        return sorted(chosen, key=lambda c: (not c.looks_like_a_resource, c.name))

    def __len__(self):
        """
        How many distinct candidates were found.

        Returns:
            int: The count after merging, so an attribute both scans saw counts
                once.

        """
        return len(self.candidates)
