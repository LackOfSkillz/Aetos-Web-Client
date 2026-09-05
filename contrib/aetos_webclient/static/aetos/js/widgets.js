/*
 * Aetos widget registry.
 *
 * A widget declares what it is and what it needs; the registry decides whether
 * the current game can support it. That is the mechanism behind progressive
 * enhancement: a widget requiring a capability the game does not expose is never
 * offered, so a pristine game gets a clean palette rather than dead entries.
 *
 * Widget definition (blueprint section 57):
 *
 *   {
 *     id:                   "room",              // unique, stable
 *     displayName:          "Current Location",
 *     requiredCapabilities: ["entities"],        // manifest features
 *     defaultSize:          {width: 260, height: 160},
 *     singleton:            true,                // at most one instance
 *     subscriptions:        ["room"],            // store sections
 *     mount(context)        -> element
 *     update(context, data) // called on subscribed section change
 *     destroy(context)      // release listeners/timers
 *   }
 *
 * The registry never touches the DOM and never knows about layout. It is a
 * catalogue plus a capability filter, which is what lets the layout engine be
 * replaced without touching a single widget.
 */

(function (window) {
    "use strict";

    function validateDefinition(definition) {
        var problems = [];
        if (!definition || typeof definition !== "object") {
            return ["definition must be an object"];
        }
        if (typeof definition.id !== "string" || !definition.id) {
            problems.push("id must be a non-empty string");
        }
        if (typeof definition.displayName !== "string" || !definition.displayName) {
            problems.push("displayName must be a non-empty string");
        }
        if (typeof definition.mount !== "function") {
            problems.push("mount must be a function");
        }
        if (definition.requiredCapabilities !== undefined
                && !Array.isArray(definition.requiredCapabilities)) {
            problems.push("requiredCapabilities must be an array when given");
        }
        if (definition.subscriptions !== undefined && !Array.isArray(definition.subscriptions)) {
            problems.push("subscriptions must be an array when given");
        }
        return problems;
    }

    function normalize(definition) {
        return {
            id: definition.id,
            displayName: definition.displayName,
            description: definition.description || "",
            requiredCapabilities: (definition.requiredCapabilities || []).slice(),
            // The region a widget asks for. Dropping this here silently sent
            // every widget to the fallback region, so a definition declaring
            // `bottom` or `aside` was ignored and the default layout became one
            // long scrolling column.
            defaultRegion: definition.defaultRegion || null,
            defaultSize: definition.defaultSize || { width: 280, height: 200 },
            singleton: definition.singleton !== false,
            subscriptions: (definition.subscriptions || []).slice(),
            mount: definition.mount,
            update: definition.update || null,
            destroy: definition.destroy || null,
            // Marks widgets shipped with Aetos, so a third-party widget can
            // never quietly replace a built-in one (blueprint section 57).
            builtin: definition.builtin === true
        };
    }

    function createRegistry() {
        var definitions = {};

        /*
         * Register a widget.
         *
         * Registration is additive and validated. A third-party widget may not
         * overwrite a built-in: allowing that would let a custom widget silently
         * replace the console or the command input, which the blueprint requires
         * to remain intact.
         */
        function register(definition) {
            var problems = validateDefinition(definition);
            if (problems.length) {
                throw new Error(
                    "Aetos widget registration failed: " + problems.join("; "));
            }
            var existing = definitions[definition.id];
            if (existing && existing.builtin && definition.builtin !== true) {
                throw new Error(
                    "Aetos widget \"" + definition.id +
                    "\" is built in and cannot be replaced.");
            }
            definitions[definition.id] = normalize(definition);
            return definitions[definition.id];
        }

        function get(id) {
            return definitions[id] || null;
        }

        function all() {
            return Object.keys(definitions).map(function (id) {
                return definitions[id];
            });
        }

        /*
         * Whether the game supports a widget.
         *
         * A widget with no required capabilities always qualifies -- that is what
         * makes the zero-configuration widgets (console, input, room) work on a
         * pristine game.
         */
        function isSupported(definition, manifest) {
            if (!definition) {
                return false;
            }
            if (!definition.requiredCapabilities.length) {
                return true;
            }
            var features = (manifest && manifest.features) || {};
            return definition.requiredCapabilities.every(function (capability) {
                return features[capability] === true;
            });
        }

        /*
         * The palette: widgets this game can actually support.
         *
         * Blueprint section 51 -- no unsupported controls clutter the screen.
         */
        function available(manifest) {
            return all().filter(function (definition) {
                return isSupported(definition, manifest);
            });
        }

        function unavailable(manifest) {
            return all().filter(function (definition) {
                return !isSupported(definition, manifest);
            });
        }

        return {
            register: register,
            get: get,
            all: all,
            available: available,
            unavailable: unavailable,
            isSupported: isSupported
        };
    }

    window.AetosWidgets = { createRegistry: createRegistry };

})(window);
