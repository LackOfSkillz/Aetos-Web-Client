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

async function run(page) {
    await inject(page, "axe", AXE);

    const report = await page.evaluate(async () => {
        const result = await window.axe.run(document, {
            resultTypes: ["violations"],
            runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] },
        });
        return {
            violations: result.violations.map((violation) => ({
                id: violation.id,
                impact: violation.impact,
                nodes: violation.nodes.length,
                target: violation.nodes[0] && violation.nodes[0].target.join(" "),
            })),
        };
    });

    const serious = report.violations.filter(
        (violation) => !INCOMPLETE_IS_NOT_A_FAILURE.has(violation.id)
            && (violation.impact === "serious" || violation.impact === "critical")
    );
    const minor = report.violations.filter(
        (violation) => violation.impact !== "serious" && violation.impact !== "critical"
    );

    const results = [];
    if (serious.length) {
        for (const violation of serious) {
            results.push({
                status: "FAIL",
                what: `${violation.id} (${violation.impact}, ${violation.nodes} node(s)): ${violation.target}`,
            });
        }
    } else {
        results.push({ status: "ok", what: "no serious or critical violations" });
    }

    for (const violation of minor) {
        results.push({
            status: "FAIL",
            what: `${violation.id} (${violation.impact}, ${violation.nodes} node(s)): ${violation.target}`,
        });
    }

    return results;
}

module.exports = {
    describes: "axe-core, across every viewport, scale and mode",
    views: { viewports: ["wide", "desktop", "tablet", "phone"], scales: [1, 2.5], modes: ["standard", "accessible"] },
    run,
};
