/*
 * Aetos accessibility preferences.  Addendum A.70, A.71, A.72.
 *
 * NOT AN ON/OFF SWITCH. There is no "accessibility mode" here, because there is
 * no such thing as an accessible user. Semantic HTML, keyboard operation and
 * focus management are unconditional and are not represented in this file at
 * all -- they cannot be turned off, by a player or by a game developer
 * (A11Y-BASE-001).
 *
 * What lives here is the part that genuinely varies between people: how much
 * the client should say out loud, how much it should move, and how much it
 * should help with orientation. Choosing a screen-reader profile adjusts
 * verbosity. It does not "turn accessibility on" (A.71).
 *
 * TWO STORES, ON PURPOSE.
 *
 * The canonical copy lives in the `preferences` namespace, so it is exported,
 * imported and counted by the privacy panel like everything else the player
 * owns (A.75).
 *
 * A mirror lives in the boot channel, because several of these settings decide
 * how the client should look *before* the database has opened. Reading them
 * late would mean a player who asked for no motion sees motion first, which is
 * precisely the harm the setting exists to prevent.
 *
 * The mirror is a cache and the namespace is the truth. They are reconciled on
 * boot in that direction.
 *
 * NEVER LEAVES THE BROWSER (A.72, A.73, A.74). Nothing here is sent to the game
 * server, and Aetos does not attempt to detect a screen reader, a braille
 * display or AAC use. That detection would be fingerprinting, and a player must
 * never have to disclose a disability to a MUD operator in order to play.
 */

(function (window) {
    "use strict";

    //: Storage key. One document, because these settings are read together.
    var DOC_ID = "accessibility";
    var BOOT_KEY = "accessibility";

    //: Schema version, so a future migration can tell old documents apart.
    var VERSION = 1;

    /*
     * Defaults.
     *
     * Chosen so that a player who changes nothing gets a client that is quiet
     * rather than chatty. An interface that announces everything is as
     * unusable as one that announces nothing, and the failure mode of
     * over-announcing is worse: it trains people to ignore the channel that
     * carries the urgent messages.
     */
    var DEFAULTS = {
        version: VERSION,

        screenReader: {
            // "selective" honours the per-category flags below. "all" and
            // "minimal" are shortcuts that ignore them.
            announcementMode: "selective",
            announceRoom: true,
            announceTells: true,
            announceChat: true,
            // Off by default: combat is the highest-volume category in most
            // games and the one most likely to make speech useless.
            announceCombat: false,
            // Thresholds only -- "health 61", "health 60", "health 59" is not
            // information, it is noise with a number in it.
            announceResources: "thresholds",
            reviewModeBehavior: "pause-normal"
        },

        braille: {
            // "HP 82/100" rather than "Health, 82 out of 100" (A11Y-BRL-002).
            compactStatus: true,
            preserveReviewPosition: true
        },

        keyboard: {
            // A11Y-KEY-002. Off by default and, when a player does opt in,
            // still never bound to a bare character by Aetos itself.
            singleKeyShortcuts: false,
            conflictWarnings: true
        },

        /*
         * Pointer and motor access.  A.57.
         *
         * Its own group rather than tacked onto `keyboard`, because a swipe is
         * not a keystroke and the distinction matters to whoever reads this
         * next.
         *
         * Every gesture duplicates a palette command, so switching them off
         * costs nothing but the shortcut -- which is exactly why it is safe to
         * offer, and why the default can be on.
         */
        pointer: {
            gestures: true
        },

        cognitive: {
            reorientEnabled: true,
            orientationChecklist: "manual",
            quietMode: false,
            // A.47. Visual quieting, separate from quietMode's announcement
            // quieting: wanting a calmer screen and wanting fewer
            // interruptions are different needs, and somebody may want either
            // without the other.
            focusMode: false,
            // A11Y-COG-007. A game event rearranging the workspace under
            // someone is disorienting for everyone and disabling for some.
            automaticWorkspaceSwitching: "never"
        },

        /*
         * Sound.  A11Y-MEDIA-002.
         *
         * One control per category, because a sound a player cannot turn down
         * is a sound they cannot escape. The master starts below full: a
         * client that arrives loud is a client somebody closes before they
         * find the slider.
         */
        audio: {
            muted: false,
            master: 0.7,
            music: 1.0,
            ambience: 1.0,
            effect: 1.0,
            ui: 1.0,
            voice: 1.0
        },

        visual: {
            scale: 1.0,
            contrast: "standard",
            // "system" defers to prefers-reduced-motion. An explicit choice
            // overrides it, in both directions -- a player may want motion the
            // operating system is suppressing.
            motion: "system",
            stimulation: "standard"
        },

        aac: {
            enabled: false,
            symbolPack: null,
            // A.64. Symbol *and* text by default: a symbol nobody recognises
            // with no word under it is unusable, while the reverse is merely
            // plain. A symbol-focused presentation is a choice, not a default.
            showTextWithSymbols: true,
            // The command a composed sentence is sent with. A player on a game
            // that uses something other than `say` -- or who wants their board
            // to whisper rather than speak aloud -- changes it here, and it is
            // an ordinary command either way (A.68).
            sayCommand: "say"
        }
    };

    //: Allowed values. Anything outside these falls back to the default rather
    //: than being stored, so a hand-edited import cannot produce a client in a
    //: state no code path expects.
    /*
     * Numeric preferences, and the range each is clamped to.
     *
     * A table rather than a branch per key. `visual.scale` used to be the only
     * number here and had its own special case; adding the volumes exposed
     * what that shape cost -- a number with no branch fell through to the
     * string check and was silently discarded, so every volume slider appeared
     * to work while nothing it set survived a reload. A player would have
     * concluded the client was broken, and they would have been right.
     */
    var SCALE_MIN = 0.75;
    var SCALE_MAX = 2.5;

    var RANGES = {
        // The scale bounds by reference, not by repetition: an earlier draft
        // of this table wrote 2.0 here and silently narrowed a range that had
        // been 2.5 since A0.
        "visual.scale": [SCALE_MIN, SCALE_MAX],
        "audio.master": [0, 1],
        "audio.music": [0, 1],
        "audio.ambience": [0, 1],
        "audio.effect": [0, 1],
        "audio.ui": [0, 1],
        "audio.voice": [0, 1]
    };

    var ENUMS = {
        "screenReader.announcementMode": ["selective", "all", "minimal"],
        "screenReader.announceResources": ["never", "thresholds", "always"],
        "screenReader.reviewModeBehavior": ["pause-normal", "pause-all", "pause-none"],
        "cognitive.orientationChecklist": [
            "disabled", "manual", "idle", "unfamiliar", "always"
        ],
        "cognitive.automaticWorkspaceSwitching": ["never", "ask", "always"],
        "visual.contrast": ["standard", "high"],
        "visual.motion": ["system", "full", "reduced"],
        "visual.stimulation": ["rich", "standard", "reduced", "minimal"]
    };

    //: Bounds on the one numeric setting, so a bad value cannot render the
    //: interface unreadably small or large.

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    /*
     * Merge a stored document over the defaults.
     *
     * Deliberately not a deep-merge library. Unknown keys are dropped and
     * out-of-range values fall back, so the object handed to the rest of the
     * client always has exactly the shape the code expects -- there is no
     * "maybe this key exists" anywhere downstream.
     */
    function normalize(raw) {
        var result = clone(DEFAULTS);
        if (!raw || typeof raw !== "object") {
            return result;
        }

        Object.keys(DEFAULTS).forEach(function (group) {
            if (group === "version") {
                return;
            }
            var stored = raw[group];
            if (!stored || typeof stored !== "object") {
                return;
            }
            Object.keys(DEFAULTS[group]).forEach(function (key) {
                if (!Object.prototype.hasOwnProperty.call(stored, key)) {
                    return;
                }
                var value = stored[key];
                var path = group + "." + key;

                if (ENUMS[path]) {
                    if (ENUMS[path].indexOf(value) !== -1) {
                        result[group][key] = value;
                    }
                    return;
                }
                if (RANGES[path]) {
                    var number = parseFloat(value);
                    if (isFinite(number)) {
                        result[group][key] = Math.min(
                            RANGES[path][1], Math.max(RANGES[path][0], number)
                        );
                    }
                    return;
                }
                if (typeof DEFAULTS[group][key] === "boolean") {
                    if (typeof value === "boolean") {
                        result[group][key] = value;
                    }
                    return;
                }
                // symbolPack: a string or null, nothing else.
                if (value === null || typeof value === "string") {
                    result[group][key] = value;
                }
            });
        });

        return result;
    }

    function createPreferences(services) {
        var storage = services && services.storage;
        var listeners = [];

        // Seeded from the boot mirror so the very first paint is already
        // correct, then reconciled from the database when it opens.
        var current = normalize(
            storage && storage.getBootPreference
                ? storage.getBootPreference(BOOT_KEY, null)
                : null
        );

        function notify() {
            listeners.forEach(function (listener) {
                try {
                    listener(clone(current));
                } catch (err) {
                    // One bad subscriber must not stop the others from
                    // applying a preference the player explicitly asked for.
                    if (window.console) {
                        window.console.error("Aetos: accessibility subscriber failed", err);
                    }
                }
            });
        }

        function get() {
            return clone(current);
        }

        /*
         * Read one setting by dotted path.
         *
         * Callers ask questions like `pref("visual.motion")` rather than
         * reaching into the object, so a later reshuffle of the schema does not
         * mean editing every widget.
         */
        function value(path) {
            var parts = String(path).split(".");
            var node = current;
            for (var i = 0; i < parts.length; i++) {
                if (!node || typeof node !== "object") {
                    return undefined;
                }
                node = node[parts[i]];
            }
            return node;
        }

        function persist() {
            if (!storage) {
                return Promise.resolve(current);
            }
            // Mirror first. If the database write fails -- quota, private
            // browsing -- the player's choice still applies on the next load,
            // which matters more than the record being complete.
            if (storage.setBootPreference) {
                storage.setBootPreference(BOOT_KEY, current);
            }
            return storage
                .put("preferences", { id: DOC_ID, accessibility: current })
                .then(function () { return current; })
                .catch(function () { return current; });
        }

        /*
         * Apply a partial update.
         *
         * Partial by group, so a caller changing one setting cannot silently
         * reset the others -- the same merge-not-replace rule the notes store
         * learned the hard way in M11.
         */
        function update(patch) {
            var merged = clone(current);
            Object.keys(patch || {}).forEach(function (group) {
                if (!merged[group] || typeof patch[group] !== "object") {
                    return;
                }
                Object.keys(patch[group]).forEach(function (key) {
                    merged[group][key] = patch[group][key];
                });
            });
            current = normalize(merged);
            notify();
            return persist();
        }

        function reset() {
            current = clone(DEFAULTS);
            notify();
            return persist();
        }

        /*
         * Reconcile with the database once it is available.
         *
         * The namespace is the truth and the boot mirror is a cache, so a
         * stored document wins. If none exists, the mirror is written back so a
         * profile imported on another machine survives.
         */
        function load() {
            if (!storage) {
                notify();
                return Promise.resolve(get());
            }
            return storage
                .get("preferences", DOC_ID)
                .then(function (stored) {
                    if (stored && stored.accessibility) {
                        current = normalize(stored.accessibility);
                    }
                    notify();
                    return persist().then(get);
                })
                .catch(function () {
                    notify();
                    return get();
                });
        }

        function subscribe(listener) {
            if (typeof listener !== "function") {
                return function () {};
            }
            listeners.push(listener);
            // Prime immediately. A subscriber that only hears about *changes*
            // never applies the current value, which is the bug the state store
            // hit in M6.
            try {
                listener(get());
            } catch (err) {
                if (window.console) {
                    window.console.error("Aetos: accessibility subscriber failed", err);
                }
            }
            return function unsubscribe() {
                var index = listeners.indexOf(listener);
                if (index !== -1) {
                    listeners.splice(index, 1);
                }
            };
        }

        return {
            get: get,
            value: value,
            update: update,
            reset: reset,
            load: load,
            subscribe: subscribe
        };
    }

    /*
     * Every numeric default must appear in RANGES.
     *
     * Checked at load rather than asserted in a test alone, because the
     * failure it prevents is silent: a number with no range is dropped by
     * `normalize`, and the only symptom is a setting that will not stick.
     * Better to be loud in the console of whoever added it.
     */
    Object.keys(DEFAULTS).forEach(function (group) {
        if (group === "version" || typeof DEFAULTS[group] !== "object") {
            return;
        }
        Object.keys(DEFAULTS[group]).forEach(function (key) {
            if (typeof DEFAULTS[group][key] !== "number") {
                return;
            }
            if (!RANGES[group + "." + key] && window.console) {
                window.console.warn(
                    "Aetos: numeric preference " + group + "." + key +
                    " has no entry in RANGES and will not persist."
                );
            }
        });
    });

    window.AetosAccessibilityPreferences = {
        create: createPreferences,
        DEFAULTS: DEFAULTS,
        ENUMS: ENUMS,
        RANGES: RANGES,
        VERSION: VERSION,
        DOC_ID: DOC_ID,
        normalize: normalize
    };

})(window);
