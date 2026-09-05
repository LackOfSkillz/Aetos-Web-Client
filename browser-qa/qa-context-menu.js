/*
 * Aetos browser QA -- contextual actions and accessible context menus.
 *
 * Blueprint section 51 requires context menus to open by the Context Menu key
 * and Shift+F10 as well as by right-click, and to be readable and operable by a
 * screen reader. Right-click is the easy path and the one a keyboard user cannot
 * take, so the keyboard cases are tested first and hardest here.
 */

(async function aetosMenuQa() {
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

    function key(target, k, opts) {
        target.dispatchEvent(new KeyboardEvent("keydown", Object.assign(
            { key: k, bubbles: true, cancelable: true }, opts || {})));
    }

    var A = window.Aetos;
    if (!A || !window.AetosMenu) {
        return { passed: 0, failed: 1, failures: ["Aetos or AetosMenu missing"] };
    }

    // Ensure there is an entity with actions to act on.
    if (!(A.store.get("room") || {}).name) {
        A.sendCommand("connect guest");
        for (var w = 0; w < 40 && !(A.store.get("room") || {}).name; w++) {
            await new Promise(function (r) { setTimeout(r, 100); });
        }
    }
    // Let the store flush and the widgets re-render. Store notifications are
    // batched, so state arriving is not the same moment as the DOM reflecting
    // it -- querying immediately races the render.
    await new Promise(function (r) { setTimeout(r, 500); });

    var entities = (A.store.get("entities").items) || [];
    if (!entities.some(function (e) { return (e.actions || []).length; })) {
        // Town Square holds the demo object.
        A.sendCommand("down");
        await new Promise(function (r) { setTimeout(r, 1200); });
    }

    /* --- Actions arrive with their entity ------------------------------ */

    entities = (A.store.get("entities").items) || [];
    check("actions: entities carry their own actions",
        entities.some(function (e) { return (e.actions || []).length > 0; }),
        JSON.stringify(entities.map(function (e) { return e.name; })));

    check("actions: every action has a label and a command",
        entities.every(function (e) {
            return (e.actions || []).every(function (a) {
                return typeof a.label === "string" && a.label &&
                       typeof a.command === "string" && a.command;
            });
        }));

    var exits = (A.store.get("room").exits) || [];
    check("actions: exits get actions too",
        exits.length === 0 || exits.some(function (e) { return (e.actions || []).length > 0; }));

    /* --- Trigger semantics --------------------------------------------- */

    var triggers = [...document.querySelectorAll('[aria-haspopup="menu"]')];
    check("menu: triggers declare aria-haspopup", triggers.length > 0, String(triggers.length));
    if (!triggers.length) {
        return results;
    }
    var trigger = triggers[0];
    check("menu: trigger starts collapsed", trigger.getAttribute("aria-expanded") === "false");

    /* --- Shift+F10 ------------------------------------------------------ */

    trigger.focus();
    key(trigger, "F10", { shiftKey: true });
    var menu = document.querySelector('[role="menu"]');
    check("keyboard: Shift+F10 opens the menu", !!menu);
    if (!menu) {
        return results;
    }
    check("menu: trigger reports expanded", trigger.getAttribute("aria-expanded") === "true");
    check("menu: has an accessible name", !!menu.getAttribute("aria-label"),
        menu.getAttribute("aria-label"));
    check("menu: focus moves into the menu on open",
        document.activeElement.getAttribute("role") === "menuitem",
        document.activeElement.tagName);

    var items = [...menu.querySelectorAll('[role="menuitem"]')];
    check("menu: items use the menuitem role", items.length >= 1, String(items.length));

    /* --- Arrow navigation ----------------------------------------------- */

    var first = document.activeElement;
    key(menu, "ArrowDown");
    check("keyboard: ArrowDown moves to the next item",
        items.length < 2 || document.activeElement !== first);
    key(menu, "ArrowUp");
    check("keyboard: ArrowUp moves back", document.activeElement === first);
    key(menu, "End");
    check("keyboard: End jumps to the last item",
        document.activeElement === items[items.length - 1]);
    key(menu, "Home");
    check("keyboard: Home jumps to the first item", document.activeElement === items[0]);

    check("menu: exactly one item is tabbable (roving tabindex)",
        items.filter(function (i) { return i.getAttribute("tabindex") === "0"; }).length === 1);

    /* --- Closing --------------------------------------------------------- */

    key(menu, "Escape");
    check("keyboard: Escape closes the menu", !document.querySelector('[role="menu"]'));
    check("keyboard: focus returns to the trigger on close",
        document.activeElement === trigger,
        document.activeElement && document.activeElement.className);
    check("menu: trigger reports collapsed again",
        trigger.getAttribute("aria-expanded") === "false");

    /* --- Context Menu key ------------------------------------------------ */

    trigger.focus();
    key(trigger, "ContextMenu");
    check("keyboard: the Context Menu key opens the menu",
        !!document.querySelector('[role="menu"]'));
    window.AetosMenu.close(true);

    /* --- Tab leaves rather than cycling ---------------------------------- */

    trigger.focus();
    key(trigger, "F10", { shiftKey: true });
    key(document.querySelector('[role="menu"]'), "Tab");
    check("keyboard: Tab closes the menu rather than cycling inside it",
        !document.querySelector('[role="menu"]'));

    /* --- Activating an action sends its command --------------------------- */

    var sent = [];
    var originalSend = A.dispatcher.send;
    A.dispatcher.send = function (text) { sent.push(text); return originalSend.apply(this, arguments); };

    trigger.focus();
    key(trigger, "F10", { shiftKey: true });
    var actionItem = document.querySelector('[role="menuitem"]');
    var expected = actionItem.textContent.trim();
    actionItem.click();
    await new Promise(function (r) { setTimeout(r, 300); });

    A.dispatcher.send = originalSend;

    check("action: activating a menu item sends a command", sent.length > 0,
        JSON.stringify(sent));
    check("action: the command is ordinary text, not a privileged call",
        sent.every(function (t) { return typeof t === "string"; }), expected);
    check("menu: closes after an action is chosen",
        !document.querySelector('[role="menu"]'));

    /* --- Only one menu at a time ------------------------------------------ */

    if (triggers.length > 1) {
        triggers[0].focus();
        key(triggers[0], "F10", { shiftKey: true });
        triggers[1].focus();
        key(triggers[1], "F10", { shiftKey: true });
        check("menu: opening a second menu closes the first",
            document.querySelectorAll('[role="menu"]').length === 1,
            String(document.querySelectorAll('[role="menu"]').length));
        window.AetosMenu.close(false);
    }

    return results;
})();
