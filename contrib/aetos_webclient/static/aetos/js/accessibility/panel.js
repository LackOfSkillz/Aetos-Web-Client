/*
 * Aetos accessibility panel.  A9.
 *
 * One visible control that reveals the accessibility options, and a picker
 * behind it.
 *
 * WHY THIS EXISTS. The preferences it shows are not new -- every one of them
 * has worked since the A-track built it, and every one is in Settings. The
 * problem is that they are spread across five groups of a panel reached from
 * the command palette, and **almost nobody will ever find them**. A player who
 * needs three of them has to know they exist, know they are separable, and go
 * looking. Granularity is right and it created a discovery problem; this is the
 * answer to that problem and nothing else.
 *
 * WHAT THE TOGGLE DOES AND DOES NOT DO. It changes what is *offered*, never
 * what is on. Turning the panel off keeps every accommodation the player chose
 * and leaves the same controls in Settings.
 *
 * The other reading -- a switch that turns the accommodations themselves off --
 * is a sharper product with a real hazard: somebody flicks it to see what the
 * standard interface looks like, and then cannot read the screen well enough to
 * find the switch again. Until that is asked for explicitly, this one cannot
 * strand anybody.
 *
 * WHAT IS NOT IN HERE. Keyboard operation, focus management, landmarks,
 * accessible names, the announcer, colour never carrying meaning alone. Those
 * are unconditional and are listed in the panel as such -- somebody deciding
 * whether to turn accessibility "on" deserves to know what was never off.
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

        function isOpen() {
            return !!preferences.value("shell.accessibilityPanel");
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
            (schema.GOVERNED || []).forEach(function (entry, index) {
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
            if (toggleButton) {
                toggleButton.setAttribute("aria-expanded", isOpen() ? "true" : "false");
            }
            if (!isOpen()) {
                return;
            }

            var heading = document.createElement("h2");
            heading.className = "aetos-a11y-panel__heading";
            heading.textContent = "Accessibility options";

            var intro = document.createElement("p");
            intro.className = "aetos-a11y-panel__detail";
            intro.textContent =
                "Choose what you want. Each of these is separate -- there is no "
                + "bundle to accept or refuse, and every one of them is also in "
                + "Settings.";

            host.appendChild(heading);
            host.appendChild(intro);

            var options = document.createElement("div");
            options.className = "aetos-a11y-panel__options";
            buildControls(options);
            host.appendChild(options);

            buildUnconditional(host);
        }

        function toggle() {
            var next = !isOpen();
            set("shell.accessibilityPanel", next);
            render();
            announce(next
                ? "Accessibility options shown."
                : "Accessibility options hidden. Nothing you chose was changed.");
            if (next && focusManager && focusManager.focusFirst) {
                focusManager.focusFirst(host);
            }
            return next;
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
                toggleButton.setAttribute("aria-controls", PANEL_ID);
                toggleButton.addEventListener("click", function () { toggle(); });
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
            toggle: toggle,
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
