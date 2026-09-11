"""
Reading a game's source without running it.

THE WHOLE POINT IS THAT NOTHING IS IMPORTED. A game's
`typeclasses/characters.py` is ordinary Python and importing it runs it: it can
open a connection, read a file, take ten seconds, or raise. Discovery is a tool a
developer runs to find out what their game has, and it would be a poor one if
running it could change anything or fail because the game is mid-edit.

So the entire static scan is `ast.parse` on text. There is no `importlib`, no
`compile(..., "exec")`, no `eval`, and a test asserts none of those names appear
in this module -- because the natural way to make this "better" is to import the
module and use `dir()`, and that version cannot be made safe afterwards.

The cost is real and worth naming: a scan that does not run the code cannot see
what the code computes. `self.db.hp = starting_hp` yields a candidate whose kind
is `unknown`, and a game that sets its attributes in a loop over a table yields
nothing at all. That is what `runtime_scan` is for, and why neither scan is
offered on its own.

WHAT IT LOOKS FOR. Evennia has two ways to set an attribute and games use both::

    self.db.hp = 100                    # the attribute handler
    self.attributes.add("hp", 100)      # the explicit call

Both are recognised. The receiver is recorded rather than assumed: `self.db.hp`
in a typeclass and `caller.db.hp` in a command are both real evidence, and which
one it was belongs in the report so a developer can tell a character attribute
from something set on a room.

"""

import ast
import os

from evennia.contrib.base_systems.aetos_webclient.discovery.candidates import Candidate
from evennia.contrib.base_systems.aetos_webclient.discovery.roots import approved_files

#: Receiver names whose `.db` is taken to be a character's.
#:
#: A guess, and a narrow one on purpose. `self` inside a typeclass, and the two
#: names Evennia's own command docs use for the character running a command.
#: `obj.db.x` is not included: in a command, `obj` is usually the thing being
#: acted on rather than the actor, and a report full of a room's attributes
#: labelled as the character's is worse than a shorter report.
CHARACTER_RECEIVERS = ("self", "caller", "character")


def _kind_of(node):
    """
    What an assigned value looks like, from the syntax alone.

    Args:
        node (ast.AST): The right-hand side of an assignment.

    Returns:
        str: One of `candidates.KINDS`.

    Notes:
        `bool` is tested before `int` because `True` is an `int` in Python, and
        reporting a flag as a number is the kind of small wrongness that makes a
        generated settings block need checking line by line.

    """
    if isinstance(node, ast.Constant):
        if isinstance(node.value, bool):
            return "boolean"
        if isinstance(node.value, (int, float)):
            return "number"
        if isinstance(node.value, str):
            return "text"
        return "unknown"
    if isinstance(node, (ast.List, ast.Tuple, ast.Set, ast.Dict)):
        return "collection"
    if isinstance(node, ast.BinOp):
        # `100 * level` is still a number as far as anybody reading it cares.
        left = _kind_of(node.left)
        right = _kind_of(node.right)
        return "number" if "number" in (left, right) else "unknown"
    return "unknown"


def _attribute_target(node):
    """
    The receiver and attribute name of a `<receiver>.db.<name>` expression.

    Args:
        node (ast.AST): A node that may be an attribute access.

    Returns:
        tuple or None: `(receiver, name)`, or None if this is not the shape.

    Notes:
        Matches exactly two levels. `self.db.stats.hp` is an attribute of an
        attribute, which the binding grammar can express but the scan cannot
        verify from source -- so it is not claimed here. Under-reporting is the
        safe direction: a missing suggestion costs the developer a line of
        typing, and a wrong one costs them an afternoon.

    """
    if not isinstance(node, ast.Attribute):
        return None
    holder = node.value
    if not isinstance(holder, ast.Attribute) or holder.attr != "db":
        return None
    if not isinstance(holder.value, ast.Name):
        return None
    return holder.value.id, node.attr


def _attributes_add_call(node):
    """
    The receiver and key of an `<receiver>.attributes.add("key", ...)` call.

    Args:
        node (ast.AST): A node that may be such a call.

    Returns:
        tuple or None: `(receiver, key, value_node)`, or None.

    Notes:
        Only a literal string key is accepted. `attributes.add(name, value)` in
        a loop is exactly the case the static scan cannot see, and guessing at
        the variable's contents would produce candidates that do not exist.

    """
    if not isinstance(node, ast.Call) or not isinstance(node.func, ast.Attribute):
        return None
    if node.func.attr != "add":
        return None
    handler = node.func.value
    if not isinstance(handler, ast.Attribute) or handler.attr != "attributes":
        return None
    if not isinstance(handler.value, ast.Name):
        return None
    if not node.args or not isinstance(node.args[0], ast.Constant):
        return None
    key = node.args[0].value
    if not isinstance(key, str) or not key.isidentifier():
        return None
    value = node.args[1] if len(node.args) > 1 else None
    return handler.value.id, key, value


def scan_source(source, label, receivers=CHARACTER_RECEIVERS):
    """
    Candidates in one piece of Python source.

    Args:
        source (str): Python source text.
        label (str): How to name this source in evidence, usually a path
            relative to the game directory.
        receivers (tuple, optional): Receiver names to accept.

    Returns:
        list: `Candidate` objects.

    Raises:
        SyntaxError: If the source does not parse. Callers decide what to do
            about a game file that is mid-edit; this does not swallow it,
            because a scan that silently skipped the Character typeclass and
            reported "no candidates" would be read as "your game has nothing".

    """
    tree = ast.parse(source)
    found = []

    for node in ast.walk(tree):
        if isinstance(node, ast.Assign):
            for target in node.targets:
                match = _attribute_target(target)
                if match and match[0] in receivers:
                    receiver, name = match
                    found.append(
                        Candidate(
                            expression="db.%s" % name,
                            name=name,
                            origin="static",
                            evidence="%s:%d, assigned as %s.db.%s"
                            % (label, node.lineno, receiver, name),
                            kind=_kind_of(node.value),
                        )
                    )
        elif isinstance(node, ast.Call):
            match = _attributes_add_call(node)
            if match and match[0] in receivers:
                receiver, name, value = match
                kind = _kind_of(value) if value is not None else "unknown"
                found.append(
                    Candidate(
                        expression="db.%s" % name,
                        name=name,
                        origin="static",
                        evidence="%s:%d, set by %s.attributes.add(%r)"
                        % (label, node.lineno, receiver, name),
                        kind=kind,
                    )
                )

    return found


def scan_files(gamedir=None):
    """
    Candidates across every file discovery is allowed to read.

    Args:
        gamedir (str, optional): The game directory. Defaults to
            `settings.GAME_DIR`.

    Returns:
        tuple: `(candidates, problems)` -- a list of `Candidate` and a list of
            human-readable strings naming files that could not be parsed.

    Notes:
        A file that does not parse is reported rather than raised, because one
        broken file in `world/` should not stop a developer discovering their
        Character. The problems go in the report, so "I got fewer results than I
        expected" has an answer on the same screen.

    """
    gamedir = gamedir or None
    files = approved_files(gamedir)
    base = os.path.commonpath(files) if files else ""
    candidates = []
    problems = []

    for path in files:
        try:
            with open(path, "r", encoding="utf-8") as handle:
                source = handle.read()
        except (OSError, UnicodeDecodeError) as error:
            problems.append("%s could not be read (%s)" % (path, error))
            continue

        # Forward slashes regardless of platform. The label goes into a comment
        # a developer reads and may paste into an issue, and `world\combat.py`
        # is a Windows detail nobody outside Windows should have to parse.
        label = (os.path.relpath(path, base) if base else path).replace(os.sep, "/")
        try:
            candidates.extend(scan_source(source, label))
        except SyntaxError as error:
            problems.append("%s could not be parsed (line %s)" % (label, error.lineno))

    return candidates, problems
