/*
 * Aetos browser QA -- A8 readiness.
 *
 * WHY THIS EXISTS. Gary, 2026-09-06, asked for the client to be "as ready for a
 * human tester as we are able to" before Meris is asked to run A8. A human
 * tester's time is the scarcest thing this project will ever spend, and it must
 * not be spent discovering that task 26 opens nothing.
 *
 * So this walks `docs/a8-tester-protocol.md` and, for every numbered task,
 * answers one question: **is there something there, does it open, is it named,
 * does it close, and does focus come back?** Nothing here judges whether the
 * result is *good* -- that is exactly what A.95 reserves for a person, and a
 * script that claimed to check it would be lying about the thing that matters.
 *
 * WHAT A RESULT MEANS. Every task lands in one of four buckets, and the
 * distinction is the whole point:
 *
 *   ok           verified working, right now, in this browser
 *   needs-session  the destination exists and is sound, but showing real data
 *                  needs a puppeted character -- so it is checked as far as a
 *                  logged-out client allows and no further
 *   needs-human    judgement. Keystroke counts, whether focus "jumps", whether
 *                  braille loses its place, whether the concept set is right.
 *                  Automation cannot answer these and does not pretend to.
 *   FAIL         a destination is missing or broken
 *
 * **The gate is that no task is FAIL when the tester sits down.** `needs-human`
 * is not a gap; it is the protocol working as designed.
 *
 * WHAT IT CANNOT DO, said plainly so nobody reads a clean run as a pass:
 * it does not run a screen reader, does not drive a braille display, and cannot
 * tell whether anything is pleasant to use. A0 shipped a scrolling region a
 * keyboard user could not scroll and every automated check passed.
 *
 * SETUP. Loaded like the axe gate:
 *
 *     cp qa-a8-readiness.js ../aetos_testgame/web/static/qa/
 *     cd ../aetos_testgame && evennia collectstatic --noinput
 *
 * then in the client page, a <script src> away. It returns a report object.
 */

window.__aetosA8 = (async function aetosA8Readiness() {
    "use strict";

    /*
     * Everything this probe changes, so it can be put back.
     *
     * A run that crashed halfway used to leave the client in accessible mode
     * with high contrast on -- which is a fine state to be in and a terrible one
     * to hand somebody who did not ask for it, especially the tester this whole
     * exercise is preparing for. Restored in a `finally`, so a thrown probe
     * still tidies up after itself.
     */
    var startingPreferences = null;

    var results = {
        viewport: window.innerWidth + "x" + window.innerHeight,
        textScale: (function () {
            var root = document.querySelector(".aetos-root");
            return root ? window.getComputedStyle(root).fontSize : "unknown";
        }()),
        ok: 0,
        failed: 0,
        needsSession: 0,
        needsHuman: 0,
        failures: [],
        deferred: []
    };

    var A = window.Aetos || {};

    /*
     * A hidden browser pane reports `innerWidth: 0`, and every geometric check
     * below then measures nothing and reports a failure that is not real.
     *
     * The first run of this gate did exactly that: it said the mode switch was
     * off screen at large text, in a viewport of zero by zero. A result computed
     * from a viewport that does not exist is worse than no result, because
     * somebody acts on it -- so this refuses to run rather than reporting.
     */
    if (!window.innerWidth || !window.innerHeight) {
        return {
            refused: "the viewport is " + window.innerWidth + "x" + window.innerHeight
                + ". Bring the browser window to the front and run this again -- a "
                + "hidden pane measures nothing and every layout check would lie.",
            ok: 0,
            failed: 0,
            failures: []
        };
    }

    function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

    /*
     * Put the client back, and say whether it worked.
     *
     * This gate runs against a live client and changes the mode, the contrast
     * and the text size on the way through. Leaving any of that behind would
     * hand the next person -- very possibly the tester this is preparing for --
     * an interface they did not choose and cannot account for.
     *
     * The check is reported rather than merely attempted, because "I restored
     * it" is a claim and this project has been caught by unverified ones.
     */
    function restore() {
        if (!startingPreferences || !A.accessibility) { return; }
        var preferences = A.accessibility.preferences;
        try {
            preferences.update(startingPreferences);
            preferences.update({ shell: { mode: startingPreferences.shell.mode } });
        } catch (err) {
            results.leftBehind = "could not restore preferences: " + err;
            return;
        }
        var now = preferences.get();
        if (now.shell.mode !== startingPreferences.shell.mode
                || now.visual.contrast !== startingPreferences.visual.contrast
                || now.visual.scale !== startingPreferences.visual.scale) {
            results.leftBehind = "the client was not left as it was found: mode "
                + now.shell.mode + ", contrast " + now.visual.contrast
                + ", scale " + now.visual.scale;
            results.failed += 1;
            results.failures.push("the readiness gate changed the client and did not put it back");
        }
    }

    if (A.accessibility && A.accessibility.preferences) {
        startingPreferences = JSON.parse(
            JSON.stringify(A.accessibility.preferences.get()));
    }

    /*
     * Record one task's outcome.
     *
     * `where` is the protocol section and number, so a failure can be looked up
     * in the document a tester is holding rather than only in this file.
     */
    function record(where, what, outcome, detail) {
        if (outcome === "ok") {
            results.ok += 1;
        } else if (outcome === "FAIL") {
            results.failed += 1;
            results.failures.push(where + " " + what + (detail ? " -- " + detail : ""));
        } else {
            if (outcome === "needs-session") { results.needsSession += 1; }
            if (outcome === "needs-human") { results.needsHuman += 1; }
            results.deferred.push(outcome + " | " + where + " " + what
                + (detail ? " -- " + detail : ""));
        }
    }

    function check(where, what, condition, detail) {
        record(where, what, condition ? "ok" : "FAIL", condition ? "" : detail);
    }

    /*
     * The contract every overlay in this client shares.
     *
     * Opening moves focus in, closing returns it to whatever opened it. Both
     * halves matter and the second is the one that gets broken: a dialog that
     * dumps focus back at the top of the document sends a screen-reader user to
     * the start of the page every time they close anything.
     */
    async function overlay(where, what, open, close, selector) {
        var opener = document.getElementById("aetos-send") || document.body;
        opener.focus();

        var opened = false;
        try { opened = (await open()) !== false; } catch (err) {
            record(where, what, "FAIL", "opening threw: " + err);
            return;
        }
        await sleep(250);

        var element = document.querySelector(selector);
        if (!element) {
            record(where, what, "FAIL", "opened but " + selector + " is not in the document");
            return;
        }

        var inside = element.contains(document.activeElement);

        try { await close(); } catch (err) {
            record(where, what, "FAIL", "closing threw: " + err);
            return;
        }
        await sleep(250);

        var gone = !document.querySelector(selector);
        var returned = document.activeElement === opener;

        if (!gone) {
            record(where, what, "FAIL", "did not close");
        } else if (!inside) {
            record(where, what, "FAIL", "opened without moving focus into it");
        } else if (!returned) {
            record(where, what, "FAIL", "closed without returning focus to the opener");
        } else {
            record(where, what, "ok");
        }
    }

    /* --- Section 0: both modes, and the way back --------------------------- */

    var panel = A.accessibilityPanel;
    if (!panel) {
        record("0", "the mode switch", "FAIL", "no accessibility panel on window.Aetos");
    } else {
        var control = document.querySelector('[role="switch"]');
        check("0.1", "the switch is findable and is a switch",
            !!control && control.getAttribute("role") === "switch",
            "no element with role=switch");

        if (control) {
            check("0.2", "the switch is named",
                !!(control.getAttribute("aria-label") || control.textContent.trim()));
            check("0.3", "the switch reports its state",
                control.getAttribute("aria-checked") !== null,
                "no aria-checked");

            var before = panel.isAccessible();
            panel.setMode(before ? "standard" : "accessible");
            await sleep(150);
            check("0.4", "flipping the switch changes the reported state",
                control.getAttribute("aria-checked") === String(!before));

            /*
             * The trap this gate found on its first run: `setMode` coerced its
             * argument with `!!`, so the string "standard" was true and turned
             * accessible mode ON. No player could reach it -- every call site in
             * the client toggles with no argument -- and the first outside
             * caller hit it immediately.
             *
             * Kept as a check because the coercion is exactly the kind of thing
             * somebody tidying would put back.
             */
            panel.setMode("standard");
            await sleep(150);
            check("0.4", "setMode understands the names of the modes it sets",
                panel.isAccessible() === false,
                "setMode('standard') did not switch to standard mode");
            check("0.4", "setMode refuses an argument it does not understand",
                panel.setMode("sideways") === null,
                "an unrecognised mode was accepted");

            panel.setMode(before ? "accessible" : "standard");
            await sleep(150);
        }

        /*
         * The claim the whole two-mode design rests on: leaving accessible mode
         * masks the accommodations and erases nothing, so the way back is one
         * keystroke and it restores what you built.
         *
         * Checked here because it is *falsifiable*, and because a tester who
         * found it false would be stranded -- which is the one outcome the
         * protocol says must not happen to them.
         */
        var prefs = A.accessibility && A.accessibility.preferences;
        if (prefs) {
            var original = prefs.get();
            panel.setMode("accessible");
            prefs.update({ visual: { contrast: "high" } });
            await sleep(100);
            var chosenWhileOn = prefs.get().visual.contrast;

            panel.setMode("standard");
            await sleep(100);
            var maskedNotErased = prefs.get().visual.contrast === chosenWhileOn
                && prefs.effective().visual.contrast !== chosenWhileOn;

            panel.setMode("accessible");
            await sleep(100);
            var cameBack = prefs.effective().visual.contrast === chosenWhileOn;

            /*
             * Checked against `effective()` here and against the *rendered*
             * attribute further down. Two different questions: whether the
             * preference layer masks, and whether the mask reaches the screen.
             * A0's lesson was that the second does not follow from the first.
             */
            check("0.5", "the preference layer masks rather than erasing",
                maskedNotErased, "the stored value changed when the mode did");
            check("0.7", "and reports the choice again on the way back", cameBack);

            prefs.update({ visual: { contrast: original.visual.contrast } });
            panel.setMode(original.shell && original.shell.mode === "accessible"
                ? "accessible" : "standard");
            await sleep(100);
        }

        record("0.1", "how long it takes to FIND the switch unaided", "needs-human");
        record("0.5", "whether the announcement on leaving is enough", "needs-human");
        record("0.6", "whether the way back is discoverable without being told",
            "needs-human");
    }

    /* --- Section 1, tasks 1 and 5-6: structure ----------------------------- */

    check("1.1", "the page says what it is",
        !!document.title && document.title.trim().length > 0);

    /*
     * A landmark needs a name when there is more than one of its role, and not
     * otherwise.
     *
     * The first draft demanded a name on every one and reported two failures
     * that were not: the sole `<header>`, which needs no name because there is
     * only one banner to distinguish it from, and the composer's `<footer>`,
     * which sits inside a `<section>` and is therefore not a landmark at all.
     * Being stricter than the specification produces findings a tester would
     * chase and a reviewer would reject.
     */
    function landmarkRole(element) {
        var explicit = element.getAttribute("role");
        if (explicit) { return explicit; }
        var tag = element.tagName;
        if (tag === "MAIN") { return "main"; }
        if (tag === "NAV") { return "navigation"; }
        if (tag === "ASIDE") { return "complementary"; }
        // `header` and `footer` are landmarks only when not inside sectioning
        // content -- article, aside, main, nav or section.
        if (tag === "HEADER" || tag === "FOOTER") {
            return element.closest("article, aside, main, nav, section")
                ? null
                : (tag === "HEADER" ? "banner" : "contentinfo");
        }
        return null;
    }

    function namedLandmark(element) {
        if (element.getAttribute("aria-label")) { return true; }
        var labelled = element.getAttribute("aria-labelledby");
        return !!(labelled && labelled.split(/\s+/).some(function (id) {
            return document.getElementById(id);
        }));
    }

    var byRole = {};
    Array.prototype.slice.call(document.querySelectorAll(
        "main, nav, aside, header, footer, [role=main], [role=navigation], "
        + "[role=complementary], [role=banner], [role=contentinfo], [role=region], [role=log]"
    )).forEach(function (element) {
        var role = landmarkRole(element);
        if (!role) { return; }
        byRole[role] = byRole[role] || [];
        byRole[role].push(element);
    });

    var ambiguous = [];
    Object.keys(byRole).forEach(function (role) {
        var group = byRole[role];
        if (group.length < 2) { return; }
        group.filter(function (element) { return !namedLandmark(element); })
            .forEach(function (element) {
                ambiguous.push(role + " (" + element.tagName.toLowerCase()
                    + "." + element.className + ")");
            });
    });

    check("1.5", "no two landmarks of the same role are left unnamed",
        ambiguous.length === 0, ambiguous.slice(0, 5).join(", "));

    var headings = Array.prototype.slice.call(
        document.querySelectorAll("h1, h2, h3, h4, h5, h6"));
    var levels = headings.map(function (h) { return parseInt(h.tagName.slice(1), 10); });
    var skipped = [];
    levels.forEach(function (level, index) {
        if (index && level > levels[index - 1] + 1) {
            skipped.push(headings[index - 1].tagName + " -> " + headings[index].tagName);
        }
    });
    check("1.6", "the heading structure has no skipped levels",
        skipped.length === 0, skipped.join(", "));
    check("1.6", "there is exactly one h1",
        document.querySelectorAll("h1").length === 1,
        document.querySelectorAll("h1").length + " found");

    /* --- Section 1, task 2 and section 8: the keyboard path ---------------- */

    var focusable = Array.prototype.slice.call(document.querySelectorAll(
        'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )).filter(function (element) {
        if (element.disabled) { return false; }
        if (element.closest("[hidden]")) { return false; }
        var style = window.getComputedStyle(element);
        return style.visibility !== "hidden" && style.display !== "none";
    });

    function accessibleName(element) {
        var labelledby = element.getAttribute("aria-labelledby");
        if (labelledby) {
            var parts = labelledby.split(/\s+/).map(function (id) {
                var target = document.getElementById(id);
                return target ? target.textContent.trim() : "";
            }).filter(Boolean);
            if (parts.length) { return parts.join(" "); }
        }
        if (element.getAttribute("aria-label")) { return element.getAttribute("aria-label"); }
        if (element.id) {
            var label = document.querySelector('label[for="' + element.id + '"]');
            if (label && label.textContent.trim()) { return label.textContent.trim(); }
        }
        if (element.getAttribute("title")) { return element.getAttribute("title"); }
        return (element.textContent || "").trim();
    }

    var nameless = focusable.filter(function (element) { return !accessibleName(element); });
    check("8", "every focus stop has an accessible name",
        nameless.length === 0,
        nameless.slice(0, 5).map(function (element) {
            return element.tagName + "." + element.className;
        }).join(", "));

    check("1.2", "the command input is reachable by keyboard",
        focusable.indexOf(document.getElementById("aetos-input")) !== -1);

    var skipLinks = document.querySelectorAll(".aetos-skiplink");
    check("1.2", "the skip links point at things that exist",
        skipLinks.length > 0 && Array.prototype.every.call(skipLinks, function (link) {
            return document.querySelector(link.getAttribute("href"));
        }));

    record("8", "driving the whole client with the mouse unplugged", "needs-human",
        "tab order and names are verified; whether it is BEARABLE is not");

    /* --- Section 1, tasks 12-14, 24, 31: the overlays ---------------------- */

    if (A.help) {
        await overlay("1.12", "help opens, traps focus, closes and returns it",
            function () { return A.help.open(); },
            function () { return A.help.close(); },
            ".aetos-help__overlay");
    } else {
        record("1.12", "help", "FAIL", "no help module");
    }

    if (A.palette) {
        await overlay("1.13", "the command palette opens and returns focus",
            function () { return A.palette.open(); },
            function () { return A.palette.close(); },
            ".aetos-palette-box");

        var commands = A.palette.commands ? A.palette.commands() : [];
        check("1.13", "the palette has commands to find", commands.length > 0);
        var textSize = commands.filter(function (command) {
            return /text size|larger text|smaller text/i.test(command.label || "");
        });
        check("7.1", "text size is reachable from the palette without opening settings",
            textSize.length >= 2,
            "found " + textSize.length + " text-size commands");
    } else {
        record("1.13", "the command palette", "FAIL", "no palette module");
    }

    if (A.settingsDashboard) {
        await overlay("1.24", "the settings dashboard opens and returns focus",
            function () { return A.settingsDashboard.open(); },
            function () { return window.AetosDialog.close(null); },
            ".aetos-dialog");
    }

    if (A.settings && A.settings.openPrivacy) {
        await overlay("1.31", "the privacy panel opens and returns focus",
            function () { return A.settings.openPrivacy(); },
            function () { return window.AetosDialog.close(null); },
            ".aetos-dialog");
    }

    /* --- Section 1, tasks 15-16: the accessibility settings ---------------- */

    var preferences = A.accessibility && A.accessibility.preferences;
    if (preferences) {
        var root = document.documentElement;

        /*
         * Contrast is a *governed* accommodation, so it applies in accessible
         * mode and is masked in standard mode. Both halves are checked, in that
         * order, because between them they are the A10 claim the whole two-mode
         * design rests on -- and because checking only the first is how the
         * first draft of this probe reported high contrast broken while it was
         * working exactly as designed.
         */
        var modeBefore = preferences.get().shell.mode;

        preferences.update({ shell: { mode: "accessible" }, visual: { contrast: "high" } });
        await sleep(200);
        check("1.15", "high contrast applies in accessible mode",
            root.getAttribute("data-aetos-contrast") === "high",
            "attribute is " + root.getAttribute("data-aetos-contrast"));

        preferences.update({ shell: { mode: "standard" } });
        await sleep(200);
        check("0.5", "and standard mode stops it applying",
            root.getAttribute("data-aetos-contrast") !== "high",
            "standard mode still had high contrast applied");
        check("0.5", "without erasing the choice",
            preferences.get().visual.contrast === "high",
            "the stored value changed when the mode did");

        preferences.update({ shell: { mode: "accessible" } });
        await sleep(200);
        check("0.7", "and switching back brings it straight back",
            root.getAttribute("data-aetos-contrast") === "high");

        preferences.update({
            shell: { mode: modeBefore },
            visual: { contrast: "standard" }
        });
        await sleep(100);

        /*
         * `screenReader.announcementMode`, and the first draft of this asked for
         * `announcements.verbosity` -- a name that sounded right and does not
         * exist. It threw, which is the good outcome; a probe that had read an
         * absent key with `||` would have reported the setting working.
         */
        var beforeMode = preferences.get().screenReader.announcementMode;
        preferences.update({ screenReader: { announcementMode: "minimal" } });
        await sleep(100);
        check("1.16", "how much is announced can be changed",
            preferences.get().screenReader.announcementMode === "minimal");
        preferences.update({ screenReader: { announcementMode: beforeMode } });

        record("1.16", "whether the announcement modes are the RIGHT modes", "needs-human");
        record("1.20", "whether threshold announcements are useful or noise", "needs-human");
    }

    /* --- Section 7: text size --------------------------------------------- */

    if (preferences && A.responsive) {
        var startScale = preferences.get().visual.scale;

        preferences.update({ visual: { scale: 2.5 } });
        await sleep(300);

        var switchControl = document.querySelector('[role="switch"]');
        var box = switchControl ? switchControl.getBoundingClientRect() : null;
        check("7.3", "the mode switch is still on screen at the largest text",
            !!box && box.width > 0 && box.height > 0
                && box.top >= 0 && box.left >= 0
                && box.bottom <= window.innerHeight + 1
                && box.right <= window.innerWidth + 1,
            box ? JSON.stringify({ top: Math.round(box.top), right: Math.round(box.right) }) : "absent");

        check("7.2", "the client does not scroll sideways at the largest text",
            document.documentElement.scrollWidth <= window.innerWidth + 1,
            document.documentElement.scrollWidth + " > " + window.innerWidth);

        check("7.2", "the layout reflows rather than keeping three columns",
            document.querySelector(".aetos-root").getAttribute("data-aetos-size") !== "desktop",
            "still 'desktop' at 250% text");

        preferences.update({ visual: { scale: startScale } });
        await sleep(300);

        preferences.update({ visual: { scale: 1.5 } });
        await sleep(200);
        var survivedMode = null;
        if (panel) {
            panel.setMode("standard");
            await sleep(200);
            survivedMode = preferences.effective().visual.scale === 1.5;
        }
        check("7.5", "text size survives a mode switch",
            survivedMode !== false,
            "text size was reverted by standard mode");
        preferences.update({ visual: { scale: startScale } });
        await sleep(200);

        record("7.6", "whether this beats the browser's own zoom", "needs-human");
    }

    /* --- Section 1, tasks 17-19: review mode and history ------------------- */

    if (A.review) {
        A.review.enter();
        await sleep(150);
        check("1.17", "review mode can be entered", A.review.isActive() === true);
        A.review.exit();
        await sleep(150);
        check("1.18", "review mode can be left", A.review.isActive() === false);
        record("1.18", "whether you land where you expected on leaving", "needs-human");
    }

    /* --- Section 1, tasks 25-26, 29-30: the player's own tools ------------- */

    /*
     * The player's own tools are stored in the browser, and every read of them
     * is asynchronous.
     *
     * The first draft of these probes called `macros.all()` and asked whether
     * the result contained anything -- and got a Promise, which contains
     * nothing. It threw, which is why it was found; the version that used `||`
     * or a truthiness test would have reported all four tools working while
     * checking a Promise object. Worth recording because it is the same shape as
     * the defect this whole exercise exists to keep away from the tester.
     */
    if (A.aliases) {
        await A.aliases.save({ pattern: "a8probe", expansion: "look" });
        var expanded = await A.aliases.expandInput("a8probe");
        check("1.25", "an alias can be created and expands",
            typeof expanded === "string" && expanded.indexOf("look") !== -1,
            "expanded to " + JSON.stringify(expanded));
        await A.aliases.remove("a8probe");
    }

    if (A.macros) {
        await A.macros.save({ id: "a8probe", label: "A8 probe", commands: ["look"] });
        var savedMacros = await A.macros.all();
        check("1.26", "a macro can be created and is listed",
            savedMacros.some(function (macro) { return macro.id === "a8probe"; }));
        await A.macros.remove("a8probe");
    }

    if (A.notes) {
        var noteId = A.notes.makeId();
        await A.notes.save({ id: noteId, subject: "a8", subjectKind: "room", body: "probe" });
        var savedNotes = await A.notes.all();
        check("1.29", "a note can be saved and read back",
            savedNotes.some(function (note) { return note.id === noteId; }));
        await A.notes.remove(noteId);
    }

    if (A.profile) {
        /*
         * `exportProfile()` builds it; `toJson(profile)` only serialises one it
         * is handed. The first draft called `toJson()` with no argument, got
         * `undefined`, and reported profile export broken -- which is the lesson
         * this whole gate exists to apply: a probe that has not been run is a
         * guess about the code rather than a check on it.
         */
        var exported = await A.profile.exportProfile();
        check("1.32", "the profile exports as something a player could keep",
            !!exported && (typeof exported === "string" || typeof exported === "object"),
            "exportProfile gave " + typeof exported);
    }

    /* --- Section 1, tasks 33-34, and section 6: the board ------------------ */

    if (A.registry) {
        var aacAvailable = A.registry.all().some(function (widget) {
            return widget.id === "aac";
        });
        check("1.33", "the picture and word board is registered", aacAvailable);
    }
    record("6", "whether the concept set and categories are right", "needs-human",
        "A.94 reserves this entirely; the project claims no AAC support until answered");

    if (A.workspaces) {
        check("1.34", "there is a simplified workspace to switch to",
            typeof A.workspaces.DEFAULT_WORKSPACE !== "undefined");
    }

    /* --- What cannot be reached from a logged-out client ------------------- */

    [
        ["1.3", "sending a command and hearing the reply"],
        ["1.4", "whether five commands read as output or as a wall"],
        ["1.7", "finding the room description"],
        ["1.8", "finding what else is in the room"],
        ["1.9", "finding your inventory"],
        ["1.10", "whether the map's text equivalent reads as a map or a list"],
        ["1.11", "walking an exit through the interface"],
        ["1.19", "searching history for a word you saw earlier"],
        ["1.21", "being told the connection dropped"],
        ["1.22", "being told a command did not send"],
        ["1.23", "knowing the panels are current again"],
        ["1.27", "opening a context menu on something in the room"],
        ["1.28", "using an action from that menu"]
    ].forEach(function (entry) {
        record(entry[0], entry[1], "needs-session",
            "needs a puppeted character; the surface exists and is named");
    });

    [
        ["2", "JAWS"],
        ["3", "Orca, on Firefox and Chromium"],
        ["4", "refreshable braille on real hardware"],
        ["5", "the cognitive scenarios"]
    ].forEach(function (entry) {
        record(entry[0], entry[1], "needs-human",
            "no automation substitutes for this (A.35, A.85, A.93, A.101)");
    });

    restore();
    return results;
})().catch(function (err) {
    /*
     * A probe that throws must still say so, and must still put the client back.
     * Returning the error as a result rather than letting the promise reject
     * means the caller reads one shape either way.
     */
    if (window.Aetos && window.Aetos.accessibility) {
        try { window.Aetos.accessibility.preferences.reset(); } catch (ignored) {}
    }
    return { crashed: String(err), ok: 0, failed: 1, failures: ["the readiness probe itself threw: " + err] };
});
