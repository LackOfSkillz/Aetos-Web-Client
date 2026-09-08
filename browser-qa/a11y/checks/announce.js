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
     * ...and still is, with quiet mode on.  A14b.
     *
     * Quiet mode dropped `normal` priority as well as `background`, and every
     * line of ordinary game text arrives as `other`, which is `normal`. So
     * "fewer interruptions" silenced the game.
     *
     * Invisible to a sighted player -- the console is right there and nothing
     * appears lost. Total silence for somebody listening, because the console is
     * deliberately `aria-live="off"` and announcements are their only channel.
     * The setting's own promise, "nothing is lost, it is still in the log", is
     * only true if you can read the log.
     */
    const quiet = await capture(page, () => {
        window.Aetos.accessibility.preferences.update({ cognitive: { quietMode: true } });
        const pipeline = window.Aetos.pipeline;
        if (pipeline && pipeline.ingest) {
            pipeline.ingest({ category: "text", text: "The chamber is cold." });
        }
    });
    results.push(quiet.polite.length > 0
        ? { status: "ok", what: "quiet mode quietens interruptions, not the game" }
        : {
            status: "FAIL",
            what: "quiet mode silenced ordinary game output -- quiet is not deaf",
        });
    await page.evaluate(() =>
        window.Aetos.accessibility.preferences.update({ cognitive: { quietMode: false } })
    );

    /*
     * A backgrounded tab does not talk.  A16.
     *
     * A MUD sits in a background tab for hours, and a live region keeps firing
     * while it does -- so a screen reader reading somebody's email gets
     * interrupted by a room description from a game they are not currently
     * playing. Heydon Pickering's Notifications article gives the remedy:
     * swap `role` and `aria-live` off while `document.hidden`, and restore
     * them on return.
     *
     * `document.hidden` is redefined rather than genuinely backgrounding the
     * tab, because Playwright has no way to background a page without also
     * suspending the timers this check depends on.
     */
    const background = await page.evaluate(async () => {
        const polite = document.getElementById("aetos-announcer");
        const urgent = document.getElementById("aetos-announcer-urgent");
        const before = {
            politeRole: polite.getAttribute("role"),
            politeLive: polite.getAttribute("aria-live"),
            urgentRole: urgent.getAttribute("role"),
            urgentLive: urgent.getAttribute("aria-live"),
        };

        const setHidden = (value) => {
            Object.defineProperty(document, "hidden", {
                configurable: true,
                get: () => value,
            });
            Object.defineProperty(document, "visibilityState", {
                configurable: true,
                get: () => (value ? "hidden" : "visible"),
            });
            document.dispatchEvent(new Event("visibilitychange"));
        };

        setHidden(true);
        await new Promise((r) => setTimeout(r, 120));
        const hidden = {
            politeRole: polite.getAttribute("role"),
            politeLive: polite.getAttribute("aria-live"),
            urgentRole: urgent.getAttribute("role"),
            urgentLive: urgent.getAttribute("aria-live"),
        };

        // A message arriving while nobody is looking.
        window.Aetos.emitter.emit("text", ["A cold hall, while you were away."]);
        await new Promise((r) => setTimeout(r, 300));

        setHidden(false);
        await new Promise((r) => setTimeout(r, 120));
        const restored = {
            politeRole: polite.getAttribute("role"),
            politeLive: polite.getAttribute("aria-live"),
            urgentRole: urgent.getAttribute("role"),
            urgentLive: urgent.getAttribute("aria-live"),
            politeText: polite.textContent,
        };
        return { before, hidden, restored };
    });

    results.push(
        background.hidden.politeRole === "none"
            && background.hidden.politeLive === "off"
            && background.hidden.urgentRole === "none"
            ? { status: "ok", what: "a backgrounded tab stops announcing" }
            : {
                status: "FAIL",
                what: `still live while hidden: ${JSON.stringify(background.hidden)}`,
            }
    );

    /*
     * Restored exactly as they were, not to a hardcoded pair.
     *
     * The two regions are not symmetrical: polite is `role="status"
     * aria-live="polite"`, urgent is `role="alert"` with no `aria-live` at all.
     * Restoring an assumed pair would quietly give the urgent region an
     * attribute it never had.
     */
    results.push(
        background.restored.politeRole === background.before.politeRole
            && background.restored.politeLive === background.before.politeLive
            && background.restored.urgentRole === background.before.urgentRole
            && background.restored.urgentLive === background.before.urgentLive
            ? { status: "ok", what: "and both regions come back exactly as they were" }
            : {
                status: "FAIL",
                what: `restored wrong: ${JSON.stringify(background.restored)} `
                    + `was ${JSON.stringify(background.before)}`,
            }
    );

    /*
     * And comes back empty.
     *
     * Messages arriving while hidden are still *written* -- only the attributes
     * are off -- so without clearing, the region returns holding the last thing
     * that happened while nobody was looking, and making it live again can
     * announce that stale line out of nowhere. Found by measuring the first
     * version of the fix, which had exactly this bug.
     */
    results.push(!background.restored.politeText
        ? { status: "ok", what: "and empty, so nothing stale is read on return" }
        : {
            status: "FAIL",
            what: `came back holding "${background.restored.politeText.slice(0, 40)}"`,
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
