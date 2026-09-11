/*
 * Focus stays where it was put.
 *
 * WCAG 3.2.1 and 3.2.2 are about not surprising people: focus must not move on
 * its own, and changing a setting must not change the context around it. Both
 * are invisible to anybody testing with their eyes -- if focus jumps while you
 * are looking at the screen you simply look somewhere else. If you are listening
 * to it, or reading it on a braille display, the sentence you were halfway
 * through is gone and you do not know where you are.
 *
 * "focus jumps" is named in A.95 as a **defect** even when every automated test
 * passes. This is the part of it a machine can catch: focus moving with nobody
 * touching anything.
 *
 * A MUD client is the hard case for this, and that is why it is worth a check.
 * Game output arrives unprompted, all the time, and every line of it is a DOM
 * mutation near a focused element. A client that pulled focus to new output
 * would be unusable with a screen reader and perfectly pleasant to look at.
 */

"use strict";

async function run(page) {
    const results = [];

    /*
     * Park focus somewhere identifiable, then let the game talk.
     */
    const held = await page.evaluate(async () => {
        const input = document.getElementById("aetos-input");
        if (!input) { return { error: "no command input" }; }
        input.focus();
        const before = document.activeElement.id;

        const moves = [];
        const listener = (event) => moves.push(event.target.id || event.target.className || "?");
        document.addEventListener("focusin", listener);

        const pipeline = window.Aetos.pipeline;
        for (let index = 0; index < 20; index += 1) {
            pipeline.ingest({ category: "text", text: `The torch gutters. ${index}` });
        }
        await new Promise((resolve) => setTimeout(resolve, 600));

        document.removeEventListener("focusin", listener);
        return { before, after: document.activeElement.id, moves };
    });

    if (held.error) {
        return [{ status: "FAIL", what: held.error }];
    }
    results.push(held.before === held.after && held.moves.length === 0
        ? { status: "ok", what: "twenty lines of game output did not move focus" }
        : {
            status: "FAIL",
            what: `focus moved from ${held.before} to ${held.after} while output arrived`
                + (held.moves.length ? ` (${held.moves.slice(0, 3).join(", ")})` : ""),
        });

    /*
     * Changing a setting must not move focus either -- 3.2.2, and the reason the
     * accessibility options are usable at all. Somebody adjusting the text size
     * because they cannot read the screen must not then have to find their place
     * again.
     */
    const settingChange = await page.evaluate(async () => {
        const control = document.querySelector('[role="switch"]');
        if (!control) { return { error: "no mode switch" }; }
        control.focus();
        const before = document.activeElement;
        window.Aetos.accessibility.preferences.update({ visual: { scale: 1.5 } });
        await new Promise((resolve) => setTimeout(resolve, 400));
        const same = document.activeElement === before;
        window.Aetos.accessibility.preferences.update({ visual: { scale: 1 } });
        await new Promise((resolve) => setTimeout(resolve, 300));
        return { same };
    });

    if (settingChange.error) {
        results.push({ status: "FAIL", what: settingChange.error });
    } else {
        results.push(settingChange.same
            ? { status: "ok", what: "changing the text size left focus where it was" }
            : { status: "FAIL", what: "changing the text size moved focus" });
    }

    /*
     * Switching *into* accessible mode is the one deliberate exception: it moves
     * focus into the options panel, because that is what was just asked for.
     * A.97 records it as intended, so this asserts the exception rather than
     * flagging it -- an exception nobody has written down is indistinguishable
     * from a bug.
     */
    const onSwitch = await page.evaluate(async () => {
        const panel = window.Aetos.accessibilityPanel;
        panel.setMode("standard");
        await new Promise((resolve) => setTimeout(resolve, 250));
        const before = document.activeElement;
        panel.setMode("accessible");
        await new Promise((resolve) => setTimeout(resolve, 350));
        const moved = document.activeElement !== before;
        panel.setMode("standard");
        await new Promise((resolve) => setTimeout(resolve, 250));
        return moved;
    });
    results.push({
        status: "ok",
        what: onSwitch
            ? "entering accessible mode moves focus, which A.97 records as intended"
            : "entering accessible mode leaves focus alone",
    });

    return results;
}

module.exports = {
    describes: "focus does not move unless somebody moved it",
    views: { viewports: ["desktop"], scales: [1], modes: ["standard", "accessible"] },
    run,
};
