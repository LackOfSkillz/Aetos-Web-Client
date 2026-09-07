/*
 * The accessibility tree the screen reader actually consumes.
 *
 * WHY THIS AND NOT MORE OF THE SAME. Every name check in this project so far --
 * including the one in `qa-a8-readiness.js` -- computes accessible names with a
 * hand-rolled function: check `aria-labelledby`, then `aria-label`, then a
 * `<label for>`, then `title`, then text. That approximation is right for the
 * easy cases and the easy cases are not where naming goes wrong. It does not
 * know about `aria-labelledby` pointing at a hidden element, or a `<label>` that
 * wraps rather than references, or an `aria-label` on an element whose role
 * forbids one, or text hidden from the tree by an ancestor's `aria-hidden`.
 *
 * Chrome computes the real thing, and the Chrome DevTools Protocol will hand it
 * over. `Accessibility.getFullAXTree` returns exactly what an assistive
 * technology is given: computed names, computed roles, and the states that go
 * with them. Asserting on that removes a whole layer of "our idea of the name"
 * from between the test and the truth.
 *
 * WHAT IT CANNOT DO. It is Chrome's computation, not NVDA's or JAWS's, and those
 * differ -- which is exactly why the protocol asks a tester to note where JAWS
 * and NVDA disagree, and says those are usually our bugs rather than the screen
 * reader's.
 */

"use strict";

//: Roles whose whole purpose is to be operated, and which are therefore useless
//: without a name. A button called nothing is a button nobody can choose.
const MUST_BE_NAMED = new Set([
    "button", "link", "checkbox", "radio", "switch", "textbox", "combobox",
    "searchbox", "slider", "spinbutton", "menuitem", "menuitemcheckbox",
    "menuitemradio", "tab", "option", "treeitem",
]);

//: Roles that are landmarks. Naming is required only where there are two of the
//: same role -- the rule is telling them apart, not labelling for its own sake.
const LANDMARKS = new Set([
    "banner", "complementary", "contentinfo", "form", "main", "navigation",
    "region", "search",
]);

/**
 * Read the computed accessibility tree.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<object[]>} Nodes with role, name and ignored state.
 */
async function fullTree(page) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Accessibility.enable");
    const { nodes } = await cdp.send("Accessibility.getFullAXTree");
    await cdp.detach();

    return nodes.map((node) => ({
        role: node.role && node.role.value,
        name: (node.name && node.name.value ? String(node.name.value) : "").trim(),
        ignored: !!node.ignored,
        description: node.description && node.description.value,
        properties: (node.properties || []).reduce((all, property) => {
            all[property.name] = property.value && property.value.value;
            return all;
        }, {}),
    }));
}

async function run(page) {
    const nodes = await fullTree(page);
    const live = nodes.filter((node) => !node.ignored);
    const results = [];

    if (!live.length) {
        return [{ status: "FAIL", what: "the accessibility tree came back empty" }];
    }
    results.push({ status: "ok", what: `${live.length} nodes in the tree` });

    /*
     * Chrome's own computation, so a failure here is a name a screen reader
     * genuinely does not get -- not a name our approximation failed to find.
     */
    const unnamed = live.filter(
        (node) => MUST_BE_NAMED.has(node.role) && !node.name
            && node.properties.hidden !== true
            && node.properties.disabled !== true
    );
    results.push(unnamed.length
        ? {
            status: "FAIL",
            what: `${unnamed.length} operable node(s) have no computed name: `
                + unnamed.slice(0, 5).map((n) => n.role).join(", "),
        }
        : { status: "ok", what: "every operable node has a computed name" });

    const byLandmark = {};
    for (const node of live) {
        if (!LANDMARKS.has(node.role)) { continue; }
        byLandmark[node.role] = byLandmark[node.role] || [];
        byLandmark[node.role].push(node);
    }
    const ambiguous = [];
    for (const [role, group] of Object.entries(byLandmark)) {
        if (group.length < 2) { continue; }
        for (const node of group.filter((n) => !n.name)) { ambiguous.push(role); }
    }
    results.push(ambiguous.length
        ? { status: "FAIL", what: `duplicate landmarks left unnamed: ${ambiguous.join(", ")}` }
        : { status: "ok", what: "no two landmarks of a role are left unnamed" });

    /*
     * A switch must report its state, and the mode switch is the control this
     * whole two-mode design rests on. Checked here rather than only in the
     * readiness gate because `aria-checked` being *present* in the DOM and
     * being *computed* into the tree are different claims.
     */
    const switches = live.filter((node) => node.role === "switch");
    if (!switches.length) {
        results.push({ status: "FAIL", what: "no switch in the tree -- the mode control is missing" });
    } else {
        const stateless = switches.filter((node) => node.properties.checked === undefined);
        results.push(stateless.length
            ? { status: "FAIL", what: "a switch reports no checked state to the tree" }
            : { status: "ok", what: `the mode switch reports its state (${switches[0].properties.checked})` });
    }

    /*
     * Exactly one h1. Chrome's tree gives the computed heading level, which is
     * the number a screen reader reads out when moving by heading -- and that is
     * not always the tag, once `aria-level` is in play.
     */
    const h1s = live.filter((node) => node.role === "heading" && node.properties.level === 1);
    results.push(h1s.length === 1
        ? { status: "ok", what: "exactly one level-1 heading" }
        : { status: "FAIL", what: `${h1s.length} level-1 headings` });

    return results;
}

module.exports = {
    describes: "the accessibility tree Chrome computes, rather than our idea of it",
    views: { viewports: ["desktop", "phone"], scales: [1, 2.5], modes: ["standard", "accessible"] },
    run,
};
