/*
 * Does the client actually read the game aloud?  A15.
 *
 * Gary turned on the setting called "How much is announced", played, and heard
 * nothing: *"ok I have the reading turned on but it doesnt read out loud"*.
 *
 * The client was behaving exactly as designed. Aetos wrote to an ARIA live
 * region and left the speaking to a screen reader -- correct for somebody
 * running NVDA, silence for everybody else, and the setting's own wording
 * ("what is spoken aloud") promised speech the client never produced.
 *
 * The population that wants text read to them is far larger than the population
 * running a screen reader. Telling all of them to install NVDA is not an
 * accessibility answer, so the client now has a voice of its own.
 *
 * HOW THIS IS MEASURED WITHOUT A SOUND CARD. `speechSynthesis.speak` is replaced
 * with a recorder before the run. That is honest here in a way it would not be
 * elsewhere: what is under test is whether the client *asks* for the right text
 * at the right moment with the right settings. Whether the operating system's
 * voice is intelligible is not ours and cannot be asserted -- it is a line in
 * the tester protocol.
 *
 * The gesture is a real click rather than a call to `unlock()`, so the arming
 * path is exercised instead of bypassed. Browsers refuse audio until the player
 * has interacted with the page, and a check that skipped that would pass while
 * every real player heard nothing.
 */

"use strict";

async function run(page) {
    const results = [];

    const speech = await page.evaluate(() =>
        !!(window.Aetos.accessibility && window.Aetos.accessibility.speech)
    );
    if (!speech) {
        return [{ status: "skip", what: "no speech module in this client" }];
    }

    await page.evaluate(() => {
        window.__aetosSpoken = [];
        window.__aetosCancels = 0;
        window.speechSynthesis.speak = (utterance) => {
            window.__aetosSpoken.push({
                text: utterance.text,
                rate: utterance.rate,
                volume: utterance.volume,
            });
        };
        window.speechSynthesis.cancel = () => { window.__aetosCancels += 1; };
    });

    // A real gesture, so the arming path runs.
    await page.mouse.click(200, 500);
    await page.waitForTimeout(150);

    const seen = await page.evaluate(async () => {
        const prefs = window.Aetos.accessibility.preferences;
        const out = {};

        prefs.update({ speech: { enabled: false } });
        await new Promise((r) => setTimeout(r, 150));
        window.__aetosSpoken = [];
        window.Aetos.emitter.emit("text", ["A quiet room."]);
        await new Promise((r) => setTimeout(r, 350));
        out.whileOff = window.__aetosSpoken.length;

        prefs.update({
            shell: { mode: "accessible" },
            speech: { enabled: true, rate: 1.3 },
        });
        await new Promise((r) => setTimeout(r, 150));
        window.__aetosSpoken = [];
        window.Aetos.emitter.emit("text", ["A dusty chamber. Exits: north."]);
        await new Promise((r) => setTimeout(r, 450));
        out.whileOn = window.__aetosSpoken.slice();

        window.__aetosCancels = 0;
        prefs.update({ speech: { enabled: false } });
        await new Promise((r) => setTimeout(r, 250));
        out.cancelsOnDisable = window.__aetosCancels;

        return out;
    });

    /*
     * Off by default and silent when off.
     *
     * A client that starts talking is alarming, and for somebody running a
     * screen reader it would be two voices over the same text. Aetos cannot
     * detect a screen reader and must never try -- that is fingerprinting -- so
     * the only honest default is silence plus a clearly named control.
     */
    results.push(seen.whileOff === 0
        ? { status: "ok", what: "says nothing while reading aloud is off" }
        : { status: "FAIL", what: `spoke ${seen.whileOff} time(s) while switched off` });

    results.push(seen.whileOn.length > 0
        ? { status: "ok", what: `game text is spoken: "${seen.whileOn[0].text.slice(0, 40)}"` }
        : { status: "FAIL", what: "reading aloud is on and the game was still not spoken" });

    if (seen.whileOn.length) {
        const said = seen.whileOn[0];
        results.push(!/[<>]/.test(said.text)
            ? { status: "ok", what: "the markup is not read out" }
            : { status: "FAIL", what: `span tags reached the voice: ${said.text.slice(0, 60)}` });

        results.push(Math.abs(said.rate - 1.3) < 0.01
            ? { status: "ok", what: "the reading speed the player chose is used" }
            : { status: "FAIL", what: `rate was ${said.rate}, not the chosen 1.3` });
    }

    /*
     * Turning it off stops it mid-sentence.
     *
     * Without this, switching it off lets the current utterance run to the end
     * -- which reads as the control not working, and is precisely the moment
     * somebody wants the talking to stop. Speech that cannot be stopped is
     * worse than no speech.
     */
    results.push(seen.cancelsOnDisable > 0
        ? { status: "ok", what: "turning it off stops it talking immediately" }
        : { status: "FAIL", what: "it kept talking after being switched off" });

    await page.evaluate(() =>
        window.Aetos.accessibility.preferences.update({ speech: { enabled: false } })
    );

    return results;
}

module.exports = {
    describes: "the client reads the game aloud when asked, and not otherwise",
    // One view: this is about audio, which no viewport or text scale changes.
    views: { viewports: ["desktop"], scales: [1], modes: ["accessible"] },
    run,
};
