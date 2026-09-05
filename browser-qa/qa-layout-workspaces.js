/*
 * Aetos browser QA -- widget registry, layout manager, Edit Layout, workspaces.
 *
 * Run in the page context; returns { passed, failed, failures }.
 *
 * The keyboard tests matter most. Blueprint revision 2 requires every drag
 * operation to have a keyboard equivalent and no widget to be finished until it
 * is usable without a mouse, so the keyboard path is tested as the primary
 * interface rather than as an accessibility afterthought.
 */

(async function aetosLayoutQa() {
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

    function key(k, opts) {
        var event = new KeyboardEvent("keydown", Object.assign(
            { key: k, bubbles: true, cancelable: true }, opts || {}));
        document.dispatchEvent(event);
        return event;
    }

    function panelOf(id) {
        return document.querySelector('[data-aetos-widget="' + id + '"]');
    }

    function regionOf(id) {
        var panel = panelOf(id);
        if (!panel || !panel.parentNode) { return null; }
        return panel.parentNode.getAttribute("data-aetos-region");
    }

    var A = window.Aetos;
    if (!A || !A.registry || !A.layout || !A.workspaces) {
        return { passed: 0, failed: 1,
                 failures: ["Aetos.registry / layout / workspaces missing"] };
    }

    var registry = A.registry;
    var layout = A.layout;
    var ws = A.workspaces;

    /*
     * Log in first. Widgets legitimately hide themselves when they have no data
     * (a room widget with no room is not an empty box), so assertions about
     * visibility are only meaningful once the client has real state.
     */
    if (!(A.store.get("room") || {}).name) {
        // sendCommand, not dispatcher.send: the former also refreshes state,
        // which is what actually populates the widgets.
        A.sendCommand("connect guest");
        for (var wait = 0; wait < 40 && !(A.store.get("room") || {}).name; wait++) {
            await new Promise(function (r) { setTimeout(r, 100); });
        }
    }
    check("setup: client has room state before layout tests",
        !!(A.store.get("room") || {}).name, JSON.stringify(A.store.get("room")));

    // A previous run can have saved a layout with a widget hidden, and hiding
    // is deliberately persistent. Start from a known state so later assertions
    // are about this run rather than the last one.
    ws.resetLayout();

    /* --- Registry ----------------------------------------------------- */

    check("registry: built-in widgets are registered",
        registry.all().length >= 4, String(registry.all().length));

    check("registry: a widget with no required capabilities is always available",
        registry.isSupported(registry.get("room"), {}) === true);

    check("registry: a widget needing an unexposed capability is unavailable",
        registry.isSupported(
            { requiredCapabilities: ["resources"] }, { features: { resources: false } }) === false);

    check("registry: capability satisfied when the game exposes it",
        registry.isSupported(
            { requiredCapabilities: ["resources"] }, { features: { resources: true } }) === true);

    var replaceThrew = false;
    try {
        registry.register({ id: "room", displayName: "Hijacked", mount: function () {} });
    } catch (err) { replaceThrew = true; }
    check("registry: a built-in cannot be replaced by a third-party widget", replaceThrew);

    var invalidThrew = false;
    try { registry.register({ id: "", displayName: "", mount: null }); }
    catch (err) { invalidThrew = true; }
    check("registry: an invalid definition is rejected", invalidThrew);

    /* --- Layout: widgets are mounted ---------------------------------- */

    check("layout: built-in widgets are mounted",
        layout.instances().length >= 4, String(layout.instances().length));
    check("layout: each mounted widget has a DOM panel", !!panelOf("room"));
    check("layout: panels carry an accessible name",
        !!panelOf("room").getAttribute("aria-labelledby"));

    /* --- Keyboard MUST NOT interfere with normal play ------------------ */

    ws.setEditing(false);
    var startRegion = regionOf("room");
    var startHidden = panelOf("room").hidden;
    key("ArrowLeft");
    key("ArrowDown");
    key("h");
    check("keyboard: layout keys are inert outside edit mode",
        regionOf("room") === startRegion && panelOf("room").hidden === startHidden,
        regionOf("room") + " / hidden=" + panelOf("room").hidden);

    var input = document.getElementById("aetos-input");
    ws.setEditing(true);
    var beforeTyping = regionOf("room");
    var hiddenBeforeTyping = panelOf("room").hidden;
    // A player typing "h" or an arrow key in the command box must never move a
    // panel, even while edit mode is on.
    input.dispatchEvent(new KeyboardEvent("keydown",
        { key: "h", bubbles: true, cancelable: true }));
    input.dispatchEvent(new KeyboardEvent("keydown",
        { key: "ArrowRight", bubbles: true, cancelable: true }));
    check("keyboard: typing in the command input never edits the layout",
        regionOf("room") === beforeTyping && panelOf("room").hidden === hiddenBeforeTyping,
        regionOf("room") + " / hidden=" + panelOf("room").hidden);

    /* --- Keyboard layout editing --------------------------------------- */

    ws.setEditing(true);
    check("edit mode: reports as editing", ws.isEditing() === true);
    check("edit mode: marks the root element",
        document.getElementById("aetos-root").classList.contains("aetos-editing"));

    ws.select("room");
    check("select: reports the selected widget", ws.selectedWidget() === "room");
    check("select: exposes selection to assistive tech, not just styling",
        panelOf("room").getAttribute("aria-current") === "true");

    var first = ws.selectedWidget();
    key("]");
    check("keyboard: ] selects the next widget", ws.selectedWidget() !== first);
    key("[");
    check("keyboard: [ selects the previous widget", ws.selectedWidget() === first);

    ws.select("room");
    var beforeRegion = regionOf("room");
    key("ArrowRight");
    check("keyboard: arrow right moves the widget to another region",
        regionOf("room") !== beforeRegion, regionOf("room"));
    key("ArrowLeft");
    check("keyboard: arrow left moves it back",
        regionOf("room") === beforeRegion, regionOf("room"));

    // Pick the LAST panel in its region, so "move up" is genuinely possible.
    // Choosing an arbitrary widget can select one already at the top, where
    // refusing to move is correct behaviour rather than a failure.
    var sidebarRegion = document.querySelector('[data-aetos-region="sidebar"]');
    var sidebarIds = [...sidebarRegion.children]
        .map(function (el) { return el.getAttribute("data-aetos-widget"); })
        .filter(Boolean);
    var lastId = sidebarIds[sidebarIds.length - 1];
    var order = function () {
        return [...sidebarRegion.children]
            .map(function (el) { return el.getAttribute("data-aetos-widget"); }).join(",");
    };
    ws.select(lastId);
    var beforeOrder = order();
    key("ArrowUp");
    check("keyboard: arrow up reorders within the region",
        order() !== beforeOrder, beforeOrder + " -> " + order());

    check("keyboard: moving beyond the edge is refused, not wrapped",
        (function () {
            ws.select(sidebarIds[0]);
            var before = order();
            key("ArrowUp");
            return order() === before;
        })());

    ws.select("people");
    var beforeHeight = panelOf("people").style.height;
    key("+");
    check("keyboard: plus resizes the widget",
        panelOf("people").style.height !== beforeHeight, panelOf("people").style.height);
    key("-");

    // Use a widget that is currently visible, so hiding it is an observable
    // change rather than a no-op on something already hidden.
    var visibleId = layout.instances()
        .map(function (i) { return i.id; })
        .filter(function (id) { return !panelOf(id).hidden; })[0];
    ws.select(visibleId);
    key("h");
    check("keyboard: h hides the selected widget",
        panelOf(visibleId).hidden === true, visibleId);

    /* --- The `hidden` attribute must actually hide --------------------- */

    check("css: hidden panels are not displayed",
        window.getComputedStyle(panelOf(visibleId)).display === "none",
        window.getComputedStyle(panelOf(visibleId)).display);

    key("Escape");
    check("keyboard: escape leaves edit mode", ws.isEditing() === false);

    /* --- Reset ---------------------------------------------------------- */

    ws.resetLayout();
    check("reset: restores the supported widgets",
        layout.instances().length >= 4, String(layout.instances().length));

    /* --- Workspaces ------------------------------------------------------ */

    await ws.saveWorkspace("QA Test");
    var list = await ws.listWorkspaces();
    check("workspace: saved and listed",
        list.some(function (w) { return w.name === "QA Test"; }),
        JSON.stringify(list.map(function (w) { return w.name; })));

    ws.setEditing(true);
    ws.select("room");
    ws.move("aside");
    var movedRegion = regionOf("room");
    await ws.saveWorkspace("QA Moved");
    ws.setEditing(false);

    await ws.switchTo("QA Test");
    check("workspace: switching restores the earlier layout",
        regionOf("room") !== movedRegion || movedRegion === null,
        "now " + regionOf("room") + ", was " + movedRegion);
    check("workspace: switching reports the active workspace",
        ws.currentWorkspace() === "QA Test", ws.currentWorkspace());

    var missing = await ws.switchTo("Does Not Exist");
    check("workspace: switching to an unknown workspace fails safely",
        missing === false && layout.instances().length >= 4);

    /* --- Restore re-checks rather than trusts ---------------------------- */

    var report = layout.restore({
        version: 1,
        widgets: [
            { id: "room", region: "sidebar" },
            { id: "no_such_widget", region: "sidebar" }
        ]
    });
    check("restore: skips widget ids that no longer exist",
        report.skipped >= 1, JSON.stringify(report));

    /* --- Widget palette --------------------------------------------------
     *
     * Hiding must be reversible. Without the palette the only way back would be
     * a full reset, discarding everything else the player arranged.
     * ------------------------------------------------------------------ */

    ws.setEditing(true);
    var paletteEl = document.getElementById("aetos-palette");
    check("palette: is shown in edit mode", paletteEl && paletteEl.hidden === false);

    var paletteButtons = function () {
        return [...document.querySelectorAll("#aetos-palette-list button")];
    };
    check("palette: lists the supported widgets",
        paletteButtons().length >= 4, String(paletteButtons().length));
    check("palette: marks shown widgets with a pressed state",
        paletteButtons().some(function (b) { return b.getAttribute("aria-pressed") === "true"; }));

    var target = paletteButtons()[0];
    var targetLabel = target.textContent.trim();
    target.click();
    var afterHide = paletteButtons().find(function (b) {
        return b.textContent.trim() === targetLabel; });
    check("palette: toggling a shown widget hides it",
        afterHide.getAttribute("aria-pressed") === "false", targetLabel);

    afterHide.click();
    var afterShow = paletteButtons().find(function (b) {
        return b.textContent.trim() === targetLabel; });
    check("palette: a hidden widget can be restored from the palette",
        afterShow.getAttribute("aria-pressed") === "true", targetLabel);

    ws.setEditing(false);
    check("palette: is hidden outside edit mode",
        document.getElementById("aetos-palette").hidden === true);

    /* --- Cleanup --------------------------------------------------------- */

    await A.storage.remove("workspaces", "QA Test");
    await A.storage.remove("workspaces", "QA Moved");
    ws.setEditing(false);
    ws.resetLayout();

    return results;
})();
