/*
 * Windows High Contrast, emulated.
 *
 * WHY THIS ONE MATTERS PARTICULARLY. `notes/a10-two-modes.md` says of the mode
 * switch:
 *
 *   *"Under Windows High Contrast, where background and border colours are
 *   discarded, the position is what is left."*
 *
 * That is a claim about a rendering mode nobody has ever put the client into.
 * It is a good argument and it has never been measured, which is the exact
 * shape of the four things A10 itself found that "read as a guarantee and did
 * nothing".
 *
 * `forced-colors: active` is what Windows High Contrast turns on. The browser
 * throws away author colours and substitutes the user's palette, so anything
 * whose meaning was carried by a background or a border stops carrying it.
 * Chrome can emulate it, so the claim is checkable.
 *
 * WHAT IT CANNOT DO. It emulates the *CSS mode*, not Windows' actual palettes,
 * and a real high-contrast theme may pick colours this does not. It answers
 * "does anything survive", not "does it look right".
 */

"use strict";

async function run(page) {
    const results = [];

    await page.emulateMedia({ forcedColors: "active" });
    await page.waitForTimeout(250);

    /*
     * The switch's state must be readable with every author colour discarded.
     * A10's argument is that the thumb's *position* carries it -- so the test is
     * that the thumb sits somewhere different in the two states, measured in
     * pixels, with colour taken away.
     */
    const thumb = await page.evaluate(async () => {
        const panel = window.Aetos.accessibilityPanel;
        const control = document.querySelector('[role="switch"]');
        if (!control) { return null; }

        /*
         * The thumb inside the track, by name.
         *
         * The first version took `control.querySelector("*")` -- the button's
         * first descendant, which is the text label. It never moves, so the
         * check reported that the switch had no visible state in high contrast:
         * a serious-sounding failure, in the exact claim A10 said had never been
         * measured, produced entirely by measuring the wrong element.
         *
         * Offset from the track rather than from the button, because the label
         * sits between them and changes width with the text size.
         */
        const measure = () => {
            const track = control.querySelector(".aetos-modeswitch__track");
            const knob = control.querySelector(".aetos-modeswitch__thumb");
            if (!track || !knob) { return null; }
            return Math.round(knob.getBoundingClientRect().left
                - track.getBoundingClientRect().left);
        };

        panel.setMode("standard");
        await new Promise((resolve) => setTimeout(resolve, 200));
        const off = measure();
        panel.setMode("accessible");
        await new Promise((resolve) => setTimeout(resolve, 200));
        const on = measure();
        panel.setMode("standard");
        await new Promise((resolve) => setTimeout(resolve, 200));

        return { off, on, checked: control.getAttribute("aria-checked") };
    });

    if (!thumb || thumb.off === null || thumb.on === null) {
        results.push({ status: "FAIL", what: "could not measure the switch thumb" });
    } else {
        results.push(thumb.off !== thumb.on
            ? { status: "ok", what: `the thumb moves ${Math.abs(thumb.on - thumb.off)}px with colours discarded` }
            : { status: "FAIL", what: "the thumb does not move -- in high contrast the switch has no visible state" });
    }

    /*
     * `aria-checked` is the other half, and the half that does not depend on
     * pixels at all. Colour never carries meaning alone (blueprint 45), and in
     * forced colours it carries nothing.
     */
    results.push(thumb && thumb.checked !== null
        ? { status: "ok", what: "and the state is still in the accessibility tree" }
        : { status: "FAIL", what: "the switch reports no state" });

    /*
     * Focus must survive too. `outline: none` plus a coloured border is a common
     * and invisible-in-forced-colors way to show focus, and it is exactly what
     * this mode is for catching.
     */
    const focusSurvives = await page.evaluate(() => {
        const control = document.querySelector('[role="switch"]');
        if (!control) { return null; }
        const before = getComputedStyle(control).outlineStyle;
        control.focus();
        const after = getComputedStyle(control);
        const changed = after.outlineStyle !== before && after.outlineStyle !== "none";
        control.blur();
        return changed;
    });
    results.push(focusSurvives
        ? { status: "ok", what: "focus is still shown with an outline, which forced colours keep" }
        : { status: "FAIL", what: "focus is not shown by an outline -- it may vanish in high contrast" });

    /*
     * Nothing should disappear entirely. An element drawn only as a coloured
     * background with no text and no border becomes invisible here.
     */
    const vanished = await page.evaluate(() => {
        const suspects = Array.from(document.querySelectorAll(
            ".aetos-resource__fill, .aetos-connection__dot, .aetos-modeswitch__thumb"
        ));
        return suspects.filter((element) => {
            const box = element.getBoundingClientRect();
            return box.width === 0 || box.height === 0;
        }).length;
    });
    results.push(vanished === 0
        ? { status: "ok", what: "no state indicator collapsed to nothing" }
        : { status: "FAIL", what: `${vanished} indicator(s) have no size in forced colours` });

    await page.emulateMedia({ forcedColors: "none" });
    await page.waitForTimeout(150);

    return results;
}

module.exports = {
    describes: "Windows High Contrast, where author colours are thrown away",
    views: { viewports: ["desktop"], scales: [1, 2.5], modes: ["standard", "accessible"] },
    run,
};
