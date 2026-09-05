/*
 * Aetos command palette.
 *
 * Ctrl+K opens a searchable list of things the CLIENT can do -- open the map,
 * edit the layout, add a macro, clear local data (blueprint section 36).
 *
 * IT DOES NOT SEND GAME COMMANDS.
 *
 * That boundary is deliberate and worth stating, because most palettes in other
 * software do run arbitrary things. The player already has a command line for
 * the game; a second one that looked similar but behaved differently would be a
 * trap. Everything here acts on Aetos itself.
 *
 * The palette is also the discoverability surface. A keyboard shortcut nobody
 * can find is not a feature, so every client action registers here with a
 * description -- including the ones that also have a shortcut, so the shortcut
 * is learnable rather than something you had to read the docs to know.
 *
 * ACCESSIBILITY
 *
 * Implemented as the ARIA combobox-with-listbox pattern: the input keeps focus
 * throughout and `aria-activedescendant` moves the selection, so a screen reader
 * announces each option as the player arrows through it without focus ever
 * leaving the field they are typing in.
 */

(function (window, document) {
    "use strict";

    var MAX_RESULTS = 40;

    /*
     * Subsequence match, not substring.
     *
     * "elay" should find "Edit Layout" -- a player half-remembers a name and
     * types fragments of it. Requiring a contiguous substring would fail the
     * exact case a palette exists to serve.
     */
    function score(query, text) {
        var needle = query.toLowerCase();
        var haystack = text.toLowerCase();
        if (!needle) {
            return 1;
        }
        if (haystack.indexOf(needle) !== -1) {
            // A contiguous match is a better match, so it sorts first.
            return 1000 - haystack.indexOf(needle);
        }
        var position = 0;
        var matched = 0;
        for (var i = 0; i < needle.length; i++) {
            var found = haystack.indexOf(needle[i], position);
            if (found === -1) {
                return 0;
            }
            matched += 1;
            position = found + 1;
        }
        return matched;
    }

    function createPalette(services) {
        var announce = services.announce || function () {};
        var commands = [];
        var element = null;
        var input = null;
        var list = null;
        var visible = [];
        var selected = 0;
        var opener = null;

        /*
         * Register a client action.
         *
         * `when` lets a command hide itself when it does not apply -- a game
         * that forbids macros should not offer "New macro" and then refuse.
         */
        function register(command) {
            if (!command || !command.id || !command.label ||
                    typeof command.run !== "function") {
                throw new Error("A palette command needs an id, a label and a run function.");
            }
            commands = commands.filter(function (entry) { return entry.id !== command.id; });
            commands.push({
                id: command.id,
                label: command.label,
                description: command.description || "",
                group: command.group || "Client",
                shortcut: command.shortcut || null,
                when: command.when || function () { return true; },
                run: command.run
            });
            return command.id;
        }

        function available() {
            return commands.filter(function (command) {
                try {
                    return command.when() !== false;
                } catch (err) {
                    return false;
                }
            });
        }

        function search(query) {
            return available()
                .map(function (command) {
                    var best = Math.max(
                        score(query, command.label),
                        score(query, command.group + " " + command.label),
                        score(query, command.description) * 0.5
                    );
                    return { command: command, score: best };
                })
                .filter(function (entry) { return entry.score > 0; })
                .sort(function (a, b) {
                    if (b.score !== a.score) {
                        return b.score - a.score;
                    }
                    return a.command.label.localeCompare(b.command.label);
                })
                .slice(0, MAX_RESULTS)
                .map(function (entry) { return entry.command; });
        }

        function optionId(index) {
            return "aetos-palette-option-" + index;
        }

        function render() {
            list.textContent = "";
            visible.forEach(function (command, index) {
                var item = document.createElement("li");
                item.className = "aetos-palette__option";
                item.id = optionId(index);
                item.setAttribute("role", "option");
                item.setAttribute("aria-selected", index === selected ? "true" : "false");

                var label = document.createElement("span");
                label.className = "aetos-palette__label";
                label.textContent = command.label;
                item.appendChild(label);

                if (command.shortcut) {
                    var key = document.createElement("kbd");
                    key.className = "aetos-palette__shortcut";
                    key.textContent = command.shortcut;
                    item.appendChild(key);
                }
                if (command.description) {
                    var description = document.createElement("span");
                    description.className = "aetos-palette__description";
                    description.textContent = command.description;
                    item.appendChild(description);
                }

                item.addEventListener("mousedown", function (event) {
                    // mousedown, not click: clicking would blur the input first
                    // and close the palette before the choice registered.
                    event.preventDefault();
                    choose(index);
                });
                list.appendChild(item);
            });

            // The input keeps focus; the selection is announced through
            // activedescendant so the player never loses their typing position.
            input.setAttribute("aria-activedescendant",
                visible.length ? optionId(selected) : "");
            input.setAttribute("aria-expanded", visible.length ? "true" : "false");

            var current = list.children[selected];
            if (current && current.scrollIntoView) {
                current.scrollIntoView({ block: "nearest" });
            }
        }

        function refresh() {
            visible = search(input.value);
            selected = 0;
            render();
        }

        function move(delta) {
            if (!visible.length) {
                return;
            }
            selected = (selected + delta + visible.length) % visible.length;
            render();
        }

        function choose(index) {
            var command = visible[index];
            close();
            if (!command) {
                return;
            }
            try {
                command.run();
            } catch (err) {
                announce("That did not work: " + err.message);
            }
        }

        function close() {
            if (!element) {
                return false;
            }
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
            element = null;
            input = null;
            list = null;
            // Focus returns where it came from, so a keyboard user is not
            // dropped at the top of the document.
            if (opener && document.contains(opener)) {
                opener.focus();
            }
            opener = null;
            return true;
        }

        function open() {
            if (element) {
                return false;
            }
            opener = document.activeElement;

            element = document.createElement("div");
            element.className = "aetos-palette-overlay";

            var box = document.createElement("div");
            box.className = "aetos-palette-box";
            box.setAttribute("role", "dialog");
            box.setAttribute("aria-modal", "true");
            box.setAttribute("aria-label", "Command palette");

            input = document.createElement("input");
            input.type = "text";
            input.className = "aetos-input aetos-palette__input";
            input.setAttribute("role", "combobox");
            input.setAttribute("aria-expanded", "false");
            input.setAttribute("aria-controls", "aetos-palette-results");
            input.setAttribute("aria-autocomplete", "list");
            input.setAttribute("aria-label", "Search client commands");
            input.placeholder = "Search client commands";

            list = document.createElement("ul");
            list.className = "aetos-palette__results";
            list.id = "aetos-palette-results";
            list.setAttribute("role", "listbox");
            list.setAttribute("aria-label", "Client commands");

            box.appendChild(input);
            box.appendChild(list);
            element.appendChild(box);
            document.body.appendChild(element);

            input.addEventListener("input", refresh);
            input.addEventListener("keydown", function (event) {
                switch (event.key) {
                case "ArrowDown": move(1); break;
                case "ArrowUp": move(-1); break;
                case "Home": selected = 0; render(); break;
                case "End": selected = Math.max(0, visible.length - 1); render(); break;
                case "Enter": choose(selected); break;
                case "Escape": close(); break;
                default: return;
                }
                event.preventDefault();
            });

            element.addEventListener("mousedown", function (event) {
                if (event.target === element) {
                    close();
                }
            });

            refresh();
            input.focus();
            return true;
        }

        function toggle() {
            return element ? close() : open();
        }

        /*
         * Ctrl+K, and Cmd+K on a Mac.
         *
         * Bound at the document with capture, so it works while focus is in the
         * game input -- which is where a player's hands actually are.
         */
        function bindKeys(target) {
            (target || document).addEventListener("keydown", function (event) {
                if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
                    event.preventDefault();
                    toggle();
                }
            }, true);
        }

        return {
            register: register,
            open: open,
            close: close,
            toggle: toggle,
            bindKeys: bindKeys,
            search: search,
            commands: function () { return commands.slice(); },
            available: available,
            isOpen: function () { return !!element; }
        };
    }

    window.AetosPalette = { create: createPalette, score: score };

})(window, document);
