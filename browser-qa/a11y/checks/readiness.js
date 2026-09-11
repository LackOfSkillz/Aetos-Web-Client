/*
 * The A8 readiness gate, folded into the suite.
 *
 * `qa-a8-readiness.js` walks `docs/a8-tester-protocol.md` and checks that every
 * task the tester will be asked to do has somewhere to go: it opens, it is
 * named, it closes, and focus comes back where it started. It was written to be
 * pasted into a page by hand. Running it here means it happens on every sweep
 * rather than when somebody remembers.
 *
 * Its own three buckets are collapsed to two here on purpose. `needs-session`
 * and `needs-human` are not failures and never will be -- they are the protocol
 * working as designed -- so they are reported once as a count rather than as
 * twenty-six lines that would train people to skim past the ones that matter.
 */

"use strict";

const path = require("path");
const { inject } = require("../inject");

const GATE = path.join(__dirname, "..", "..", "qa-a8-readiness.js");

async function run(page) {
    await page.evaluate(() => { delete window.__aetosA8; });
    await inject(page, "a8-readiness", GATE);

    const report = await page.evaluate(async () => {
        const started = Date.now();
        while (!window.__aetosA8 && Date.now() - started < 5000) {
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
        return window.__aetosA8 ? await window.__aetosA8 : { crashed: "the gate never appeared" };
    });

    if (report.refused) {
        return [{ status: "FAIL", what: `the gate refused to run: ${report.refused}` }];
    }
    if (report.crashed) {
        return [{ status: "FAIL", what: `the gate threw: ${report.crashed}` }];
    }

    const results = [];
    for (const failure of report.failures || []) {
        results.push({ status: "FAIL", what: failure });
    }
    if (!(report.failures || []).length) {
        results.push({ status: "ok", what: `${report.ok} protocol destinations verified` });
    }
    results.push({
        status: "skip",
        what: `${report.needsSession} tasks need a logged-in character, `
            + `${report.needsHuman} need a person`,
    });
    if (report.leftBehind) {
        results.push({ status: "FAIL", what: report.leftBehind });
    }

    return results;
}

module.exports = {
    describes: "every task in the tester protocol has somewhere to go",
    views: { viewports: ["desktop", "phone"], scales: [1], modes: ["standard"] },
    run,
};
