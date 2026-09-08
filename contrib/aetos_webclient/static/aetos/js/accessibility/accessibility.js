/*
 * Aetos accessibility manager.  Addendum A.4.
 *
 * Composes the four pieces of the foundation -- preferences, announcements,
 * focus and shortcuts -- and applies the visual preferences to the document.
 *
 * WHY THIS IS A SUBSYSTEM AND NOT A UTILITY FILE. Accessibility behaviour that
 * lives as scattered helpers gets partially applied: one widget honours reduced
 * motion, the next forgets, and nobody notices because the person who would
 * notice is not in the room. Making it a subsystem with one entry point means a
 * widget cannot forget, because the widget is not the thing deciding.
 *
 * A.4 also requires that accessibility code read the same canonical state store
 * as the visual widgets rather than scraping rendered text. That rule is why
 * this file takes services rather than reaching into the DOM for game state:
 * an accessible view is a *peer* presentation of the same state, never a
 * transcription of the visual one.
 *
 * PREFERENCES BECOME ATTRIBUTES, NOT CLASSES ON EVERY ELEMENT. The manager sets
 * a handful of `data-aetos-*` attributes on the root element and CSS does the
 * rest. That keeps the styling decisions in the stylesheet, where a theme can
 * see and honour them, instead of hard-coded in JavaScript where a theme cannot.
 */

(function (window, document) {
    "use strict";

    function createAccessibility(services) {
        var settings = services || {};
        var root = settings.root || document.documentElement;
        var storage = settings.storage || null;

        var preferences = window.AetosAccessibilityPreferences
            ? window.AetosAccessibilityPreferences.create({ storage: storage })
            : null;

        /*
         * The client's own voice.  A15.
         *
         * Built before the announcer so it can be handed straight in as a
         * renderer. It is not a second announcement channel: everything about
         * *whether* to say something is decided in the announcer, and speech
         * only turns a decided message into sound.
         */
        var speech = window.AetosSpeech
            ? window.AetosSpeech.create({ preferences: preferences })
            : null;

        var announcer = window.AetosAnnouncementManager
            ? window.AetosAnnouncementManager.create({
                politeRegion: settings.politeRegion,
                urgentRegion: settings.urgentRegion,
                preferences: preferences,
                speak: speech ? speech.speak : null
            })
            : null;

        /*
         * Arm speech on the first gesture of the session.
         *
         * Browsers refuse audio until the player has interacted with the page,
         * and speaking before that produces no sound while leaving some
         * synthesisers in a state where the *next* utterance is dropped too.
         *
         * `once`-style teardown by hand rather than the option, because the
         * published floor includes browsers without it. Capture phase so a
         * handler that stops propagation cannot prevent the arming.
         */
        if (speech) {
            (function () {
                function arm() {
                    speech.unlock();
                    document.removeEventListener("pointerdown", arm, true);
                    document.removeEventListener("keydown", arm, true);
                }
                document.addEventListener("pointerdown", arm, true);
                document.addEventListener("keydown", arm, true);
            }());
        }

        var focus = window.AetosFocusManager
            ? window.AetosFocusManager.create({
                root: settings.root || document,
                fallback: settings.focusFallback || null,
                onViolation: settings.onFocusViolation || null
            })
            : null;

        var shortcuts = window.AetosShortcutManager
            ? window.AetosShortcutManager.create({
                storage: storage,
                preferences: preferences,
                onConflict: settings.onShortcutConflict || null
            })
            : null;

        /*
         * Reflect the visual preferences onto the root element.
         *
         * Motion deserves a note. "system" means: say nothing, and let the
         * `prefers-reduced-motion` media query decide. An explicit choice
         * overrides it *in both directions* -- a player may want motion the
         * operating system is suppressing, and quietly refusing them that
         * would be the same paternalism in the other direction.
         */
        function apply(current) {
            if (!root) {
                return;
            }
            var visual = (current && current.visual) || {};

            if (visual.motion === "system") {
                root.removeAttribute("data-aetos-motion");
            } else {
                root.setAttribute("data-aetos-motion", visual.motion);
            }

            root.setAttribute("data-aetos-stimulation", visual.stimulation || "standard");
            root.setAttribute("data-aetos-contrast", visual.contrast || "standard");
            /*
             * A12. Governs the client's own prose only -- the console, the map
             * and the command input take the monospace face in CSS regardless,
             * because the server aligned that text by counting characters.
             */
            root.setAttribute("data-aetos-typeface", visual.typeface || "proportional");

            var scale = parseFloat(visual.scale);
            if (isFinite(scale) && scale !== 1) {
                // A multiplier on the client's own type scale, not a font-size
                // override on <html> -- overriding that would fight the
                // browser's own zoom rather than compose with it.
                root.style.setProperty("--aetos-scale", String(scale));
            } else {
                root.style.removeProperty("--aetos-scale");
            }

            /*
             * Changing the text size changes how much fits, so the layout has to
             * be reconsidered -- and nothing else will ask it to. The responsive
             * manager watches the root element's *size*, and this changes only
             * what is inside it, so the ResizeObserver never fires and the
             * client kept three columns at 180% text with five characters in
             * each. Found by turning the text up and looking.
             */
            if (window.Aetos && window.Aetos.responsive
                    && window.Aetos.responsive.measure) {
                window.Aetos.responsive.measure();
            }

            var cognitive = (current && current.cognitive) || {};
            root.setAttribute("data-aetos-quiet", cognitive.quietMode ? "true" : "false");
            /*
             * A.47. Driven by the preference rather than set directly, so it
             * survives a reload without the shell having to remember to
             * restore it -- and so there is exactly one thing to read when
             * asking whether focus mode is on.
             */
            root.setAttribute("data-aetos-focus-mode", cognitive.focusMode ? "true" : "false");
        }

        /*
         * Announce something.
         *
         * The single entry point the rest of the client uses. Kept as a thin
         * pass-through so that call sites depend on the manager rather than on
         * the announcer's internals -- when M17 adds burst aggregation, nothing
         * outside this subsystem changes.
         */
        function announce(message, options) {
            if (!announcer) {
                return null;
            }
            return announcer.announce(message, options);
        }

        function start() {
            if (preferences) {
                preferences.subscribe(apply);
            }
            if (shortcuts) {
                shortcuts.listen(document);
            }
            // The focus guard is diagnostic. It reports rather than prevents,
            // and only where a violation handler was supplied -- there is no
            // point paying for the listeners in a session nobody is watching.
            if (focus && settings.onFocusViolation) {
                focus.startGuard();
            }

            var ready = [];
            if (preferences) {
                ready.push(preferences.load());
            }
            if (shortcuts) {
                ready.push(shortcuts.load());
            }
            return Promise.all(ready).then(function () { return true; });
        }

        return {
            preferences: preferences,
            announcer: announcer,
            speech: speech,
            focus: focus,
            shortcuts: shortcuts,
            announce: announce,
            apply: apply,
            start: start
        };
    }

    window.AetosAccessibility = { create: createAccessibility };

})(window, document);
