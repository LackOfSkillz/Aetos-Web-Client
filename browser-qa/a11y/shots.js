/*
 * Screenshots of the panel's screens, for a human to look at.
 *
 *     cd browser-qa && npm run a11y:shots
 */

"use strict";

const path = require("path");
const { chromium } = require("@playwright/test");

const URL = "http://localhost:4471/webclient/";
const OUT = path.join(__dirname, "..", "shots");

async function main() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
    await page.goto(URL);
    await page.waitForFunction(() => window.Aetos && window.Aetos.accessibilityPanel, null, {
        timeout: 30000,
    });
    await page.waitForTimeout(1200);

    const set = (mode, preset) =>
        page.evaluate(
            (state) =>
                window.Aetos.accessibility.preferences.update({
                    shell: { mode: state.mode, preset: state.preset },
                }),
            { mode, preset }
        );
    const open = () =>
        page.evaluate(() => {
            const panel = window.Aetos.accessibilityPanel;
            if (!panel.isOpen()) { panel.toggleOptions(); }
        });
    const shut = () =>
        page.evaluate(() => {
            const panel = window.Aetos.accessibilityPanel;
            if (panel.isOpen()) { panel.toggleOptions(); }
        });

    const shot = async (name) => {
        // Long enough for a text-scale change to land AND for the responsive
        // re-measure that follows it. At 500ms the console had not repainted
        // and the shots showed an empty frame -- which looked exactly like a
        // client defect and was not one.
        await page.waitForTimeout(1600);
        await page.screenshot({ path: path.join(OUT, name) });
    };

    // 1. the chooser -- what somebody meets on first turning the mode on
    await set("accessible", null);
    await open();
    await shot("1-chooser.png");

    // 2. the hub -- every setting as a tile, with its value on it
    await page.evaluate(() => window.Aetos.accessibilityPanel.choose("low-vision"));
    await page.waitForTimeout(700);
    await open();
    await shot("2-hub.png");

    // 3. one setting, drilled into
    await page.evaluate(() => window.Aetos.accessibilityPanel.openDetail("visual.motion"));
    await shot("3-detail.png");

    // 4. the summary strip, with the panel closed
    await page.evaluate(() => window.Aetos.accessibilityPanel.backToHub());
    await shut();
    await shot("4-summary-panel-closed.png");

    // Leave the lab client where it started, so the next person to open it is
    // not looking at somebody else's preset.
    await set("standard", null);
    await shut();

    process.stdout.write("wrote four shots to " + OUT + "\n");
    await browser.close();
}

main().catch((error) => {
    process.stderr.write(String((error && error.stack) || error) + "\n");
    process.exit(1);
});
