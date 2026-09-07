"""
Tests for A12 -- the axis every other gate in this project is blind to.

Gary, looking at the client with all 288 automated accessibility checks passing,
NVDA announcing the mode switch correctly, and axe clean across 144 scans:

    *"this doesnt feel accessible to me, but I dont have this particular
    challenge so its hard for me to tell, but what we have now 'feels' like we
    are way off the mark"*

He was right, and the reason is worth more than the fix. Everything this project
built measures **machine-readable correctness**: does a control have a name, a
role, a state; can a program reach it; will a screen reader say it. Measured
against WCAG 2.5.8 the client passed too -- twelve controls under 24x24, every
one of them inside the spacing exception.

What nothing measured was **legibility, density and effort**: what a sighted
person with low vision, dyslexia, ADHD or a tremor actually meets. One gate
touched that axis (`reflow`) and it only asked whether things fit.

Measured at 1920x1080 with the panel open, before A12:

    one typeface on all 86 text-bearing elements
    eleven controls in one section, in five columns
    242 words of prose, filling 53% of the viewport
    a console line 127 characters long
    `--aetos-target: 0px` on any pointer that is not coarse

And the finding that mattered most: accessible mode and standard mode rendered
**byte-identically**, because the mode masks preferences and every governed
preference defaults to its standard value.

Full write-up, with the sources and with two of my own measurements that turned
out to be wrong: `notes/a12-accessible-ux-research.md`.

"""

import re
from pathlib import Path

from django.test import TestCase

from evennia.contrib.base_systems.aetos_webclient import AETOS_STATIC_DIR

from .test_accessibility_panel import CSS, PANEL, PREFS, _function, _governed_paths

SHELL_CSS = (Path(AETOS_STATIC_DIR) / "aetos" / "css" / "aetos.css").read_text(encoding="utf-8")


def _block(source, selector):
    """
    One CSS rule body, by its opening selector.

    Args:
        source (str): The stylesheet.
        selector (str): The text that opens the rule, including the brace.

    Returns:
        str: Everything up to the closing brace.

    """
    start = source.index(selector)
    return source[start : source.index("\n}", start)]


def _prefs_function(name, until):
    """
    Slice one function out of `preferences.js`.

    The panel test module's `_function` reads `panel.js`; the preset machinery
    lives in the preferences module, so it needs its own.

    Args:
        name (str): The function's signature line.
        until (str): A later landmark.

    Returns:
        str: JavaScript source.

    """
    start = PREFS.index(name)
    return PREFS[start : PREFS.index(until, start)]


def _without_comments(source):
    """
    A stylesheet with its comments removed.

    Necessary for any test that scans for token *usage*: the comments in this
    project routinely quote the very thing being asserted about, including the
    undefined custom property this file checks for.

    Args:
        source (str): CSS.

    Returns:
        str: The same, minus `/* ... */`.

    """
    return re.sub(r"/\*.*?\*/", "", source, flags=re.S)


def _preset_block():
    """
    The `PRESETS` table's source.

    Returns:
        str: From the declaration to the lookup helper that follows it.

    """
    return PREFS[PREFS.index("var PRESETS = [") : PREFS.index("function presetNamed")]


def _preset_names():
    """
    The starting points, in the order they are offered.

    Returns:
        list: Preset names.

    """
    return re.findall(r'name:\s*"([\w-]+)"', _preset_block())


class TestTheModeDoesSomethingWhenYouTurnItOn(TestCase):
    """
    The sequence before A12, for somebody who needs help: find the switch, flip
    it, watch nothing happen, press Options, read 242 words across five columns,
    and answer eleven technical questions before the client is any easier to use.

    Every step was correct in isolation. The sum put the whole configuration
    burden on the person least able to spend it, in the name of not presuming.

    """

    def test_there_is_a_starting_point_for_each_thing_a_person_would_say(self):
        self.assertEqual(
            _preset_names(),
            ["low-vision", "calm", "screen-reader", "motor", "custom"],
        )

    def test_the_chooser_offers_no_more_than_coga_asks_for(self):
        """
        W3C's COGA guidance asks for no more than about seven options in any one
        section. The panel this replaces opened with eleven.

        """
        self.assertLessEqual(len(_preset_names()), 7)

    def test_setting_it_up_yourself_is_an_answer_rather_than_a_dismissal(self):
        """
        `"custom"` is a recorded preset rather than a way of closing the
        chooser. If it were not, the question would come back every session --
        which is the interruption this whole change exists to remove.

        """
        self.assertIn("custom", _preset_names())

    def test_only_the_preset_that_says_it_changes_nothing_changes_nothing(self):
        for chunk in _preset_block().split('name: "')[1:]:
            name = chunk[: chunk.index('"')]
            values = chunk[chunk.index("values:") :][:400]
            if name == "custom":
                self.assertIn("values: {}", values)
            else:
                self.assertNotIn("values: {}", values)

    def test_the_presets_are_named_in_a_persons_words_not_a_specifications(self):
        """
        Somebody who cannot read small text knows that about themselves. They do
        not necessarily know the phrase "reduced stimulation".

        """
        labels = re.findall(r'label:\s*"([^"]+)"', _preset_block())
        self.assertIn("Hard to see small text", labels)
        self.assertIn("I use a screen reader or braille display", labels)
        for label in labels:
            self.assertNotIn("stimulation", label.lower())
            self.assertNotIn("contrast ratio", label.lower())

    def test_applying_one_is_a_single_write(self):
        """
        One `update`, so subscribers repaint once rather than eleven times, and
        so a preset cannot be left half-applied.

        """
        body = _prefs_function("function applyPreset(name)", "return {")
        self.assertEqual(body.count("update("), 1)
        self.assertIn("patch.shell.preset = preset.name", body)

    def test_an_unknown_preset_changes_nothing(self):
        body = _prefs_function("function applyPreset(name)", "return {")
        self.assertIn("if (!preset)", body)

    def test_a_preset_is_ordinary_preferences_so_the_masking_rule_is_untouched(self):
        """
        `effective()` is the delicate part of A10. A preset is a bulk write of
        the same preferences somebody could set by hand, which is what keeps it
        out of there entirely -- nothing in the masking rule may learn that
        presets exist, or there are two sources of truth for what is in force.

        """
        body = _prefs_function("function effective()", "function activeAccommodations")
        self.assertNotIn("preset", body)
        self.assertNotIn("PRESETS", body)

    def test_the_choice_is_announced_together_with_the_way_back(self):
        """
        Somebody who has just changed the contrast and type size of their whole
        client on one keypress needs to hear that it is undoable before they
        need to hear anything else.

        """
        body = _function("function choose(name)", "function attach(")
        self.assertIn("can be changed", body)


class TestTheOptionsAreGrouped(TestCase):
    """
    Eleven controls in one flat grid measured five columns wide on a 1920px
    screen, so the reading order zig-zagged across the whole display with no
    headings to say where you were.

    """

    def _section_paths(self):
        block = PREFS[PREFS.index("var SECTIONS = [") : PREFS.index("var SCALE_MIN")]
        return re.findall(r'"(\w+\.\w+)"', block)

    def test_every_governed_option_is_in_a_named_group(self):
        """
        The panel renders anything missing under "More" rather than dropping it,
        so this failing costs a heading rather than a control. It should still
        never fail.

        """
        self.assertEqual(sorted(set(_governed_paths())), sorted(set(self._section_paths())))

    def test_no_group_holds_more_than_coga_asks_for(self):
        block = PREFS[PREFS.index("var SECTIONS = [") : PREFS.index("var SCALE_MIN")]
        for chunk in block.split("label:")[1:]:
            self.assertLessEqual(len(re.findall(r'"\w+\.\w+"', chunk)), 7)

    def test_a_group_carries_its_heading_as_its_accessible_name(self):
        """
        A screen reader should get the structure the eye gets, rather than
        eleven undifferentiated controls in a row.

        """
        body = _function("function buildControls(container)", "function buildChooser")
        self.assertIn('group.setAttribute("role", "group")', body)
        self.assertIn('group.setAttribute("aria-labelledby", heading.id)', body)


class TestTheClientIsLegibleAndNotOnlyCorrect(TestCase):
    """
    None of axe, the accessibility tree, the keyboard walk, the announcer or
    NVDA has an opinion about whether the result can comfortably be read.

    """

    def test_the_shell_and_the_game_text_are_set_in_different_faces(self):
        self.assertIn("--aetos-font-ui:", SHELL_CSS)
        self.assertIn("--aetos-font-mono:", SHELL_CSS)

    def test_the_ui_face_needs_no_download(self):
        """
        The contrib ships no font files and loads nothing from a CDN, so the
        proportional face has to be a system stack.

        """
        block = SHELL_CSS[SHELL_CSS.index("--aetos-font-ui:") :][:200]
        self.assertIn("system-ui", block)

    def test_game_output_keeps_its_fixed_width_face_regardless(self):
        """
        Not a preference, and this is the one place that is true. The server
        aligned that text by counting characters -- ASCII maps, score tables,
        the rules in Evennia's own connection screen. A proportional face does
        not make that prettier; it makes it wrong.

        """
        self.assertIn("font-family: var(--aetos-font-mono)", _block(SHELL_CSS, ".aetos-console {"))

    def test_what_you_type_is_set_like_what_it_becomes(self):
        """
        The command echoes into the console a moment later, and typing it in a
        different face makes the echo look like somebody else said it.

        """
        self.assertIn("font-family: var(--aetos-font-mono)", _block(SHELL_CSS, ".aetos-input {"))

    def test_the_face_of_the_clients_own_prose_is_a_choice(self):
        """
        Because the evidence splits, and any single answer is wrong for
        somebody. Vision Australia and APA Style say avoid monospace for long
        passages; Rello and Baeza-Yates measured dyslexic readers directly and
        found monospace *improved* reading performance.

        """
        self.assertIn('"visual.typeface"', PREFS)
        self.assertIn('.aetos-root[data-aetos-typeface="monospace"]', SHELL_CSS)

    def test_the_typeface_choice_survives_the_mode_switch(self):
        """
        Like text size, and for the same reason Gary gave about that: the shape
        of the letters is a basic property of a text interface rather than an
        accommodation somebody opts into.

        """
        entry = PREFS[PREFS.index('path: "visual.typeface"') :][:600]
        self.assertIn("revertsInStandardMode: false", entry)

    def test_the_reading_line_is_bounded_in_characters_at_every_size(self):
        """
        There *was* a cap, and measurement found it never fired: `max-width:
        120ch` applied only under `data-aetos-size="wide"`, and a 1920x1080
        monitor computes as `desktop` because at 16px text its effective width
        is 1680 against an 1800 boundary. The console measured 127 characters.

        A breakpoint was the wrong mechanism. "Is this line too long to track
        back from" is a question about characters, so the answer is in `ch`.

        """
        self.assertIn("--aetos-measure: 80ch", SHELL_CSS)
        block = _block(SHELL_CSS, ".aetos-console,\n.aetos-composer {")
        self.assertIn("max-width: var(--aetos-measure)", block)
        self.assertNotIn('data-aetos-size="wide"', block)

    def test_there_is_a_target_floor_on_every_pointer_and_not_only_touch(self):
        """
        `--aetos-target` was `0px`, raised to 44px only under `pointer: coarse`,
        so a mouse user had no floor at all. Twelve controls measured under
        24x24 -- passing 2.5.8 through the *spacing* exception, which is to say
        by being far from their neighbours rather than by being big enough. A
        20px checkbox is still 20px to somebody with a tremor.

        """
        root = _block(SHELL_CSS, ":root {")
        self.assertIn("--aetos-target: 24px", root)
        self.assertNotIn("--aetos-target: 0px", root)

    def test_the_floor_is_applied_outside_the_coarse_pointer_block(self):
        """
        The token was only half the defect. The rules that used it lived inside
        `@media (pointer: coarse)`, which is how it spent its whole life as a
        no-op on a mouse even before the value was wrong.

        """
        before = SHELL_CSS[: SHELL_CSS.index("@media (pointer: coarse)")]
        self.assertIn("min-height: var(--aetos-target)", before)

    def test_the_panel_controls_use_that_floor(self):
        # Anchored to the start of a line: the same class name also appears at
        # the end of an earlier selector list, and matching that one would
        # measure a rule about alignment rather than the rule about size.
        self.assertIn("var(--aetos-target)", _block(CSS, "\n.aetos-a11y-panel__checkbox {"))

    def test_every_slider_is_sized_and_not_only_the_panels(self):
        """
        Keyed on the element, not on a class.

        The first version of this styled `.aetos-a11y-panel__range` alone and
        left the six volume sliders in the Sound widget exactly as they were --
        a fix that lands on one instance of a defect and declares the class of
        defect fixed. Measurement caught it because it counted every range on
        the page rather than the one that had just been changed.

        """
        self.assertIn('.aetos-root input[type="range"] {', CSS)
        self.assertNotIn(".aetos-a11y-panel__range::", CSS)

    def test_the_slider_thumb_is_sized_and_not_only_its_box(self):
        """
        The range measured 177x16. Height on the input alone only grows the box;
        the thumb is what gets grabbed, and it needs both vendor pseudo-elements
        or one engine keeps the small one.

        """
        for pseudo in ("::-webkit-slider-thumb", "::-moz-range-thumb"):
            self.assertIn(
                "var(--aetos-target)",
                _block(CSS, '.aetos-root input[type="range"]' + pseudo),
            )

    def test_body_text_has_somewhere_to_get_its_leading_from(self):
        self.assertIn("--aetos-line-height: 1.5", SHELL_CSS)

    def test_a_token_that_is_used_is_a_token_that_is_defined(self):
        """
        `--aetos-text-dim` was used four times and defined nowhere. With no
        fallback the declaration is invalid at computed-value time, so those
        elements rendered at full strength by accident rather than by decision.

        For an explanatory sentence full strength is the right answer, so it is
        now said out loud. The general rule matters more than this instance: a
        custom property with no definition and no fallback is a silent no-op,
        and the contrast validator cannot check a colour that is never applied.

        """
        for name, source in (("accessibility.css", CSS), ("aetos.css", SHELL_CSS)):
            body = _without_comments(source)
            used = set(re.findall(r"var\((--aetos-[\w-]+)\)", body))
            defined = set(re.findall(r"(--aetos-[\w-]+):", body + _without_comments(SHELL_CSS)))
            self.assertEqual(
                used - defined, set(), "%s uses custom properties nothing defines" % name
            )
