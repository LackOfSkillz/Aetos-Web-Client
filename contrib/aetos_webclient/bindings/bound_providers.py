"""
Providers that read a declaration instead of a game's Python.

These are ordinary providers. They subclass the same bases, return the same
payloads and go through the same normalisers as a hand-written one, which is the
property that matters: **the client cannot tell which route supplied the data.**
A game that outgrows a binding and writes a provider class changes nothing about
what the player sees, and a game that starts with a class and simplifies to a
binding does not have to re-check its widgets.

That is not a coincidence, it is why M16 put every slot through a normaliser. A
second code path into the client would be a second set of bugs, and the first
place they would show is on the accessibility surface -- announcements,
thresholds and labels are computed from the normalised shape.

**D1 implements `resources` only**, which is its gate: a health bar from nothing
but a settings block. `equipment`, `target`, `effects` and `actions` validate and
are suggested by discovery today, and D2 serves them. Until then their slots fall
through to the stock default rather than to something half-built.

"""

from evennia.contrib.base_systems.aetos_webclient.bindings.resolver import (
    AetosBindingResolver,
)
from evennia.contrib.base_systems.aetos_webclient.bindings.settings_source import (
    get_bindings,
)
from evennia.contrib.base_systems.aetos_webclient.providers import base


class BoundResourceProvider(base.AetosResourceProvider):
    """
    Resources declared in `AETOS_BINDINGS["resources"]`.

    """

    name = "resources (bindings)"

    def __init__(self, resolver=None):
        """
        Args:
            resolver (AetosBindingResolver, optional): Injected for tests, and so
                that a game with an unusual attribute store can subclass one
                thing rather than this whole provider.

        """
        self.resolver = resolver or AetosBindingResolver()

    def describe(self):
        """
        Identify this provider for the developer inspector.

        Returns:
            dict: The provider's name, class and the keys it serves.

        Notes:
            The keys are included because "resources (bindings)" on its own
            leaves a developer wondering which of their declarations are live.
            Names only -- never the expressions, which say where a game keeps its
            data, and never values.

        """
        described = super().describe()
        try:
            described["bound"] = sorted(get_bindings().get("resources", {}))
        except Exception:
            described["bound"] = []
        return described

    def get_resources(self, character):
        """
        Build the character's resources from the declaration.

        Args:
            character (Object): The character to describe.

        Returns:
            list: Resource dicts, in the shape `resources.normalize_resources`
                expects.

        Notes:
            **A resource whose value will not resolve is omitted, not zeroed.**
            A bar reading 0 says "you are dead"; a missing bar says "this is not
            available", and only one of those is true when a binding points at an
            attribute a character has not got yet.

            The declared order is kept. Python dicts preserve insertion order, so
            the order in settings.py is the order on screen, which is the one
            thing a developer can control here without another field.

        """
        try:
            declared = get_bindings().get("resources", {})
        except Exception:
            # Malformed settings are the startup check's business. Here, a
            # player is connecting.
            return []

        built = []
        for key, entry in declared.items():
            value = self.resolver.resolve_number(character, entry["value"])
            if value is None:
                continue

            resource = {
                "id": key,
                "label": entry.get("label", key),
                "value": value,
            }

            for field in ("maximum", "minimum"):
                if field in entry:
                    bound = self.resolver.resolve_number(character, entry[field])
                    if bound is not None:
                        resource[field] = bound

            # `severity` and `display` are plain text in the declaration and are
            # passed through for the normaliser to accept or drop. Validating
            # them twice would put the list of legal display modes in two files.
            for field in ("display", "severity"):
                if field in entry:
                    resource[field] = entry[field]

            built.append(resource)

        return built


#: Slot name mapped to the provider that serves it from bindings.
#:
#: A table rather than a chain of `if slot ==`, so that D2 adds four entries and
#: changes nothing else, and so `settings_source.provider_for` can answer "not
#: yet" for a slot by simply not being in it.
PROVIDERS = {
    "resources": BoundResourceProvider,
}
