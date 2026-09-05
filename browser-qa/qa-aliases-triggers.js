/*
 * Aetos browser QA -- aliases and triggers.
 *
 * Blueprint sections 29 and 30. The safety cases are the point: alias recursion
 * and trigger loops are both ways a player can accidentally build something that
 * hangs their browser or spams a game, and neither is obvious when they define
 * the pieces one at a time.
 */

(async function aetosAliasTriggerQa() {
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
    if (!A || !A.aliases || !A.triggers) {
        return { passed: 0, failed: 1, failures: ["Aetos.aliases / triggers missing"] };
    }

    await A.storage.clear("aliases");
    await A.storage.clear("triggers");

    var aliases = A.aliases;

    /* --- Alias expansion ------------------------------------------------- */

    function expand(input, list) {
        return aliases.expand(input, list);
    }

    var simple = [{ id: "hh", pattern: "hh", expansion: "heal head", enabled: true }];
    check("alias: expands a simple shorthand",
        expand("hh", simple).text === "heal head", expand("hh", simple).text);

    check("alias: leaves unmatched input alone",
        expand("look", simple).text === "look");

    check("alias: matching is case-insensitive by default",
        expand("HH", simple).text === "heal head",
        "a player typing in anger means the same thing");

    /* --- Positional arguments --------------------------------------------- */

    var positional = [
        { id: "tt", pattern: "tt", expansion: "tell $1 $*", enabled: true },
        { id: "gt", pattern: "gt", expansion: "get $1 from backpack", enabled: true }
    ];
    check("alias: $1 takes one word",
        expand("gt sword", positional).text === "get sword from backpack",
        expand("gt sword", positional).text);

    check("alias: $* takes the rest of the line",
        expand("tt Bob hello there", positional).text === "tell Bob hello there",
        expand("tt Bob hello there", positional).text);

    var noPlaceholder = [{ id: "g", pattern: "g", expansion: "get", enabled: true }];
    check("alias: arguments are appended when no placeholder is used",
        expand("g lamp", noPlaceholder).text === "get lamp",
        expand("g lamp", noPlaceholder).text);

    var missing = [{ id: "t", pattern: "t", expansion: "tell $1 $2", enabled: true }];
    check("alias: a missing argument does not leave a literal placeholder",
        expand("t Bob", missing).text.indexOf("$") === -1,
        expand("t Bob", missing).text);

    /* --- Chaining ---------------------------------------------------------- */

    var chained = [
        { id: "a", pattern: "a", expansion: "b", enabled: true },
        { id: "b", pattern: "b", expansion: "look", enabled: true }
    ];
    var chainResult = expand("a", chained);
    check("alias: expansions chain", chainResult.text === "look", chainResult.text);
    check("alias: chain depth is reported", chainResult.report.depth === 2,
        String(chainResult.report.depth));

    /* --- RECURSION: the dangerous case -------------------------------------- */

    var cyclic = [
        { id: "x", pattern: "x", expansion: "y", enabled: true },
        { id: "y", pattern: "y", expansion: "x", enabled: true }
    ];
    var cycleResult = expand("x", cyclic);
    check("alias: a cycle terminates rather than hanging", true,
        "reaching this line at all means it returned");
    check("alias: the cycle is reported, not silently truncated",
        cycleResult.report.cycle !== null, JSON.stringify(cycleResult.report));

    var selfRef = [{ id: "s", pattern: "s", expansion: "s more", enabled: true }];
    var selfResult = expand("s", selfRef);
    check("alias: a self-referential alias terminates",
        selfResult.report.cycle !== null || selfResult.report.truncated,
        JSON.stringify(selfResult.report));

    var deep = [];
    for (var i = 0; i < 30; i++) {
        deep.push({ id: "d" + i, pattern: "d" + i, expansion: "d" + (i + 1), enabled: true });
    }
    var deepResult = expand("d0", deep);
    check("alias: depth is bounded",
        deepResult.report.depth <= window.AetosAliases.MAX_DEPTH,
        String(deepResult.report.depth));

    /* --- Disabled aliases ---------------------------------------------------- */

    var disabled = [{ id: "z", pattern: "z", expansion: "look", enabled: false }];
    check("alias: a disabled alias does not expand",
        expand("z", disabled).text === "z");

    /* --- Persistence and validation ------------------------------------------ */

    var savedAlias = await aliases.save({ pattern: "hh", expansion: "heal head" });
    check("alias: saves", !!savedAlias && savedAlias.pattern === "hh");

    var rejected = false;
    try {
        await aliases.save({ pattern: "", expansion: "look" });
    } catch (err) { rejected = true; }
    check("alias: refuses an empty pattern", rejected);

    rejected = false;
    try {
        await aliases.save({ pattern: "q", expansion: "" });
    } catch (err) { rejected = true; }
    check("alias: refuses an empty expansion", rejected);

    var multiword = await aliases.save({ pattern: "two words", expansion: "look" });
    check("alias: a multi-word pattern is reduced to its first token",
        multiword.pattern === "two",
        "an alias matches the first word, so a spaced pattern would never fire");

    /* --- Triggers: text ------------------------------------------------------- */

    var triggers = A.triggers;

    var textTrigger = triggers.normalize({
        id: "bleed", label: "Bleeding", kind: "text",
        pattern: "You begin bleeding", commands: ["bandage"]
    });
    check("trigger: contains-matching works",
        triggers.matchesText(textTrigger, "You begin bleeding badly."));
    check("trigger: contains-matching is case-insensitive",
        triggers.matchesText(textTrigger, "you BEGIN BLEEDING"));
    check("trigger: a non-match does not fire",
        !triggers.matchesText(textTrigger, "You feel fine."));

    var regexTrigger = triggers.normalize({
        id: "hp", label: "Low", kind: "text", mode: "regex",
        pattern: "^HP: [0-9]{1,2}$", commands: ["quaff potion"]
    });
    check("trigger: regex matching works", triggers.matchesText(regexTrigger, "HP: 12"));
    check("trigger: regex anchors are respected",
        !triggers.matchesText(regexTrigger, "current HP: 12 remaining"));

    var badRegex = false;
    try {
        await triggers.save({ label: "Bad", kind: "text", mode: "regex",
                              pattern: "([unclosed", commands: ["look"] });
    } catch (err) { badRegex = true; }
    check("trigger: an invalid regex is rejected at save time", badRegex,
        "otherwise it would throw on every line of game output");

    var noCommands = false;
    try {
        await triggers.save({ label: "Empty", kind: "text", pattern: "x", commands: [] });
    } catch (err) { noCommands = true; }
    check("trigger: refuses a trigger with no commands", noCommands);

    var capped = await triggers.save({
        label: "Many", kind: "text", pattern: "x",
        commands: ["a", "b", "c", "d", "e", "f", "g"]
    });
    check("trigger: command count is capped",
        capped.commands.length <= 5, String(capped.commands.length));

    /* --- Triggers: structured -------------------------------------------------- */

    check("trigger: reads a resource as a fraction",
        typeof triggers.readPath("resources.health") === "number" ||
        triggers.readPath("resources.health") === undefined,
        String(triggers.readPath("resources.health")));

    var structured = triggers.normalize({
        id: "lowhp", label: "Low HP", kind: "structured",
        subject: "resources.health", comparator: "lt", value: 0.99,
        commands: ["look"]
    });
    var healthKnown = triggers.readPath("resources.health") !== undefined;
    if (healthKnown) {
        check("trigger: structured comparison evaluates against live state",
            typeof triggers.matchesStructured(structured) === "boolean");
    }

    var missingSubject = triggers.normalize({
        id: "nope", label: "Nope", kind: "structured",
        subject: "resources.does_not_exist", comparator: "lt", value: 1,
        commands: ["look"]
    });
    check("trigger: an unknown subject never matches",
        triggers.matchesStructured(missingSubject) === false,
        "a typo in a subject must not fire on every sync");

    /* --- LOOP PROTECTION: the dangerous case ------------------------------------ */

    var fired = [];
    var isolated = window.AetosTriggers.create({
        storage: null,
        queue: { run: function (commands) { fired.push(commands.join(",")); return true; } },
        store: A.store,
        announce: function () {},
        isAllowed: function () { return true; }
    });

    var loopy = [isolated.normalize({
        id: "loop", label: "Loop", kind: "text",
        pattern: "echo", commands: ["say echo"], cooldown: 0
    })];

    // Simulate a trigger firing on its own output, over and over.
    for (var n = 0; n < 60; n++) {
        isolated.onText("echo", loopy);
    }
    check("trigger: a runaway loop is rate-limited",
        fired.length <= window.AetosTriggers.RATE_LIMIT,
        String(fired.length) + " firings");
    check("trigger: the looping trigger is disabled, not silently throttled",
        loopy[0].enabled === false,
        "a permanently throttled trigger reads as a broken client");

    /* --- Cooldown ---------------------------------------------------------------- */

    var cooldownFired = [];
    var clock = 0;
    var cooling = window.AetosTriggers.create({
        storage: null,
        queue: { run: function (c) { cooldownFired.push(c.join(",")); return true; } },
        store: A.store,
        announce: function () {},
        isAllowed: function () { return true; },
        now: function () { return clock; }
    });
    var cooled = [cooling.normalize({
        id: "cool", label: "Cool", kind: "text",
        pattern: "hit", commands: ["dodge"], cooldown: 1000
    })];
    cooling.onText("hit", cooled);
    cooling.onText("hit", cooled);
    cooling.onText("hit", cooled);
    check("trigger: cooldown prevents immediate re-firing",
        cooldownFired.length === 1, String(cooldownFired.length));
    clock += 1500;
    cooling.onText("hit", cooled);
    check("trigger: fires again once the cooldown elapses",
        cooldownFired.length === 2, String(cooldownFired.length));

    /* --- Structured triggers are edge-triggered ----------------------------------- */

    var edgeFired = [];
    var edgeStore = {
        get: function () { return { items: [{ id: "hp", value: 10, maximum: 100, minimum: 0 }] }; }
    };
    var edge = window.AetosTriggers.create({
        storage: null,
        queue: { run: function (c) { edgeFired.push(c.join(",")); return true; } },
        store: edgeStore,
        announce: function () {},
        isAllowed: function () { return true; },
        now: (function () { var c = 0; return function () { c += 5000; return c; }; })()
    });
    var edgeTrigger = [edge.normalize({
        id: "edge", label: "Edge", kind: "structured",
        subject: "resources.hp", comparator: "lt", value: 0.5,
        commands: ["heal"], cooldown: 0
    })];
    edge.onState(edgeTrigger);
    edge.onState(edgeTrigger);
    edge.onState(edgeTrigger);
    check("trigger: structured triggers fire on the edge, not every sync",
        edgeFired.length === 1, String(edgeFired.length) +
        " -- a health trigger must not fire once per sync while hurt");

    /* --- Policy -------------------------------------------------------------------- */

    var forbidden = window.AetosTriggers.create({
        storage: null,
        queue: { run: function () { return true; } },
        store: A.store,
        announce: function () {},
        isAllowed: function () { return false; }
    });
    check("trigger: does nothing when the game forbids triggers",
        forbidden.onText("anything", loopy).length === 0);

    var forbiddenAliases = window.AetosAliases.create({
        storage: A.storage,
        isAllowed: function () { return false; },
        announce: function () {}
    });
    check("alias: does not expand when the game forbids aliases",
        forbiddenAliases.expand("hh", simple).text === "hh");

    await A.storage.clear("aliases");
    await A.storage.clear("triggers");
    return results;
})();
