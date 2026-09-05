/*
 * Aetos settings: automation editors and the privacy panel.
 *
 * Brings together the editor forms deferred from M12-M14 (macros, aliases,
 * triggers, timers, scripts) and the Privacy & Local Data panel required by
 * blueprint section 63.
 *
 * TWO PRINCIPLES SHAPE THIS FILE.
 *
 * 1. AN EDITOR IS NEVER OFFERED FOR SOMETHING THE GAME FORBIDS.
 *
 *    Section 32 is explicit: if scripting is disabled, no scripting editor
 *    appears. Not a disabled button, not an editor that refuses on save -- the
 *    entry is simply absent. Offering a form that cannot work wastes the
 *    player's time and misrepresents the game.
 *
 * 2. THE PRIVACY PANEL SHOWS WHAT IS ACTUALLY THERE.
 *
 *    Counts are read from storage rather than assumed, so the panel cannot
 *    drift from reality. A privacy screen that under-reports is worse than none,
 *    because it is actively reassuring about something it has not checked.
 */

(function (window, document) {
    "use strict";

    function createSettings(services) {
        var storage = services.storage;
        var profile = services.profile;
        var announce = services.announce || function () {};
        var dialog = services.dialog;

        /* --- Small helpers ------------------------------------------------ */

        function lines(value) {
            return String(value || "")
                .split("\n")
                .map(function (line) { return line.trim(); })
                .filter(Boolean);
        }

        function commaList(value) {
            return String(value || "")
                .split(",")
                .map(function (entry) { return entry.trim(); })
                .filter(Boolean);
        }

        function report(promise, what) {
            return promise.then(function (saved) {
                announce(what + " saved.");
                return saved;
            }).catch(function (err) {
                // The engines reject with useful messages; surfacing them beats
                // a generic failure the player cannot act on.
                announce(err.message);
                return null;
            });
        }

        /* --- Alias editor -------------------------------------------------- */

        function editAlias(existing) {
            var alias = existing || {};
            dialog.open({
                title: existing ? "Edit alias" : "New alias",
                description:
                    "The first word you type is replaced. Use $1 for one word " +
                    "and $* for the rest, so 'tell $1 $*' turns 'tt Bob hi there' " +
                    "into 'tell Bob hi there'.",
                fields: [
                    { name: "pattern", label: "When I type", value: alias.pattern || "" },
                    { name: "expansion", label: "Send instead", value: alias.expansion || "" }
                ],
                onSubmit: function (values) {
                    report(services.aliases.save({
                        id: alias.id,
                        pattern: values.pattern,
                        expansion: values.expansion
                    }), "Alias");
                }
            });
        }

        /* --- Trigger editor -------------------------------------------------- */

        function editTrigger(existing) {
            var trigger = existing || { kind: "text", mode: "contains" };
            dialog.open({
                title: existing ? "Edit trigger" : "New trigger",
                description:
                    "Runs commands when the game says something. Structured " +
                    "triggers are more reliable where a game exposes data -- " +
                    "text matching breaks when a game rewords a message.",
                fields: [
                    { name: "label", label: "Name", value: trigger.label || "" },
                    {
                        name: "pattern",
                        label: "When the game says (text triggers)",
                        value: trigger.pattern || ""
                    },
                    {
                        name: "regex",
                        label: "Treat as a regular expression",
                        type: "checkbox",
                        value: trigger.mode === "regex"
                    },
                    {
                        name: "commands",
                        label: "Then run (one command per line, max 5)",
                        type: "textarea",
                        value: (trigger.commands || []).join("\n")
                    }
                ],
                onSubmit: function (values) {
                    report(services.triggers.save({
                        id: trigger.id,
                        label: values.label,
                        kind: "text",
                        pattern: values.pattern,
                        mode: values.regex ? "regex" : "contains",
                        commands: lines(values.commands)
                    }).then(function (saved) {
                        services.reloadTriggers();
                        return saved;
                    }), "Trigger");
                }
            });
        }

        /* --- Timer editor ---------------------------------------------------- */

        function editTimer(existing) {
            var timer = existing || {};
            dialog.open({
                title: existing ? "Edit timer" : "New timer",
                description:
                    "Runs commands on a schedule, even while you are not typing. " +
                    "Your game has allowed this; be sure its rules permit " +
                    "unattended play.",
                fields: [
                    { name: "label", label: "Name", value: timer.label || "" },
                    {
                        name: "seconds",
                        label: "Every (seconds)",
                        value: String((timer.interval || 60000) / 1000)
                    },
                    {
                        name: "repeat",
                        label: "Repeat (otherwise runs once)",
                        type: "checkbox",
                        value: timer.repeat !== false
                    },
                    {
                        name: "commands",
                        label: "Run (one command per line, max 5)",
                        type: "textarea",
                        value: (timer.commands || []).join("\n")
                    }
                ],
                onSubmit: function (values) {
                    var seconds = parseFloat(values.seconds);
                    report(services.timers.save({
                        id: timer.id,
                        label: values.label,
                        interval: (isFinite(seconds) ? seconds : 60) * 1000,
                        repeat: values.repeat,
                        commands: lines(values.commands)
                    }).then(function (saved) {
                        if (saved) {
                            services.timers.start(saved);
                        }
                        return saved;
                    }), "Timer");
                }
            });
        }

        /* --- Script editor ---------------------------------------------------- */

        function editScript(existing) {
            var script = existing || {};
            dialog.open({
                title: existing ? "Edit script" : "New script",
                description:
                    "Aetos Script. Available: send, echo, resource, room, target, " +
                    "get, set. It cannot reach the web, your files, or the page -- " +
                    "only these.",
                fields: [
                    { name: "label", label: "Name", value: script.label || "" },
                    {
                        name: "source",
                        label: "Script",
                        type: "textarea",
                        rows: 12,
                        value: script.source ||
                            'if resource("health") < 0.3 then\n  send("quaff potion")\nend'
                    }
                ],
                onSubmit: function (values) {
                    // save() compiles, so a syntax error is reported here with
                    // its line rather than the first time the script runs.
                    report(services.scripting.save({
                        id: script.id,
                        label: values.label,
                        source: values.source
                    }), "Script");
                }
            });
        }


        /* --- Automation groups (E3) ------------------------------------- */

        /*
         * One switch for a set of related automation.
         *
         * The list states, for every group, how many rules it currently
         * suppresses. A player looking at a trigger that is not firing needs to
         * know whether they turned it off or their group did -- those have
         * completely different fixes, and a rule that silently does nothing is
         * indistinguishable from a rule that is broken.
         */
        function openGroups() {
            var groups = services.groups;
            if (!groups) {
                return null;
            }

            var body = document.createElement("div");

            var explanation = document.createElement("p");
            explanation.className = "aetos-dialog__description";
            explanation.textContent =
                "A group switches related automation on and off together. A rule " +
                "runs only when both it and its group are enabled -- turning a " +
                "group on never re-enables a rule you switched off yourself.";
            body.appendChild(explanation);

            var notice = document.createElement("p");
            notice.className = "aetos-dialog__description";
            notice.textContent =
                "Nothing changes a group except you. Switching workspace does not, " +
                "and neither does anything the game sends.";
            body.appendChild(notice);

            var list = document.createElement("ul");
            list.className = "aetos-privacy__list";
            list.setAttribute("tabindex", "0");
            list.setAttribute("aria-label", "Automation groups");

            var all = groups.all();
            if (!all.length) {
                var empty = document.createElement("p");
                empty.className = "aetos-dialog__description";
                empty.textContent = "No groups yet.";
                body.appendChild(empty);
            }

            all.forEach(function (group) {
                var row = document.createElement("li");
                row.className = "aetos-privacy__row";

                var button = document.createElement("button");
                button.type = "button";
                button.className = "aetos-list__button";
                button.textContent = group.name;
                // Pressed state, not a colour: the switch has to be readable
                // to somebody who cannot see the styling.
                button.setAttribute("aria-pressed", group.enabled ? "true" : "false");
                button.addEventListener("click", function () {
                    groups.toggle(group.id, countMembers(group.id)).then(function () {
                        openGroups();
                    });
                });

                var state = document.createElement("span");
                state.className = "aetos-privacy__count";
                var members = countMembers(group.id);
                state.textContent = group.enabled
                    ? "on, " + members + (members === 1 ? " rule" : " rules")
                    : "off, " + members + (members === 1 ? " rule" : " rules") +
                        " suppressed";

                row.appendChild(button);
                row.appendChild(state);
                list.appendChild(row);
            });

            body.appendChild(list);

            dialog.open({
                title: "Automation groups",
                content: body,
                submitLabel: "New group",
                fields: [],
                onSubmit: function () { editGroup(null); }
            });
            return true;
        }

        /*
         * How many rules belong to a group.
         *
         * Counted across every automation surface rather than tracked, because
         * a count that is stored can disagree with reality and a count that is
         * derived cannot.
         */
        function countMembers(groupId) {
            var total = 0;
            [services.aliases, services.triggers, services.timers,
             services.scripting, services.displayRules].forEach(function (engine) {
                if (!engine || typeof engine.all !== "function") {
                    return;
                }
                try {
                    total += engine.all().filter(function (rule) {
                        return rule.group === groupId;
                    }).length;
                } catch (err) {
                    // An engine that fails to enumerate costs its own count,
                    // not the dialog.
                }
            });
            return total;
        }

        function editGroup(existing) {
            var group = existing || {};
            dialog.open({
                title: existing ? "Edit group" : "New group",
                description:
                    "Give the group a name you would recognise in a hurry -- " +
                    "Combat, Crafting, Roleplay. You assign rules to it when " +
                    "you edit them.",
                fields: [
                    { name: "name", label: "Name", value: group.name || "" },
                    {
                        name: "description",
                        label: "What it is for (optional)",
                        value: group.description || ""
                    },
                    {
                        name: "enabled",
                        label: "Enabled",
                        type: "checkbox",
                        value: group.enabled !== false
                    }
                ],
                onSubmit: function (values) {
                    report(services.groups.save({
                        id: group.id,
                        name: values.name,
                        description: values.description,
                        enabled: values.enabled
                    }), "Group");
                }
            });
        }

        /* --- Display rules (deferred from E2) ---------------------------- */

        /*
         * Highlight, substitute, filter and collapse.
         *
         * The description says plainly what these do and do not do, because
         * "filter" reads like "delete" to anyone who has used another client,
         * and the difference is the entire point.
         */
        function editDisplayRule(existing) {
            var rule = existing || { kind: "highlight" };
            dialog.open({
                title: existing ? "Edit display rule" : "New display rule",
                description:
                    "Changes how game output looks. It never changes what " +
                    "happened: a hidden line is still in your history, still " +
                    "searchable, and still triggers whatever was watching for it.",
                fields: [
                    { name: "label", label: "Name", value: rule.label || "" },
                    {
                        name: "kind",
                        label: "highlight, substitute, filter or collapse",
                        value: rule.kind || "highlight"
                    },
                    { name: "pattern", label: "When output contains", value: rule.pattern || "" },
                    {
                        name: "regex",
                        label: "Treat as a regular expression",
                        type: "checkbox",
                        value: rule.regex === true
                    },
                    {
                        name: "replacement",
                        label: "Replace with (substitute only)",
                        value: rule.replacement || ""
                    },
                    {
                        name: "group",
                        label: "Automation group (optional)",
                        value: rule.group || ""
                    }
                ],
                onSubmit: function (values) {
                    report(services.displayRules.save({
                        id: rule.id,
                        kind: values.kind,
                        label: values.label,
                        pattern: values.pattern,
                        regex: values.regex,
                        replacement: values.replacement,
                        group: values.group
                    }), "Display rule");
                }
            });
        }

        /* --- Privacy and local data --------------------------------------------
         *
         * Section 63. The player should be able to see exactly what is kept
         * about them, export it, and delete it.
         */

        var FRIENDLY_NAMES = {
            layouts: "Layouts",
            workspaces: "Workspaces",
            macros: "Macros",
            aliases: "Aliases",
            triggers: "Triggers and timers",
            scripts: "Scripts",
            variables: "Script variables",
            relationships: "Relationship tags",
            notes: "Notes",
            map_notes: "Map notes",
            map_pois: "Map points of interest",
            display_rules: "Display rules",
            themes: "Themes",
            keybindings: "Keybindings",
            preferences: "Preferences",
            automation_profiles: "Automation groups"
        };

        function openPrivacy() {
            storage.counts().then(function (counts) {
                storage.isPersistent().then(function (persistent) {
                    var body = document.createElement("div");

                    var explanation = document.createElement("p");
                    explanation.className = "aetos-dialog__description";
                    explanation.textContent = persistent
                        ? "Everything below is stored in this browser only. " +
                          "It is never sent to the game server."
                        : "This browser is not storing data (private mode or " +
                          "blocked storage), so nothing here will survive the session.";
                    body.appendChild(explanation);

                    var table = document.createElement("ul");
                    table.className = "aetos-privacy__list";
                    /*
                     * Focusable, because it scrolls.
                     *
                     * Arrow keys scroll whatever has focus, so a scrolling
                     * region outside the tab order cannot be scrolled by
                     * keyboard at all -- the player can see there is more and
                     * has no way to reach it. Found by axe as
                     * `scrollable-region-focusable`; invisible to anyone
                     * testing with a mouse wheel.
                     *
                     * A focusable region needs a name, or it is announced as
                     * an unlabelled group.
                     *
                     * The name goes on the <ul> without touching its role. An
                     * earlier attempt set role="group" here, which stripped the
                     * implicit `list` role and orphaned every <li> -- axe
                     * caught it immediately as `listitem`. A list can carry an
                     * accessible name perfectly well as a list.
                     */
                    table.setAttribute("tabindex", "0");
                    table.setAttribute("aria-label", "Stored data by category");
                    var total = 0;
                    storage.namespaces.forEach(function (namespace) {
                        var count = counts[namespace] || 0;
                        total += count;
                        var row = document.createElement("li");
                        row.className = "aetos-privacy__row";
                        var name = document.createElement("span");
                        name.textContent = FRIENDLY_NAMES[namespace] || namespace;
                        var value = document.createElement("span");
                        value.className = "aetos-privacy__count";
                        value.textContent = String(count);
                        row.appendChild(name);
                        row.appendChild(value);
                        table.appendChild(row);
                    });
                    body.appendChild(table);

                    var summary = document.createElement("p");
                    summary.className = "aetos-dialog__description";
                    summary.textContent = total === 0
                        ? "Nothing is stored yet."
                        : total + " item" + (total === 1 ? "" : "s") + " in total.";
                    body.appendChild(summary);

                    dialog.open({
                        title: "Privacy and local data",
                        content: body,
                        submitLabel: "Export everything",
                        extraActions: [
                            {
                                label: "Clear all Aetos data",
                                // Destructive, so it confirms. The confirmation
                                // names what will go, because "are you sure?"
                                // without specifics is not informed consent.
                                run: function () {
                                    dialog.open({
                                        title: "Clear all Aetos data?",
                                        description:
                                            "This deletes " + total + " stored item" +
                                            (total === 1 ? "" : "s") +
                                            " -- layouts, macros, notes, relationship " +
                                            "tags and the rest. It cannot be undone. " +
                                            "Your game account is not affected, and " +
                                            "nothing belonging to other software is " +
                                            "touched.",
                                        submitLabel: "Delete everything",
                                        fields: [],
                                        onSubmit: function () {
                                            storage.clearAll().then(function () {
                                                announce("All Aetos data cleared.");
                                            });
                                        }
                                    });
                                }
                            }
                        ],
                        fields: [],
                        onSubmit: function () {
                            exportProfile();
                        }
                    });
                });
            });
        }

        /* --- Export and import ------------------------------------------------- */

        function exportProfile() {
            profile.exportProfile(null, {
                timestamp: new Date().toISOString(),
                game: services.gameName
            }).then(function (data) {
                var text = profile.toJson(data);
                var blob = new window.Blob([text], { type: "application/json" });
                var url = window.URL.createObjectURL(blob);
                var link = document.createElement("a");
                link.href = url;
                link.download = "aetos-profile.json";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                // Revoke on the next tick, not immediately: revoking before the
                // browser has started the download cancels it.
                window.setTimeout(function () { window.URL.revokeObjectURL(url); }, 1000);
                announce("Profile exported.");
            });
        }

        function importProfile() {
            var picker = document.createElement("input");
            picker.type = "file";
            picker.accept = "application/json,.json";
            picker.addEventListener("change", function () {
                var file = picker.files && picker.files[0];
                if (!file) {
                    return;
                }
                var reader = new window.FileReader();
                reader.onload = function () {
                    profile.importProfile(reader.result).then(function (result) {
                        // Report what was refused as well as what landed. An
                        // import that silently drops half a file is worse than
                        // one that says so.
                        var message = "Imported " + result.imported + " item" +
                            (result.imported === 1 ? "" : "s") + ".";
                        if (result.rejected) {
                            message += " " + result.rejected + " rejected.";
                        }
                        if (result.unknownNamespaces.length) {
                            message += " Unknown sections ignored: " +
                                result.unknownNamespaces.join(", ") + ".";
                        }
                        announce(message);
                    }).catch(function (err) {
                        announce("Import failed: " + err.message);
                    });
                };
                reader.readAsText(file);
            });
            picker.click();
        }

        return {
            editAlias: editAlias,
            editTrigger: editTrigger,
            editTimer: editTimer,
            editScript: editScript,
            openGroups: openGroups,
            editGroup: editGroup,
            editDisplayRule: editDisplayRule,
            openPrivacy: openPrivacy,
            exportProfile: exportProfile,
            importProfile: importProfile
        };
    }

    window.AetosSettings = { create: createSettings };

})(window, document);
