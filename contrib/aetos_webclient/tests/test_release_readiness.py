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
