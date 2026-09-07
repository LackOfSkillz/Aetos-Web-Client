/*
 * What the client says out loud, without needing a screen reader to hear it.
 *
 * A screen reader reads a live region. The client owns exactly two of them --
 * `#aetos-announcer` (`role="status"`, polite) and `#aetos-announcer-urgent`
 * (`role="alert"`) -- and every announcement in the whole application goes
 * through the announcer and into one of those. So watching them is watching
 * what a screen reader would say, deterministically, with no screen reader
 * involved.
 *
 * WHAT THIS DOES AND DOES NOT REPLACE. It does not replace NVDA: it cannot tell
 * you whether NVDA reads the sentence at a useful moment, whether it interrupts
 * something the player wanted, or whether it is exhausting after an hour. What
 * it does replace is *our half* -- did the right sentence get written, once,
 * into the right region, at the right priority. That half is fully testable and
 * has never been tested.
 *
 * THE FAILURES IT IS LOOKING FOR are the ones people actually report about
 * screen readers, and all three are ours rather than the reader's:
 *
 *   - the same thing announced twice, because two code paths both said it
 *   - gameplay reaching the urgent region, which interrupts mid-sentence and is
 *     reserved (the announcer's own header says gameplay never goes there)
 *   - an announcement fired by a reconnect, so every drop replays old news
 */

"use strict";

/**
 * Watch both live regions while something happens.
 *
 * @param {import('@playwright/test').Page} page
 * @param {Function} action Runs in the page.
 * @param {object} [argument] Passed to the action.
 * @returns {Promise<{polite: string[], urgent: string[]}>}
 */
async function capture(page, action, argument) {
    await page.evaluate(() => {
        /*
         * Disconnect the observers from the last capture first.
         *
         * Without this, each call left its observer attached and every one of
         * them went on pushing into the current `window.__said` -- so the second
         * capture recorded everything twice and the check reported the client
         * announcing twice. It was a real duplicate, in the test.
         *
         * Worth the comment because the failure was indistinguishable from the
         * defect this check exists to find, which is the worst kind of bug a
         * test can have: it accuses the code of exactly its own mistake.
         */
        (window.__watchers || []).forEach((observer) => observer.disconnect());
        window.__watchers = [];
        window.__said = { polite: [], urgent: [] };

        const watch = (id, bucket) => {
            const region = document.getElementById(id);
            if (!region) { return; }
            const observer = new MutationObserver(() => {
                const text = region.textContent.trim();
                // The announcer clears a region before rewriting it, so that an
                // identical message announces again. The empty step is not
                // something anybody hears.
                if (text) { window.__said[bucket].push(text); }
            });
            observer.observe(region, { childList: true, characterData: true, subtree: true });
            window.__watchers.push(observer);
        };
        watch("aetos-announcer", "polite");
        watch("aetos-announcer-urgent", "urgent");
    });

    await page.evaluate(action, argument);
    await page.waitForTimeout(400);
    return page.evaluate(() => window.__said);
}

async function run(page) {
    const results = [];

    const regions = await page.evaluate(() => ({
        polite: !!document.getElementById("aetos-announcer"),
        urgent: !!document.getElementById("aetos-announcer-urgent"),
        politeRole: (document.getElementById("aetos-announcer") || {}).getAttribute
            ? document.getElementById("aetos-announcer").getAttribute("role") : null,
        urgentRole: (document.getElementById("aetos-announcer-urgent") || {}).getAttribute
            ? document.getElementById("aetos-announcer-urgent").getAttribute("role") : null,
    }));

    if (!regions.polite || !regions.urgent) {
        return [{ status: "FAIL", what: "one of the two live regions is missing" }];
    }
    results.push({
        status: regions.politeRole === "status" && regions.urgentRole === "alert" ? "ok" : "FAIL",
        what: `live regions are ${regions.politeRole} and ${regions.urgentRole}`,
    });

    /*
     * The mode switch, which is the announcement this project has argued about
     * most. Leaving accessible mode must say what stopped, that nothing was
     * erased, and the way back -- and must not be whispered at the quietest
     * level, because it is the one message somebody needs to hear.
     */
    const leaving = await capture(page, () => {
        window.Aetos.accessibilityPanel.setMode("accessible");
        window.Aetos.accessibilityPanel.setMode("standard");
    });
    const said = leaving.polite.concat(leaving.urgent).join(" ");
    results.push(/standard mode/i.test(said)
        ? { status: "ok", what: "leaving accessible mode is announced" }
        : { status: "FAIL", what: `leaving announced nothing useful: ${JSON.stringify(said).slice(0, 120)}` });
    results.push(/control shift a/i.test(said)
        ? { status: "ok", what: "and the announcement names the way back" }
        : { status: "FAIL", what: "the announcement does not say how to return" });

    /*
     * Nothing said twice. Two code paths both announcing is the defect that
     * makes a screen reader exhausting, and it is invisible to anybody testing
     * with their eyes.
     */
    /*
     * Only the messages this action caused.
     *
     * The client announces connection state on its own schedule, and a
     * "Connected." arriving mid-capture is not a duplicate of anything -- but a
     * naive check on the whole list would eventually call it one, on a flaky
     * connection, intermittently, which is the worst way for a gate to be wrong.
     */
    const aboutMode = leaving.polite.filter((text) => /mode\./i.test(text));
    const duplicated = aboutMode.filter((text, index) => aboutMode.indexOf(text) !== index);
    results.push(duplicated.length
        ? { status: "FAIL", what: `announced twice: ${JSON.stringify(duplicated[0]).slice(0, 80)}` }
        : { status: "ok", what: "nothing was announced twice" });

    /*
     * The urgent region interrupts whatever is being read. The announcer's own
     * header says gameplay never reaches it. This is where that stops being a
     * comment and becomes a check.
     */
    const gameplay = await capture(page, () => {
        const pipeline = window.Aetos.pipeline;
        if (!pipeline || !pipeline.ingest) { return; }
        for (let index = 0; index < 5; index += 1) {
            pipeline.ingest({ category: "text", text: `A rat squeaks. ${index}` });
        }
    });
    results.push(gameplay.urgent.length === 0
        ? { status: "ok", what: "ordinary game output never reaches the urgent region" }
        : { status: "FAIL", what: `gameplay interrupted: ${JSON.stringify(gameplay.urgent[0]).slice(0, 80)}` });

    /*
     * ...and that it reaches the polite one at all.  A14.
     *
     * THE ASSERTION ABOVE PASSED FOR THE WORST POSSIBLE REASON. It says game
     * output must not reach the *urgent* region, and for the whole life of this
     * check that was true because **no game output was announced anywhere**.
     * The pipeline's `announce` stage had exactly one observer -- the capture
     * recorder -- so nothing was ever handed to the announcer, and the console
     * is deliberately `aria-live="off"`. A screen reader user typed `look` and
     * heard silence.
     *
     * A check of the form "X must not happen" is satisfied by nothing happening
     * at all, and that is not a subtle failure mode -- it is the default one.
     * Every negative assertion in this suite needs a positive one beside it
     * saying the thing under test occurred, or it is measuring an empty room.
     *
     * Gary found this by using the client. Five automated gates did not.
     */
    results.push(gameplay.polite.length > 0
        ? {
            status: "ok",
            what: `game output is announced (${gameplay.polite.length} to the polite region)`,
        }
        : {
            status: "FAIL",
            what: "game output was announced nowhere -- a screen reader user hears "
                + "nothing when the game speaks",
        });

    /*
     * Announcing the absence of news. A reconnect re-sends state, and a client
     * that announced all of it would say everything again on every drop -- which
     * on a flaky connection is the worst experience this client can produce for
     * somebody listening to it.
     */
    const resync = await capture(page, () => {
        const store = window.Aetos.store;
        const current = store.get("resources");
        store.applySync({ resources: current });
        if (store.flushNow) { store.flushNow(); }
    });
    results.push(resync.polite.length === 0 && resync.urgent.length === 0
        ? { status: "ok", what: "re-receiving unchanged state announces nothing" }
        : { status: "FAIL", what: `a resync announced: ${JSON.stringify(resync.polite[0] || resync.urgent[0]).slice(0, 80)}` });

    return results;
}

module.exports = {
    describes: "what the client writes to its live regions -- our half of what a screen reader says",
    views: { viewports: ["desktop"], scales: [1], modes: ["standard", "accessible"] },
    run,
};
