"""
Tests for A9 -- the accessibility toggle and its feature picker.

Gary's direction: *"the accessibility ui and the standard ui should be a toggle
and if its toggled on you can choose the accessibility features you want."*

None of the options this panel shows are new. Every one has worked since the
A-track built it and every one is in Settings. The problem it solves is that they
are spread across five groups of a panel reached from the command palette, so a
player who needs three of them has to know they exist, know they are separable,
and go looking. Granularity was right and it created a discovery problem.

**The line this milestone had to draw** is between the accommodations a player
chooses and the ones that are simply how the client is built. A0 deliberately
gave the schema no master switch (A.70) and that reasoning holds exactly here: a
client that is only operable by keyboard when a box is ticked is not an
accessible client with a toggle, it is an inaccessible client with an apology.

So the toggle governs the optional, opinionated layer, and the baseline is not
merely excluded but *listed in the panel* -- somebody deciding whether to turn
accessibility "on" deserves to know what was never off.

"""

import re
from pathlib import Path

from django.test import TestCase

from evennia.contrib.base_systems.aetos_webclient import AETOS_STATIC_DIR

JS_DIR = Path(AETOS_STATIC_DIR) / "aetos" / "js"
PANEL = (JS_DIR / "accessibility" / "panel.js").read_text(encoding="utf-8")
PREFS = (JS_DIR / "accessibility" / "preferences.js").read_text(encoding="utf-8")
SHELL = (JS_DIR / "aetos.js").read_text(encoding="utf-8")
TEMPLATE = (Path(AETOS_STATIC_DIR).parent / "templates" / "webclient.html").read_text(
    encoding="utf-8"
)
CSS = (Path(AETOS_STATIC_DIR) / "aetos" / "css" / "accessibility.css").read_text(encoding="utf-8")


def _governed_paths():
    """
    The preference paths the panel offers.

    Returns:
        list: Dotted paths, in declaration order.

    """
    block = PREFS[PREFS.index("var GOVERNED = [") : PREFS.index("var UNCONDITIONAL = [")]
    return re.findall(r'path:\s*"([\w.]+)"', block)


class TestTheToggleIsFindable(TestCase):
    """
    The entire justification for A9. If it is not findable it has changed
    nothing, because everything behind it already existed.

    """

    def test_it_is_in_the_status_bar_rather_than_in_settings(self):
        """
        Settings is where these options already were, and where almost nobody
        found them.

        """
        nav = TEMPLATE[TEMPLATE.index('id="aetos-toolbar"') :]
        nav = nav[: nav.index("</nav>")]
        self.assertIn('id="aetos-accessibility-toggle"', nav)

    def test_it_says_a_word_rather_than_showing_an_icon(self):
        """
        An icon here would be a symbol somebody has to recognise before they can
        ask for help reading symbols.

        """
        self.assertIn(">Accessibility</button>", TEMPLATE)

    def test_it_is_an_ordinary_button_in_the_tab_order(self):
        """
        No `tabindex`, no roving group. The toolbar is a plain `nav` of
        unrelated controls, which the template says in as many words, so a
        button in it is reachable by Tab like any other.

        """
        window = TEMPLATE[TEMPLATE.index('id="aetos-accessibility-toggle"') :][:300]
        self.assertIn('type="button"', window)
        self.assertNotIn("tabindex", window)

    def test_it_reports_whether_the_panel_is_showing(self):
        self.assertIn('aria-expanded="false"', TEMPLATE)
        self.assertIn('toggleButton.setAttribute("aria-expanded"', PANEL)
        self.assertIn('toggleButton.setAttribute("aria-controls", PANEL_ID)', PANEL)

    def test_it_is_also_a_palette_command_and_a_shortcut(self):
        """
        The shortcut manager refuses a shortcut that does not name an existing
        palette command -- "no feature may exist only behind a shortcut". Found
        the hard way: the first version registered the shortcut and no palette
        entry, so the command was reachable by a key nobody would guess and a
        button, and not by the search that exists for finding things.

        """
        self.assertIn('addCommand("accessibility.panel"', SHELL)
        self.assertIn('paletteCommand: "accessibility.panel"', SHELL)

    def test_the_shortcut_is_not_a_bare_character(self):
        """
        Single letters are what NVDA and JAWS use for structural navigation.
        Taking one would break reading the client in order to reach a panel
        about reading the client.

        """
        window = SHELL[SHELL.index('id: "accessibility.panel"') :][:600]
        self.assertIn('defaultBinding: "Ctrl+Shift+A"', window)

    def test_a_control_that_would_do_nothing_is_hidden(self):
        self.assertIn("orphanToggle.hidden = true", SHELL)


class TestItDoesNotDependOnOptionalModules(TestCase):
    """
    Found while building it: the panel was created inside `if (palette)`, so a
    client without the command palette would have had no accessibility panel
    either. An accessibility feature that depends on an optional convenience is
    not a baseline of anything.

    """

    def test_the_panel_is_created_outside_the_palette_block(self):
        creation = SHELL.index("var accessibilityPanel = window.AetosAccessibilityPanel")
        palette_block = SHELL.index("        if (palette) {")
        self.assertLess(creation, palette_block)

    def test_only_its_palette_entry_is_inside_that_block(self):
        entry = SHELL.index('addCommand("accessibility.panel"')
        palette_block = SHELL.index("        if (palette) {")
        self.assertGreater(entry, palette_block)


class TestTheToggleChangesWhatIsOfferedNotWhatIsOn(TestCase):
    """
    The decision behind the whole stage, and the one that keeps it safe.

    """

    def test_toggling_writes_only_the_panel_preference(self):
        body = PANEL[PANEL.index("function toggle()") : PANEL.index("function attach(")]
        self.assertIn('set("shell.accessibilityPanel", next)', body)
        # Nothing else. A toggle that also reset accommodations is the reading
        # that can strand somebody.
        self.assertEqual(body.count("set("), 1)

    def test_closing_it_says_so_explicitly(self):
        """
        Because the fear it answers is real: somebody who flicks a switch
        labelled "accessibility" is entitled to know their settings survived it.

        """
        self.assertIn("Nothing you chose was changed.", PANEL)

    def test_the_panel_state_persists(self):
        self.assertIn("shell: {", PREFS)
        self.assertIn("accessibilityPanel: false", PREFS)

    def test_the_default_is_off(self):
        """
        On by default would push a panel at everybody, which is the opposite of
        letting people choose -- and would make the client's first impression a
        settings screen.

        """
        block = PREFS[PREFS.index("shell: {") :][:120]
        self.assertIn("accessibilityPanel: false", block)


class TestTheGovernanceLine(TestCase):
    """
    The deliverable of A9 as much as the UI is. Getting this line in the wrong
    place is the whole risk.

    """

    def test_every_offered_path_exists_in_the_schema(self):
        """
        A picker offering a preference nothing reads is a control that appears
        to work and changes nothing.

        """
        defaults = PREFS[PREFS.index("var DEFAULTS = {") : PREFS.index("var GOVERNED = [")]
        for path in _governed_paths():
            group, key = path.split(".")
            self.assertIn(group + ": {", defaults, "no such group: %s" % group)
            self.assertIn(key + ":", defaults, "no such preference: %s" % path)

    def test_the_baseline_is_not_offered_as_an_option(self):
        """
        The rule that cannot move. None of these is a preference at all, and
        none may become one.

        """
        offered = set(_governed_paths())
        for forbidden in (
            "keyboard.singleKeyShortcuts",
            "screenReader.reviewModeBehavior",
            "braille.compactStatus",
        ):
            self.assertNotIn(
                forbidden,
                offered,
                "%s is baseline or expert configuration and does not belong in the "
                "picker" % forbidden,
            )

    def test_the_panel_lists_what_was_never_optional(self):
        """
        Shown, not merely excluded. Somebody deciding whether to turn
        accessibility "on" deserves to know what was never off -- otherwise the
        toggle implies the client was inaccessible until they found it.

        """
        self.assertIn("var UNCONDITIONAL = [", PREFS)
        block = PREFS[PREFS.index("var UNCONDITIONAL = [") : PREFS.index("var SCALE_MIN")]
        for expected in ("keyboard", "Focus", "Colour", "announcement"):
            self.assertIn(expected, block, "the always-on list omits %r" % expected)
        self.assertIn("buildUnconditional", PANEL)
        self.assertIn('textContent = "Always on"', PANEL)

    def test_the_picker_is_granular_rather_than_a_preset(self):
        """
        Gary's direction was "you can choose the accessibility features you
        want" -- individual controls, not a bundle to accept or refuse.

        """
        self.assertGreaterEqual(len(_governed_paths()), 8)
        self.assertIn("there is no ", PANEL)
        self.assertIn("bundle to accept or refuse", PANEL)


class TestThePanelIsItselfAccessible(TestCase):
    """
    A panel about accessibility that is not accessible would be a special kind
    of failure.

    """

    def test_it_is_a_landmark_rather_than_a_dialog(self):
        """
        It does not cover the game, does not trap focus and need not be
        dismissed. Somebody adjusting contrast should be able to watch the room
        description change while they do it.

        """
        self.assertIn('host.setAttribute("role", "region")', PANEL)
        self.assertIn('host.setAttribute("aria-label", "Accessibility options")', PANEL)
        self.assertNotIn('"dialog"', PANEL)

    def test_every_control_is_a_native_element(self):
        """
        A native range arrives already keyboard-operable, already announced with
        its value, and already understood by whatever assistive technology the
        player uses. A hand-built one starts at none of that.

        """
        for native in ('input.type = "checkbox"', 'input.type = "range"', 'createElement("select")'):
            self.assertIn(native, PANEL)
        self.assertNotIn('role="slider"', PANEL)
        self.assertNotIn('role="switch"', PANEL)

    def test_the_explanation_describes_rather_than_names(self):
        """
        `aria-describedby`, not part of the label. Merging them makes an
        accessible name three lines long, which is read out in full every time
        focus lands on the control.

        """
        self.assertIn('control.setAttribute("aria-describedby", note.id)', PANEL)

    def test_changes_are_announced(self):
        self.assertIn('announce(entry.label + ": " + (input.checked ? "on" : "off"))', PANEL)

    def test_it_re_renders_when_something_else_changes_a_preference(self):
        """
        Settings and the palette can change the same values. A picker showing
        stale state is worse than no picker -- it tells the player their
        accommodation is off when it is on.

        """
        self.assertIn("preferences.subscribe(function () { render(); })", PANEL)

    def test_the_layout_reflows_for_scaled_text_and_not_only_narrow_windows(self):
        """
        `auto-fit` with a `minmax` floor rather than a width breakpoint: the
        case a breakpoint gets wrong is text scaled up in a wide window, which
        is exactly the case this panel exists to serve.

        """
        block = CSS[CSS.index(".aetos-a11y-panel__options {") :]
        block = block[: block.index("}")]
        self.assertIn("auto-fit", block)
        self.assertIn("minmax(", block)
