/*
 * Aetos accessibility mode and its options.  A9, then A10.
 *
 * One visible control that switches between the standard interface and the
 * accessible one, and the picker that belongs to the second.
 *
 * WHY IT EXISTS. The preferences it shows are not new -- every one has worked
 * since the A-track built it, and every one is in Settings. The problem was that
 * they sat across five groups of a panel reached from the command palette, and
 * **almost nobody would ever find them**. Granularity was right and it created a
 * discovery problem.
 *
 * WHAT THE TOGGLE DOES. A9 shipped it as a disclosure: the panel hid and every
 * setting stayed applied. Gary asked for the sharper version -- two modes, "so
 * we dont have to try to be everything to everybody" -- and that is A10.
 * Standard mode stops the governed accommodations applying. Accessible mode
 * resumes them.
 *
 * IT MASKS; IT NEVER ERASES. Switching to standard leaves every stored value
 * untouched, so switching back restores the interface somebody built rather than
 * a fresh one. That is what makes the switch safe to try, and it is the whole
 * difference between a mode and a reset.
 *
 * WHAT IS NOT GOVERNED BY IT. Keyboard operation, focus management, landmarks,
 * accessible names, the announcer, colour never carrying meaning alone. Those
 * are unconditional in both modes and are listed in the panel as such --
 * somebody deciding whether to switch deserves to know what was never off.
 *
 * Three of the panel's own options are not governed either, because their
 * defaults are the *less* accessible value: reverting gestures, mute or
 * orientation help would impose an accommodation's opposite on the person who
 * asked for it. See `revertsInStandardMode` in preferences.js.
 */

(function (window, document) {
    "use strict";

    var PANEL_ID = "aetos-accessibility-panel";

    /*
     * Human-readable choices for the enumerated preferences.
     *
     * Written out rather than derived from the stored values, because
     * "reduced-stimulation" is a key and "Calmer" is a word. A picker whose
     * options read like configuration is a picker that fails the people it is
     * for.
     */
    var CHOICES = {
        "visual.contrast": [
            ["standard", "Standard"],
            ["high", "High contrast"]
        ],
        "visual.motion": [
            ["system", "Follow my system setting"],
            ["reduced", "Reduce motion"],
            ["full", "Full motion"]
        ],
        "visual.stimulation": [
            ["standard", "Standard"],
            ["reduced", "Reduced"],
            ["minimal", "Minimal"]
        ],
        "screenReader.announcementMode": [
            ["selective", "Only what I chose"],
            ["all", "Everything"],
            ["minimal", "As little as possible"]
        ],
        "visual.typeface": [
            ["proportional", "Normal lettering"],
            ["monospace", "Fixed-width lettering"]
        ]
    };

    function createAccessibilityPanel(services) {
        var preferences = services.preferences;
        var announce = services.announce || function () {};
        var focusManager = services.focusManager || null;
        var schema = window.AetosAccessibilityPreferences || {};
        var host = null;
        var toggleButton = null;
        var optionsButton = null;

        /*
         * Whether the options are on screen.
         *
         * Deliberately NOT a stored preference. The mode is a lasting choice
         * about which interface you are in; having the settings open is a thing
         * you are doing this minute. Persisting it would mean the panel came
         * back every session for somebody who opened it once.
         */
        var optionsShown = false;

        function isAccessible() {
            return preferences.value("shell.mode") === "accessible";
        }

        function isOpen() {
            return optionsShown;
        }

        /*
         * Whether the starting-point question is still owed.  A12.
         *
         * Only in accessible mode: standard mode is the client as it comes, and
         * putting an accessibility question in front of somebody who has not
         * asked for one is the presumption A10 was right to avoid.
         *
         * `null` is "never asked". Every other value -- including "custom" --
         * is an answer, which is why choosing to set things up by hand has to
         * be a preset rather than a way of dismissing the chooser.
         */
        function needsChooser() {
            return isAccessible() && preferences.value("shell.preset") === null;
        }

        /*
         * The options this mode can actually apply.
         *
         * Standard mode is not empty -- text size, sound, gestures and
         * orientation help all apply there, because none of them is reverted by
         * the switch. Showing the full list in standard mode would offer
         * controls that do nothing; hiding the panel entirely would take text
         * size away from the people most likely to need it.
         */
        function entriesForMode() {
            var all = schema.GOVERNED || [];
            if (isAccessible()) {
                return all;
            }
            return all.filter(function (entry) {
                return !entry.revertsInStandardMode;
            });
        }

        /*
         * Write one preference.
         *
         * Paths are `group.key`, which is the shape `update` takes. Split here
         * rather than teaching the panel about the schema's structure.
         */
        function set(path, value) {
            var parts = path.split(".");
            var patch = {};
            patch[parts[0]] = {};
            patch[parts[0]][parts[1]] = value;
            return preferences.update(patch);
        }

        function labelled(control, text, detail, id) {
            var wrapper = document.createElement("div");
            wrapper.className = "aetos-a11y-panel__row";

            var label = document.createElement("label");
            label.className = "aetos-a11y-panel__label";
            label.setAttribute("for", id);
            label.textContent = text;

            var note = document.createElement("p");
            note.className = "aetos-a11y-panel__detail";
            note.id = id + "-detail";
            note.textContent = detail;

            // Described by the note rather than labelled by it: the label is
            // the name, and the sentence underneath is the explanation. Merging
            // them makes an accessible name three lines long.
            control.setAttribute("aria-describedby", note.id);
            control.id = id;

            wrapper.appendChild(label);
            wrapper.appendChild(control);
            wrapper.appendChild(note);
            return wrapper;
        }

        function booleanControl(entry, id) {
            var input = document.createElement("input");
            input.type = "checkbox";
            input.className = "aetos-a11y-panel__checkbox";
            input.checked = !!preferences.value(entry.path);
            input.addEventListener("change", function () {
                set(entry.path, input.checked);
                announce(entry.label + ": " + (input.checked ? "on" : "off"));
            });
            return labelled(input, entry.label, entry.detail, id);
        }

        function enumControl(entry, id) {
            var select = document.createElement("select");
            select.className = "aetos-a11y-panel__select";
            var current = preferences.value(entry.path);
            (CHOICES[entry.path] || []).forEach(function (choice) {
                var option = document.createElement("option");
                option.value = choice[0];
                option.textContent = choice[1];
                if (choice[0] === current) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
            select.addEventListener("change", function () {
                set(entry.path, select.value);
                announce(entry.label + ": " + select.options[select.selectedIndex].textContent);
            });
            return labelled(select, entry.label, entry.detail, id);
        }

        function rangeControl(entry, id) {
            /*
             * A native range input, not a custom slider.
             *
             * It arrives already operable by keyboard, already announced with
             * its value, and already understood by every assistive technology
             * the player might use. A hand-built one starts at none of that.
             */
            var bounds = (schema.RANGES && schema.RANGES[entry.path]) || [0.75, 2.5];
            var input = document.createElement("input");
            input.type = "range";
            input.className = "aetos-a11y-panel__range";
            input.min = String(bounds[0]);
            input.max = String(bounds[1]);
            input.step = "0.05";
            input.value = String(preferences.value(entry.path));

            var output = document.createElement("span");
            output.className = "aetos-a11y-panel__value";

            function show() {
                output.textContent = Math.round(parseFloat(input.value) * 100) + "%";
            }
            show();

            input.addEventListener("input", function () {
                show();
                set(entry.path, parseFloat(input.value));
            });

            var row = labelled(input, entry.label, entry.detail, id);
            row.insertBefore(output, row.querySelector("." + "aetos-a11y-panel__detail"));
            return row;
        }

        function controlFor(entry, id) {
            if (entry.kind === "boolean") {
                return booleanControl(entry, id);
            }
            if (entry.kind === "enum") {
                return enumControl(entry, id);
            }
            if (entry.kind === "range") {
                return rangeControl(entry, id);
            }
            return null;
        }

        /*
         * The options, in named groups.  A12.
         *
         * This used to append all eleven into one grid, which measured five
         * columns wide and made the reading order zig-zag across a whole 1920px
         * screen. Grouping is not decoration: COGA's guidance is about how many
         * things are in front of somebody at once, and a heading every three or
         * four controls is what turns a list into a place you can navigate.
         *
         * Each group is a `group` with its heading as the accessible name, so a
         * screen reader gets the same structure the eye does rather than eleven
         * undifferentiated controls.
         */
        function buildControls(container) {
            var available = entriesForMode();
            var byPath = {};
            available.forEach(function (entry) {
                byPath[entry.path] = entry;
            });

            var placed = {};
            var index = 0;

            function addGroup(label, entries) {
                if (!entries.length) {
                    return;
                }
                var group = document.createElement("div");
                group.className = "aetos-a11y-panel__group";
                group.setAttribute("role", "group");

                var heading = document.createElement("h3");
                heading.className = "aetos-a11y-panel__group-heading";
                heading.id = "aetos-a11y-group-"
                    + label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
                heading.textContent = label;
                group.setAttribute("aria-labelledby", heading.id);
                group.appendChild(heading);

                var options = document.createElement("div");
                options.className = "aetos-a11y-panel__options";
                entries.forEach(function (entry) {
                    var row = controlFor(entry, "aetos-a11y-opt-" + index);
                    index += 1;
                    if (row) {
                        options.appendChild(row);
                    }
                });
                group.appendChild(options);
                container.appendChild(group);
            }

            (schema.SECTIONS || []).forEach(function (section) {
                var entries = [];
                section.paths.forEach(function (path) {
                    if (byPath[path]) {
                        entries.push(byPath[path]);
                        placed[path] = true;
                    }
                });
                addGroup(section.label, entries);
            });

            // Anything the sections forgot. A test asserts this is empty; it
            // renders anyway so that adding a preference and not listing it
            // costs a heading rather than the control itself.
            addGroup(
                "More",
                available.filter(function (entry) {
                    return !placed[entry.path];
                })
            );
        }

        /*
         * The starting point chooser.  A12.
         *
         * Shown instead of the options when somebody has turned accessible mode
         * on and has never been asked. One question, five answers, in the words
         * a person would use about their own situation -- against the eleven
         * technical decisions this panel used to open with.
         *
         * Buttons rather than radios: choosing one *does* something
         * immediately, and a radio group implies a pending Apply. The list is a
         * `list` so the number of choices is announced up front, which is the
         * thing that tells somebody how long this will take.
         */
        function buildChooser(container) {
            var heading = document.createElement("h2");
            heading.className = "aetos-a11y-panel__heading";
            heading.textContent = "What would help most?";

            var intro = document.createElement("p");
            intro.className = "aetos-a11y-panel__detail";
            intro.textContent =
                "Pick the closest one and the client changes straight away. "
                + "You can change any of it afterwards, and nothing here is "
                + "permanent.";

            container.appendChild(heading);
            container.appendChild(intro);

            var list = document.createElement("ul");
            list.className = "aetos-a11y-panel__choices";

            (schema.PRESETS || []).forEach(function (preset) {
                var item = document.createElement("li");

                var button = document.createElement("button");
                button.type = "button";
                button.className = "aetos-a11y-panel__choice";
                button.setAttribute(
                    "aria-describedby", "aetos-a11y-preset-" + preset.name
                );

                var name = document.createElement("span");
                name.className = "aetos-a11y-panel__choice-label";
                name.textContent = preset.label;

                var detail = document.createElement("span");
                detail.className = "aetos-a11y-panel__choice-detail";
                detail.id = "aetos-a11y-preset-" + preset.name;
                detail.textContent = preset.detail;

                button.appendChild(name);
                button.appendChild(detail);
                button.addEventListener("click", function () {
                    choose(preset.name);
                });

                item.appendChild(button);
                list.appendChild(item);
            });

            container.appendChild(list);
        }

        /*
         * Take a starting point, and say what happened.
         *
         * The announcement names the way back in the same breath as the change.
         * Somebody who has just altered the contrast and type size of their
         * whole client on one keypress needs to hear that it is undoable before
         * they need to hear anything else.
         */
        function choose(name) {
            var preset = null;
            (schema.PRESETS || []).forEach(function (candidate) {
                if (candidate.name === name) {
                    preset = candidate;
                }
            });
            if (!preset) {
                return null;
            }
            preferences.applyPreset(name);
            render();
            if (focusManager && focusManager.focusFirst) {
                focusManager.focusFirst(host);
            }
            announce(
                preset.name === "custom"
                    ? "Every setting is listed below. Nothing has been changed."
                    : preset.label + " applied. Every setting is listed below "
                        + "and any of them can be changed."
            );
            return preset.name;
        }

        function buildUnconditional(container) {
            var heading = document.createElement("h3");
            heading.className = "aetos-a11y-panel__heading";
            heading.textContent = "Always on";

            var note = document.createElement("p");
            note.className = "aetos-a11y-panel__detail";
            note.textContent =
                "These are not options. They are how the client is built, and "
                + "they are the same whether this panel is open or closed.";

            var list = document.createElement("ul");
            list.className = "aetos-a11y-panel__always";
            (schema.UNCONDITIONAL || []).forEach(function (line) {
                var item = document.createElement("li");
                item.textContent = line;
                list.appendChild(item);
            });

            container.appendChild(heading);
            container.appendChild(note);
            container.appendChild(list);
        }

        function render() {
            if (!host) {
                return;
            }
            host.textContent = "";
            host.hidden = !isOpen();
            if (optionsButton) {
                // Shown in both modes: standard mode still has text size.
                optionsButton.hidden = false;
                optionsButton.setAttribute("aria-expanded", isOpen() ? "true" : "false");
            }
            if (toggleButton) {
                /*
                 * `aria-checked` on a `switch`, not `aria-pressed` on a button
                 * and not `aria-expanded` on a disclosure.
                 *
                 * It is a two-state control: a switch announces "on" and "off",
                 * which is what this is. `aria-pressed` would say "pressed",
                 * which describes the act rather than the state, and
                 * `aria-expanded` would claim it merely reveals a panel -- while
                 * it is in fact changing the contrast and type size of the whole
                 * client.
                 */
                /*
                 * `isAccessible()`, not `isOpen()`.
                 *
                 * They were the same function until the options were split out
                 * of the mode, and this line kept the old one -- so the switch
                 * would have reported whether the settings panel was open
                 * rather than which mode you were in. It reads correctly only
                 * when both happen to agree, which is exactly how a defect like
                 * this survives a quick look.
                 */
                toggleButton.setAttribute("aria-checked", isAccessible() ? "true" : "false");
                toggleButton.setAttribute(
                    "title",
                    isAccessible()
                        ? "Accessible mode is on. Ctrl+Shift+A switches back."
                        : "Switch to accessible mode. Ctrl+Shift+A."
                );
            }
            if (!isOpen()) {
                return;
            }

            /*
             * Never asked, and in accessible mode: ask.  A12.
             *
             * This is the whole answer to "you flip the switch and nothing
             * happens". It happens once -- taking any starting point, including
             * "let me choose each setting myself", records an answer and this
             * never appears again.
             */
            if (needsChooser()) {
                buildChooser(host);
                return;
            }

            var heading = document.createElement("h2");
            heading.className = "aetos-a11y-panel__heading";
            heading.textContent = isAccessible()
                ? "Accessible mode options"
                : "Display options";

            var intro = document.createElement("p");
            intro.className = "aetos-a11y-panel__detail";
            intro.textContent = isAccessible()
                ? "Choose what you want. Each of these is separate -- there is no "
                    + "bundle to accept or refuse. Switching back to standard mode "
                    + "stops them applying and keeps every choice, so you can look "
                    + "and come back."
                : "These apply in standard mode too. Turning on accessible mode "
                    + "adds contrast, motion, announcement and layout options to "
                    + "this list.";

            host.appendChild(heading);
            host.appendChild(intro);

            // The groups lay out side by side; the controls inside each one
            // stack. A12 -- the flat version put every control in a single
            // grid, which came out five columns wide with no headings.
            var groups = document.createElement("div");
            groups.className = "aetos-a11y-panel__groups";
            buildControls(groups);
            host.appendChild(groups);

            buildUnconditional(host);
        }

        /*
         * Switch between the standard interface and the accessible one.
         *
         * The stored settings are never touched -- see `effective()` in
         * preferences.js. Standard mode stops the governed accommodations
         * applying; accessible mode resumes exactly what was there before.
         *
         * THE WAY BACK. This is the hazard in a real mode switch and the reason
         * A9 shipped the softer version first: somebody turns it off to look,
         * the type shrinks and the contrast drops, and they cannot find the
         * control again. Three things answer that, and all three matter:
         *
         *   1. `Ctrl+Shift+A` works in both modes and is stated out loud at the
         *      moment it becomes relevant, rather than in documentation nobody
         *      is reading at that moment.
         *   2. The toggle itself is never governed by the mode. It keeps its
         *      place, its label and its size in both.
         *   3. Nothing is erased, so the way back is one keystroke rather than
         *      a rebuild.
         */
        function setMode(wanted) {
            /*
             * `setMode("standard")` used to turn accessible mode ON.
             *
             * The argument was coerced with `!!wanted`, so any non-empty string
             * was true -- and the two strings anybody would reach for are the
             * names of the two modes. A function called `setMode` that accepts
             * `"standard"` and does the opposite is the exact shape of defect
             * this project keeps finding, except in an API rather than in a
             * control.
             *
             * No player could hit it: every call site inside the client passes
             * nothing and toggles. It was found by the A8 readiness probe, which
             * is an outside caller, falling into it on its first run -- which is
             * what an outside caller would do.
             *
             * Now the mode names work, booleans still work, no argument still
             * toggles, and anything else is refused rather than guessed at.
             * Refused with `null` rather than an exception, because this runs in
             * a websocket-driven client where "degrade, never raise" is the
             * rule -- and `null` rather than `false`, because a successful
             * switch to standard mode already returns `false` and the two must
             * not look the same.
             */
            var next;
            if (wanted === undefined) {
                next = !isAccessible();
            } else if (wanted === "accessible" || wanted === "standard") {
                next = wanted === "accessible";
            } else if (typeof wanted === "boolean") {
                next = wanted;
            } else {
                return null;
            }
            var lost = preferences.activeAccommodations
                ? preferences.activeAccommodations()
                : [];
            set("shell.mode", next ? "accessible" : "standard");

            /*
             * Ask the question, once, at the only moment it makes sense.  A12.
             *
             * This is a deliberate narrowing of the rule stated below, and it
             * is worth being plain about that. The objection there was that
             * opening the settings made the switch read as "show me a panel of
             * options" rather than as a mode control, and that objection was
             * right about a panel of eleven technical choices.
             *
             * One question with five plain-language answers is not that panel.
             * And the alternative, measured, is worse than the thing the rule
             * was protecting against: turning on accessible mode with no preset
             * and no options open changes **nothing at all** on screen, because
             * every governed preference already sits at its standard value. A
             * switch that visibly does nothing teaches people it is cosmetic.
             *
             * It happens once. Any answer, including "let me choose each
             * setting myself", is recorded, and from then on the switch behaves
             * exactly as the rule below describes.
             */
            if (next && needsChooser()) {
                optionsShown = true;
            }
            render();

            if (next) {
                announce(needsChooser()
                    ? "Accessible mode. One question below about what would "
                        + "help most."
                    : lost.length
                        ? "Accessible mode. " + lost.join(", ") + " back on."
                        : "Accessible mode. The Options button beside the switch "
                            + "chooses what it applies.");
            } else {
                /*
                 * Say what stopped and how to undo it, in that order. Somebody
                 * who has just lost their contrast needs the second half more
                 * than the first, and hears the sentence to the end.
                 */
                announce(lost.length
                    ? "Standard mode. " + lost.join(", ") + " no longer applied, "
                        + "and nothing was erased. Press Control Shift A to bring "
                        + "them back."
                    : "Standard mode. Press Control Shift A to return.",
                    { priority: "important" });
            }

            /*
             * Switching the mode does not open the settings.
             *
             * It used to, and that made the switch read as "show me a panel of
             * options" rather than as a mode control -- which is exactly how it
             * was described back to me. Turning a mode on and configuring it are
             * two things, and the switch does the first.
             */
            return next;
        }

        /*
         * Change the text size by a step, or reset it.
         *
         * Works in both modes, because `visual.scale` is not reverted by the
         * switch. Clamped to the schema's own range so a repeated keystroke
         * cannot walk it somewhere unreadable, and announced with the resulting
         * percentage rather than "larger" -- somebody adjusting this cannot
         * necessarily see the result.
         *
         * Args:
         *     delta (number|null): The step, or null to reset to the default.
         */
        function adjustTextSize(delta) {
            var bounds = (schema.RANGES && schema.RANGES["visual.scale"]) || [0.75, 2.5];
            var next = 1;
            if (delta !== null && delta !== undefined) {
                next = (parseFloat(preferences.value("visual.scale")) || 1) + delta;
                next = Math.min(bounds[1], Math.max(bounds[0], next));
                next = Math.round(next * 100) / 100;
            }
            set("visual.scale", next);
            render();
            announce("Text size " + Math.round(next * 100) + " percent.");
            return next;
        }

        /*
         * Show or hide the options.
         *
         * Only meaningful in accessible mode, and the button that calls it is
         * hidden in standard mode. Guarded anyway, because the palette command
         * can reach it from anywhere.
         */
        function toggleOptions() {
            // Does NOT switch the mode. Standard mode has options of its own,
            // and quietly changing somebody's interface because they asked to
            // see the settings would be the same conflation the switch itself
            // just had removed.
            optionsShown = !optionsShown;
            render();
            if (optionsShown) {
                announce("Accessibility options shown.");
                if (focusManager && focusManager.focusFirst) {
                    focusManager.focusFirst(host);
                }
            } else {
                announce("Accessibility options hidden. Nothing was changed.");
            }
            return optionsShown;
        }

        function attach(container, button) {
            host = document.createElement("section");
            host.id = PANEL_ID;
            host.className = "aetos-a11y-panel";
            // A landmark, because it is a destination somebody navigates to
            // rather than a dialog that interrupts them.
            host.setAttribute("role", "region");
            host.setAttribute("aria-label", "Accessibility options");
            container.appendChild(host);

            toggleButton = button || null;
            if (toggleButton) {
                toggleButton.addEventListener("click", function () { setMode(); });
            }

            optionsButton = document.getElementById("aetos-accessibility-options");
            if (optionsButton) {
                optionsButton.setAttribute("aria-controls", PANEL_ID);
                optionsButton.addEventListener("click", function () { toggleOptions(); });
            }

            // Re-render when anything else changes a preference this panel
            // shows -- Settings and the palette can change the same values, and
            // a picker showing stale state is worse than no picker.
            preferences.subscribe(function () { render(); });
            render();
            return host;
        }

        return {
            attach: attach,
            // `toggle` switches the MODE, which is what the shortcut and the
            // switch both mean by it.
            toggle: setMode,
            setMode: setMode,
            toggleOptions: toggleOptions,
            adjustTextSize: adjustTextSize,
            isAccessible: isAccessible,
            isOpen: isOpen,
            needsChooser: needsChooser,
            choose: choose,
            render: render
        };
    }

    window.AetosAccessibilityPanel = {
        create: createAccessibilityPanel,
        PANEL_ID: PANEL_ID,
        CHOICES: CHOICES
    };

})(window, document);
