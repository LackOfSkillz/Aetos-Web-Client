/*
 * Aetos browser QA -- command palette, editors and the privacy panel.
 *
 * Blueprint sections 36 and 63.
 *
 * Two properties matter most:
 *
 *   - the palette acts on the CLIENT and never sends game commands, because a
 *     second command line that looked similar but behaved differently would be
 *     a trap
 *   - an editor is never offered for automation the game forbids (section 32)
 */

(async function aetosPaletteQa() {
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

    function key(target, k, opts) {
        target.dispatchEvent(new KeyboardEvent("keydown", Object.assign(
            { key: k, bubbles: true, cancelable: true }, opts || {})));
    }

    var A = window.Aetos;
    var P = window.AetosPalette;
    if (!A || !A.palette || !P) {
        return { passed: 0, failed: 1, failures: ["Aetos.palette missing"] };
    }
    var palette = A.palette;

    /* --- Matching -------------------------------------------------------- */

    check("match: an exact substring scores", P.score("layout", "Edit layout") > 0);
    check("match: a subsequence matches too", P.score("elay", "Edit layout") > 0,
        "a player half-remembers a name and types fragments");
    check("match: a contiguous match outranks a scattered one",
        P.score("layout", "Edit layout") > P.score("elay", "Edit layout"));
    check("match: an impossible query scores zero", P.score("zzzz", "Edit layout") === 0);
    check("match: an empty query matches everything", P.score("", "anything") > 0);

    /* --- Registration ---------------------------------------------------- */

    check("palette: commands are registered", palette.commands().length > 5,
        String(palette.commands().length));

    var invalid = false;
    try { palette.register({ id: "bad" }); } catch (err) { invalid = true; }
    check("palette: a command without a run function is rejected", invalid);

    var before = palette.commands().length;
    palette.register({ id: "qa.dup", label: "One", run: function () {} });
    palette.register({ id: "qa.dup", label: "Two", run: function () {} });
    check("palette: re-registering an id replaces rather than duplicates",
        palette.commands().filter(function (c) { return c.id === "qa.dup"; }).length === 1);
    check("palette: the replacement wins",
        palette.commands().filter(function (c) { return c.id === "qa.dup"; })[0].label === "Two");

    /* --- Policy gating: the important one -------------------------------- */

    var automation = (A.store.get("manifest").automation) || {};
    var offered = palette.available().map(function (c) { return c.id; });

    if (automation.scripting === false) {
        check("policy: no scripting editor is offered when the game forbids it",
            offered.indexOf("script.new") === -1,
            "section 32: not a disabled button, absent");
    }
    if (automation.timers === false) {
        check("policy: no timer editor is offered when the game forbids it",
            offered.indexOf("timer.new") === -1);
    }
    if (automation.macros !== false) {
        check("policy: the macro editor IS offered when macros are allowed",
            offered.indexOf("macro.new") !== -1);
    }

    palette.register({
        id: "qa.gated", label: "Gated", run: function () {},
        when: function () { return false; }
    });
    check("palette: a command can hide itself",
        palette.available().map(function (c) { return c.id; }).indexOf("qa.gated") === -1);
    check("palette: a hidden command is still registered",
        palette.commands().map(function (c) { return c.id; }).indexOf("qa.gated") !== -1,
        "hidden by circumstance, not unregistered");

    var thrower = { id: "qa.throws", label: "Throws", run: function () {},
                    when: function () { throw new Error("boom"); } };
    palette.register(thrower);
    check("palette: a command whose condition throws is hidden, not fatal",
        palette.available().map(function (c) { return c.id; }).indexOf("qa.throws") === -1);

    /* --- Opening and the combobox pattern --------------------------------- */

    var opener = document.getElementById("aetos-input");
    opener.focus();
    key(document, "k", { ctrlKey: true });
    await sleep(150);

    var box = document.querySelector(".aetos-palette-box");
    var field = document.querySelector(".aetos-palette__input");
    check("keyboard: Ctrl+K opens the palette from the game input", !!box,
        "which is where a player's hands actually are");
    check("palette: the field is a combobox", field && field.getAttribute("role") === "combobox");
    check("palette: the results are a listbox",
        !!document.querySelector('[role="listbox"]'));
    check("palette: options use the option role",
        document.querySelectorAll('[role="option"]').length > 0);

    check("palette: focus stays in the field", document.activeElement === field,
        "so the player never loses their typing position");
    check("palette: selection is exposed via activedescendant",
        !!field.getAttribute("aria-activedescendant"),
        field.getAttribute("aria-activedescendant"));
    check("palette: expanded state is declared",
        field.getAttribute("aria-expanded") === "true");

    /* --- Navigation -------------------------------------------------------- */

    var firstId = field.getAttribute("aria-activedescendant");
    key(field, "ArrowDown");
    check("keyboard: ArrowDown moves the selection",
        field.getAttribute("aria-activedescendant") !== firstId);
    check("keyboard: focus still has not moved", document.activeElement === field);
    key(field, "ArrowUp");
    check("keyboard: ArrowUp moves back",
        field.getAttribute("aria-activedescendant") === firstId);
    key(field, "End");
    var endId = field.getAttribute("aria-activedescendant");
    key(field, "Home");
    check("keyboard: Home and End jump to the ends",
        endId !== firstId && field.getAttribute("aria-activedescendant") === firstId);

    var selectedCount = document.querySelectorAll('[role="option"][aria-selected="true"]').length;
    check("palette: exactly one option is selected", selectedCount === 1,
        String(selectedCount));

    /* --- Filtering ---------------------------------------------------------- */

    field.value = "layout";
    field.dispatchEvent(new Event("input", { bubbles: true }));
    await sleep(100);
    var options = [...document.querySelectorAll("[role='option']")];
    var labels = options.map(function (o) {
        return o.querySelector(".aetos-palette__label").textContent;
    });
    check("palette: filtering narrows the list",
        labels.length > 0 && labels.length < palette.available().length,
        labels.length + " of " + palette.available().length);

    // Every result must match SOMEWHERE -- label, group or description. A
    // description match is legitimate and deliberately weighted lower: "Export
    // profile" mentions layouts, so it belongs in the results, last.
    check("palette: every result matches the query somewhere",
        options.every(function (option) {
            return option.textContent.toLowerCase().indexOf("layout") !== -1 ||
                   option.textContent.toLowerCase().indexOf("workspace") !== -1;
        }),
        JSON.stringify(labels));

    check("palette: label matches rank above description matches",
        labels[0].toLowerCase().indexOf("layout") !== -1, labels[0]);

    field.value = "zzzzznope";
    field.dispatchEvent(new Event("input", { bubbles: true }));
    await sleep(100);
    check("palette: a query matching nothing shows nothing",
        document.querySelectorAll('[role="option"]').length === 0);
    check("palette: expanded is false with no results",
        field.getAttribute("aria-expanded") === "false");

    /* --- Closing ------------------------------------------------------------ */

    key(field, "Escape");
    await sleep(100);
    check("keyboard: Escape closes the palette",
        !document.querySelector(".aetos-palette-box"));
    check("keyboard: focus returns to the opener", document.activeElement === opener,
        document.activeElement && document.activeElement.id);

    /* --- The palette never sends game commands -------------------------------- */

    var sent = [];
    var originalSend = A.dispatcher.send;
    A.dispatcher.send = function (text) { sent.push(text); return originalSend.apply(this, arguments); };

    palette.open();
    await sleep(100);
    var focusField = document.querySelector(".aetos-palette__input");
    focusField.value = "focus";
    focusField.dispatchEvent(new Event("input", { bubbles: true }));
    await sleep(100);
    key(focusField, "Enter");
    await sleep(200);

    A.dispatcher.send = originalSend;
    check("boundary: running a palette command sends nothing to the game",
        sent.length === 0, JSON.stringify(sent));
    check("boundary: the command still did its work",
        document.activeElement === document.getElementById("aetos-input"),
        "Focus the command input should have run");

    /* --- Shortcuts are discoverable -------------------------------------------- */

    var withShortcut = palette.commands().filter(function (c) { return c.shortcut; });
    check("discoverability: shortcuts are listed in the palette",
        withShortcut.length > 0,
        "a shortcut nobody can find is not a feature");

    /* --- Privacy panel ---------------------------------------------------------- */

    if (A.settings) {
        await A.storage.clear("notes");
        await A.notes.save({ subject: "QA", kind: "free", body: "counted" });

        A.settings.openPrivacy();
        await sleep(400);

        var panel = document.querySelector(".aetos-privacy__list");
        check("privacy: the panel lists stored data", !!panel);
        if (panel) {
            var rows = [...panel.querySelectorAll(".aetos-privacy__row")];
            check("privacy: every namespace is listed",
                rows.length === A.storage.namespaces.length,
                rows.length + " of " + A.storage.namespaces.length);

            var counted = rows.some(function (row) {
                return row.textContent.indexOf("Notes") !== -1 &&
                       row.textContent.indexOf("1") !== -1;
            });
            check("privacy: counts are read from storage, not assumed", counted,
                "a panel that under-reports is worse than none");
        }
        window.AetosDialog.close(null);
        await A.storage.clear("notes");
    }

    return results;
})();
