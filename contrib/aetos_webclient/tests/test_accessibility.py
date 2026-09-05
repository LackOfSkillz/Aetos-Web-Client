"""
Accessibility contract tests for the Aetos shell.

Blueprint revision 2 makes accessibility a completion gate rather than a late
review: no core Aetos widget is finished until it is usable without vision and
usable without a mouse. These tests encode the parts of that rule which can be
asserted statically, so a regression fails here rather than in a screen reader.

"""

from pathlib import Path

from django.test import TestCase

from evennia.contrib.base_systems.aetos_webclient import AETOS_TEMPLATE_DIR, constants

TEMPLATE_PATH = Path(AETOS_TEMPLATE_DIR) / constants.WEBCLIENT_TEMPLATE_NAME
STATIC_DIR = Path(AETOS_TEMPLATE_DIR).parent / "static" / "aetos"


class TestShellSemantics(TestCase):
    """Landmarks, headings and labels a non-visual user navigates by."""

    def setUp(self):
        self.markup = TEMPLATE_PATH.read_text(encoding="utf-8")

    def test_has_a_main_landmark(self):
        """Screen reader users jump between landmarks to skip chrome."""
        self.assertIn("<main", self.markup)

    def test_console_region_is_labelled(self):
        """An unlabelled region is announced only as "region"."""
        self.assertIn('aria-labelledby="aetos-console-heading"', self.markup)
        self.assertIn('id="aetos-console-heading"', self.markup)

    def test_command_input_has_a_label(self):
        """A bare textarea is announced with no indication of its purpose."""
        self.assertIn('<label for="aetos-input"', self.markup)

    def test_console_is_keyboard_reachable(self):
        """
        Scrollback must be reachable without a mouse. tabindex="0" puts the log
        in the tab order so it can be scrolled with the keyboard.

        """
        self.assertIn('tabindex="0"', self.markup)


class TestOutputIsNotALiveRegion(TestCase):
    """
    The output console must not announce every line.

    `role="log"` carries an *implicit* aria-live="polite". Left implicit, a screen
    reader would announce every line of game output -- unusable during combat spam
    or a long room listing. Aetos therefore sets aria-live="off" explicitly and
    routes deliberate announcements through a separate announcer region.
    Blueprint sections 48 and 100.

    """

    def setUp(self):
        self.markup = TEMPLATE_PATH.read_text(encoding="utf-8")

    def test_console_disables_the_implicit_live_region(self):
        """Without this, role="log" would announce all game output."""
        self.assertIn('aria-live="off"', self.markup)

    def test_a_dedicated_announcer_region_exists(self):
        """Deliberate announcements need a channel that is not the output log."""
        self.assertIn('id="aetos-announcer"', self.markup)
        self.assertIn('aria-live="polite"', self.markup)

    def test_announcer_is_available_to_widgets(self):
        """Later widgets announce through this shared seam, not their own."""
        script = (STATIC_DIR / "js" / "aetos.js").read_text(encoding="utf-8")
        self.assertIn("announcer: announcer", script)


class TestStatusIsNotColourAlone(TestCase):
    """
    No information may depend on colour alone (blueprint sections 45, 49).

    Connection state is carried by a text label; the coloured dot is decorative
    and hidden from assistive technology.

    """

    def setUp(self):
        self.markup = TEMPLATE_PATH.read_text(encoding="utf-8")
        self.script = (STATIC_DIR / "js" / "aetos.js").read_text(encoding="utf-8")

    def test_decorative_dot_is_hidden_from_assistive_tech(self):
        """Announcing a bare dot adds noise and no information."""
        self.assertIn('class="aetos-connection__dot" aria-hidden="true"', self.markup)

    def test_connection_state_has_a_text_label(self):
        """The state must be readable, not merely visible."""
        self.assertIn('id="aetos-connection-label"', self.markup)
        for word in ("Connecting", "Connected", "Disconnected"):
            self.assertIn(word, self.script)


class TestKeyboardOperation(TestCase):
    """Everything must be operable without a mouse (blueprint section 50)."""

    def setUp(self):
        self.script = (STATIC_DIR / "js" / "aetos.js").read_text(encoding="utf-8")

    def test_enter_submits_a_command(self):
        """The primary action must not require clicking the Send button."""
        self.assertIn('event.key === "Enter"', self.script)

    def test_shift_enter_is_reserved_for_newlines(self):
        """Multi-line input must remain possible without submitting."""
        self.assertIn("!event.shiftKey", self.script)


class TestVisualComfortPreferences(TestCase):
    """Respect for user-level display preferences."""

    def setUp(self):
        self.css = (STATIC_DIR / "css" / "aetos.css").read_text(encoding="utf-8")

    def test_reduced_motion_is_respected(self):
        """
        Motion can cause nausea and migraine; the OS preference is honoured.

        Asserted against `accessibility.css`, not this file's stylesheet. M4 put
        a blanket rule here that matched every element unconditionally; A0 later
        added one that honours an explicit player choice in both directions, and
        the two disagreed -- a player who deliberately chose full motion still
        had it removed by the older rule. The blanket rule was deleted at M29,
        and this test follows the rule that actually reads the preference.

        """
        a11y = (STATIC_DIR / "css" / "accessibility.css").read_text(encoding="utf-8")
        self.assertIn("@media (prefers-reduced-motion: reduce)", a11y)
        # And an explicit choice still wins, which is the part that was broken.
        self.assertIn(':root:not([data-aetos-motion="full"])', a11y)

    def test_focus_is_always_visible(self):
        """A keyboard user who cannot see focus cannot navigate."""
        self.assertIn(":focus-visible", self.css)

    def test_focus_outline_is_not_suppressed(self):
        """`outline: none` without a replacement is a common accessibility bug."""
        self.assertNotIn("outline: none", self.css)
        self.assertNotIn("outline:none", self.css)
