/*
 * Getting a script into the page without breaking the thing being tested.
 *
 * Playwright's `addScriptTag({ path })` reads the file and inlines it, and the
 * client's Content-Security-Policy is `script-src 'self'` with no
 * `unsafe-inline`. So every injection was blocked, and the suite's first full
 * run reported thirty-six failures that were all the same one.
 *
 * **The CSP was right and the test was wrong**, which is the important way round.
 * The obvious fix is to launch the browser with the policy disabled, and that
 * would be testing a different client -- one whose defining security property
 * has been turned off for the convenience of the tests. Aetos ships a CSP
 * precisely so that nothing can inject script into it; a suite that needs that
 * switched off is a suite that cannot tell whether it still works.
 *
 * So instead the file is served *from the page's own origin*. Playwright
 * intercepts a URL under `/__qa/`, answers it with the file's bytes, and the
 * page loads it with an ordinary `src`. `'self'` is satisfied because it really
 * is self, and the policy is exercised rather than bypassed.
 */

"use strict";

/**
 * Serve a local file to the page under its own origin and load it.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} name URL-safe name, used in the served path.
 * @param {string} filePath Absolute path to the JavaScript file.
 */
async function inject(page, name, filePath) {
    const url = `/__qa/${name}.js`;

    await page.route(`**${url}`, (route) =>
        route.fulfill({ path: filePath, contentType: "application/javascript" })
    );

    await page.addScriptTag({ url });
}

module.exports = { inject };
