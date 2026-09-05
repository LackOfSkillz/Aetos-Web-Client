/*
 * Aetos browser QA -- automated accessibility audit.
 *
 * Addendum A.86, A.87. Development-only tooling: a game developer installing
 * the contrib needs no Node, no npm and no Playwright. Nothing here ships.
 *
 * SETUP. axe-core is not bundled. Install it and serve it to the lab client:
 *
 *     cd browser-qa && npm install
 *     cp node_modules/axe-core/axe.min.js ../aetos_testgame/web/static/qa/
 *     cd ../aetos_testgame && evennia collectstatic --noinput
 *
 * The lab game is gitignored, so the copy is a local artifact rather than
 * something that ends up in the contrib.
 *
 * WHAT AN AXE PASS IS AND IS NOT. A.87 is explicit: a clean run does not make a
 * feature accessible. Automated tooling finds a specific and narrow class of
 * defect -- missing names, broken roles, orphaned list items, unreachable
 * scroll regions. It cannot tell whether a label is *meaningful*, whether a
 * task takes forty keystrokes, or whether a braille display keeps losing its
 * place. Those need A8 and a person.
 *
 * What it is very good at is catching the defects that are invisible to
 * whoever introduced them. Both of A0's real findings were of that kind: a
 * scrolling region a keyboard user could not scroll, and -- in the first
 * attempted fix for it -- a role that orphaned fifteen list items. Neither
 * shows up in a screenshot.
 *
 * RUNTIME. Six full axe passes take well over half a minute, which exceeds the
 * evaluation timeout of some browser-automation harnesses. If the whole suite
 * times out, run `scan()` for one view at a time -- the results are identical,
 * and each view is independent by construction.
 */

(async function aetosAxeQa() {
    "use strict";

    var results = { passed: 0, failed: 0, failures: [] };

    function check(name, condition, detail) {
        if (condition) {
            results.passed += 1;
        } else {
            results.failed += 1;
            results.failures.push(name + (detail ? " -- " + detail : ""));
        }
    }

    function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

    if (!window.axe) {
        try {
            await new Promise(function (resolve, reject) {
                var script = document.createElement("script");
                script.src = "/static/qa/axe.min.js";
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        } catch (err) {
            return {
                passed: 0,
                failed: 1,
                failures: ["axe-core is not served. See the setup note at the top of qa-axe.js."]
            };
        }
    }

    //: The rule sets Aetos holds itself to. `best-practice` is included
    //: deliberately: several of its rules -- scrollable-region-focusable among
    //: them -- catch genuine keyboard defects that the WCAG tags alone miss.
    var OPTIONS = {
        runOnly: {
            type: "tag",
            values: [
                "wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"
            ]
        }
    };

    var A = window.Aetos;
    if (!A) {
        return { passed: 0, failed: 1, failures: ["Aetos not loaded"] };
    }

    /*
     * Scan one view.
     *
     * `serious` and `critical` are the gate. `moderate` and `minor` are
     * reported but do not fail, so a stylistic best-practice note cannot block
     * a release while a real keyboard trap slips past unnoticed in the noise.
     */
    async function scan(name, setup, teardown) {
        if (setup) {
            await setup();
        }
        await sleep(350);

        var report;
        try {
            report = await window.axe.run(document, OPTIONS);
        } finally {
            if (teardown) {
                await teardown();
                await sleep(150);
            }
        }

        var blocking = report.violations.filter(function (violation) {
            return violation.impact === "serious" || violation.impact === "critical";
        });

        check(
            "axe: " + name + " has no serious or critical violations",
            blocking.length === 0,
            blocking.map(function (violation) {
                return violation.id + " (" + violation.impact + ", " +
                    violation.nodes.length + " nodes: " +
                    violation.nodes[0].target.join(" ") + ")";
            }).join("; ")
        );

        // Reported, not enforced. An "incomplete" is axe saying it could not
        // determine the answer -- most often a contrast check behind an
        // overlay -- which is a prompt for a human, not a failure.
        if (report.incomplete.length) {
            results.failures.push(
                "NOTE " + name + ": axe could not determine " +
                report.incomplete.map(function (r) { return r.id; }).join(", ")
            );
        }

        return report;
    }

    await scan("default workspace", null, null);

    if (A.help) {
        await scan("help overlay",
            function () { A.help.open("developers"); },
            function () { A.help.close(); });
    }

    if (A.palette) {
        await scan("command palette",
            function () { A.palette.open(); },
            function () { A.palette.close(); });
    }

    if (A.settings && window.AetosDialog) {
        await scan("privacy dialog",
            function () { A.settings.openPrivacy(); },
            function () { window.AetosDialog.close(null); });
    }

    /*
     * A5. Both panels are lists of the player's own items, which is the shape
     * axe is best at: an unlabelled row of identical "Delete" buttons and an
     * unreachable scroll region are exactly the defects that are invisible to
     * whoever wrote them.
     */
    if (A.settings && A.orientation && window.AetosDialog) {
        await scan("reorientation summary",
            function () { A.settings.openOrientation(); },
            function () { window.AetosDialog.close(null); });
    }

    if (A.settings && A.cognitive && window.AetosDialog) {
        await scan("reminders and tasks",
            function () { A.settings.openReminders(); },
            function () { window.AetosDialog.close(null); });
    }

    /*
     * M18. Scanned with captions in the list and an image shown, because an
     * empty panel hides every per-row defect -- and the first version of this
     * widget had two: a role on a <ul> that orphaned every caption, and the
     * `aria-allowed-role` that came with it.
     */
    if (A.audio && A.captions) {
        await scan("sound and captions",
            function () {
                A.audio.sync({ items: [
                    { id: "qa-a", url: "/static/qa/silence.ogg", category: "ambience",
                      caption: "Waves against the wharf.", decorative: false,
                      loop: true, volume: 1, uncaptioned: false },
                    { id: "qa-b", url: "/static/qa/silence.ogg", category: "effect",
                      caption: null, decorative: false, loop: false, volume: 1,
                      uncaptioned: true }
                ] });
                A.captions.showImage({ url: "/static/qa/nothing.png",
                    description: "A chart of the harbour.", category: "image" });
            },
            function () {
                A.captions.showImage(null);
                A.audio.sync({ items: [] });
            });
    }

    /*
     * M19. The themes list, and the contrast report with real failures in it.
     *
     * Scanned with a deliberately illegible theme, because the report is the
     * one panel whose content only exists when something is wrong -- and a
     * panel nobody ever renders in its failing state is a panel nobody has
     * ever actually checked.
     */
    if (A.themes && A.settings && window.AetosDialog) {
        await scan("themes",
            function () { A.settings.openThemes(); },
            function () { window.AetosDialog.close(null); });

        await scan("contrast report",
            async function () {
                var saved = await A.themes.save({
                    id: "qa-contrast", name: "QA low contrast",
                    tokens: { "--aetos-bg": "#3a3a3a", "--aetos-panel": "#454545",
                              "--aetos-text": "#8a8a8a" }
                });
                A.settings.showContrastReport(saved.theme, saved.contrast);
            },
            async function () {
                window.AetosDialog.close(null);
                await A.themes.remove("qa-contrast");
            });
    }

    /*
     * A7. Scanned with a sentence in the strip, since an empty strip has no
     * per-word controls and those are where the labelling risk lives.
     *
     * This scan already earned itself: the word grid carried an `aria-label`
     * on a plain <div>, which is prohibited and, worse, silently ignored -- so
     * the grid was simply unlabelled, and axe reported it only as
     * *incomplete* rather than as a violation.
     */
    if (A.aac) {
        await scan("picture communication",
            function () {
                A.aac.add("i");
                A.aac.add("want");
                A.aac.add("help");
            },
            function () { A.aac.clear(); });
    }

    /*
     * M21. The inspector, which is nine lists at once -- the densest panel in
     * the client and the one most likely to grow a scrolling region nobody
     * gave a tabindex. It did, on the first run.
     */
    if (A.inspector && window.AetosDialog) {
        await scan("inspector",
            function () { A.inspector.open(); },
            function () { window.AetosDialog.close(null); });
    }

    if (A.workspaces) {
        await scan("edit layout",
            function () { A.workspaces.toggleEditing(); },
            function () { A.workspaces.toggleEditing(); });
    }

    /*
     * The accessibility presets are scanned too.
     *
     * A high-contrast theme that fails contrast is the exact failure mode
     * A11Y-VIS-003 exists to prevent, and it is not a hypothetical: a palette
     * chosen by eye passes for the person who chose it.
     */
    if (A.accessibility && A.accessibility.preferences) {
        var preferences = A.accessibility.preferences;
        await scan("high contrast, minimal stimulation",
            function () {
                return preferences.update({
                    visual: { contrast: "high", stimulation: "minimal", motion: "reduced" }
                });
            },
            function () {
                return preferences.update({
                    visual: { contrast: "standard", stimulation: "standard", motion: "system" }
                });
            });
    }

    return results;
})();
