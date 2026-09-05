/*
 * Aetos browser QA -- output-path performance.
 *
 * M25. Development-only tooling: a game developer installing the contrib needs
 * no Node, no npm and no Playwright. Nothing here ships.
 *
 * USAGE. Paste into the console of a lab client at http://localhost:4471/webclient/
 * and read the table it prints.
 *
 * WHY THIS EXISTS AS A SCRIPT RATHER THAN A TEST. The Python suite pins the
 * *structure* that makes the client fast -- that `append` reads no geometry,
 * that the flush measures once, that the batch is bounded. It cannot pin a
 * number: a timing assertion in CI measures the build machine's load. So the
 * numbers live here, run by hand, and the note records what they were.
 *
 * WHAT IT MEASURES. The cost of one line of game output, at three session
 * lengths, because the defect M25 fixed was invisible at the first and
 * catastrophic at the third. A client that is fast when you open it and
 * unusable four hours later is the failure mode worth watching for, and it is
 * exactly the one a quick look never finds.
 *
 * The reference numbers, taken in the lab on 2026-09-05:
 *
 *     empty log      before 2.60ms/line   after 0.13 - 0.19ms/line
 *     1200 lines     before 19.1ms/line   after 0.21 - 0.23ms/line
 *     at the cap     before 68.2ms/line   after 0.28 - 0.73ms/line
 *
 * The ranges are run-to-run variance on one machine, which is the reason the
 * numbers are not asserted anywhere.
 *
 * Read the shape rather than the absolute values. Some growth with scrollback
 * length remains and is expected -- laying out a 5000-node list costs more than
 * laying out an empty one, and trimming the overflow is real work. What must
 * not come back is growth of the old kind: 26x from empty to full, where the
 * per-line cost was set by how long the player had been playing.
 */

(async function aetosPerformanceQa() {
    "use strict";

    var A = window.Aetos;
    if (!A || !A.pipeline || !A.consoleWidget) {
        console.error("Aetos is not booted on this page.");
        return;
    }

    var consoleEl = document.querySelector(".aetos-console");

    /*
     * Drive real events through the real pipeline.
     *
     * Not `consoleWidget.append` directly: the point is the whole per-line
     * path -- the canonical log, the automation stage, the display rules and
     * the console -- because a fix that moves cost from one stage to another
     * would otherwise look like a win.
     */
    function burst(count, tag) {
        var started = performance.now();
        for (var i = 0; i < count; i++) {
            A.pipeline.ingest({
                kind: "text",
                text: tag + " " + i + " -- the rat squeals and lunges.",
                category: "other"
            });
        }
        // Force the batch out, so the flush's cost is inside the measurement
        // rather than landing in the next frame and being invisible here.
        if (A.consoleWidget.flush) {
            A.consoleWidget.flush();
        }
        return performance.now() - started;
    }

    function row(label, elapsed, count) {
        return {
            phase: label,
            "total ms": Math.round(elapsed * 10) / 10,
            "ms/line": Math.round((elapsed / count) * 100) / 100,
            "console nodes": consoleEl ? consoleEl.childElementCount : null
        };
    }

    var rows = [];

    rows.push(row("200 lines, from empty", burst(200, "cold"), 200));

    burst(1000, "fill");
    rows.push(row("200 lines, after 1200", burst(200, "warm"), 200));

    // Past the 5000-line cap, where the scrollback is at its longest and the
    // old per-line layout was at its most expensive.
    burst(4000, "fill");
    rows.push(row("200 lines, at the cap", burst(200, "hot"), 200));

    console.table(rows);

    var growth = rows[2]["ms/line"] / Math.max(rows[0]["ms/line"], 0.001);
    console.log(
        "Cost growth from empty to full scrollback: " + (Math.round(growth * 10) / 10) + "x, " +
        "at " + rows[2]["ms/line"] + "ms/line with the scrollback full."
    );
    /*
     * Two numbers, because either alone misleads. Growth alone punishes a
     * client that is simply fast when empty; the absolute alone hides the
     * defect that only appears after four hours of play.
     */
    console.log(
        growth > 10 || rows[2]["ms/line"] > 1
            ? "REGRESSION: expected under 10x and under 1ms/line at the cap. " +
              "The M25 defect measured 26x and 68ms/line."
            : "Healthy: within the M25 reference range."
    );

    // Leave the console as it was found, near enough -- 5000 lines of test
    // filler in a lab client is confusing to the next person to look at it.
    if (consoleEl) {
        consoleEl.textContent = "";
        console.log("Console cleared. The canonical log still holds the test events.");
    }
})();
