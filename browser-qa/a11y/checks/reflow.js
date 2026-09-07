/*
 * WCAG 2.2 success criterion 1.4.10, as written.
 *
 * The criterion is not "works on a phone". It is: content must be presentable
 * without loss of information or functionality, and **without scrolling in two
 * dimensions**, at a width equivalent to 320 CSS pixels. That is what a 1280px
 * window becomes at 400% zoom, which is the setting a low-vision user actually
 * reaches for.
 *
 * The exception is real and this client uses it: content requiring a
 * two-dimensional layout may scroll in both directions. The help overlay's
 * examples are column-aligned tables and scroll sideways on purpose -- so the
 * test is not "nothing scrolls sideways", it is "the *page* does not".
 *
 * WHY IT IS SEPARATE FROM THE VIEWPORT MATRIX. 320px is a criterion rather than
 * a device. Nobody has a 320px monitor; people have 400% zoom, and this is the
 * width that produces.
 */

"use strict";

async function run(page) {
    const results = [];

    /*
     * Two-dimensional scrolling is the failure. A vertical scrollbar is the
     * reflow *working* -- content going down the page instead of off the side of
     * it -- so only horizontal overflow counts against this.
     */
    const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        bodyScroll: document.body.scrollWidth,
    }));
    results.push(overflow.scrollWidth <= overflow.clientWidth + 1
        ? { status: "ok", what: "the page does not scroll sideways at 320px" }
        : {
            status: "FAIL",
            what: `the page is ${overflow.scrollWidth}px wide in a ${overflow.clientWidth}px window`,
        });

    /*
     * "Without loss of functionality" is the other half of the criterion, and
     * the half a width measurement misses entirely. Every control that exists at
     * desktop width must still be reachable here -- reflow that works by hiding
     * the controls is not reflow.
     */
    const reachable = await page.evaluate(() => {
        const wanted = [
            ["the command input", "#aetos-input"],
            ["the send button", "#aetos-send"],
            ["the mode switch", '[role="switch"]'],
            ["the options button", "#aetos-open-options, .aetos-statusbar__button"],
            ["the settings button", "#aetos-open-settings"],
        ];
        return wanted.map(([label, selector]) => {
            const element = document.querySelector(selector);
            if (!element) { return { label, present: false }; }
            const box = element.getBoundingClientRect();
            return {
                label,
                present: true,
                sized: box.width > 0 && box.height > 0,
                onScreen: box.right > 0 && box.left < window.innerWidth,
            };
        });
    });

    for (const control of reachable) {
        if (!control.present) {
            results.push({ status: "FAIL", what: `${control.label} is gone at 320px` });
        } else if (!control.sized) {
            results.push({ status: "FAIL", what: `${control.label} has no size at 320px` });
        } else if (!control.onScreen) {
            results.push({ status: "FAIL", what: `${control.label} is off the side of the screen` });
        } else {
            results.push({ status: "ok", what: `${control.label} is still there and usable` });
        }
    }

    /*
     * And at 320px *with the text turned up*, which is the combination somebody
     * with low vision actually has -- a small window because they zoomed, and
     * large text because they need it. The two are usually tested separately and
     * the interesting failures are in the corner.
     */
    await page.evaluate(() => {
        window.Aetos.accessibility.preferences.update({ visual: { scale: 2.5 } });
    });
    await page.waitForTimeout(400);

    const stillFits = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        inputVisible: (() => {
            const input = document.querySelector("#aetos-input");
            if (!input) { return false; }
            const box = input.getBoundingClientRect();
            return box.width > 0 && box.height > 0;
        })(),
    }));

    results.push(stillFits.scrollWidth <= stillFits.clientWidth + 1
        ? { status: "ok", what: "and still does not scroll sideways at 250% text" }
        : { status: "FAIL", what: `at 250% text the page is ${stillFits.scrollWidth}px wide` });
    results.push(stillFits.inputVisible
        ? { status: "ok", what: "the command input survives 320px at 250% text" }
        : { status: "FAIL", what: "the command input is unusable at 320px and 250% text" });

    await page.evaluate(() => {
        window.Aetos.accessibility.preferences.update({ visual: { scale: 1 } });
    });
    await page.waitForTimeout(300);

    return results;
}

module.exports = {
    describes: "WCAG 1.4.10 as written -- 320 CSS px, no two-dimensional scrolling",
    views: "reflow",
    run,
};
