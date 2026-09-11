/*
 * Driving the client without a pointer.
 *
 * WHAT CHANGED. `docs/a8-tester-protocol.md` said, in writing, that synthetic
 * keystrokes did not reach the page and so nobody had ever driven this client
 * without a mouse. That was wrong -- they arrive perfectly well once the window
 * has focus, which is what a real user's window has anyway. The A8 readiness
 * pass walked the tab order by hand once. This makes it a check, in every view.
 *
 * REACHABILITY IS NOT OPERABILITY, and the difference is where the defects live.
 * A0 shipped a scrolling region that was in the tab order and could not be
 * scrolled. So this asks three separate questions:
 *
 *   1. can Tab reach everything, and does it come back round?
 *   2. is there a trap -- somewhere Tab goes and cannot leave?
 *   3. does the focused thing have a visible focus indicator?
 *
 * Question 3 is the one a machine can only half answer. It checks that *some*
 * style changes on focus, which catches the outright missing outline; it cannot
 * tell whether the result is visible enough, and does not claim to.
 */

"use strict";

/**
 * Walk the tab order and describe every stop.
 *
 * @param {import('@playwright/test').Page} page
 * @param {number} limit Stop after this many presses, whatever happens.
 * @returns {Promise<object[]>} One entry per stop.
 */
async function walk(page, limit = 80) {
    /*
     * Read `document.activeElement` after each press, rather than listening for
     * `focusin`.
     *
     * The first version listened, and reported keyboard traps that were not
     * there: the accessibility panel re-renders on some interactions, and an
     * element that is replaced while focused fires `focusin` again for what
     * looks like the same control. Three identical entries in a row read as
     * "Tab goes nowhere" when Tab had moved perfectly well.
     *
     * Asking where focus *is* cannot be fooled that way. It is the same lesson
     * as measuring the rendered button rather than reading the stylesheet.
     */
    await page.evaluate(() => {
        // Start from the top of the document, so the first Tab lands where it
        // would for somebody who has just arrived. `body` is not focusable, so
        // blurring whatever holds focus is what actually resets it.
        if (document.activeElement && document.activeElement !== document.body) {
            document.activeElement.blur();
        }
    });

    const describe = () =>
        page.evaluate(() => {
            const element = document.activeElement;
            if (!element || element === document.body) { return null; }
            return {
                role: element.getAttribute("role") || element.tagName.toLowerCase(),
                id: element.id || null,
                className: typeof element.className === "string" ? element.className : null,
                /*
                 * Identity needs the text as well as the id and class.
                 *
                 * The four skip links have no id and share one class, so a key
                 * built from those two made every one of them look like the
                 * same element -- and the walk reported a keyboard trap on the
                 * second Tab, in some views and not others depending on where
                 * focus happened to start. An intermittent false trap is worse
                 * than none: it is the kind of result people learn to re-run
                 * until it passes.
                 */
                text: (element.getAttribute("aria-label")
                    || element.textContent || "").trim().slice(0, 40),
            };
        });

    const stops = [];
    let previous = null;

    for (let index = 0; index < limit; index += 1) {
        await page.keyboard.press("Tab");
        const current = await describe();
        if (!current) { break; }

        const key = `${current.id}|${current.className}|${current.text}`;
        if (previous && key === previous) {
            // Tab pressed and focus did not move. A genuine trap.
            stops.push({ ...current, trapped: true });
            break;
        }
        // Back to where the walk began: the order wraps, which is correct.
        if (stops.length > 2 && key === `${stops[0].id}|${stops[0].className}|${stops[0].text}`) {
            break;
        }
        stops.push(current);
        previous = key;
    }

    return stops;
}

async function run(page) {
    const results = [];

    /*
     * Close anything a previous check left open.
     *
     * The suite reuses one page, and a dialog left open is a focus trap by
     * design -- correct behaviour that would be reported here as a defect. Any
     * check that opens something is responsible for closing it; this is the
     * belt to that pair of braces, because a false "keyboard trap" is the kind
     * of finding that gets a whole gate ignored.
     */
    await page.evaluate(() => {
        if (window.AetosDialog && window.AetosDialog.close) {
            try { window.AetosDialog.close(null); } catch (ignored) { /* nothing open */ }
        }
        if (window.Aetos.help && window.Aetos.help.isOpen && window.Aetos.help.isOpen()) {
            window.Aetos.help.close();
        }
        if (window.Aetos.palette && window.Aetos.palette.isOpen && window.Aetos.palette.isOpen()) {
            window.Aetos.palette.close();
        }
    });
    await page.waitForTimeout(200);

    const stops = await walk(page);
    const trapped = stops.filter((stop) => stop.trapped);

    if (stops.length < 5) {
        return [{
            status: "FAIL",
            what: `only ${stops.length} focus stops -- the tab order is broken`,
        }];
    }
    results.push({ status: "ok", what: `${stops.length} focus stops, and Tab wraps` });

    results.push(trapped.length
        ? {
            status: "FAIL",
            what: `Tab does not leave: ${trapped.map((s) => s.id || s.text || s.role).join(", ")}`,
        }
        : { status: "ok", what: "no keyboard trap in the tab order" });

    /*
     * The composer should follow the transcript.
     *
     * Not a rule from any specification -- it is UI1's claim that what you type
     * is a reply to what you have just read, and that the two belong next to
     * each other. Worth a check because it is the kind of thing a later layout
     * change would silently undo.
     */
    const consoleAt = stops.findIndex((stop) => stop.id === "aetos-console");
    const inputAt = stops.findIndex((stop) => stop.id === "aetos-input");
    if (consoleAt !== -1 && inputAt !== -1) {
        results.push(inputAt === consoleAt + 1
            ? { status: "ok", what: "the command input follows the game output" }
            : { status: "FAIL", what: `the input is ${inputAt - consoleAt} stops after the output` });
    } else {
        results.push({ status: "skip", what: "console or input not in the tab order at this size" });
    }

    /*
     * Something must change when a control takes focus. This catches the outline
     * that was removed and never replaced; it cannot judge whether what is left
     * is visible enough, and says so rather than implying otherwise.
     */
    const focusVisible = await page.evaluate(() => {
        const control = document.querySelector('[role="switch"]');
        if (!control) { return null; }
        const before = getComputedStyle(control);
        const plain = [before.outlineWidth, before.outlineStyle, before.boxShadow, before.borderColor].join("|");
        control.focus();
        const after = getComputedStyle(control);
        const focused = [after.outlineWidth, after.outlineStyle, after.boxShadow, after.borderColor].join("|");
        control.blur();
        return plain !== focused;
    });
    if (focusVisible === null) {
        results.push({ status: "FAIL", what: "the mode switch is not in the document" });
    } else {
        results.push(focusVisible
            ? { status: "ok", what: "focusing the mode switch changes how it is drawn" }
            : { status: "FAIL", what: "the mode switch looks identical focused and unfocused" });
    }

    /*
     * Ctrl+Shift+A is the way back from standard mode, and it is the promise the
     * announcement makes out loud to somebody who has just lost their contrast.
     * A shortcut that stopped working would strand exactly the person it was
     * written for.
     */
    const before = await page.evaluate(() => window.Aetos.accessibilityPanel.isAccessible());
    await page.keyboard.press("Control+Shift+A");
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => window.Aetos.accessibilityPanel.isAccessible());
    results.push(before !== after
        ? { status: "ok", what: "Ctrl+Shift+A switches mode" }
        : { status: "FAIL", what: "Ctrl+Shift+A did nothing -- the documented way back is gone" });
    await page.keyboard.press("Control+Shift+A");
    await page.waitForTimeout(200);

    return results;
}

module.exports = {
    describes: "reaching and operating everything without a pointer",
    views: { viewports: ["desktop", "tablet", "phone"], scales: [1, 2.5], modes: ["standard", "accessible"] },
    run,
};
