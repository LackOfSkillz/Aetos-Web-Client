#!/usr/bin/env node
/*
 * Aetos accessibility suite -- the one command.
 *
 * WHY THIS EXISTS. Gary, asked what more could be tested before a human is
 * asked to test: *"there has to be a way to run a full set of tests"*. There
 * was not. Four gates existed and every one of them was driven by hand --
 * pasting a script into a page and reading JSON back out. That is why axe spent
 * its whole life measuring a single viewport: nothing made it easy to do
 * otherwise, and a gate that is awkward to run is a gate that is run once.
 *
 *     cd browser-qa && npm run a11y
 *
 * Nothing here ships. `browser-qa/` is development-only tooling and is not a
 * dependency of the contrib -- a game installing Aetos needs no Node, no npm and
 * no Playwright.
 *
 * WHAT IT IS NOT. Every check below is a machine looking for the class of defect
 * machines are good at: a missing name, an unreachable control, a region that
 * scrolls without a way in, a layout that stops fitting. **None of it answers
 * whether any of this is bearable to use**, which is what A.95 reserves for a
 * person and what `docs/a8-tester-protocol.md` is for. A0 shipped a scrolling
 * region a keyboard user could not scroll with every automated check passing.
 *
 * Usage:
 *
 *     node a11y/run.js                     everything
 *     node a11y/run.js --only=keyboard     one check
 *     node a11y/run.js --url=http://...    a different client
 *     node a11y/run.js --quiet             failures only
 */

"use strict";

const { chromium } = require("@playwright/test");

const { views, REFLOW_VIEWPORT } = require("./views");

const CHECKS = {
    axe: require("./checks/axe"),
    tree: require("./checks/tree"),
    keyboard: require("./checks/keyboard"),
    announce: require("./checks/announce"),
    forcedColors: require("./checks/forced-colors"),
    reflow: require("./checks/reflow"),
    legibility: require("./checks/legibility"),
    focus: require("./checks/focus"),
    readiness: require("./checks/readiness"),
};

const DEFAULT_URL = "http://localhost:4471/webclient/";

function parseArgs(argv) {
    const options = { url: DEFAULT_URL, only: null, quiet: false };
    for (const arg of argv.slice(2)) {
        if (arg.startsWith("--url=")) { options.url = arg.slice(6); }
        else if (arg.startsWith("--only=")) { options.only = arg.slice(7).split(","); }
        else if (arg === "--quiet") { options.quiet = true; }
        else if (arg === "--help" || arg === "-h") { options.help = true; }
    }
    return options;
}

/**
 * Put the client into one view and wait for it to settle there.
 *
 * The wait matters. Changing the text size makes the responsive manager
 * re-measure and possibly change the whole layout, and a check that measured
 * before that landed would be measuring the previous view.
 *
 * @param {import('@playwright/test').Page} page
 * @param {object} view
 */
async function applyView(page, view) {
    await page.setViewportSize({ width: view.viewport.width, height: view.viewport.height });
    await page.evaluate(({ scale, mode }) => {
        const prefs = window.Aetos.accessibility.preferences;
        prefs.update({ shell: { mode }, visual: { scale } });
    }, { scale: view.scale, mode: view.mode });
    // One frame for the scale, one for the ResizeObserver the scale change wakes.
    await page.waitForTimeout(350);
}

/**
 * Open the client and wait until it has finished booting.
 *
 * @param {import('@playwright/test').Browser} browser
 * @param {string} url
 * @returns {Promise<import('@playwright/test').Page>}
 */
async function openClient(browser, url) {
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on("console", (message) => {
        if (message.type() === "error") { consoleErrors.push(message.text()); }
    });
    page.on("pageerror", (error) => consoleErrors.push(String(error)));
    page.__consoleErrors = consoleErrors;

    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
        () => window.Aetos && window.Aetos.accessibility && window.Aetos.accessibilityPanel,
        null,
        { timeout: 30000 }
    );
    return page;
}

function line(status, text) {
    const mark = { ok: "  ok  ", FAIL: " FAIL ", skip: " skip " }[status] || "      ";
    return `${mark}${text}`;
}

async function main() {
    const options = parseArgs(process.argv);
    if (options.help) {
        process.stdout.write(
            "Aetos accessibility suite\n\n"
            + "  node a11y/run.js [--url=URL] [--only=name,name] [--quiet]\n\n"
            + "  checks: " + Object.keys(CHECKS).join(", ") + "\n"
        );
        return 0;
    }

    const chosen = options.only
        ? Object.fromEntries(Object.entries(CHECKS).filter(([name]) => options.only.includes(name)))
        : CHECKS;

    if (!Object.keys(chosen).length) {
        process.stderr.write("no such check. Available: " + Object.keys(CHECKS).join(", ") + "\n");
        return 2;
    }

    const browser = await chromium.launch();
    const page = await openClient(browser, options.url);

    const totals = { ok: 0, failed: 0, skipped: 0 };
    const failures = [];

    for (const [name, check] of Object.entries(chosen)) {
        process.stdout.write(`\n${name} -- ${check.describes}\n`);

        const targets = check.views === "reflow"
            ? [{ name: "320 CSS px (1280 at 400%)", viewport: REFLOW_VIEWPORT, scale: 1, mode: "standard" }]
            : views(check.views);

        for (const view of targets) {
            await applyView(page, view);
            let found;
            try {
                found = await check.run(page, view);
            } catch (error) {
                found = [{ status: "FAIL", what: `the check itself threw: ${error.message}` }];
            }

            for (const result of found) {
                totals[result.status === "ok" ? "ok" : result.status === "skip" ? "skipped" : "failed"] += 1;
                if (result.status === "FAIL") {
                    failures.push(`${name} | ${view.name} | ${result.what}`);
                }
                if (!options.quiet || result.status !== "ok") {
                    process.stdout.write(line(result.status, `${view.name}  ${result.what}\n`));
                }
            }
        }
    }

    /*
     * A page error is a finding.
     *
     * Not part of any single check, because the check that provoked it is not
     * necessarily the one that would report it -- and an exception thrown while
     * a screen reader is halfway through a panel is exactly the kind of thing
     * that produces "it just stopped working" in a tester's notes.
     */
    const errors = page.__consoleErrors.filter(
        (text) => !/favicon|net::ERR_|Failed to load resource/i.test(text)
    );
    if (errors.length) {
        totals.failed += 1;
        failures.push("console | the client logged errors while being tested: "
            + errors.slice(0, 3).join(" / "));
    }

    await browser.close();

    process.stdout.write(
        `\n${"-".repeat(60)}\n`
        + `${totals.ok} ok, ${totals.failed} failed, ${totals.skipped} skipped\n`
    );
    if (failures.length) {
        process.stdout.write("\nfailures:\n" + failures.map((f) => "  " + f).join("\n") + "\n");
    }
    process.stdout.write(
        "\nThis suite cannot tell you whether any of it is bearable to use.\n"
        + "That is docs/a8-tester-protocol.md, and it needs a person.\n"
    );

    return totals.failed ? 1 : 0;
}

main().then((code) => process.exit(code)).catch((error) => {
    process.stderr.write(String(error && error.stack || error) + "\n");
    process.exit(2);
});
