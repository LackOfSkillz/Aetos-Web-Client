/*
 * Aetos browser QA -- reflow and reachability.  A8, WCAG 1.4.10 and 2.4.11.
 *
 * Development-only tooling: a game developer installing the contrib needs no
 * Node, no npm and no Playwright. Nothing here ships.
 *
 * USAGE. Emulate a 320px-wide viewport, then paste this into the console of a
 * lab client. In Chrome devtools that is the device toolbar; in a plain window,
 * resize to 320 CSS pixels.
 *
 * WHAT IT MEASURES, AND WHY THE OBVIOUS VERSION IS WRONG.
 *
 * WCAG 1.4.10 asks whether content reflows to 320px without two-dimensional
 * scrolling. The obvious check -- "is anything wider than the viewport?" --
 * misses the failure that was actually in this client: the status bar's
 * controls were each narrow and *positioned* off the right-hand edge, with
 * `body { overflow-x: hidden }` above them. Nothing was too wide. There was no
 * scrollbar. `window.scrollTo(500, 0)` did nothing. The Help button, Edit
 * Layout and the Accessibility toggle were simply unreachable on a phone.
 *
 * The second version of the check overcorrected and flagged nine more controls
 * -- volume sliders and list buttons inside widget bodies that scroll
 * horizontally on purpose. Those are reachable and fine.
 *
 * So the question is neither "too wide" nor "off-screen". It is **off-screen
 * with no ancestor that can be scrolled to reach it**, which is what this
 * measures.
 *
 * It also measures at the client's own text scales. A window-width breakpoint
 * gets scaled text wrong: the window is wide and the content is not.
 */

(async function aetosReflowQa() {
    "use strict";

    var A = window.Aetos;
    if (!A || !A.accessibility) {
        console.error("Aetos is not booted on this page.");
        return;
    }

    var doc = document.documentElement;
    var SELECTOR = "button, input, textarea, select, a[href], [tabindex]";

    /*
     * Whether something outside the viewport can still be got at.
     *
     * True when any ancestor scrolls horizontally and has somewhere to scroll,
     * or when the page itself does.
     */
    function reachable(element) {
        var node = element.parentElement;
        while (node && node !== doc) {
            var style = window.getComputedStyle(node);
            if ((style.overflowX === "auto" || style.overflowX === "scroll")
                    && node.scrollWidth > node.clientWidth + 1) {
                return true;
            }
            node = node.parentElement;
        }
        return doc.scrollWidth > doc.clientWidth + 1;
    }

    function unreachableControls() {
        var found = [];
        Array.prototype.forEach.call(document.querySelectorAll(SELECTOR), function (element) {
            var rect = element.getBoundingClientRect();
            if (rect.width === 0 && rect.height === 0) {
                return;
            }
            var outside = rect.right > doc.clientWidth + 1 || rect.left < -1;
            if (outside && !reachable(element)) {
                found.push({
                    control: element.id
                        || (element.className || "").toString().split(" ")[0]
                        || element.tagName,
                    text: (element.textContent || "").trim().slice(0, 30),
                    x: Math.round(rect.left) + ".." + Math.round(rect.right)
                });
            }
        });
        return found;
    }

    if (doc.clientWidth > 400) {
        console.warn(
            "Viewport is " + doc.clientWidth + "px. Emulate 320px before trusting this."
        );
    }

    var rows = [];
    var failures = [];
    var scales = [1.0, 1.5, 2.0, 2.5];

    for (var i = 0; i < scales.length; i++) {
        await A.accessibility.preferences.update({ visual: { scale: scales[i] } });
        await new Promise(function (resolve) { window.setTimeout(resolve, 500); });
        var found = unreachableControls();
        rows.push({
            "text scale": scales[i],
            "viewport": doc.clientWidth,
            "page scrolls sideways": doc.scrollWidth > doc.clientWidth + 1,
            "unreachable controls": found.length
        });
        found.forEach(function (entry) {
            failures.push("scale " + scales[i] + ": " + entry.control
                + " (" + entry.text + ") at x=" + entry.x);
        });
    }

    await A.accessibility.preferences.update({ visual: { scale: 1.0 } });

    console.table(rows);

    if (failures.length) {
        console.error(
            "UNREACHABLE at 320px -- WCAG 1.4.10 and 2.4.11. These controls are "
            + "outside the viewport with nothing to scroll:"
        );
        failures.forEach(function (line) { console.error("  " + line); });
    } else {
        console.log("No unreachable controls at 320px, at any supported text scale.");
    }

    /*
     * The page itself must not scroll sideways. A region that scrolls
     * internally is a normal accommodation; a page that does is the failure
     * 1.4.10 is about.
     */
    if (doc.scrollWidth > doc.clientWidth + 1) {
        console.error(
            "The page scrolls horizontally at " + doc.clientWidth + "px, which is the "
            + "two-dimensional scrolling 1.4.10 forbids."
        );
    }
})();
