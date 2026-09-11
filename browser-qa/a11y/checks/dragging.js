/*
 * Can the slider actually be dragged?  A13.
 *
 * Gary, on the text-size control:
 *
 *     *"the text size slider is janky I try to slide it smoothly back and forth
 *     but the slider redraws every time text sizes do so for every increment I
 *     have to reclick the slider and move in one click, wait one click wait."*
 *
 * The cause was structural rather than cosmetic. Every `input` event wrote a
 * preference, every write notified subscribers, and the panel's subscriber
 * calls `render()`, which begins `host.textContent = ""`. Dragging the slider
 * destroyed the element being dragged on the first pixel of movement, so the
 * browser had nothing left to send pointer events to.
 *
 * WHY THIS IS ITS OWN CHECK. Nothing else in this suite could see it. axe found
 * a correctly-named, correctly-roled, correctly-valued `<input type="range">`
 * and was right about all of it. The keyboard walk reached it and operated it,
 * because arrow keys do not depend on the element surviving a pointer gesture.
 * The accessibility tree had it exactly as it should be. Every automated gate
 * passed a control that could not be used with a mouse.
 *
 * That is the same shape as A0's scrolling region -- a thing every check called
 * correct and no person could operate -- and the lesson is the same: state and
 * structure are not use.
 *
 * Measured counterfactually before it was written. With the fix reverted this
 * check reports 2 distinct values across a twelve-step drag, the value moving
 * *backwards* from 1.0 to 0.9, and focus lost to the document. With it, twelve
 * values, 1.0 to 1.6, focus retained.
 */

"use strict";

//: A drag of this many moves should produce roughly this many distinct values.
//: Well under twelve, because a slider legitimately quantises -- what is being
//: caught is a control that stops responding after one or two.
const MIN_DISTINCT_VALUES = 6;

async function run(page) {
    const results = [];

    const restore = await page.evaluate(() => {
        const prefs = window.Aetos.accessibility.preferences;
        const panel = window.Aetos.accessibilityPanel;
        const previous = {
            preset: prefs.value("shell.preset"),
            mode: prefs.value("shell.mode"),
            scale: prefs.value("visual.scale"),
            open: panel.isOpen(),
        };
        prefs.update({
            shell: { mode: "accessible", preset: "custom" },
            visual: { scale: 1 },
        });
        if (!panel.isOpen()) { panel.toggleOptions(); }
        panel.openDetail("visual.scale");
        return previous;
    });

    const slider = await page.$("#aetos-a11y-detail-range");
    if (!slider) {
        results.push({ status: "skip", what: "no text-size slider in this view" });
        return results;
    }

    const box = await slider.boundingBox();

    await page.evaluate(() => {
        window.__aetosDragSeen = [];
        window.Aetos.accessibility.preferences.subscribe(function (prefs) {
            window.__aetosDragSeen.push(prefs.visual.scale);
        });
    });

    // One continuous gesture: press once, move repeatedly, release once.
    await page.mouse.move(box.x + box.width * 0.1, box.y + box.height / 2);
    await page.mouse.down();
    for (let step = 1; step <= 12; step += 1) {
        await page.mouse.move(
            box.x + box.width * (0.1 + step * 0.06),
            box.y + box.height / 2
        );
        await page.waitForTimeout(25);
    }
    await page.mouse.up();
    await page.waitForTimeout(200);

    const seen = await page.evaluate(() => ({
        distinct: new Set(window.__aetosDragSeen).size,
        first: window.__aetosDragSeen[0],
        last: window.__aetosDragSeen[window.__aetosDragSeen.length - 1],
        stillThere: !!document.getElementById("aetos-a11y-detail-range"),
        focused: document.activeElement && document.activeElement.id,
    }));

    results.push(
        seen.distinct >= MIN_DISTINCT_VALUES
            ? {
                status: "ok",
                what: `one drag moved the text size through ${seen.distinct} values`,
            }
            : {
                status: "FAIL",
                what: `one drag produced only ${seen.distinct} value(s) -- the control `
                    + "is being destroyed mid-gesture",
            }
    );

    /*
     * Direction, because the broken version moved the value the wrong way.
     *
     * A rebuilt slider registers the pointer as a fresh click at the gesture's
     * *origin*, which was to the left of where it started -- so dragging right
     * made the text smaller. Asserting only on the count would have passed a
     * control that responded backwards.
     */
    results.push(
        seen.last > seen.first
            ? { status: "ok", what: "dragging rightwards made the text larger" }
            : {
                status: "FAIL",
                what: `dragging rightwards moved ${seen.first} to ${seen.last}`,
            }
    );

    results.push(
        seen.stillThere && seen.focused === "aetos-a11y-detail-range"
            ? { status: "ok", what: "the slider still holds focus after the drag" }
            : {
                status: "FAIL",
                what: `focus ended on "${seen.focused || "nothing"}" rather than the slider`,
            }
    );

    await page.evaluate((previous) => {
        const panel = window.Aetos.accessibilityPanel;
        panel.backToHub();
        if (panel.isOpen() !== previous.open) { panel.toggleOptions(); }
        window.Aetos.accessibility.preferences.update({
            shell: { mode: previous.mode, preset: previous.preset },
            visual: { scale: previous.scale },
        });
    }, restore);

    return results;
}

module.exports = {
    describes: "the text-size slider survives being dragged",
    // One view is enough: this is about whether a gesture destroys its own
    // target, which is not a property of viewport or text scale.
    views: { viewports: ["desktop"], scales: [1], modes: ["accessible"] },
    run,
};
