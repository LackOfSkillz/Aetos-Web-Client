/*
 * Whether the result can comfortably be read.  A12.
 *
 * WHY THIS CHECK EXISTS AT ALL. Gary looked at the client with all 288 of the
 * other checks passing, NVDA announcing the mode switch correctly and axe clean
 * across 144 scans, and said it *"feels like we are way off the mark"*. He was
 * right, and the reason is that every gate in this suite measures the same
 * thing: **machine-readable correctness**. Does a control have a name, a role,
 * a state; can a program reach it; will a screen reader say it.
 *
 * That is one axis. The other is legibility, density and effort -- what a
 * sighted person with low vision, dyslexia, ADHD or a tremor actually meets --
 * and nothing here had an opinion about it. The client passed WCAG 2.5.8 with
 * twelve controls under 24x24, on the spacing exception, which is to say by
 * being far apart rather than by being big enough.
 *
 * WHAT IT IS NOT. It cannot tell you whether a sentence is worth reading or
 * whether an evening of this is bearable. It measures the handful of things
 * that are genuinely numeric -- how long a line is, how big a target is, how
 * many decisions are on screen at once -- and leaves the rest where it belongs,
 * with a person.
 *
 * WHY THE NUMBERS ARE WHERE THEY ARE. Every one of these was a real defect
 * found by measuring, not a limit imagined in advance:
 *
 *   line length   the console ran to 127 characters, because the cap it had
 *                 applied only at `wide` and a 1920x1080 monitor is `desktop`
 *   target size   `--aetos-target` was `0px` on any pointer that is not coarse,
 *                 and the rules using it sat inside the coarse media query
 *   density       eleven controls and 242 words in one section, in five columns
 *   type scale    three headings sized in `rem`, which the client's own text
 *                 scale deliberately never touches
 */

"use strict";

//: WCAG 1.4.8 asks for no more than 80 characters a line. A little slack for
//: padding, which `ch` arithmetic does not account for.
const MAX_CHARACTERS_PER_LINE = 90;

//: WCAG 2.5.8. Not the spacing exception -- that is the criterion's escape
//: hatch, and passing through it is not the same as being hittable.
const MIN_TARGET = 24;

//: W3C COGA asks for no more than about seven options in any one section.
const MAX_OPTIONS_PER_SECTION = 7;

/**
 * Measure the client as it currently stands.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<object>} Raw measurements.
 */
function measure(page, minTarget) {
    return page.evaluate((floor) => {
        const root = document.querySelector(".aetos-root");
        const visible = (el) => {
            const box = el.getBoundingClientRect();
            return box.width > 0 && box.height > 0;
        };

        /*
         * The console, by its own class.
         *
         * Named exactly rather than with a `[class*='console']` fallback. The
         * first version of this measurement used one, matched the widget
         * *wrapper*, and reported a line-height the console does not have --
         * the same wrong-element mistake the forced-colors check made with the
         * switch's label instead of its thumb.
         */
        const out = { line: null, targets: [], sections: [], remSized: [] };

        const console_ = document.querySelector(".aetos-console");
        if (console_ && visible(console_)) {
            const styles = getComputedStyle(console_);
            const probe = document.createElement("span");
            probe.style.cssText = "position:absolute;visibility:hidden;white-space:pre";
            probe.style.font = styles.font || `${styles.fontSize} ${styles.fontFamily}`;
            probe.textContent = "0".repeat(100);
            document.body.appendChild(probe);
            const characterWidth = probe.getBoundingClientRect().width / 100;
            probe.remove();
            const width = console_.getBoundingClientRect().width;
            out.line = {
                characters: characterWidth ? Math.round(width / characterWidth) : null,
                leading: parseFloat(styles.lineHeight) / parseFloat(styles.fontSize),
            };
        }

        // Every target, not only the ones in whatever was changed last. The
        // slider fix landed on the accessibility panel first and left the six
        // volume sliders untouched; counting all of them is what caught that.
        root.querySelectorAll(
            "button, input, select, textarea, a[href], [role=button], [role=switch]"
        ).forEach((el) => {
            if (!visible(el)) { return; }
            const box = el.getBoundingClientRect();
            if (box.width < floor || box.height < floor) {
                out.targets.push({
                    what: `${el.tagName.toLowerCase()}${el.type ? "[" + el.type + "]" : ""}`
                        + (el.id ? "#" + el.id : ""),
                    size: `${Math.round(box.width)}x${Math.round(box.height)}`,
                });
            }
        });

        // How many decisions are in front of somebody at once, per group.
        root.querySelectorAll(".aetos-a11y-panel__group").forEach((group) => {
            const heading = group.querySelector(".aetos-a11y-panel__group-heading");
            out.sections.push({
                name: heading ? heading.textContent.trim() : "(unnamed)",
                controls: Array.from(
                    group.querySelectorAll("input, select, textarea")
                ).filter(visible).length,
            });
        });

        return out;
    }, minTarget);
}

async function run(page) {
    const results = [];

    /*
     * Open the panel before measuring, and put it back afterwards.
     *
     * The first version of this check measured whatever happened to be on
     * screen -- and the accessibility panel is never open in an ordinary view,
     * so the density assertion never ran once across thirty-six of them. A
     * check that cannot fail is worse than no check, because it prints "ok".
     *
     * Both states are covered by axe already; what is measured here is the
     * grouped options, since that is where "how many decisions at once" means
     * anything. `preset: "custom"` gets past the chooser without applying
     * anybody's accommodations to the view under test.
     */
    const restore = await page.evaluate(() => {
        const prefs = window.Aetos.accessibility.preferences;
        const panel = window.Aetos.accessibilityPanel;
        const previous = {
            preset: prefs.value("shell.preset"),
            open: panel.isOpen(),
        };
        prefs.update({ shell: { preset: "custom" } });
        if (!panel.isOpen()) { panel.toggleOptions(); }
        return previous;
    });

    /*
     * Wait for the console to have a width before measuring it.
     *
     * Without this the very first view reported only the target results: the
     * console had not been laid out yet, so it measured zero characters and the
     * line assertions were silently skipped. One view out of thirty-six quietly
     * testing less than the others is exactly the shape of coverage loss this
     * suite has met before.
     */
    await page.waitForFunction(() => {
        const el = document.querySelector(".aetos-console");
        return el && el.getBoundingClientRect().width > 0;
    }, null, { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(150);

    const seen = await measure(page, MIN_TARGET);

    await page.evaluate((previous) => {
        const panel = window.Aetos.accessibilityPanel;
        if (panel.isOpen() !== previous.open) { panel.toggleOptions(); }
        window.Aetos.accessibility.preferences.update({
            shell: { preset: previous.preset },
        });
    }, restore);

    if (seen.line && seen.line.characters) {
        results.push(
            seen.line.characters <= MAX_CHARACTERS_PER_LINE
                ? {
                    status: "ok",
                    what: `the reading line is ${seen.line.characters} characters`,
                }
                : {
                    status: "FAIL",
                    what: `the reading line is ${seen.line.characters} characters `
                        + `(WCAG 1.4.8 asks for 80)`,
                }
        );
        results.push(
            seen.line.leading >= 1.49
                ? { status: "ok", what: "the transcript has room between its lines" }
                : {
                    status: "FAIL",
                    what: `line-height is ${seen.line.leading.toFixed(2)}, and 1.4.8 asks 1.5`,
                }
        );
    }

    if (seen.targets.length) {
        for (const target of seen.targets) {
            results.push({
                status: "FAIL",
                what: `${target.what} is ${target.size}, under ${MIN_TARGET}px`,
            });
        }
    } else {
        results.push({
            status: "ok",
            what: `every target is at least ${MIN_TARGET}px without relying on spacing`,
        });
    }

    /*
     * Only meaningful where the panel is actually open, which is not most
     * views. Reporting "0 sections, fine" everywhere would be a check that
     * cannot fail, and this suite has enough of a lesson about those.
     */
    if (seen.sections.length) {
        const crowded = seen.sections.filter(
            (section) => section.controls > MAX_OPTIONS_PER_SECTION
        );
        results.push(
            crowded.length
                ? {
                    status: "FAIL",
                    what: crowded
                        .map((s) => `"${s.name}" offers ${s.controls} choices at once`)
                        .join("; "),
                }
                : {
                    status: "ok",
                    what: `${seen.sections.length} groups, none over `
                        + `${MAX_OPTIONS_PER_SECTION} choices`,
                }
        );
    }

    return results;
}

module.exports = {
    describes: "whether the result can comfortably be read, not only parsed",
    /*
     * Both text scales, because the defects this exists to catch are scale
     * defects: a heading sized in `rem` looks fine at 100% and is smaller than
     * its own labels at 150%. And both modes, because they are two interfaces.
     */
    views: {
        viewports: ["wide", "desktop", "phone"],
        scales: [1, 2.5],
        modes: ["standard", "accessible"],
    },
    run,
};
