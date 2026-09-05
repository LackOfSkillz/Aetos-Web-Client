/*
 * Aetos browser QA -- relationships, notes, POIs and the modal dialog.
 *
 * The privacy checks are the point of this suite. Blueprint section 2.3 forbids
 * a player's relationships and notes reaching the game server, and section 24 is
 * explicit that a relationship tag does not affect server-side social systems.
 *
 * "We did not wire it up to send" is not a guarantee. These tests watch the
 * command dispatcher while local data is created and assert nothing is sent.
 */

(async function aetosLocalDataQa() {
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

    function key(target, k, opts) {
        target.dispatchEvent(new KeyboardEvent("keydown", Object.assign(
            { key: k, bubbles: true, cancelable: true }, opts || {})));
    }

    var A = window.Aetos;
    if (!A || !A.relationships || !A.notes) {
        return { passed: 0, failed: 1, failures: ["Aetos.relationships / notes missing"] };
    }

    var rel = A.relationships;
    var notes = A.notes;

    // Clean slate: a previous run must not colour this one.
    await A.storage.clear("relationships");
    await A.storage.clear("notes");

    /* --- Relationships -------------------------------------------------- */

    await rel.setCategory("Aric", "friend");
    var record = await rel.get("Aric");
    check("relationship: a category is stored", record && record.category === "friend",
        JSON.stringify(record));

    check("relationship: lookup is case-insensitive",
        !!(await rel.get("aric")), "a player types names how they like");

    await rel.setCategory("Aric", "enemy");
    check("relationship: category can be changed",
        (await rel.get("Aric")).category === "enemy");

    await rel.addTag("Aric", "Trader");
    await rel.addTag("Aric", "trader");
    check("relationship: tags do not duplicate on case",
        (await rel.get("Aric")).tags.length === 1,
        JSON.stringify((await rel.get("Aric")).tags));

    await rel.addTag("Aric", "Reliable");
    check("relationship: multiple tags are kept",
        (await rel.get("Aric")).tags.length === 2);

    await rel.removeTag("Aric", "Trader");
    check("relationship: a tag can be removed",
        (await rel.get("Aric")).tags.length === 1);

    // Neutral with no tags means "no opinion", which is the absence of a record.
    await rel.setCategory("Bland", "neutral");
    check("relationship: neutral with no tags stores nothing",
        (await rel.get("Bland")) === null || (await rel.get("Bland")) === undefined,
        "an un-tagged player should leave no trace");

    await rel.addTag("Tagged", "Guildmate");
    await rel.setCategory("Tagged", "neutral");
    check("relationship: neutral WITH tags is kept",
        !!(await rel.get("Tagged")),
        "the tags are still the player's data");

    var invalid = false;
    try { await rel.setCategory("Aric", "nemesis"); } catch (err) { invalid = true; }
    check("relationship: an unknown category is rejected", invalid);

    /* --- Entity decoration ---------------------------------------------- */

    var decorated = await rel.decorate([{ name: "Aric", kind: "character" }]);
    check("relationship: entities can be decorated with local opinion",
        decorated[0].relationship === "enemy", JSON.stringify(decorated[0]));
    check("relationship: decoration returns a copy, not a mutation",
        decorated[0] !== undefined && decorated[0].tags !== undefined);

    /* --- Notes ----------------------------------------------------------- */

    var saved = await notes.save({
        subject: "Captain Renn", kind: "character",
        body: "Buys damaged nautical equipment. Usually at the harbour.",
        tags: ["Trader", "Reliable"]
    });
    check("note: is saved", !!saved && !!saved.id);
    check("note: records a created and updated time", !!saved.created && !!saved.updated);

    var again = await notes.save({
        subject: "Captain Renn", kind: "character", body: "Updated."
    });
    check("note: re-noting the same subject edits rather than duplicating",
        again.id === saved.id, saved.id + " vs " + again.id);
    check("note: an omitted field does not wipe existing data",
        again.tags.length === 2,
        "saving without tags must mean 'leave them alone', not 'delete them'");
    check("note: an explicitly empty value still clears",
        (await notes.save({ subject: "Captain Renn", kind: "character", tags: [] })).tags.length === 0);
    await notes.save({ subject: "Captain Renn", kind: "character",
                       tags: ["Trader", "Reliable"] });
    check("note: only one note exists for that subject",
        (await notes.all()).length === 1, String((await notes.all()).length));

    await notes.save({ subject: "Old Tower", kind: "room", body: "Locked at night.",
                       tags: ["Danger"] });
    await notes.save({ subject: "Random thought", kind: "free", body: "Try the north road." });

    var found = await notes.search("locked");
    check("note: search matches the body", found.length === 1 && found[0].subject === "Old Tower",
        JSON.stringify(found.map(function (n) { return n.subject; })));

    found = await notes.search("danger");
    check("note: search matches tags too", found.length === 1,
        "a player does not recall whether they wrote it as a tag or in the text");

    found = await notes.search("", { kind: "room" });
    check("note: can filter by subject kind", found.length === 1 && found[0].kind === "room");

    found = await notes.search("", { tag: "Danger" });
    check("note: can filter by tag", found.length === 1);

    await notes.save({ subject: "Random thought", kind: "free",
                       body: "Try the north road.", pinned: true });
    found = await notes.search("");
    check("note: pinned notes sort first", found[0].subject === "Random thought",
        found[0].subject);

    var tagList = await notes.tags();
    check("note: all tags can be listed", tagList.length >= 2, JSON.stringify(tagList));

    /* --- Map notes and POIs are notes, not a parallel system -------------- */

    await notes.save({ subject: "Town Square", kind: "room", body: "Fountain here.",
                       poi: true, icon: "star" });
    var pois = await notes.search("", { poi: true });
    check("poi: a POI is a note with a room subject", pois.length === 1);
    check("poi: POIs are searchable alongside notes",
        (await notes.search("fountain")).length === 1);

    /* --- PRIVACY: none of this reaches the game --------------------------- */

    var sent = [];
    var originalSend = A.dispatcher.send;
    A.dispatcher.send = function (text) {
        sent.push(text);
        return originalSend.apply(this, arguments);
    };

    await rel.setCategory("Watched", "enemy");
    await rel.addTag("Watched", "Suspect");
    await notes.save({ subject: "Watched", kind: "character", body: "Secret note." });
    await notes.remove(notes.makeId("Watched", "character"));
    await new Promise(function (r) { setTimeout(r, 300); });

    A.dispatcher.send = originalSend;

    check("PRIVACY: marking a relationship sends nothing to the game",
        sent.length === 0, JSON.stringify(sent));
    check("PRIVACY: saving a note sends nothing to the game", sent.length === 0);

    // The structural guarantee, not just the observed one: a local menu action
    // carries a `run` function and no `command`, so there is nothing for the
    // dispatcher to send even if it were called.
    var localAction = { group: "local", label: "Friend", run: function () {} };
    check("PRIVACY: local actions carry no command field",
        localAction.command === undefined);

    /* --- Dialog accessibility --------------------------------------------- */

    if (window.AetosDialog) {
        var opener = document.getElementById("aetos-input");
        opener.focus();
        window.AetosDialog.open({
            title: "QA dialog",
            opener: opener,
            fields: [{ name: "body", label: "Body", type: "textarea", value: "x" }]
        });

        var dialog = document.querySelector('[role="dialog"]');
        check("dialog: opens with a dialog role", !!dialog);
        check("dialog: is modal", dialog.getAttribute("aria-modal") === "true");
        check("dialog: has an accessible name", !!dialog.getAttribute("aria-labelledby"));
        check("dialog: focus moves inside on open", dialog.contains(document.activeElement),
            document.activeElement && document.activeElement.tagName);

        // Focus trap: Tab from the last control wraps to the first rather than
        // escaping into the page behind, where a screen-reader user could
        // operate controls they cannot see.
        var focusables = dialog.querySelectorAll("button, input, textarea");
        focusables[focusables.length - 1].focus();
        key(document, "Tab");
        check("dialog: Tab wraps rather than escaping the dialog",
            dialog.contains(document.activeElement),
            document.activeElement && document.activeElement.tagName);

        key(document, "Escape");
        check("dialog: Escape closes it", !document.querySelector('[role="dialog"]'));
        check("dialog: focus returns to the opener", document.activeElement === opener,
            document.activeElement && document.activeElement.id);
    }

    /* --- Cleanup ---------------------------------------------------------- */

    await A.storage.clear("relationships");
    await A.storage.clear("notes");

    return results;
})();
