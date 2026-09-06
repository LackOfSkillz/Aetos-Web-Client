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

    def test_it_reports_which_mode_you_are_in(self):
        """
        `aria-pressed`, not `aria-expanded`.

        A10 made it a mode switch. A disclosure that also changed the page's
        contrast and type size would be lying about what it does.

        """
        self.assertIn('aria-pressed="false"', TEMPLATE)
        self.assertIn('toggleButton.setAttribute("aria-pressed"', PANEL)
        self.assertNotIn('setAttribute("aria-expanded"', PANEL)
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


class TestTheModeMasksAndNeverErases(TestCase):
    """
    A10, and the decision that keeps a real mode switch safe.

    A9 shipped this as a disclosure: the panel hid and every accommodation
    stayed applied. Gary asked for the sharper version -- *"lets make the default
    mode and the accessable mode a toggle so we dont have to try to be everything
    to everybody"* -- so standard mode now genuinely stops the governed
    accommodations applying.

    The hazard I raised against that reading is real: somebody switches to look,
    the type shrinks and the contrast drops, and they cannot find the control
    again. What makes it survivable is that **nothing is erased**. The way back
    is one keystroke and it restores the interface they built, rather than
    handing them an empty one to rebuild.

    """

    def test_the_mode_is_the_stored_state(self):
        self.assertIn("shell: {", PREFS)
        self.assertIn('mode: "standard"', PREFS)
        self.assertIn('"shell.mode": ["standard", "accessible"]', PREFS)

    def test_the_default_is_the_standard_interface(self):
        """
        Anything else would push an accessibility panel at everybody, which is
        both the opposite of choosing and the thing Gary asked to stop doing.

        """
        block = PREFS[PREFS.index("shell: {") :][:120]
        self.assertIn('mode: "standard"', block)

    def test_toggling_writes_only_the_mode(self):
        body = PANEL[PANEL.index("function toggle()") : PANEL.index("function attach(")]
        self.assertIn('set("shell.mode", next ? "accessible" : "standard")', body)
        # Exactly one write. A toggle that also reset the accommodations would
        # be the version nobody can afford to try.
        self.assertEqual(body.count("set("), 1)

    def test_standard_mode_masks_rather_than_clearing(self):
        """
        The whole design in one function. `effective()` builds a view; it never
        assigns into `current`.

        """
        body = PREFS[
            PREFS.index("function effective()") : PREFS.index("function activeAccommodations()")
        ]
        self.assertIn("var view = clone(current);", body)
        self.assertIn("entry.revertsInStandardMode", body)
        self.assertNotIn("current[", body.split("clone(current)")[1])

    def test_consumers_are_given_the_effective_view(self):
        """
        So that every widget honours the mode without having to know a mode
        exists -- and so there is one place to get it wrong instead of twenty.

        """
        self.assertIn("listener(effective());", PREFS)
        self.assertNotIn("listener(clone(current));", PREFS)

    def test_the_priming_call_uses_it_too(self):
        """
        Priming with `get()` would apply the accommodations once at boot and
        mask them from the next change onward, so a client started in standard
        mode would look accessible until somebody touched something.

        """
        body = PREFS[PREFS.index("function subscribe(listener)") :][:1200]
        self.assertIn("listener(effective());", body)

    def test_the_editors_still_see_what_the_player_chose(self):
        """
        `get()` and `value()` answer "what did you choose", which is what the
        panel and Settings must show. Only subscribers get the mask.

        """
        body = PREFS[PREFS.index("function get() {") :][:120]
        self.assertIn("return clone(current);", body)


class TestSomeThingsMustNotRevert(TestCase):
    """
    The subtlest part of the line, and the one that would have made standard
    mode actively hostile if I had got it wrong.

    A preference may only be reverted if its **default is the standard
    experience**, so that reverting removes an accommodation rather than
    imposing one. Three of the panel's options fail that test.

    """

    def _entry(self, path):
        """
        One governed entry's declaration.

        Args:
            path (str): The preference path.

        Returns:
            str: The declaration block.

        """
        start = PREFS.index('path: "%s"' % path)
        return PREFS[start : PREFS.index("}", start)]

    def test_gestures_do_not_come_back_on(self):
        """
        They default to ON, so somebody with a tremor turns them OFF. Reverting
        would switch them back on for the person who most needed them off.

        """
        self.assertIn("revertsInStandardMode: false", self._entry("pointer.gestures"))

    def test_mute_is_not_undone(self):
        """
        Muting is the accommodation; the default is unmuted. Reverting would
        start playing sound at somebody.

        """
        self.assertIn("revertsInStandardMode: false", self._entry("audio.muted"))

    def test_orientation_help_is_not_switched_on(self):
        """
        It defaults to ON, so reverting adds a feature rather than removing one.
        A mode switch is not for that.

        """
        self.assertIn("revertsInStandardMode: false", self._entry("cognitive.reorientEnabled"))

    def test_the_visual_accommodations_do_revert(self):
        """
        These are the ones whose default *is* the standard experience, which is
        what makes reverting them the point of the mode rather than a loss.

        """
        for path in (
            "visual.contrast",
            "visual.scale",
            "visual.stimulation",
            "cognitive.quietMode",
            "cognitive.focusMode",
            "aac.enabled",
        ):
            self.assertIn(
                "revertsInStandardMode: true",
                self._entry(path),
                "%s should revert in standard mode" % path,
            )

    def test_motion_reverts_to_following_the_system(self):
        """
        Its default is `"system"`, so reverting hands the decision back to
        `prefers-reduced-motion` rather than to full motion. Somebody whose
        operating system asks for less still gets less in standard mode.

        """
        self.assertIn("revertsInStandardMode: true", self._entry("visual.motion"))
        self.assertIn('motion: "system"', PREFS)

    def test_the_reasoning_is_recorded_next_to_the_flag(self):
        """
        Getting this backwards is invisible in review and obvious to whoever it
        happens to.

        """
        block = PREFS[: PREFS.index("var GOVERNED = [")]
        self.assertIn("default is the standard experience", block[-2600:])
        self.assertIn("tremor", block[-2600:])


class TestThereIsAlwaysAWayBack(TestCase):
    """
    The hazard that made A9 ship the softer version first.

    """

    def _toggle(self):
        """
        The body of the mode switch.

        Returns:
            str: JavaScript source.

        """
        return PANEL[PANEL.index("function toggle()") : PANEL.index("function attach(")]

    def test_leaving_says_how_to_return(self):
        self.assertIn("Press Control Shift A", self._toggle())

    def test_leaving_says_nothing_was_erased(self):
        self.assertIn("nothing was erased", self._toggle())

    def test_it_names_what_stopped_applying(self):
        """
        "Standard mode" alone leaves somebody working out what just changed from
        how the screen looks, which is the thing they may no longer be able to
        do.

        """
        self.assertIn("activeAccommodations", PANEL)
        self.assertIn("function activeAccommodations()", PREFS)

    def test_that_message_is_not_announced_at_the_quietest_level(self):
        self.assertIn('priority: "important"', self._toggle())

    def test_the_shell_forwards_announcement_options(self):
        """
        Found by writing the test: the shell passed a fixed
        `{ priority: "normal" }` and dropped anything the panel asked for, so
        the one message somebody needs to hear would have arrived in the
        quietest category there is.

        """
        self.assertIn("accessibility.announce(message, options || ", SHELL)

    def test_the_switch_keeps_its_size_in_both_modes(self):
        """
        Measured at 32px in both. It is the control somebody reaches for when
        they can no longer read the screen, so it does not get to shrink with
        everything else.

        """
        self.assertIn(".aetos-root .aetos-statusbar__button--mode", CSS)
        block = CSS[CSS.index(".aetos-root .aetos-statusbar__button--mode {") :]
        self.assertIn("min-height: 32px", block[: block.index("}")])

    def test_that_rule_is_where_it_can_actually_win(self):
        """
        Two earlier versions did nothing at all. `var(--aetos-target)` is `0px`
        on a fine pointer; then `min-height: 28px` in `aetos.css` lost to a 24px
        rule of equal specificity in this file, which loads later. Both were
        caught by measuring the rendered button rather than by reading the CSS.

        """
        self.assertLess(
            CSS.index(".aetos-root .aetos-statusbar__button--mode {"),
            CSS.index(".aetos-root button,"),
            "the mode switch's floor is declared after the rule it must beat",
        )


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
        for native in (
            'input.type = "checkbox"',
            'input.type = "range"',
            'createElement("select")',
        ):
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
