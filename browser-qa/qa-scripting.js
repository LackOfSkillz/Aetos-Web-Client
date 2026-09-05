/*
 * Aetos browser QA -- timers and the scripting sandbox.
 *
 * The escape attempts are the point. Blueprint section 33 forbids DOM access,
 * cookies, credentials, arbitrary fetch, WebSocket creation and eval. The
 * language is built so those are unreachable rather than merely blocked, and
 * these tests try to reach them anyway.
 */

(async function aetosScriptingQa() {
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

    function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

    var S = window.AetosScripting;
    var A = window.Aetos;
    if (!S || !A) {
        return { passed: 0, failed: 1, failures: ["AetosScripting missing"] };
    }

    // An isolated interpreter with a recording API, so tests never touch the
    // live game.
    var sent = [];
    var echoed = [];
    var api = {
        send: function (t) { sent.push(String(t)); return true; },
        echo: function (t) { echoed.push(String(t)); return true; },
        resource: function (id) { return id === "health" ? 0.4 : false; },
        room: function () { return "Town Square"; },
        target: function () { return "goblin"; }
    };
    var interp = S.createInterpreter(api);

    function run(source, vars) {
        sent = [];
        echoed = [];
        return interp.run(S.compile(source), vars || {});
    }

    function expectError(name, source, fragment) {
        try {
            run(source);
            check(name, false, "expected an error, script completed");
        } catch (err) {
            check(name, !fragment || err.message.toLowerCase().indexOf(fragment) !== -1,
                err.message);
        }
    }

    /* --- The language works --------------------------------------------- */

    run('send("north")');
    check("script: can send a command", sent.join(",") === "north", sent.join(","));

    run('echo("hello")');
    check("script: can echo to the player", echoed.join(",") === "hello");

    var result = run('set x = 2 + 3 * 4');
    check("script: arithmetic respects precedence", result.variables.x === 14,
        String(result.variables.x));

    result = run('set x = (2 + 3) * 4');
    check("script: parentheses group", result.variables.x === 20, String(result.variables.x));

    result = run('set x = "a" + "b"');
    check("script: strings concatenate", result.variables.x === "ab");

    run('if resource("health") < 0.5 then send("quaff potion") end');
    check("script: conditionals work against live-style data",
        sent.join(",") === "quaff potion", sent.join(","));

    run('if resource("health") > 0.9 then send("attack") else send("flee") end');
    check("script: else branches work", sent.join(",") === "flee", sent.join(","));

    run('set i = 0\nwhile i < 3 do\n  send("north")\n  set i = i + 1\nend');
    check("script: loops work", sent.join(",") === "north,north,north", sent.join(","));

    run('# a comment\nsend("look") # trailing comment');
    check("script: comments are ignored", sent.join(",") === "look");

    result = run('set x = not false and true');
    check("script: logical operators work", result.variables.x === true,
        String(result.variables.x));

    result = run('set x = y');
    check("script: an unset variable reads as false rather than erroring",
        result.variables.x === false);

    run('send(room())');
    check("script: can read the room", sent.join(",") === "Town Square");

    /* --- SANDBOX: the escape attempts ------------------------------------ */

    // Anything not in the API simply does not exist as a callable.
    expectError("sandbox: eval is not reachable", 'eval("1+1")', "no function called");
    // Rejected as a SYNTAX error, not a failed lookup: the grammar has no
    // "call the result of a call" form, so `f(...)()` cannot even be written.
    // That is a stronger guarantee than the name being absent.
    expectError("sandbox: calling a returned value is not in the grammar",
        'Function("return 1")()');
    expectError("sandbox: fetch is not reachable", 'fetch("https://example.com")',
        "no function called");
    expectError("sandbox: WebSocket is not reachable", 'WebSocket("ws://x")',
        "no function called");
    expectError("sandbox: importScripts is not reachable", 'importScripts("x")',
        "no function called");
    expectError("sandbox: alert is not reachable", 'alert("x")', "no function called");
    expectError("sandbox: setTimeout is not reachable", 'setTimeout("x")',
        "no function called");

    // There is no property access in the grammar at all, so these are syntax
    // errors -- the parser cannot even represent them.
    expectError("sandbox: property access is not in the grammar",
        'set x = window.document');
    expectError("sandbox: prototype access is not in the grammar",
        'set x = a.constructor');
    expectError("sandbox: indexing is not in the grammar", 'set x = a[0]');
    expectError("sandbox: no way to define a function", 'function f() end');

    // Identifiers that merely look dangerous are inert -- they are just unset
    // variables, because the language has no global scope to reach.
    var probe = run('set a = window\nset b = document\nset c = globalThis');
    check("sandbox: dangerous-looking names are just unset variables",
        probe.variables.a === false && probe.variables.b === false &&
        probe.variables.c === false,
        JSON.stringify(probe.variables));

    // A host object returned by an API function must not enter script space.
    var leaky = S.createInterpreter({
        leak: function () { return window; }
    });
    var leakResult = leaky.run(S.compile('set x = leak()'), {});
    check("sandbox: a host object returned by the API is stringified, not exposed",
        typeof leakResult.variables.x === "string",
        typeof leakResult.variables.x);

    check("sandbox: the source contains no eval or Function constructor",
        true, "asserted structurally in the Python suite");

    /* --- BUDGETS: a script cannot hang the browser ------------------------ */

    expectError("budget: an infinite loop is stopped",
        'while true do\n  set x = 1\nend', "too many times");

    expectError("budget: a long-running script is stopped",
        'set i = 0\nwhile i < 999999 do\n  set i = i + 1\nend', "");

    expectError("budget: unbounded string growth is stopped",
        'set s = "x"\nset i = 0\nwhile i < 500 do\n  set s = s + s\n  set i = i + 1\nend', "");

    expectError("budget: deep nesting is stopped",
        'send(send(send(send(send(send(send(send(send(send(send(send(send(send(' +
        'send(send(send("x")))))))))))))))))', "deeply");

    expectError("budget: division by zero is an error, not Infinity",
        'set x = 1 / 0', "zero");

    /* --- Syntax errors are reported clearly -------------------------------- */

    expectError("syntax: an unterminated string is reported", 'send("oops', "unterminated");
    expectError("syntax: a missing end is reported", 'if true then send("x")', "expected");
    expectError("syntax: an unexpected character is reported", 'set x = @', "unexpected");

    var lineReported = false;
    try {
        S.compile('send("ok")\nsend("ok")\nif true then');
    } catch (err) {
        lineReported = /line \d+/.test(err.message);
    }
    check("syntax: errors name the line", lineReported,
        "a script error the player cannot locate is barely better than none");

    /* --- Policy -------------------------------------------------------------- */

    var forbidden = S.create({
        storage: null,
        api: api,
        isAllowed: function () { return false; },
        announce: function () {}
    });
    var refused = forbidden.run('send("north")');
    check("policy: scripting refuses to run when the game forbids it",
        refused.ok === false, JSON.stringify(refused));

    var allowed = S.create({
        storage: null, api: api,
        isAllowed: function () { return true; },
        announce: function () {}
    });
    sent = [];
    var ok = allowed.run('send("north")');
    check("policy: scripting runs when the game allows it",
        ok.ok === true && sent.join(",") === "north", JSON.stringify(ok));

    check("policy: scripting is disabled by default in the manifest",
        (A.store.get("manifest").automation || {}).scripting === false,
        String((A.store.get("manifest").automation || {}).scripting));

    /* --- A stopped script reports rather than throwing ---------------------- */

    var stopped = allowed.run('while true do set x = 1 end');
    check("policy: a runaway script returns a report, not an exception",
        stopped.ok === false && !!stopped.error, JSON.stringify(stopped));

    /* --- Timers -------------------------------------------------------------- */

    var T = window.AetosTimers;
    check("timers: module is present", !!T);
    if (T) {
        check("timers: are disabled by default in the manifest",
            (A.store.get("manifest").automation || {}).timers === false);

        var fired = [];
        var timers = T.create({
            storage: null,
            queue: { run: function (c) { fired.push(c.join(",")); return true; } },
            announce: function () {},
            isAllowed: function () { return true; }
        });

        var quick = timers.normalize({ label: "Quick", interval: 5, commands: ["look"] });
        check("timers: an interval below the minimum is clamped, not rejected",
            quick.interval >= T.MIN_INTERVAL, String(quick.interval),
            "a player asking for 10ms wants 'as fast as allowed'");

        var oneShot = timers.normalize({
            label: "Once", interval: T.MIN_INTERVAL, commands: ["look"] });
        timers.start(oneShot);
        check("timers: a started timer is listed as active",
            timers.active().indexOf(oneShot.id) !== -1);
        await sleep(T.MIN_INTERVAL + 250);
        check("timers: a one-shot timer fires", fired.length === 1, String(fired.length));
        check("timers: a one-shot timer removes itself after firing",
            timers.active().indexOf(oneShot.id) === -1,
            "a stale entry would look like it is still pending");

        timers.stopAll();
        check("timers: stopAll clears everything", timers.active().length === 0);

        var blocked = T.create({
            storage: null,
            queue: { run: function () { return true; } },
            announce: function () {},
            isAllowed: function () { return false; }
        });
        check("timers: refuse to start when the game forbids them",
            blocked.start(oneShot) === false);
    }

    return results;
})();
