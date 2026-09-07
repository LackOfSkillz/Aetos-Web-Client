"""
Tests for M31 -- release candidate.

What a reviewer would check before merging a contrib, checked here instead so
that it is checked every time rather than once.

Most of these pin conventions rather than behaviour, and each one exists because
breaking it produces no error and no symptom -- the class of defect this project
has found in a README, a stylesheet, a compatibility claim and a settings page.

**A8 is not represented here and cannot be.** Assistive-technology validation
needs a refreshable braille display and somebody who works with augmentative
communication, and A.100 says the project cannot claim braille or AAC
compatibility without them. Nothing in a test file substitutes for that, and a
test that pretended to would be worse than its absence.

"""

import ast
import re
from pathlib import Path

from django.test import TestCase

from evennia.contrib.base_systems.aetos_webclient import AETOS_STATIC_DIR

CONTRIB_DIR = Path(AETOS_STATIC_DIR).parent
README = (CONTRIB_DIR / "README.md").read_text(encoding="utf-8")


def _python_files():
    """
    Every Python module the contrib ships.

    Returns:
        list: Paths, excluding caches.

    """
    return [p for p in sorted(CONTRIB_DIR.rglob("*.py")) if "__pycache__" not in p.parts]


#: This module, which must not scan itself.
#:
#: It contains the very strings it looks for -- "aetos_testgame", "TODO" -- as
#: the patterns it searches with. Left in, the scans report this file for
#: describing what it forbids, which is the same shape as a test matching its
#: own prose and had exactly the same effect: two red tests and nothing wrong.
SCANNER = Path(__file__).name


def _scannable(paths):
    """
    Drop the scanner from a list of files to scan.

    Args:
        paths (list): Paths.

    Returns:
        list: The same paths without this module.

    """
    return [p for p in paths if p.name != SCANNER]


def _client_files():
    """
    Every JavaScript file the contrib ships.

    Returns:
        list: Paths.

    """
    return sorted((Path(AETOS_STATIC_DIR)).rglob("*.js"))


class TestTheReadmeFeedsEvenniasDocumentation(TestCase):
    """
    Evennia generates a contrib's documentation page and its entry in the
    contrib index from this README, by splitting on blank lines:

        block 0 -> the title
        block 1 -> the credits line
        block 2 -> the blurb shown in the index

    Reformat the top of the README and the index entry silently becomes
    something else -- a heading, half a sentence, or the directory name. There
    is no error; the page just reads wrong for everybody browsing the contribs.

    """

    def _blocks(self):
        """
        The README split the way Evennia's generator splits it.

        Returns:
            list: Up to four blocks.

        """
        return README.split("\n\n", 3)

    def test_it_splits_into_the_blocks_the_generator_expects(self):
        self.assertGreaterEqual(len(self._blocks()), 3)

    def test_the_first_block_is_a_single_title_heading(self):
        title = self._blocks()[0]
        self.assertTrue(title.startswith("# "), "first block is not a heading: %r" % title[:40])
        self.assertNotIn("\n", title, "the title block runs on into the next line")

    def test_the_second_block_is_the_credits_line(self):
        """
        Every other contrib uses this exact form, and the index prints it
        verbatim under the contrib's name.

        """
        credits = self._blocks()[1]
        self.assertTrue(
            credits.startswith("Contribution by "),
            "second block is not a credits line: %r" % credits[:60],
        )

    def test_the_third_block_reads_as_a_description(self):
        """
        It becomes the one-paragraph summary in the contrib index, so it has to
        stand alone -- no heading, no list, no sentence that depends on what
        came before it.

        """
        blurb = self._blocks()[2]
        self.assertFalse(blurb.startswith("#"), "the blurb block is a heading")
        self.assertFalse(blurb.startswith("- "), "the blurb block is a list")
        self.assertGreater(len(blurb), 80, "the blurb is too short to describe anything")

    def test_the_readme_says_what_it_is_before_how_to_install_it(self):
        self.assertLess(README.index("## Features"), README.index("## Installation"))


class TestTheContribIsSelfContained(TestCase):
    """
    A contrib that reaches outside its own directory cannot be reviewed as one
    change, and cannot be removed by deleting one directory.

    """

    def test_nothing_imports_from_another_contrib(self):
        for path in _python_files():
            source = path.read_text(encoding="utf-8")
            for match in re.findall(r"from (evennia\.contrib\.[\w.]+) import", source):
                self.assertIn(
                    "aetos_webclient",
                    match,
                    "%s imports from another contrib: %s" % (path.name, match),
                )

    def test_no_file_refers_to_a_developer_machine(self):
        """
        Absolute paths, the laboratory game, and its ports. Every one of them
        works on exactly one computer.

        """
        patterns = (r"[A-Z]:\\\\", r"aetos_testgame", r"localhost:44")
        for path in _scannable(list(_python_files()) + list(_client_files())):
            source = path.read_text(encoding="utf-8")
            for pattern in patterns:
                self.assertIsNone(
                    re.search(pattern, source),
                    "%s refers to a developer machine (%s)" % (path.name, pattern),
                )

    def test_nothing_is_left_marked_unfinished(self):
        for path in _scannable(list(_python_files()) + list(_client_files())):
            source = path.read_text(encoding="utf-8")
            for marker in ("TODO", "FIXME", "XXX:", "HACK"):
                self.assertNotIn(marker, source, "%s contains %s" % (path.name, marker))

    def test_the_client_loads_nothing_from_a_third_party_host(self):
        """
        The core-only dependency rule, checked where it would break: a game on
        a firewalled network must still work, and an unpinned CDN URL is a
        breaking change for every install at once.

        Matches on the *loading* attributes rather than on any URL, because
        `http://www.w3.org/2000/svg` is a namespace and `evennia.com` in a
        comment is a link somebody should follow -- neither fetches anything.

        """
        sources = list(_client_files()) + sorted((CONTRIB_DIR / "templates").rglob("*.html"))
        self.assertGreater(len(sources), 20)
        for path in sources:
            source = path.read_text(encoding="utf-8")
            for attribute in ("src", "href"):
                for match in re.findall(r'%s\s*=\s*"(https?://[^"]+)"' % attribute, source):
                    self.fail("%s loads %s from %s" % (path.name, attribute, match))


class TestEveryProductionDefinitionIsDocumented(TestCase):
    """
    Evennia's contributing guide asks for Google-style docstrings on all code.

    Test methods are exempt here and that is a position rather than an
    oversight: they are named as sentences, and the ones whose reasoning is not
    obvious from the name carry a docstring explaining *why the case matters*.
    Six hundred docstrings restating the method name would bury those.

    """

    def test_no_production_definition_lacks_a_docstring(self):
        missing = []
        for path in _python_files():
            if path.parent.name == "tests":
                continue
            tree = ast.parse(path.read_text(encoding="utf-8"))
            if not ast.get_docstring(tree):
                missing.append("%s: module" % path.name)
            for node in ast.walk(tree):
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                    if not ast.get_docstring(node):
                        missing.append("%s: %s" % (path.name, node.name))
        self.assertEqual(missing, [], "undocumented: %s" % missing)

    def test_there_is_production_code_to_check(self):
        """
        Guards the test above: a path bug that found no files would make it
        pass while checking nothing.

        """
        production = [p for p in _python_files() if p.parent.name != "tests"]
        self.assertGreater(len(production), 10, "found only %d modules" % len(production))


class TestTheReleaseStatesWhatItHasNotDone(TestCase):
    """
    The one thing that must not be quietly true at release.

    A.100: the project cannot claim braille or AAC compatibility without the
    testing that justifies it. That testing is A8, it needs two people, and it
    has not happened.

    """

    def test_the_readme_does_not_claim_wcag_compliance(self):
        self.assertNotIn("WCAG 2.2 compliant", README)
        self.assertNotIn("fully accessible", README)
        self.assertIn("designed toward", README)

    def test_the_readme_does_not_claim_screen_reader_or_braille_support(self):
        self.assertIn("does not claim", README)
        for unearned in ("JAWS compatible", "braille compatible", "NVDA compatible"):
            self.assertNotIn(unearned, README)

    def test_the_readme_does_not_claim_aac_support(self):
        """
        A.94. The architecture exists; the judgement that it serves the people
        it is for does not, because nobody who works with augmentative
        communication has reviewed it.

        """
        self.assertIn("not a claim of AAC support", README)

    def test_the_readme_separates_tested_from_expected(self):
        """
        M29's compatibility work. A matrix that does not distinguish them reads
        as evidence when it is assumption.

        """
        self.assertIn("tested rather than merely expected", README)


class TestAConnectedClientThatHearsNothingSaysSo(TestCase):
    """
    Found by installing into a clean game and opening the client while the
    server was starting: the console stayed empty, the status bar said
    "Connected", and it stayed that way indefinitely. A raw websocket opened
    later received the game's greeting immediately, so the game and the port
    were both fine.

    `Evennia.isConnected()` was true and honest -- the socket really was open.
    Aetos cannot see the problem there. It can see it in its own protocol: it
    sends a hello and expects a manifest, and silence means it is connected to
    something that is not going to answer.

    Same family as M24: the client presenting something as true that it had no
    way to know was still true.

    **The cause is not proven.** The symptom was reproduced once, with logs; the
    hypothesis is a socket the Portal accepted without a Server session behind
    it. What follows is a safeguard that is correct whatever the cause -- and
    its firing path is pinned here rather than observed, because the race would
    not reproduce on demand.

    """

    def _shell(self):
        """
        The client shell's source.

        Returns:
            str: JavaScript source.

        """
        return (Path(AETOS_STATIC_DIR) / "aetos" / "js" / "aetos.js").read_text(encoding="utf-8")

    def test_the_handshake_is_watched_for_an_answer(self):
        shell = self._shell()
        self.assertIn("var HANDSHAKE_TIMEOUT_MS = 8000;", shell)
        self.assertIn("function watchHandshake()", shell)
        self.assertIn("watchHandshake();", shell)

    def test_an_answered_handshake_stops_the_watch(self):
        shell = self._shell()
        body = shell[shell.index("emitter.on(AETOS_MSG.MANIFEST") :][:400]
        self.assertIn("manifestReceived = true;", body)
        self.assertIn("clearHandshakeWatch();", body)

    def test_the_player_is_told_before_anything_is_retried(self):
        """
        The first message says the game may still be starting, which is both the
        likeliest explanation and the one that asks nothing of the player.

        """
        shell = self._shell()
        self.assertIn("Connected, but the game has not answered yet.", shell)

    def test_retrying_a_handshake_is_not_retrying_a_command(self):
        """
        M24 refuses to queue a command through a dropout, because replaying one
        executes a decision about a situation that may no longer exist. A hello
        asks a question and changes nothing, so re-sending it is safe -- and it
        lets the client heal itself the moment the server finishes starting.

        """
        shell = self._shell()
        body = shell[shell.index("function watchHandshake()") : shell.index("function sendHello()")]
        self.assertIn("helloSent = false;", body)
        self.assertIn("sendHello();", body)

    def test_it_gives_up_rather_than_retrying_forever(self):
        """
        A client quietly retrying for an hour looks exactly like a client that
        is working.

        """
        shell = self._shell()
        self.assertIn("var HANDSHAKE_ATTEMPTS = 4;", shell)
        self.assertIn("Connected, but the game is not answering.", shell)

    def test_a_reconnect_asks_the_question_again(self):
        """
        The flag has to be cleared on close, or the second connection of a
        session would be watched by a timer that already fired.

        """
        shell = self._shell()
        body = shell[shell.index('emitter.on("connection_close"') :][:500]
        self.assertIn("manifestReceived = false;", body)
        self.assertIn("clearHandshakeWatch();", body)


class TestTheReadmeSurvivesEvenniasDocsGenerator(TestCase):
    """
    Evennia publishes this contrib's page by parsing the README, and it parses it
    crudely.

    `docs/pylib/contrib_readmes2docs.py` does exactly this::

        credits = data.split("\n\n", 3)[1]
        blurb = data.split("\n\n", 3)[2]

    Split on blank lines: **the second paragraph becomes the credits line and the
    third becomes the blurb** shown in the contrib index that every Evennia user
    browses. There is no marker, no front-matter and no validation -- put a badge,
    a note, or a second title line near the top and the published page credits the
    contrib to whatever that paragraph happens to say.

    Nothing upstream needs editing to add a contrib, which is what keeps the PR
    diff confined to this directory. The price is that the README's opening shape
    is load-bearing and looks like prose.

    These tests *replicate* that parsing rather than running the generator, which
    writes a hundred files into the docs tree. So the replication itself is
    checked: the last test below reads the generator's source and fails if the
    split it depends on ever changes. A guard built on an assumption about
    somebody else's code should say out loud when that assumption expires.

    """

    def _generated(self):
        """
        What Evennia's generator would extract.

        Returns:
            tuple: The credits paragraph and the blurb paragraph.

        """
        data = README
        parts = data.split("\n\n", 3)
        return parts[1], parts[2]

    def test_the_credits_line_is_the_credits_line(self):
        credits, _ = self._generated()
        self.assertTrue(
            credits.startswith("Contribution by"),
            "Evennia would publish this as the contrib's credits: %r" % credits[:80],
        )

    def test_the_blurb_describes_the_contrib(self):
        """
        The third paragraph is what appears under the contrib's name in the index
        Evennia ships. A stray note or badge there would be the description
        thousands of people read first.

        """
        _, blurb = self._generated()
        self.assertIn("Evennia", blurb)
        self.assertGreater(len(blurb.strip()), 60, "the blurb is too short to say anything")
        for wrong in ("![", "```", "| ---", "**Note"):
            self.assertNotIn(
                wrong, blurb, "the blurb paragraph contains markup that would render badly"
            )

    def test_the_title_is_a_title(self):
        parts = README.split("\n\n", 3)
        self.assertTrue(parts[0].startswith("# "), "the README does not open with an H1")
        self.assertEqual(parts[0].count("\n"), 0, "the H1 paragraph has extra lines in it")

    def test_the_assumption_still_matches_evennias_generator(self):
        """
        The three tests above are only meaningful while Evennia parses READMEs
        this way. If it stops, they go on passing while guarding nothing --
        which is a failure mode this project has met more than once.

        Skipped rather than failed when the generator is absent: a contrib
        installed on its own has no `docs/` beside it, and that is a legitimate
        way to use this code rather than a problem with it.

        """
        generator = CONTRIB_DIR.parents[3] / "docs" / "pylib" / "contrib_readmes2docs.py"
        if not generator.is_file():
            self.skipTest("not running from an Evennia checkout with docs/")

        source = generator.read_text(encoding="utf-8")
        self.assertIn(
            'data.split("\\n\\n", 3)[1]',
            source,
            "Evennia's docs generator no longer takes the credits from the second "
            "paragraph, so the README guards above are guarding nothing",
        )
        self.assertIn('data.split("\\n\\n", 3)[2]', source)


class TestTheContribDependsOnNothing(TestCase):
    """
    The claim the whole project rests on, finally checked.

    The README's closing line is *"No CDN, no build step, no JavaScript
    framework"*, and the design constraint above that is core-only dependencies:
    Python, Evennia, Django, and universal browser APIs. A game installs this and
    needs nothing else.

    **Nothing verified it.** An `import requests` added in a hurry would have
    shipped, and the first anybody would know is a game failing to start with an
    ImportError naming a package they never asked for -- which is the single most
    annoying way for a contrib to be wrong.

    Checked by parsing rather than by running: an import that only happens inside
    a function still counts, because it still fails, and it fails later and more
    confusingly than one at the top of a file.

    """

    #: Imports allowed beyond the standard library.
    #:
    #: `black` is the one exception and it is a *test-only* import, guarded by a
    #: `skipTest` so a game without it is unaffected. It is here because
    #: Evennia's CI runs `black --check` and this contrib arrived at that gate
    #: with twelve unformatted files; the check that prevents a recurrence has to
    #: live where it will actually be run.
    ALLOWED_EXTERNAL = {"black"}

    def _external_imports(self):
        """
        Every non-stdlib import in the contrib, and where it came from.

        Returns:
            dict: Top-level module name mapped to the files importing it.

        """
        import sys

        stdlib = set(sys.stdlib_module_names)
        found = {}

        for path in sorted(CONTRIB_DIR.rglob("*.py")):
            if "__pycache__" in path.parts:
                continue
            tree = ast.parse(path.read_text(encoding="utf-8"))
            for node in ast.walk(tree):
                modules = []
                if isinstance(node, ast.Import):
                    modules = [alias.name for alias in node.names]
                elif isinstance(node, ast.ImportFrom):
                    if node.level:
                        # Relative, so inside the contrib by construction.
                        continue
                    modules = [node.module or ""]
                for module in modules:
                    top = module.split(".")[0]
                    if not top or top in stdlib:
                        continue
                    if top in ("evennia", "django"):
                        continue
                    found.setdefault(top, set()).add(path.name)

        return found

    def test_it_imports_nothing_but_python_django_and_evennia(self):
        unexpected = {
            module: sorted(files)
            for module, files in self._external_imports().items()
            if module not in self.ALLOWED_EXTERNAL
        }
        self.assertEqual(
            unexpected,
            {},
            "the contrib promises core-only dependencies and imports: %s" % unexpected,
        )

    def test_the_one_exception_is_test_only_and_degrades(self):
        """
        `black` may be imported, and only from a test, and only in a way that
        skips when it is absent. An allowance that quietly became a runtime
        dependency would be worse than never having made it.

        """
        for module, files in self._external_imports().items():
            if module not in self.ALLOWED_EXTERNAL:
                continue
            with self.subTest(module=module):
                self.assertTrue(
                    all(name.startswith("test_") for name in files),
                    "%s is imported outside the tests: %s" % (module, sorted(files)),
                )

        source = (CONTRIB_DIR / "tests" / "test_release_readiness.py").read_text(encoding="utf-8")
        self.assertIn("except ImportError", source)
        self.assertIn("self.skipTest", source)


class TestTheCodeIsFormattedTheWayEvenniaDemands(TestCase):
    """
    Evennia's CI runs `black --check`, and a PR that fails it fails immediately.

    Found while preparing the upstream submission: **twelve files would have been
    reformatted**, and nothing in this project said so. `AGENTS.md` is explicit --
    *"Don't manually format code. Run `make format` after editing"* -- and across
    the whole D-track and the UI work it was never run, because nothing failed
    when it was skipped.

    That is the shape this project keeps finding, in a new place: a rule that
    reads as a guarantee and is enforced by nobody. The fix is not to remember
    harder.

    **Only this contrib is checked.** The PR diff is confined to
    `evennia/contrib/base_systems/aetos_webclient/`, and formatting somebody
    else's file to satisfy a test here would put changes in the diff that have
    nothing to do with Aetos.

    """

    def _sources(self):
        """
        Every Python file in the contrib.

        Returns:
            list: Paths.

        """
        return sorted(CONTRIB_DIR.rglob("*.py"))

    def test_black_would_change_nothing(self):
        try:
            import black
        except ImportError:  # pragma: no cover - depends on the dev environment
            self.skipTest("black is not installed; Evennia's CI will still run it")

        mode = black.Mode(line_length=100)
        unformatted = []
        for path in self._sources():
            source = path.read_text(encoding="utf-8")
            try:
                if black.format_file_contents(source, fast=True, mode=mode):
                    unformatted.append(path.name)
            except black.NothingChanged:
                continue
            except Exception as err:  # pragma: no cover - a parse failure is its own bug
                unformatted.append("%s (%s)" % (path.name, err))

        self.assertEqual(
            unformatted,
            [],
            "black would reformat these, and Evennia's CI runs `black --check`: %s"
            % ", ".join(unformatted),
        )

    def test_the_line_length_matches_evennias(self):
        """
        100, from Evennia's own `pyproject.toml`.

        Hard-coded above rather than read from that file, because a contrib is
        also installed on its own -- and a test that silently skipped when the
        Evennia checkout was not laid out as expected would be a guard that
        stopped guarding without saying so.

        """
        pyproject = CONTRIB_DIR.parents[3] / "pyproject.toml"
        if not pyproject.is_file():
            self.skipTest("not running from an Evennia checkout")
        self.assertIn("line-length = 100", pyproject.read_text(encoding="utf-8"))
