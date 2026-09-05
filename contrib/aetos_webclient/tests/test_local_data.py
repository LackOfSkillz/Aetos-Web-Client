"""
Contract tests for Aetos local player data.

The behaviour of the storage and profile modules is verified in a real browser by
`browser-qa/qa-storage-profile.js`, since IndexedDB, Promise ordering and
prototype-pollution guards cannot be exercised from Python.

What Python can and should pin down are the contracts that must not drift: the
namespace list, the profile format identifiers, and the promises Aetos makes
about not touching other software's data. Those are asserted here so the Evennia
test suite catches a regression even if nobody runs the browser suite.

"""

import re
from pathlib import Path

from django.test import TestCase

from evennia.contrib.base_systems.aetos_webclient import AETOS_STATIC_DIR

JS_DIR = Path(AETOS_STATIC_DIR) / "aetos" / "js"


def _strip_comments(source):
    """
    Remove JS block and line comments from source.

    Some assertions here are about what the *code* does, not what the comments
    explain. Aetos deliberately documents why it leaves Evennia's own storage
    keys alone, and that documentation must not trip a test that is really about
    executable references.

    Args:
        source (str): JavaScript source.

    Returns:
        str: The source with comments removed.

    """
    without_block = re.sub(r"/\*.*?\*/", "", source, flags=re.DOTALL)
    return re.sub(r"^\s*//.*$", "", without_block, flags=re.MULTILINE)


#: The namespaces the blueprint (section 13) requires Aetos to keep locally.
EXPECTED_NAMESPACES = [
    "layouts",
    "workspaces",
    "macros",
    "aliases",
    "triggers",
    "scripts",
    "variables",
    "relationships",
    "notes",
    "map_notes",
    "map_pois",
    "themes",
    "keybindings",
    "preferences",
    "automation_profiles",
]


class TestStorageModule(TestCase):
    """The local storage layer."""

    def setUp(self):
        self.source = (JS_DIR / "storage.js").read_text(encoding="utf-8")

    def test_module_exists(self):
        self.assertTrue((JS_DIR / "storage.js").is_file())

    def test_declares_every_required_namespace(self):
        """A missing namespace means that category of data has nowhere to live."""
        for namespace in EXPECTED_NAMESPACES:
            self.assertIn('"%s"' % namespace, self.source, "missing namespace %r" % namespace)

    def test_uses_indexeddb_for_structured_data(self):
        """
        Blueprint section 13 prefers IndexedDB. It also keeps Aetos out of
        localStorage, where stock Evennia already stores its layout.

        """
        self.assertIn("indexedDB", self.source)

    def test_localstorage_keys_are_prefixed(self):
        """
        Stock Evennia writes unprefixed localStorage keys. Aetos must namespace
        its own so the two can never collide.

        """
        self.assertIn('LOCAL_PREFIX = "aetos:"', self.source)

    def test_storage_is_scoped_per_game(self):
        """
        Two games served from one origin must not share a player's notes or
        relationship tags.

        """
        self.assertIn("scopeKeyFor", self.source)
        self.assertIn("aetos::", self.source)

    def test_falls_back_when_indexeddb_is_unavailable(self):
        """
        Private browsing can refuse IndexedDB. The client must keep working for
        the session rather than failing to start.

        """
        self.assertIn("MemoryBackend", self.source)


class TestClearAllIsNotDestructive(TestCase):
    """
    "Clear all Aetos data" must clear only Aetos data.

    Stock Evennia stores the player's webclient layout in
    `evenniaGoldenLayoutSavedState`. Deleting that because someone asked to clear
    *Aetos* data would be a destructive bug affecting software Aetos does not own.
    This was identified during the Phase 0 browser baseline.

    """

    def setUp(self):
        self.source = (JS_DIR / "storage.js").read_text(encoding="utf-8")
        self.code = _strip_comments(self.source)

    def test_no_code_references_evennias_layout_key(self):
        """
        Executable code must never name Evennia's layout key. Comments may -- and
        do -- explain why Aetos leaves it alone, which is worth documenting, so
        the assertion is made against comment-stripped source.

        """
        self.assertNotIn("evenniaGoldenLayout", self.code)

    def test_clears_localstorage_only_by_prefix(self):
        """
        Clearing must filter by the Aetos prefix, never call localStorage.clear(),
        which would wipe every key on the origin including other software's.

        """
        self.assertIn("LOCAL_PREFIX", self.source)
        self.assertNotIn("localStorage.clear()", self.source)


class TestProfileModule(TestCase):
    """Export and import of a portable player profile."""

    def setUp(self):
        self.source = (JS_DIR / "profile.js").read_text(encoding="utf-8")
        self.code = _strip_comments(self.source)

    def test_module_exists(self):
        self.assertTrue((JS_DIR / "profile.js").is_file())

    def test_declares_the_versioned_format(self):
        """A profile must identify itself so a future migration is possible."""
        self.assertIn('FORMAT = "aetos-profile"', self.source)
        self.assertIn("FORMAT_VERSION = 1", self.source)

    def test_import_is_bounded(self):
        """
        An imported profile is untrusted input. Every dimension must be capped:
        entry count, key length, string length, nesting depth, array length.

        """
        for bound in (
            "MAX_ENTRIES_PER_NAMESPACE",
            "MAX_KEY_LENGTH",
            "MAX_STRING_LENGTH",
            "MAX_DEPTH",
            "MAX_ARRAY_LENGTH",
            "MAX_OBJECT_KEYS",
        ):
            self.assertIn(bound, self.source, "missing bound %r" % bound)

    def test_guards_against_prototype_pollution(self):
        """
        A crafted profile carrying a `__proto__` key must not be able to modify
        Object.prototype when written back into storage.

        """
        self.assertIn("__proto__", self.source)
        self.assertIn("constructor", self.source)
        self.assertIn("prototype", self.source)

    def test_never_evaluates_imported_content(self):
        """
        Import writes data; it never executes anything. Blueprint section 33
        forbids eval outright.

        """
        for forbidden in ("eval(", "new Function", 'setTimeout("', "innerHTML"):
            self.assertNotIn(forbidden, self.code, "profile.js must not use %r" % forbidden)


class TestNoServerSideProfileStorage(TestCase):
    """
    Blueprint section 2.3: Aetos stores no player profile on the game server.

    The Python side of the contrib must therefore contain no model, migration, or
    persistence of any of these categories. This test guards the promise made in
    the README.

    """

    def test_contrib_declares_no_database_models(self):
        contrib_dir = Path(AETOS_STATIC_DIR).parent
        self.assertFalse((contrib_dir / "models.py").exists())
        self.assertFalse((contrib_dir / "migrations").exists())
