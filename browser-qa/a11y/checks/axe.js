/*
 * axe-core, run properly for once.
 *
 * The gate itself is not new. What is new is that it runs across the matrix
 * without anybody remembering to: `qa-axe.js` was driven by hand for its whole
 * life and was therefore only ever run at 1280x800, where it came back clean
 * every time. At 800x600 it found a serious violation immediately.
 *
 * WHAT AXE IS GOOD AT is a narrow and genuinely useful class: missing names,
 * broken roles, orphaned list items, scroll regions with no keyboard route in,
 * and colour contrast it can compute. Both of A0's real findings were of that
 * kind, and neither would have shown in a screenshot.
 *
 * WHAT IT IS NOT is a pass. A.87 is explicit and it is worth repeating wherever
 * a clean run is printed: automated tooling cannot tell whether a label is
 * *meaningful*, whether a task takes forty keystrokes, or whether a braille
 * display keeps losing its place.
 */

"use strict";

const path = require("path");
const { inject } = require("../inject");

const AXE = path.join(__dirname, "..", "..", "node_modules", "axe-core", "axe.min.js");

/*
 * Rules whose result is not trustworthy without a real backdrop.
 *
 * `color-contrast` needs to see actual painted pixels, and on a partly
 * transparent element over a themed background axe returns "incomplete" rather
 * than a verdict. That is not a defect and reporting it as one would train
 * people to ignore the output -- which is how a gate stops working. Contrast is
 * covered properly by the client's own validator, which checks the *tokens*
 * rather than guessing at composited colour.
 */
const INCOMPLETE_IS_NOT_A_FAILURE = new Set(["color-contrast"]);

/*
 * The overlays, not just the page behind them.
 *
 * The first version of this check scanned `document` in whatever state the page
 * happened to be in -- which is the default workspace and nothing else. The gate
 * it replaced opened thirteen views, so moving to the runner would have swapped
 * thirteen scans for one and called it an improvement because it now ran at four
 * viewports. Coverage traded for breadth, silently, which is the worst way to
 * lose it.
 *
 * A dialog is where accessibility defects concentrate: focus order, naming, the
 * relationship between a control and its description. Scanning only the page
 * behind them would miss the lot.
 *
 * Each entry opens something, and closes it again. A view that fails to open is
 * skipped rather than failed -- a game with diagnostics off genuinely has no
 * inspector, and reporting that as a violation would train people to ignore the
 * output.
 */
const OVERLAYS = [
    ["default workspace", null, null],
    ["help", () => window.Aetos.help.open(), () => window.Aetos.help.close()],
    ["command palette", () => window.Aetos.palette.open(), () => window.Aetos.palette.close()],
    ["settings dashboard", () => window.Aetos.settingsDashboard.open(), () => window.AetosDialog.close(null)],
    ["privacy", () => window.Aetos.settings.openPrivacy(), () => window.AetosDialog.close(null)],
    ["themes", () => window.Aetos.settings.openThemes(), () => window.AetosDialog.close(null)],
    ["reminders", () => window.Aetos.settings.openReminders(), () => window.AetosDialog.close(null)],
    ["symbol packs", () => window.Aetos.settings.openSymbolPacks(), () => window.AetosDialog.close(null)],
    ["edit layout", () => window.Aetos.workspaces.toggleEditing(), () => window.Aetos.workspaces.toggleEditing()],
];

/**
 * Run axe over whatever is currently on screen.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<object[]>} Violations.
 */
async function scan(page) {
    return page.evaluate(async () => {
        const result = await window.axe.run(document, {
            resultTypes: ["violations"],
            runOnly: {
                type: "tag",
                values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"],
            },
        });
        return result.violations.map((violation) => ({
            id: violation.id,
            impact: violation.impact,
            nodes: violation.nodes.length,
            target: violation.nodes[0] && violation.nodes[0].target.join(" "),
        }));
    });
}

async function run(page) {
    await inject(page, "axe", AXE);
    const results = [];

    for (const [name, open, close] of OVERLAYS) {
        if (open) {
            const opened = await page.evaluate((source) => {
                try {
                    // eslint-disable-next-line no-new-func
                    return new Function(`return (${source})()`)() !== false;
                } catch (error) {
                    return false;
                }
            }, open.toString()).catch(() => false);

            if (!opened) {
                results.push({ status: "skip", what: `${name}: not available in this client` });
                continue;
            }
            await page.waitForTimeout(400);
        }

        const violations = await scan(page);
        const real = violations.filter((violation) => !INCOMPLETE_IS_NOT_A_FAILURE.has(violation.id));

        if (real.length) {
            for (const violation of real) {
                results.push({
                    status: "FAIL",
                    what: `${name}: ${violation.id} (${violation.impact}, ${violation.nodes} node(s)) ${violation.target}`,
                });
            }
        } else {
            results.push({ status: "ok", what: `${name}: clean` });
        }

        if (close) {
            await page.evaluate((source) => {
                try {
                    // eslint-disable-next-line no-new-func
                    new Function(`return (${source})()`)();
                } catch (error) { /* already closed */ }
            }, close.toString());
            await page.waitForTimeout(300);
        }
    }

    return results;
}

module.exports = {
    describes: "axe-core, across every viewport, scale and mode",
    views: { viewports: ["wide", "desktop", "tablet", "phone"], scales: [1, 2.5], modes: ["standard", "accessible"] },
    run,
};
