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

        function buildControls(container) {
            entriesForMode().forEach(function (entry, index) {
                var id = "aetos-a11y-opt-" + index;
                if (entry.kind === "boolean") {
                    container.appendChild(booleanControl(entry, id));
                } else if (entry.kind === "enum") {
                    container.appendChild(enumControl(entry, id));
                } else if (entry.kind === "range") {
                    container.appendChild(rangeControl(entry, id));
                }
            });
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

            var options = document.createElement("div");
            options.className = "aetos-a11y-panel__options";
            buildControls(options);
            host.appendChild(options);

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
            var next = wanted === undefined ? !isAccessible() : !!wanted;
            var lost = preferences.activeAccommodations
                ? preferences.activeAccommodations()
                : [];
            set("shell.mode", next ? "accessible" : "standard");
            render();

            if (next) {
                announce(lost.length
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
            render: render
        };
    }

    window.AetosAccessibilityPanel = {
        create: createAccessibilityPanel,
        PANEL_ID: PANEL_ID,
        CHOICES: CHOICES
    };

})(window, document);
