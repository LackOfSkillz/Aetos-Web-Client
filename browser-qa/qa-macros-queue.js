/*
 * Aetos browser QA -- the command queue, macros and the hotbar.
 *
 * Blueprint sections 27 and 28. The interesting cases are the safety ones:
 * a queue that keeps firing after a step failed, or that ignores the game's
 * automation policy, is how a player ends up somewhere they never chose.
 */

(async function aetosQueueQa() {
    "use strict";

    var results = { passed: 0, failed: 0, failures: [] };

    function check(name, condition, detail) {
        if (condition) {
            results.passed += 1;
        } else {
            results.failed += 1;
            results.failures.push(name + (detail ? " -- " + detail : ""));
        }
    }

    function sleep(ms) {
        return new Promise(function (r) { setTimeout(r, ms); });
    }

    var A = window.Aetos;
    if (!A || !A.queue || !A.macros) {
        return { passed: 0, failed: 1, failures: ["Aetos.queue / macros missing"] };
    }

    if (!(A.store.get("room") || {}).name) {
        A.sendCommand("connect guest");
        for (var w = 0; w < 40 && !(A.store.get("room") || {}).name; w++) {
            await sleep(100);
        }
        await sleep(500);
    }

    await A.storage.clear("macros");

    /* --- A standalone queue, so tests do not fight the live one --------- */

    function makeQueue(overrides) {
        var sent = [];
        var queue = window.AetosQueue.create(Object.assign({
            send: function (text) { sent.push(text); },
            isConnected: function () { return true; },
            announce: function () {}
        }, overrides || {}));
        return { queue: queue, sent: sent };
    }

    /* --- Order and completion -------------------------------------------- */

    var q = makeQueue();
    q.queue.run(["one", "two", "three"], { delay: 10 });
    await sleep(300);
    check("queue: preserves order", q.sent.join(",") === "one,two,three", q.sent.join(","));
    check("queue: is idle when finished", q.queue.isRunning() === false);

    /* --- Length cap ------------------------------------------------------- */

    q = makeQueue();
    var many = [];
    for (var i = 0; i < 400; i++) { many.push("cmd" + i); }
    q.queue.run(many, { delay: 0 });
    await sleep(600);
    check("queue: caps sequence length",
        q.sent.length <= window.AetosQueue.MAX_QUEUE_LENGTH,
        String(q.sent.length));

    /* --- Empty and whitespace input --------------------------------------- */

    q = makeQueue();
    check("queue: refuses an empty sequence", q.queue.run([], {}) === false);
    check("queue: refuses whitespace-only commands",
        q.queue.run(["   ", ""], {}) === false);

    /* --- Stop on failure --------------------------------------------------- */

    q = makeQueue();
    var stepCount = 0;
    q.queue.run(["good", "bad", "never"], {
        delay: 10,
        verify: {
            snapshot: function () { return stepCount; },
            check: function (before, command) {
                stepCount += 1;
                // "bad" reports failure; everything after must not be sent.
                return command === "bad"
                    ? { ok: false, reason: "stopped" }
                    : { ok: true };
            }
        }
    });
    await sleep(400);
    check("queue: a failed step stops the rest",
        q.sent.indexOf("never") === -1, q.sent.join(","));
    check("queue: steps before the failure did run", q.sent.indexOf("good") !== -1);
    check("queue: is idle after stopping", q.queue.isRunning() === false);

    /* --- Disconnect pauses rather than discarding --------------------------- */

    var connected = true;
    q = makeQueue({ isConnected: function () { return connected; } });
    q.queue.run(["a", "b", "c"], { delay: 40 });
    await sleep(60);
    connected = false;
    await sleep(250);
    check("queue: pauses while disconnected", q.queue.state().paused === true,
        JSON.stringify(q.queue.state()));
    check("queue: does not fire the rest while disconnected",
        q.sent.length < 3, q.sent.join(","));

    // Reconnecting must NOT resume by itself; section 60 forbids dumping
    // accumulated commands without an explicit policy.
    connected = true;
    await sleep(200);
    check("queue: reconnecting alone does not resume",
        q.queue.state().paused === true, JSON.stringify(q.queue.state()));

    q.queue.resume();
    await sleep(300);
    check("queue: resuming explicitly finishes the sequence",
        q.sent.length === 3, q.sent.join(","));

    /* --- No interleaving ---------------------------------------------------- */

    q = makeQueue();
    q.queue.run(["first1", "first2", "first3"], { delay: 40 });
    await sleep(50);
    q.queue.run(["second1", "second2"], { delay: 10 });
    await sleep(300);
    check("queue: a new sequence replaces rather than interleaves",
        q.sent.indexOf("first3") === -1, q.sent.join(","));
    check("queue: the replacing sequence runs", q.sent.indexOf("second2") !== -1);

    /* --- Cancel -------------------------------------------------------------- */

    q = makeQueue();
    q.queue.run(["x1", "x2", "x3"], { delay: 60 });
    await sleep(70);
    q.queue.cancel();
    var afterCancel = q.sent.length;
    await sleep(250);
    check("queue: cancel stops further commands", q.sent.length === afterCancel,
        q.sent.join(","));

    /* --- Macros -------------------------------------------------------------- */

    var macro = await A.macros.save({ label: "Recover", commands: ["stand", "look"] });
    check("macro: saves", !!macro && macro.commands.length === 2);

    var capped = await A.macros.save({
        label: "Too Many",
        commands: ["a", "b", "c", "d", "e", "f", "g"]
    });
    check("macro: enforces the five-command limit",
        capped.commands.length === window.AetosMacros.MAX_COMMANDS,
        String(capped.commands.length));

    var rejected = false;
    try {
        await A.macros.save({ label: "Empty", commands: [] });
    } catch (err) {
        rejected = true;
    }
    check("macro: refuses a macro with no commands", rejected);

    var list = await A.macros.all();
    check("macro: can be listed", list.length >= 2, String(list.length));

    await A.macros.remove(macro.id);
    check("macro: can be deleted",
        (await A.macros.all()).length === list.length - 1);

    /* --- Macros are the player's, permission is the game's -------------------- */

    var blocked = window.AetosMacros.create({
        storage: A.storage,
        queue: makeQueue().queue,
        announce: function () {},
        isAllowed: function () { return false; }
    });
    check("macro: refuses to run when the game forbids macros",
        blocked.run({ label: "X", commands: ["look"] }) === false,
        "the client honours the manifest policy rather than ignoring it");

    /* --- Macro commands are ordinary text -------------------------------------- */

    var macroSent = [];
    var textQueue = window.AetosQueue.create({
        send: function (text) { macroSent.push(text); },
        isConnected: function () { return true; },
        announce: function () {}
    });
    var plainMacros = window.AetosMacros.create({
        storage: A.storage, queue: textQueue,
        announce: function () {}, isAllowed: function () { return true; }
    });
    plainMacros.run({ label: "Plain", commands: ["stand", "north"] });
    await sleep(400);
    check("macro: sends ordinary command text, nothing privileged",
        macroSent.every(function (t) { return typeof t === "string"; }) &&
        macroSent.join(",") === "stand,north",
        macroSent.join(","));

    /* --- Hotbar --------------------------------------------------------------- */

    var hotbarPanel = document.querySelector('[data-aetos-widget="hotbar"]');
    check("hotbar: is mounted", !!hotbarPanel);
    if (hotbarPanel) {
        var toolbar = hotbarPanel.querySelector('[role="toolbar"]');
        check("hotbar: groups its buttons as a toolbar", !!toolbar);
        check("hotbar: toolbar is labelled", toolbar && !!toolbar.getAttribute("aria-label"));

        await A.macros.save({ label: "QA Button", commands: ["look"] });
        // Re-render so the new macro appears.
        var refreshed = false;
        A.layout.instances().forEach(function (inst) {
            if (inst.id === "hotbar" && inst.context && inst.context.refresh) {
                inst.context.refresh();
                refreshed = true;
            }
        });
        await sleep(300);
        var buttons = [...hotbarPanel.querySelectorAll(".aetos-hotbar__button")];
        check("hotbar: renders a button per macro", buttons.length >= 1, String(buttons.length));
        if (buttons.length) {
            check("hotbar: a button's accessible name states what it will do",
                (buttons[0].getAttribute("aria-label") || "").indexOf("look") !== -1,
                buttons[0].getAttribute("aria-label"));
        }
    }

    await A.storage.clear("macros");
    return results;
})();
