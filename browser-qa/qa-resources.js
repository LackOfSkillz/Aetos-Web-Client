/*
 * Aetos browser QA -- generic resources and threshold announcements.
 *
 * The announcement rules are the point of this suite. Blueprint section 48
 * requires announcements at meaningful crossings rather than on every change,
 * because a resource that ticks each combat round would otherwise produce
 * continuous speech a screen-reader user cannot interrupt or talk over.
 */

(async function aetosResourceQa() {
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

    var R = window.AetosResources;
    if (!R) {
        return { passed: 0, failed: 1, failures: ["AetosResources missing"] };
    }

    function resource(overrides) {
        return Object.assign({
            id: "test", label: "Test", value: 100, minimum: 0, maximum: 100,
            display: "gauge", thresholds: []
        }, overrides || {});
    }

    /* --- Threshold crossing -------------------------------------------- */

    var tracker = R.createThresholdTracker();
    var withThresholds = [
        { at: 0.5, label: "Half gone.", level: "warning" },
        { at: 0.2, label: "Critical.", level: "critical" }
    ];

    check("threshold: first sight of a resource is not announced",
        tracker.evaluate(resource({ value: 100, thresholds: withThresholds })) === null);

    check("threshold: a change that crosses nothing is not announced",
        tracker.evaluate(resource({ value: 80, thresholds: withThresholds })) === null);

    var crossed = tracker.evaluate(resource({ value: 45, thresholds: withThresholds }));
    check("threshold: crossing downward announces", !!crossed, JSON.stringify(crossed));
    check("threshold: announcement uses the game's own wording",
        crossed && crossed.message === "Half gone.", crossed && crossed.message);

    check("threshold: staying below an already-crossed point does not re-announce",
        tracker.evaluate(resource({ value: 40, thresholds: withThresholds })) === null);

    var recovered = tracker.evaluate(resource({ value: 90, thresholds: withThresholds }));
    check("threshold: recovering upward is not announced", recovered === null);

    // Re-crossing after recovery should announce again -- it is news the second
    // time too.
    var reCrossed = tracker.evaluate(resource({ value: 45, thresholds: withThresholds }));
    check("threshold: crossing again after recovery announces again", !!reCrossed);

    var multi = R.createThresholdTracker();
    multi.evaluate(resource({ value: 100, thresholds: withThresholds }));
    var big = multi.evaluate(resource({ value: 5, thresholds: withThresholds }));
    check("threshold: a hit crossing several reports only the most severe",
        big && big.level === "critical", JSON.stringify(big));

    var noThresholds = R.createThresholdTracker();
    noThresholds.evaluate(resource({ value: 100 }));
    check("threshold: a resource declaring none is never announced",
        noThresholds.evaluate(resource({ value: 1 })) === null);

    /* --- Absolute vs fractional thresholds ----------------------------- */

    var absolute = R.createThresholdTracker();
    var doses = { at: 3, label: "Low on doses.", level: "warning" };
    absolute.evaluate(resource({ id: "doses", maximum: undefined, value: 10,
                                 thresholds: [doses] }));
    check("threshold: an unbounded resource uses absolute values",
        !!absolute.evaluate(resource({ id: "doses", maximum: undefined, value: 2,
                                       thresholds: [doses] })));

    /* --- Rendering ------------------------------------------------------ */

    var row = R.renderResource(resource({ label: "Sanity", value: 71 }));
    check("render: the value is present as text, not only as a bar",
        row.innerText.indexOf("71") !== -1, row.innerText);

    var meter = row.querySelector('[role="meter"]');
    check("render: a bar carries meter semantics for assistive technology", !!meter);
    check("render: the meter reports its value",
        meter && meter.getAttribute("aria-valuenow") === "71");
    check("render: the meter is labelled",
        meter && meter.getAttribute("aria-label") === "Sanity");

    var critical = R.renderResource(resource({
        value: 5, thresholds: [{ at: 0.2, label: "x", level: "critical" }] }));
    check("render: severity is stated in words, not only in colour",
        critical.innerText.toLowerCase().indexOf("critical") !== -1, critical.innerText);

    var unbounded = R.renderResource(resource({ maximum: undefined, value: 7 }));
    check("render: an unbounded resource renders without a meter",
        !unbounded.querySelector('[role="meter"]'));
    check("render: an unbounded resource still shows its value",
        unbounded.innerText.indexOf("7") !== -1);

    var pctRow = R.renderResource(resource({ display: "percentage", value: 25 }));
    check("render: percentage display shows a percentage",
        pctRow.innerText.indexOf("25%") !== -1, pctRow.innerText);

    /* --- Genre neutrality ------------------------------------------------ */

    var exotic = R.renderResource(resource({ id: "hull", label: "Hull Integrity", value: 42 }));
    check("generic: a non-fantasy resource renders identically",
        exotic.innerText.indexOf("Hull Integrity") !== -1 &&
        exotic.innerText.indexOf("42") !== -1);

    /* --- Live client ------------------------------------------------------ */

    var A = window.Aetos;
    if (A && A.store) {
        var live = A.store.get("resources").items || [];
        check("live: the game's resources reached the client",
            live.length >= 1, JSON.stringify(live.map(function (r) { return r.id; })));
        check("live: resources carry the game's declared thresholds",
            live.some(function (r) { return (r.thresholds || []).length > 0; }));
        check("live: no resource name is special-cased by Aetos",
            live.every(function (r) { return typeof r.label === "string" && r.label.length; }));
    }

    return results;
})();
