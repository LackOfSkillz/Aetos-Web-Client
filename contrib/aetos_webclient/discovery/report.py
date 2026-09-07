"""
Turning candidates into something a developer can paste.

THE OUTPUT IS THE PRODUCT. Discovery's whole value is that the developer does
not have to look anything up, so the report is a settings block in the exact
shape `AETOS_BINDINGS` takes, with the evidence beside it as comments. What is
printed should be correct if pasted unchanged and obvious where it needs
editing.

**Printed, never written.** Discovery does not open settings.py. A tool that
edits a developer's settings file has to be trusted before it is understood,
which is the wrong way round for the first thing somebody runs.

THE ONE FIELD THAT IS ALWAYS A GUESS is the label. The scan knows the attribute
is called `hp`; it does not know the game calls it "Vitality", and it certainly
does not know what it is called in the language the game is played in. So the
label is titlecased from the attribute name and the report says, once, that this
is the field to change. Saying it once is deliberate -- a comment on every line
is noise, and noise is what gets pasted without reading.

"""

from evennia.contrib.base_systems.aetos_webclient.bindings.schema import (
    is_valid_expression,
)

# D0 carried a `BINDINGS_ARE_LIVE = False` flag here, and a paragraph warning
# that pasting the output would not change anything, because the resolver did not
# exist yet. D1 built it, so both are gone rather than left as a constant that is
# never false: a flag with one possible value is a note about history wearing a
# switch's clothes, and the note belongs in `notes/d1-binding-resolver.md`, where
# it is.

HEADER = """\
# Suggested by `evennia aetos discover`. Nothing has been changed for you --
# paste what you want into server/conf/settings.py and delete the rest.
#
# The `label` on every line is a guess made from the attribute name. It is the
# text a player reads, so it is the first thing worth changing."""

NOTHING_FOUND = """\
No candidates found.

Discovery reads two things: the typeclass source under typeclasses/, world/ and
commands/, and the attributes of characters that already exist. Finding nothing
usually means one of:

  - the game stores its values somewhere other than character attributes, in
    which case a provider class is the supported route -- see AETOS_PROVIDERS;
  - the attributes are set from code discovery does not read, and no character
    has been played yet, so neither scan could see them;
  - the game directory has no typeclasses/ yet."""


def _label_for(name):
    """
    A first-draft label for an attribute name.

    Args:
        name (str): The attribute name, e.g. `hp_max`.

    Returns:
        str: A readable label, e.g. `Hp max`.

    Notes:
        Underscores to spaces and the first letter capitalised, and nothing
        cleverer. Expanding `hp` to `Health` would be a guess about the game
        that happens to be right often enough to stop developers checking it.

    """
    words = name.replace("_", " ").strip()
    return words[:1].upper() + words[1:]


def render(candidate_set, problems=(), include_all=False):
    """
    The report, as text.

    Args:
        candidate_set (CandidateSet): What the scans found.
        problems (iterable, optional): Human-readable notes about what could not
            be read.
        include_all (bool, optional): Include bookkeeping attributes.

    Returns:
        str: The report.

    """
    lines = []
    suggestions = candidate_set.suggestions(include_all=include_all)

    if not suggestions:
        lines.append(NOTHING_FOUND)
    else:
        lines.append(HEADER)
        lines.append("")
        lines.append("AETOS_BINDINGS = {")
        lines.append('    "resources": {')

        for candidate in suggestions:
            # A candidate whose expression the grammar would refuse must never
            # reach the page. The scans only build valid ones, so this is a
            # guard against a future scan rather than against today's -- and it
            # is the cheapest place to keep the promise that what is printed
            # works when pasted.
            if not is_valid_expression(candidate.expression):
                continue

            lines.append(
                "        # %s -- %s (%s, %s)"
                % (
                    candidate.name,
                    candidate.evidence,
                    candidate.origin,
                    candidate.confidence,
                )
            )
            lines.append('        "%s": {' % candidate.name)
            lines.append('            "label": "%s",' % _label_for(candidate.name))
            lines.append('            "value": "%s",' % candidate.expression)
            if candidate.maximum:
                lines.append('            "maximum": "%s",' % candidate.maximum)
            lines.append("        },")

        lines.append("    },")
        lines.append("}")

    if problems:
        lines.append("")
        lines.append("Notes:")
        for problem in problems:
            lines.append("  - %s" % problem)

    return "\n".join(lines)
