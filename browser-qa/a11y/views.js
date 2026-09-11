/*
 * The matrix every accessibility check runs across.
 *
 * WHY A MATRIX AT ALL. Until UI1 the axe gate had been run at 1280x800 and only
 * ever at 1280x800, and came back clean every time. Re-run at 800x600 it
 * immediately found a serious violation the wide run could not see. Every rule
 * about overflow, reflow, target size and truncation depends on how much room
 * there is, so a result is only ever a result *for the view it was measured in*.
 *
 * The three axes are not interchangeable, which is the reason this is a matrix
 * and not a list:
 *
 *   viewport   how much room there is
 *   textScale  how much of it one line uses -- and since UI1 the breakpoints are
 *              measured in text rather than pixels, a big text scale is a
 *              genuinely different layout, not a zoomed picture of the same one
 *   mode       standard masks the governed accommodations; accessible applies
 *              them. Two interfaces, and the whole point of A10 is that neither
 *              is a compromise for the other
 *
 * WHY NOT THE FULL CROSS PRODUCT EVERY TIME. Four viewports by three scales by
 * two modes is twenty-four views, and a full axe sweep takes the better part of
 * a minute each. A suite nobody runs because it takes twenty minutes is worth
 * less than a smaller one that runs. So each check declares the axis it is
 * actually sensitive to, and gets the views that matter to it.
 */

//: Window sizes. `wide` is included because the client behaves differently
//: there on purpose -- the console is capped and centred rather than letting a
//: line of game text run to 200 characters.
const VIEWPORTS = [
    { name: "wide", width: 1920, height: 1080 },
    { name: "desktop", width: 1280, height: 800 },
    { name: "tablet", width: 800, height: 600 },
    { name: "phone", width: 390, height: 844 },
];

//: Text scales, as the client's own setting expresses them.
//:
//: 2.5 is the maximum the client offers, and it is in the default sweep rather
//: than an extra: it is the setting people ask for most, and the one browser
//: zoom does worst.
const SCALES = [1, 1.5, 2.5];

const MODES = ["standard", "accessible"];

/*
 * The smallest window WCAG 2.2 asks about.
 *
 * 1.4.10 is written as 320 CSS pixels wide, which is what a 1280px viewport
 * becomes at 400% zoom. Kept separate from `VIEWPORTS` because it is a
 * *criterion* rather than a device -- nobody has a 320px monitor, and the point
 * is the standard rather than the hardware.
 */
const REFLOW_VIEWPORT = { name: "reflow-320", width: 320, height: 512 };

/**
 * Build the list of views a check should run in.
 *
 * @param {object} options
 * @param {string[]} [options.viewports] Viewport names, or all of them.
 * @param {number[]} [options.scales] Text scales, or just 1.
 * @param {string[]} [options.modes] Modes, or just standard.
 * @returns {object[]} Views, each with a name, viewport, scale and mode.
 */
function views({ viewports, scales, modes } = {}) {
    const chosen = viewports
        ? VIEWPORTS.filter((v) => viewports.includes(v.name))
        : VIEWPORTS;
    const withScales = scales || [1];
    const withModes = modes || ["standard"];

    const out = [];
    for (const viewport of chosen) {
        for (const scale of withScales) {
            for (const mode of withModes) {
                out.push({
                    name: `${viewport.name} @${Math.round(scale * 100)}% ${mode}`,
                    viewport,
                    scale,
                    mode,
                });
            }
        }
    }
    return out;
}

module.exports = { VIEWPORTS, SCALES, MODES, REFLOW_VIEWPORT, views };
