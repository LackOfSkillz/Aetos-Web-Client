"""
The Aetos manifest.

The manifest is how a game tells Aetos what it exposes. It is the mechanism
behind progressive enhancement: Aetos renders controls for what the manifest
declares and stays silent about everything else, so a pristine Evennia game gets
a clean client rather than a screen of dead buttons.

The manifest is descriptive, never permissive. Declaring an automation capability
tells the client it may show that editor; it grants no authority. Every command
the client ultimately sends still travels the ordinary Evennia command path and is
still subject to locks, permissions, cooldowns and game rules.

"""

from django.conf import settings

from evennia.contrib.base_systems.aetos_webclient import constants

# --- Automation policy ---------------------------------------------------

#: Automation capabilities a game may permit or forbid.
#:
#: These are *policy*, decided by the game developer. The client must honour
#: them: with "scripting" false, no scripting editor is offered at all.
#:
#: "voice" governs whether spoken input may execute a command directly. It is
#: listed here rather than treated as a client-only preference because a game
#: may reasonably want spoken commands previewed rather than executed, in the
#: same way it governs macros and triggers. Blueprint sections 32 and 87.
DEFAULT_AUTOMATION = {
    "macros": True,
    "aliases": True,
    "triggers": True,
    "timers": False,
    "scripting": False,
    "voice": True,
}

#: Feature flags describing which structured subsystems the game exposes.
#: Everything defaults to False: a game that has told Aetos nothing gets the
#: zero-configuration experience, not broken widgets.
DEFAULT_FEATURES = {
    "resources": False,
    "map": False,
    "actions": False,
    "entities": False,
    "effects": False,
    "target": False,
    "inventory": False,
    "equipment": False,
    "media": False,
    "mode": False,
}


class AetosManifestError(ValueError):
    """Raised when a game's Aetos configuration is invalid."""


def _validate_policy(configured, defaults, setting_name):
    """
    Merge a game's policy dict over the defaults, rejecting bad configuration.

    A typo in a settings key is silent otherwise: the game believes it disabled
    scripting while the client happily offers it. Unknown keys are therefore an
    error rather than being ignored.

    Args:
        configured (dict): The game's setting value.
        defaults (dict): The default policy.
        setting_name (str): Setting name, used in error messages.

    Returns:
        dict: The merged policy.

    Raises:
        AetosManifestError: If the configuration is malformed.

    """
    if configured is None:
        return dict(defaults)
    if not isinstance(configured, dict):
        raise AetosManifestError(
            "%s must be a dict, got %r" % (setting_name, type(configured).__name__)
        )

    unknown = set(configured) - set(defaults)
    if unknown:
        raise AetosManifestError(
            "%s contains unknown key(s) %s. Valid keys: %s"
            % (setting_name, sorted(unknown), sorted(defaults))
        )

    merged = dict(defaults)
    for key, value in configured.items():
        if not isinstance(value, bool):
            raise AetosManifestError(
                "%s[%r] must be a boolean, got %r" % (setting_name, key, type(value).__name__)
            )
        merged[key] = value
    return merged


def get_automation_policy():
    """
    Resolve the game's automation policy.

    Returns:
        dict: Automation capability flags.

    Raises:
        AetosManifestError: If `AETOS_AUTOMATION` is malformed.

    """
    return _validate_policy(
        getattr(settings, "AETOS_AUTOMATION", None), DEFAULT_AUTOMATION, "AETOS_AUTOMATION"
    )


def get_features():
    """
    Resolve which structured subsystems the game exposes.

    Returns:
        dict: Feature flags.

    Raises:
        AetosManifestError: If `AETOS_FEATURES` is malformed.

    """
    return _validate_policy(
        getattr(settings, "AETOS_FEATURES", None), DEFAULT_FEATURES, "AETOS_FEATURES"
    )


def build_manifest(character=None):
    """
    Build the `aetos_manifest` payload for a session.

    Args:
        character (Object, optional): The character the manifest is for. Accepted
            so that later milestones can vary the manifest per character (for
            example, exposing builder-only widgets). Unused at protocol v1.

    Returns:
        dict: The manifest payload.

    Raises:
        AetosManifestError: If the game's Aetos settings are malformed.

    """
    features = get_features()
    automation = get_automation_policy()

    return {
        "protocol": constants.PROTOCOL_VERSION,
        "features": features,
        "automation": automation,
        # Populated by providers in M3. Declared here so the shape is stable from
        # protocol v1 onward and a client can rely on the keys existing.
        "resources": [],
        "widgets": [],
        "actions": [],
        "map": {},
        "media": {},
    }
