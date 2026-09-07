/*
 * Screenshots of the three states A12 changed, for a human to look at.
 *
 *     node a11y/scratch-shots.js
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

    const shut = () =>
        page.evaluate(() => {
            const panel = window.Aetos.accessibilityPanel;
            if (panel.isOpen()) { panel.toggleOptions(); }
        });
    const open = () =>
        page.evaluate(() => {
            const panel = window.Aetos.accessibilityPanel;
            if (!panel.isOpen()) { panel.toggleOptions(); }
        });

    // 1. standard mode, nothing open -- the client as it comes
    await set("standard", "custom");
    await shut();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, "1-standard.png") });

    // 2. the chooser -- what somebody meets on first turning the mode on
    await set("accessible", null);
    await open();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, "2-chooser.png") });

    // 3. the grouped options, after a preset
    await page.evaluate(() => window.Aetos.accessibilityPanel.choose("low-vision"));
    await page.waitForTimeout(700);
    await open();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, "3-options-after-low-vision.png") });

    // Leave the lab client where it started, so the next person to open it is
    // not looking at somebody else's preset.
    await set("standard", null);
    await shut();

    process.stdout.write("wrote three shots to " + OUT + "\n");
    await browser.close();
}

main().catch((error) => {
    process.stderr.write(String((error && error.stack) || error) + "\n");
    process.exit(1);
});
