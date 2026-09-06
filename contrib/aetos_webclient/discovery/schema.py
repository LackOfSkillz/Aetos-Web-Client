"""
The `AETOS_BINDINGS` schema, and the expression grammar underneath it.

Defined at D0 and enforced by the resolver at D1, in that order deliberately:
the grammar is the security boundary of the whole D-track, and it is easier to
argue about on its own than inside a resolver.

THE GRAMMAR IS A DENY-BY-DEFAULT WHITELIST, NOT A BLOCKLIST.

`AETOS_BINDINGS` is written by a game developer in their own settings file, so
this is not a defence against a hostile author -- somebody who can edit
settings.py can already run anything. It is a defence against **the resolver
becoming an expression evaluator**, which is what happens the first time
somebody adds "just method calls" or "just indexing" to make one game work.
Every addition looks small and the sum of them is `eval` with extra steps.

So the grammar is two forms and nothing else::

    db.<name>
    db.<name>.<name>

`db` is Evennia's attribute handler, `<name>` is a plain identifier, and that is
the entire language. Anything else is refused with a message naming what was
wrong, because a binding that silently resolves to `None` is the failure mode
that wastes an afternoon.

WHAT IS DELIBERATELY NOT EXPRESSIBLE, and why each one stays out:

- **Method calls** (`db.hp()`): calling is running. A resolver that calls is a
  resolver that can be handed `db.delete` by a typo.
- **Indexing** (`db.stats[0]`): `__getitem__` is arbitrary code on a custom
  type, and the useful cases are dict keys, which the second `.name` form
  already covers for Evennia's saver-dicts.
- **Arithmetic** (`db.hp + db.bonus`): the moment two values combine, the
  resolver needs an evaluator. A game that needs a computed value has a
  provider class, which is the supported way to run its own code.
- **Dunders** (`db.__class__`, `db.__globals__`): the standard route from any
  attribute traversal to the interpreter.
- **Statements** (`import os`, `x; y`, embedded newlines): a binding is a path,
  not a program. These are listed explicitly in the rejection table because
  they are what somebody tries first.

"""

import re

#: The slots a binding may declare. Each corresponds to a provider Aetos already
#: normalises, which is the point: a binding feeds the *existing* pipeline rather
#: than being a second way into the client.
#:
#: Order matters only for the report, which lists them this way so the most
#: commonly wanted one is first.
BINDING_SLOTS = ("resources", "equipment", "target", "effects", "actions")

#: Fields a binding entry may carry, per slot. D1 validates against this; D0
#: defines it so the report only ever suggests something D1 will accept.
BINDING_FIELDS = {
    "resources": {
        "required": ("label", "value"),
        "optional": ("maximum", "minimum", "severity", "order"),
    },
    "equipment": {"required": ("label", "value"), "optional": ("order",)},
    "target": {"required": ("label", "value"), "optional": ("maximum",)},
    "effects": {"required": ("label", "value"), "optional": ("order",)},
    "actions": {"required": ("label", "command"), "optional": ("order",)},
}

#: `db.name` or `db.name.child`, and nothing else.
#:
#: Two things here are easy to get wrong and both were, in this file, before the
#: tests were run:
#:
#: **Anchoring.** An unanchored pattern matches the `db.hp` inside
#: `db.hp.__class__` and reports the whole string as valid -- the exact mistake
#: this grammar exists to prevent, made in the grammar itself.
#:
#: **Dunders are identifiers.** `__class__` and `__globals__` are ordinary
#: Python names: they start with a letter-or-underscore and continue with word
#: characters, so an identifier whitelist accepts them. That is not a small gap
#: -- `db.__class__` is the first step of every attribute-traversal escape there
#: is, and it passed the first version of this pattern.
#:
#: So each segment carries `(?!__)`. A single leading underscore stays allowed,
#: because `db._internal` is an ordinary attribute name a game may genuinely
#: want on screen; two is the marker of Python's own namespace and nothing a
#: game stores should begin that way.
_SEGMENT = r"(?!__)[A-Za-z_][A-Za-z0-9_]*"
EXPRESSION_PATTERN = re.compile(r"^db\.%s(\.%s)?$" % (_SEGMENT, _SEGMENT))

#: Expressions that must be refused, paired with what is wrong with each.
#:
#: These are not the only invalid expressions -- the whitelist decides that --
#: they are the ones with a *test each*, taken from Addendum B.59. A resolver
#: that quietly accepts any one of them has reintroduced `eval`, and the failure
#: would not be visible in any output.
REJECTED_EXPRESSIONS = {
    "db.__class__": "dunder attribute",
    "db.hp.__class__": "dunder attribute",
    "db.__globals__": "dunder attribute",
    "db.hp()": "call",
    "db.get('hp')": "call",
    "db.stats[0]": "subscript",
    "db.stats['hp']": "subscript",
    "db.hp + db.bonus": "arithmetic",
    "db.hp - 1": "arithmetic",
    "lambda: 1": "not an attribute path",
    "import os": "statement",
    "db.hp; db.mp": "statement separator",
    "db.hp\ndb.mp": "embedded newline",
    "db.hp.mp.sp": "too deep -- two levels only",
    "hp": "does not start at db",
    "db": "names no attribute",
    "db.": "names no attribute",
    ".db.hp": "does not start at db",
    "self.db.hp": "does not start at db",
    "db.hp ": "trailing whitespace",
    " db.hp": "leading whitespace",
    "": "empty",
}


def is_valid_expression(expression):
    """
    Whether a binding expression is one this grammar allows.

    Args:
        expression (str): The expression as written in `AETOS_BINDINGS`.

    Returns:
        bool: True if it is `db.name` or `db.name.child`.

    Notes:
        Non-strings are refused rather than coerced. A game that wrote
        `"value": 5` meant something, and guessing what turns a typo into a
        silently wrong health bar.

    """
    if not isinstance(expression, str):
        return False
    return bool(EXPRESSION_PATTERN.match(expression))


def expression_parts(expression):
    """
    The attribute names in a valid expression.

    Args:
        expression (str): A valid binding expression.

    Returns:
        tuple: One or two attribute names, without the leading `db`.

    Raises:
        ValueError: If the expression is not valid. Callers should ask
            `is_valid_expression` first; this refuses rather than returning a
            half-parsed result, because a caller that ignores the return value
            of a parse is the caller this exists to stop.

    """
    if not is_valid_expression(expression):
        raise ValueError("not a valid Aetos binding expression: %r" % (expression,))
    return tuple(expression.split(".")[1:])
