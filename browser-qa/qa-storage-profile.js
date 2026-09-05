/*
 * Aetos browser QA -- local storage and profile import/export.
 *
 * Run this in the page context (Playwright `page.evaluate`, or paste into a
 * browser console on the Aetos client). It returns a report object:
 *
 *     { passed: n, failed: n, failures: [...] }
 *
 * These cover behaviour that only exists in a browser -- IndexedDB, the
 * sanitiser's prototype-pollution guards, real Promise ordering -- so they
 * cannot be expressed in the Python suite. The Python suite covers the server.
 *
 * Deliberately dependency-free: the contrib must never require Node, a bundler,
 * or a JS test framework to be verifiable.
 */

(async function aetosStorageQa() {
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

    async function expectReject(name, promise) {
        try {
            await promise;
            check(name, false, "expected rejection, got success");
        } catch (err) {
            check(name, true);
        }
    }

    var A = window.Aetos;
    if (!A || !A.storage || !A.profile) {
        return { passed: 0, failed: 1, failures: ["Aetos.storage / Aetos.profile missing"] };
    }

    var storage = A.storage;
    var profile = A.profile;

    /* --- Store: sync must not wipe non-sync sections -------------------
     *
     * Regression guard. `manifest` arrives in its own message, not in a sync.
     * An earlier applySync() cleared every section except `connection`, which
     * wiped the game's declared capabilities on the first sync and silently
     * disabled every capability-gated widget for the rest of the session.
     * ------------------------------------------------------------------ */

    var store = A.store;
    if (store) {
        store.set("manifest", { features: { resources: true } });
        store.merge("connection", { state: "open" });
        store.applySync({ room: { name: "Somewhere" } });
        store.flushNow();
        check("store: sync preserves the manifest",
            (store.get("manifest").features || {}).resources === true,
            JSON.stringify(store.get("manifest")));
        check("store: sync preserves connection state",
            store.get("connection").state === "open");
        check("store: sync replaces authoritative sections",
            store.get("room").name === "Somewhere");
    }

    /* --- Storage basics ---------------------------------------------- */

    await storage.clearAll();

    await storage.put("notes", "n1", { subject: "Captain Renn", body: "Buys damaged gear." });
    var note = await storage.get("notes", "n1");
    check("storage: round-trips a value", note && note.subject === "Captain Renn");

    var rows = await storage.all("notes");
    check("storage: lists entries", rows.length === 1 && rows[0].key === "n1");

    await storage.remove("notes", "n1");
    check("storage: removes an entry", (await storage.all("notes")).length === 0);

    await expectReject(
        "storage: rejects an unknown namespace",
        storage.put("not_a_namespace", "k", 1));

    check("storage: scope key includes the origin",
        storage.scopeKey.indexOf(window.location.origin) === 0, storage.scopeKey);

    /* --- Privacy panel data ------------------------------------------ */

    await storage.put("relationships", "r1", { name: "Aric", tag: "friend" });
    await storage.put("macros", "m1", { label: "Retreat", commands: ["stand", "flee"] });
    var counts = await storage.counts();
    check("counts: reports per-namespace totals",
        counts.relationships === 1 && counts.macros === 1 && counts.notes === 0,
        JSON.stringify(counts));
    check("counts: covers every namespace",
        Object.keys(counts).length === storage.namespaces.length);

    /* --- Stock Evennia data must never be touched --------------------- */

    window.localStorage.setItem("evenniaGoldenLayoutSavedState", "STOCK-LAYOUT");
    window.localStorage.setItem("aetos:testBootPref", "\"x\"");
    await storage.clearAll();
    check("clearAll: does NOT delete stock Evennia layout state",
        window.localStorage.getItem("evenniaGoldenLayoutSavedState") === "STOCK-LAYOUT");
    check("clearAll: does remove Aetos-prefixed keys",
        window.localStorage.getItem("aetos:testBootPref") === null);
    check("clearAll: empties the namespaces",
        (await storage.all("relationships")).length === 0);
    window.localStorage.removeItem("evenniaGoldenLayoutSavedState");

    /* --- Export ------------------------------------------------------- */

    await storage.put("notes", "n1", { subject: "Tower", body: "Locked at night." });
    await storage.put("themes", "t1", { name: "Dark" });

    var exported = await profile.exportProfile(["notes"], { timestamp: "2026-01-01T00:00:00Z" });
    check("export: stamps the format", exported.format === "aetos-profile");
    check("export: stamps the version", exported.version === 1);
    check("export: includes the selected namespace", !!exported.data.notes);
    check("export: excludes unselected namespaces", exported.data.themes === undefined);

    var full = await profile.exportProfile();
    check("export: defaults to every namespace",
        Object.keys(full.data).length === storage.namespaces.length);

    /* --- Import: envelope validation ---------------------------------- */

    await expectReject("import: rejects non-JSON text", profile.importProfile("{not json"));
    await expectReject("import: rejects a non-object", profile.importProfile([1, 2, 3]));
    await expectReject("import: rejects a foreign format",
        profile.importProfile({ format: "some-other-tool", version: 1, data: {} }));
    await expectReject("import: rejects a missing data section",
        profile.importProfile({ format: "aetos-profile", version: 1 }));
    await expectReject("import: rejects a newer format version",
        profile.importProfile({ format: "aetos-profile", version: 99, data: {} }));

    /* --- Import: hostile content -------------------------------------- */

    await storage.clearAll();

    var hostile = {
        format: "aetos-profile",
        version: 1,
        data: {
            notes: {
                good: { subject: "fine", body: "ordinary" },
                polluted: JSON.parse('{"__proto__": {"pwned": true}, "keep": "yes"}')
            },
            not_a_real_namespace: { x: 1 }
        }
    };
    var report = await profile.importProfile(hostile);

    check("import: drops unknown namespaces",
        report.unknownNamespaces.indexOf("not_a_real_namespace") !== -1);
    check("import: does not create the unknown namespace",
        storage.namespaces.indexOf("not_a_real_namespace") === -1);
    check("import: prototype was not polluted", ({}).pwned === undefined);
    check("import: Object.prototype clean", Object.prototype.pwned === undefined);

    var polluted = await storage.get("notes", "polluted");
    check("import: __proto__ key was stripped from the value",
        polluted && polluted.pwned === undefined && polluted.keep === "yes",
        JSON.stringify(polluted));
    check("import: legitimate entries survive alongside hostile ones",
        (await storage.get("notes", "good")).subject === "fine");

    /* --- Import: bounds ------------------------------------------------ */

    var deep = { v: null };
    var cursor = deep;
    for (var i = 0; i < 60; i++) { cursor.v = { v: null }; cursor = cursor.v; }
    var boundsReport = await profile.importProfile({
        format: "aetos-profile", version: 1,
        data: { notes: { deep: deep, longstr: "x".repeat(60000) } }
    });
    check("import: reports truncation rather than failing", boundsReport.truncated > 0);
    var longStored = await storage.get("notes", "longstr");
    check("import: caps very long strings", typeof longStored === "string" && longStored.length <= 20000,
        longStored ? String(longStored.length) : "missing");

    var funcy = await profile.importProfile({
        format: "aetos-profile", version: 1,
        data: { notes: { fn: { ok: 1 } } }
    });
    check("import: succeeds on ordinary content", funcy.imported >= 1);

    /* --- Import: replace vs merge -------------------------------------- */

    await storage.clearAll();
    await storage.put("notes", "existing", { keep: true });
    await profile.importProfile(
        { format: "aetos-profile", version: 1, data: { notes: { added: { v: 1 } } } });
    check("import: merges by default",
        (await storage.get("notes", "existing")) !== undefined &&
        (await storage.get("notes", "added")) !== undefined);

    await profile.importProfile(
        { format: "aetos-profile", version: 1, data: { notes: { fresh: { v: 1 } } } },
        { replace: true, namespaces: ["notes"] });
    check("import: replace clears first",
        (await storage.get("notes", "existing")) === undefined &&
        (await storage.get("notes", "fresh")) !== undefined);

    /* --- Round trip ---------------------------------------------------- */

    await storage.clearAll();
    await storage.put("macros", "m1", { label: "Recover", commands: ["stand", "drink potion"] });
    var round = await profile.exportProfile(["macros"], {});
    await storage.clearAll();
    await profile.importProfile(profile.toJson(round));
    var restored = await storage.get("macros", "m1");
    check("round trip: survives export -> JSON -> import",
        restored && restored.label === "Recover" && restored.commands.length === 2,
        JSON.stringify(restored));

    await storage.clearAll();

    return results;
})();
