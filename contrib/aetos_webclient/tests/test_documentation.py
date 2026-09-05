"""
Tests for M28 -- documentation.

M28 found what a documentation milestone is for. The README's closing paragraph
listed ten things as *still to come*, and nine of them had shipped: the
accessibility foundation, event history, audio and captions, themes, the PWA
shell, touch gestures, the developer inspector, the widget SDK and the
server-described UI manifest. Only voice was genuinely outstanding.

That is the same shape as M24's `page-has-heading-one`: something correct when it
was written, reported every day afterwards to nobody. The README is the file that
ships with the contrib and the first thing an Evennia reviewer reads, and it had
quietly stopped describing the software.

So these tests are not about prose quality. They pin the three ways this
documentation can become false while nobody is looking:

- a settings example that no longer validates
- a feature described as unbuilt that exists
- the generated feature reference falling behind the help topics it is generated
  from

"""

import ast
import re
from pathlib import Path

from django.test import TestCase, override_settings

from evennia.contrib.base_systems.aetos_webclient import (
    AETOS_STATIC_DIR,
    csp,
    manifest,
    ui_manifest,
)

CONTRIB_DIR = Path(AETOS_STATIC_DIR).parent
README = (CONTRIB_DIR / "README.md").read_text(encoding="utf-8")
HELP_JS = (Path(AETOS_STATIC_DIR) / "aetos" / "js" / "help.js").read_text(encoding="utf-8")

#: The repository's `docs/` directory, when running from a checkout.
#:
#: Absent when the contrib has been vendored into an Evennia install on its own,
#: which is a legitimate way to use it -- so tests that need it skip rather than
#: fail.
DOCS_DIR = CONTRIB_DIR.parents[4] / "docs"


def _python_blocks(markdown):
    """
    Every fenced Python block in a document.

    Args:
        markdown (str): Document source.

    Returns:
        list: Block bodies.

    """
    return re.findall(r"```python\n(.*?)```", markdown, flags=re.S)


def _assignments(block):
    """
    The `AETOS_*` assignments in one code block.

    Parsed rather than executed. A README example is untrusted in the sense that
    matters here -- it is text, and running it to check it would make the test
    suite do whatever a future editor pasted in.

    Args:
        block (str): Python source.

    Returns:
        dict: Setting name to value, for assignments this can evaluate.

    """
    found = {}
    try:
        tree = ast.parse(block)
    except SyntaxError:
        return found
    for node in tree.body:
        if not isinstance(node, ast.Assign):
            continue
        for target in node.targets:
            if isinstance(target, ast.Name) and target.id.startswith("AETOS_"):
                try:
                    found[target.id] = ast.literal_eval(node.value)
                except ValueError:
                    # A worked example using a name rather than a literal, such
                    # as a provider class. Not something this can check.
                    pass
    return found


class TestTheSettingsExamplesStillWork(TestCase):
    """
    Executable documentation.

    A settings example is the part of a README people paste rather than read, so
    it is the part where being out of date does real damage.

    """

    #: Which validator owns which setting.
    VALIDATORS = {
        "AETOS_FEATURES": (manifest.get_features, manifest.AetosManifestError),
        "AETOS_AUTOMATION": (manifest.get_automation_policy, manifest.AetosManifestError),
        "AETOS_UI": (ui_manifest.get_ui_description, ui_manifest.AetosUIError),
        "AETOS_CSP": (csp.build_policy, csp.AetosCspError),
    }

    def test_the_readme_contains_examples_to_check(self):
        """
        Guards the rest of this class. A regex that matched nothing would let
        every test below pass by having no work to do.

        """
        examples = {}
        for block in _python_blocks(README):
            examples.update(_assignments(block))
        self.assertGreaterEqual(len(examples), 4, "found only %s" % sorted(examples))

    def test_every_example_validates(self):
        for block in _python_blocks(README):
            for name, value in _assignments(block).items():
                validate, error = self.VALIDATORS.get(name, (None, None))
                if validate is None:
                    continue
                with self.subTest(setting=name):
                    with override_settings(**{name: value}):
                        try:
                            validate()
                        except error as err:
                            self.fail("README example for %s is invalid: %s" % (name, err))

    def test_the_settings_table_lists_every_setting_the_client_reads(self):
        """
        A setting a game can set and cannot find out about is one it will not
        use. Read from the source rather than from a list here, so a new
        setting appears in this test the moment the code reads it.

        """
        read_by_code = set()
        for path in CONTRIB_DIR.glob("*.py"):
            read_by_code.update(
                re.findall(r'getattr\(settings, "(AETOS_\w+)"', path.read_text(encoding="utf-8"))
            )
        read_by_code.update(
            re.findall(
                r'getattr\(settings, "(AETOS_\w+)"',
                (CONTRIB_DIR / "providers" / "__init__.py").read_text(encoding="utf-8"),
            )
        )
        self.assertTrue(read_by_code)
        for name in sorted(read_by_code):
            self.assertIn("`%s`" % name, README, "%s is not in the README" % name)


class TestNothingShippedIsDescribedAsForthcoming(TestCase):
    """
    The defect M28 was written to fix, turned into something that cannot recur
    silently.

    """

    #: A phrase the README uses, and a file that exists only once it is true.
    SHIPPED = {
        "event history": CONTRIB_DIR / "static" / "aetos" / "js" / "history.js",
        "captions": CONTRIB_DIR / "static" / "aetos" / "js" / "media" / "captions.js",
        "themes": CONTRIB_DIR / "static" / "aetos" / "js" / "themes" / "themes.js",
        "PWA": CONTRIB_DIR / "static" / "aetos" / "js" / "pwa.js",
        "touch gestures": CONTRIB_DIR / "static" / "aetos" / "js" / "gestures.js",
        "developer inspector": CONTRIB_DIR
        / "static"
        / "aetos"
        / "js"
        / "developer"
        / "inspector.js",
        "picture-supported communication": CONTRIB_DIR
        / "static"
        / "aetos"
        / "js"
        / "aac"
        / "board.js",
        "UI manifest": CONTRIB_DIR / "ui_manifest.py",
    }

    def _forthcoming(self):
        """
        The paragraph listing what has not been built.

        Returns:
            str: The paragraph text.

        """
        marker = "**Still to come:**"
        self.assertIn(marker, README, "the README no longer says what is outstanding")
        start = README.index(marker)
        return README[start : README.index("\n\n", start)]

    def test_the_forthcoming_list_names_nothing_that_exists(self):
        forthcoming = self._forthcoming().lower()
        for phrase, path in self.SHIPPED.items():
            if path.exists():
                self.assertNotIn(
                    phrase.lower(),
                    forthcoming,
                    "%r ships (%s exists) but the README calls it forthcoming"
                    % (phrase, path.name),
                )

    def test_the_shipped_paths_are_real(self):
        """
        Guards the test above. Every path being wrong would make it pass while
        checking nothing.

        """
        for phrase, path in self.SHIPPED.items():
            self.assertTrue(path.exists(), "%r points at a missing file: %s" % (phrase, path))

    def test_voice_is_still_listed_and_still_absent(self):
        """
        Pinned in both directions on purpose.

        Voice is the one thing genuinely outstanding. When it ships, this fails
        until the README stops promising it -- which is the only mechanism that
        would have caught the nine that went stale.

        """
        self.assertIn("voice input", self._forthcoming().lower())
        self.assertFalse(
            (CONTRIB_DIR / "static" / "aetos" / "js" / "voice.js").exists(),
            "voice has shipped; the README's outstanding list needs updating",
        )


class TestNoSettingIsDocumentedThatNothingReads(TestCase):
    """
    The mirror image of the previous class, and a defect found the same way.

    The README's integration section opened by telling a developer to declare
    `AETOS_BINDINGS`. Nothing reads it. Following the documentation top to bottom
    produced a settings file that did nothing, with no error -- M27's startup
    checks deliberately do not warn about a setting no code consumes, because a
    check for one would be a promise the code does not keep.

    """

    def test_bindings_is_not_offered_as_something_to_configure(self):
        """
        It may be *mentioned* -- the design exists and hiding it would be its own
        kind of dishonesty -- but not as a copyable example.

        """
        for block in _python_blocks(README):
            self.assertNotIn(
                "AETOS_BINDINGS",
                block,
                "the README shows an AETOS_BINDINGS example; nothing reads it",
            )

    def test_where_it_is_mentioned_it_is_marked_as_absent(self):
        self.assertIn("AETOS_BINDINGS", README)
        marker = "Not yet built"
        self.assertIn(marker, README)
        # In the same paragraph, not somewhere else in the file.
        start = README.index(marker)
        self.assertIn("AETOS_BINDINGS", README[start : README.index("\n\n", start)])

    def test_no_command_is_documented_that_does_not_exist(self):
        """
        `evennia aetos discover` was in the README as a working command. There is
        no management command in this contrib at all.

        """
        self.assertFalse(list(CONTRIB_DIR.glob("management/**/*.py")))
        for block in re.findall(r"```\n(.*?)```", README, flags=re.S):
            self.assertNotIn("evennia aetos", block)


class TestTheGeneratedReferenceMatchesItsSource(TestCase):
    """
    `docs/features.md` is generated from `help.js` so that the page on the
    website and the help a player reads with F1 cannot disagree. That only holds
    while somebody remembers to regenerate it.

    """

    def _titles(self):
        """
        Every help topic title.

        Returns:
            list: Titles, in file order.

        """
        return re.findall(r'\n            title: "([^"]+)"', HELP_JS)

    def test_the_help_topics_are_findable(self):
        titles = self._titles()
        self.assertGreaterEqual(len(titles), 20, "found %d titles" % len(titles))

    def test_every_topic_has_a_section_in_the_generated_reference(self):
        features = DOCS_DIR / "features.md"
        if not features.exists():
            self.skipTest("docs/features.md is outside a vendored contrib")
        generated = features.read_text(encoding="utf-8")
        for title in self._titles():
            self.assertIn(
                "## %s" % title,
                generated,
                "features.md is stale: no section for %r. Run "
                "`python scripts/sync_contrib.py` then "
                "`node scripts/export_help_docs.js`." % title,
            )

    def test_no_topic_uses_markup_the_client_cannot_render(self):
        """
        Found at M28: one topic used `**bold**`.

        The same string is rendered twice -- as markdown on the website, where
        it worked, and as `textContent` in the client, where it showed the
        asterisks. One source with two renderers means the markup has to be
        what both understand, which is none.

        """
        bodies = re.findall(r'"([^"\\]*(?:\\.[^"\\]*)*)"', HELP_JS)
        for body in bodies:
            if "kwargs" in body:
                # A Python code example, where `**` is the language.
                continue
            self.assertNotIn("**", body, "help text contains markdown: %r" % body[:60])
