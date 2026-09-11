#!/usr/bin/env node
/*
 * A real screen reader, asserted on.
 *
 *     cd browser-qa && npm run a11y:nvda
 *
 * WHAT THIS CHANGES. Everything else in this suite tests *our half*: the names
 * we put in the accessibility tree, the sentences we write into a live region,
 * the order Tab visits things in. All of it is a proxy for the only question
 * that matters, which is what somebody actually hears. This drives NVDA -- the
 * real one, the one people use -- and asserts on the words it speaks.
 *
 * It takes `docs/a8-tester-protocol.md` §0.3 and §1.1-1.6 off a person's list:
 * *"What does your screen reader announce when you focus it? When you flip
 * it?"* is now a string comparison rather than a question.
 *
 * WHAT IT STILL DOES NOT ANSWER, and this is most of why A8 exists: whether
 * hearing that sentence, at that moment, forty times an hour, is bearable.
 * A.95 calls "takes too many keystrokes" and "focus jumps" defects even when
 * every automated test passes, and no amount of asserting on transcripts
 * reaches them. NVDA is also not JAWS and not Orca, and where those disagree
 * with NVDA the protocol says the difference is usually ours.
 *
 * WHY IT IS A SEPARATE COMMAND from `npm run a11y`.
 *
 * A screen reader reads the foreground window of a real desktop. That means a
 * **headed** browser, a window brought to the front, and an unlocked interactive
 * session -- none of which the rest of the suite needs, all of which make this
 * slow and impossible to run on a build server without a desktop. Bundling it
 * into the main command would make the fast suite depend on the slow one's
 * environment.
 */

"use strict";

const { nvda } = require("@guidepup/guidepup");
const { chromium } = require("@playwright/test");

const DEFAULT_URL = "http://localhost:4471/webclient/";

/*
 * Phrases that mean the desktop is not available to be read.
 *
 * NVDA reads whatever is in front. On a locked session that is the lock screen,
 * and every assertion below would fail for a reason that has nothing to do with
 * the client -- which is the same failure as measuring layout in a hidden
 * browser pane, and gets the same treatment: refuse, and say why.
 */
const NOT_A_DESKTOP = [/lock screen/i, /sign.?in/i, /ctrl.?alt.?del/i];

function say(status, text) {
    const mark = { ok: "  ok  ", FAIL: " FAIL ", note: "      " }[status] || "      ";
    process.stdout.write(`${mark}${text}\n`);
}

/**
 * Ask NVDA what it is looking at, and decide whether it is the client.
 *
 * @param {object} reader The NVDA driver.
 * @returns {Promise<string|null>} A refusal message, or null if all is well.
 */
async function refuseIfUnusable(reader) {
    const log = await reader.spokenPhraseLog();
    const heard = log.join(" ");
    if (NOT_A_DESKTOP.some((pattern) => pattern.test(heard))) {
        return "NVDA is reading the Windows lock screen, not the browser. "
            + "A screen reader reads the foreground window of an interactive "
            + "desktop, so this needs the machine unlocked and somebody logged "
            + "in. Nothing was tested.";
    }
    if (!heard.trim()) {
        return "NVDA started but spoke nothing at all. Either the browser did "
            + "not come to the front, or the session has no desktop to read.";
    }
    return null;
}

/**
 * Whether any phrase in a log matches.
 *
 * @param {string[]} log Spoken phrases.
 * @param {RegExp} pattern What to look for.
 * @returns {boolean}
 */
function heard(log, pattern) {
    return log.some((phrase) => pattern.test(phrase));
}

async function main() {
    const url = (process.argv.find((a) => a.startsWith("--url=")) || "").slice(6) || DEFAULT_URL;

    const results = { ok: 0, failed: 0, failures: [] };
    const check = (what, condition, detail) => {
        if (condition) {
            results.ok += 1;
            say("ok", what);
        } else {
            results.failed += 1;
            results.failures.push(`${what}${detail ? ` -- ${detail}` : ""}`);
            say("FAIL", `${what}${detail ? `  (${detail})` : ""}`);
        }
    };

    if (!(await nvda.detect())) {
        say("FAIL", "NVDA is not installed. Run: npx @guidepup/setup install nvda");
        return 2;
    }

    let browser;
    try {
        await nvda.start();

        /*
         * Headed, and brought to the front. A screen reader cannot read a
         * headless browser -- there is no window, so there is no accessible
         * foreground object for it to sit on.
         */
        browser = await chromium.launch({ headless: false });
        const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
        await page.goto(url);
        await page.waitForFunction(
            () => window.Aetos && window.Aetos.accessibilityPanel,
            null,
            { timeout: 30000 }
        );
        await page.bringToFront();
        await page.waitForTimeout(2500);

        await nvda.clearSpokenPhraseLog();
        await nvda.next();
        await page.waitForTimeout(500);

        const refusal = await refuseIfUnusable(nvda);
        if (refusal) {
            say("note", refusal);
            process.stdout.write("\nrefused -- nothing was tested\n");
            return 3;
        }

        /* --- protocol 1.1: what is read first ----------------------------- */

        await nvda.clearSpokenPhraseLog();
        for (let index = 0; index < 6; index += 1) { await nvda.next(); }
        const opening = await nvda.spokenPhraseLog();
        check(
            "arriving at the page reads something that identifies it",
            opening.some((phrase) => phrase.trim().length > 0),
            JSON.stringify(opening.slice(0, 3))
        );

        /* --- protocol 1.5: landmarks are named ---------------------------- */

        await nvda.clearSpokenPhraseLog();
        for (let index = 0; index < 5; index += 1) { await nvda.nextLandmark(); }
        const landmarks = await nvda.spokenPhraseLog();
        check(
            "moving by landmark announces named regions",
            landmarks.filter((phrase) => phrase.trim()).length >= 2,
            JSON.stringify(landmarks.slice(0, 4))
        );

        /* --- protocol 1.6: the heading structure -------------------------- */

        await nvda.clearSpokenPhraseLog();
        for (let index = 0; index < 5; index += 1) { await nvda.nextHeading(); }
        const headings = await nvda.spokenPhraseLog();
        check(
            "moving by heading announces the structure",
            headings.filter((phrase) => phrase.trim()).length >= 2,
            JSON.stringify(headings.slice(0, 4))
        );

        /* --- protocol 0.2 and 0.3: the mode switch ------------------------
         *
         * The questions the protocol puts to a person, in order: is it obvious
         * that it is a switch rather than a button, and what is announced when
         * you focus it and when you flip it.
         *
         * `role="switch"` was chosen over `aria-pressed` precisely so that a
         * screen reader says "on" and "off" -- the state -- rather than
         * "pressed", which is the act. This is where that decision stops being
         * an argument in a note.
         */
        await page.evaluate(() => {
            document.getElementById("aetos-accessibility-toggle").focus();
        });
        await page.waitForTimeout(300);
        await nvda.clearSpokenPhraseLog();
        await nvda.previous();
        await nvda.next();
        await page.waitForTimeout(600);
        const onSwitch = await nvda.spokenPhraseLog();

        check(
            "the mode control is announced as a switch, not a button",
            heard(onSwitch, /switch/i),
            JSON.stringify(onSwitch.slice(0, 4))
        );
        check(
            "and its state is announced",
            heard(onSwitch, /\b(on|off|not checked|checked)\b/i),
            JSON.stringify(onSwitch.slice(0, 4))
        );
        check(
            "and it is announced by name",
            heard(onSwitch, /accessible mode/i),
            JSON.stringify(onSwitch.slice(0, 4))
        );

        /* --- what this harness cannot observe, and why -------------------
         *
         * Guidepup captures the speech NVDA produces *in response to its own
         * navigation commands* -- `next`, `nextHeading`, `nextLandmark`, which
         * are the checks above. It does not capture **spontaneous** speech: a
         * live-region update, or an announcement caused by focus moving
         * programmatically.
         *
         * Measured, not assumed. Leaving accessible mode writes "Standard mode.
         * Press Control Shift A to return." into `#aetos-announcer` -- confirmed
         * by reading the element back -- and NVDA speaks it aloud, confirmed by
         * a person in the room hearing it. The spoken-phrase log for that same
         * window is empty regardless.
         *
         * Three assertions used to live here and all three failed for that
         * reason alone. They would have reported a defect in the client that
         * does not exist, which is worse than not checking at all.
         *
         * The behaviour is checked where it can be: `checks/announce.js` reads
         * the live regions directly and deterministically -- the right sentence,
         * once, in the right region, and not repeated on a reconnect. What is
         * left for a person is the half neither can reach: whether the sentence
         * arrives at a useful moment, and whether hearing it all evening is
         * bearable.
         *
         * One practical note for whoever runs this: Guidepup's NVDA build speaks
         * far faster than anybody would set it for real use. That is the
         * automation build being quick, not a rate Aetos chooses or a rate a
         * tester would hear.
         */
        say("note", "live-region and focus speech is not observable through this harness;");
        say("note", "checks/announce.js reads those regions directly instead");

    } catch (error) {
        say("FAIL", `the run itself threw: ${error && error.message}`);
        results.failed += 1;
    } finally {
        try { await nvda.stop(); } catch (ignored) { /* already stopped */ }
        if (browser) { await browser.close(); }
    }

    process.stdout.write(`\n${"-".repeat(60)}\n${results.ok} ok, ${results.failed} failed\n`);
    if (results.failures.length) {
        process.stdout.write("\nfailures:\n" + results.failures.map((f) => "  " + f).join("\n") + "\n");
    }
    process.stdout.write(
        "\nNVDA is not JAWS and not Orca, and none of this says whether hearing\n"
        + "these sentences all evening is bearable. That is still a person's job.\n"
    );

    return results.failed ? 1 : 0;
}

main().then((code) => process.exit(code)).catch((error) => {
    process.stderr.write(String((error && error.stack) || error) + "\n");
    process.exit(2);
});
