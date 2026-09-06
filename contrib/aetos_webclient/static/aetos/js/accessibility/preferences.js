/*
 * Aetos accessibility preferences.  Addendum A.70, A.71, A.72.
 *
 * THERE IS A MODE, AND IT DOES NOT REACH THE BASELINE (A10).
 *
 * `shell.mode` chooses between the standard interface and the accessible one.
 * It governs the *optional* layer only -- contrast, type size, motion,
 * stimulation, verbosity, quiet and focus modes, the word board.
 *
 * Semantic HTML, keyboard operation, focus management, landmarks, accessible
 * names and the announcer are unconditional, are not represented in this file
 * at all, and cannot be turned off by a player or a game developer
 * (A11Y-BASE-001). A mode switch that could reach them would not be a mode
 * switch; it would be a way to break the client.
 *
 * This file said "there is no accessibility mode here" until A10, and for the
 * baseline that is still exactly true. What changed is that the optional layer
 * now has one, because trying to be everything to everybody at once produced an
 * interface that was nobody's first choice.
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

        /*
         * Which interface the player is in.  A10.
         *
         * `"standard"` is the client as it is for somebody who never asks for
         * anything: default contrast, default type, no accessibility panel.
         * `"accessible"` applies the accommodations they have chosen and offers
         * the panel to change them.
         *
         * A9 shipped this as a *disclosure* -- the panel hid and every setting
         * stayed applied. Gary asked for the sharper version: two modes, "so we
         * dont have to try to be everything to everybody". This is that.
         *
         * **The mode masks; it never erases.** Switching to standard stops the
         * governed accommodations applying and leaves every stored value
         * exactly as it was, so switching back restores the interface somebody
         * spent time building rather than handing them a fresh one. Erasing
         * would make the toggle a thing you cannot afford to try.
         */
        shell: {
            mode: "standard"
        },

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
    /*
     * What the accessibility panel offers.  A9.
     *
     * This table is the deliverable of A9 as much as the panel is: it draws the
     * line between the accommodations a player chooses and the ones that are
     * simply how the client is built.
     *
     * Everything here is **optional and opinionated** -- a matter of need and
     * taste, which a player might reasonably not want. Nothing here is load
     * bearing for basic operation.
     *
     * `kind` says how to render it; `label` is what a player reads; `detail`
     * says what changes, in terms of what they will see rather than what the
     * code does.
     *
     * `revertsInStandardMode` is the one that needs care. A10 makes standard
     * mode stop applying the accommodations, and something may only be reverted
     * safely if its **default is the standard experience** -- so that reverting
     * removes an accommodation rather than imposing one.
     *
     * Three here fail that test and are marked `false`:
     *
     *   `pointer.gestures` defaults to ON, so somebody with a tremor turns them
     *   OFF. Reverting would switch gestures back on for the person who most
     *   needed them off.
     *
     *   `audio.muted` defaults to OFF, so muting is the accommodation.
     *   Reverting would start playing sound at somebody.
     *
     *   `cognitive.reorientEnabled` defaults to ON. Reverting adds a feature
     *   rather than removing one, which is not what a mode switch is for.
     *
     * They stay in the panel, because they belong there, and they survive the
     * mode switch untouched. Getting this backwards would make standard mode
     * actively hostile to three of the people it is meant to leave alone.
     */
    var GOVERNED = [
        {
            path: "visual.contrast",
            revertsInStandardMode: true,
            kind: "enum",
            label: "Contrast",
            detail: "Higher contrast strengthens every border and text colour."
        },
        {
            path: "visual.scale",
            revertsInStandardMode: true,
            kind: "range",
            label: "Text size",
            detail: "Scales the whole interface, not only the text."
        },
        {
            path: "visual.motion",
            revertsInStandardMode: true,
            kind: "enum",
            label: "Motion",
            detail: "Your choice wins over the system setting, in both directions."
        },
        {
            path: "visual.stimulation",
            revertsInStandardMode: true,
            kind: "enum",
            label: "Visual detail",
            detail: "Removes decoration that carries no information."
        },
        {
            path: "screenReader.announcementMode",
            revertsInStandardMode: true,
            kind: "enum",
            label: "How much is announced",
            detail: "What is spoken aloud or sent to a braille display."
        },
        {
            path: "cognitive.quietMode",
            revertsInStandardMode: true,
            kind: "boolean",
            label: "Quiet mode",
            detail: "Fewer interruptions. Nothing is lost -- it is still in the log."
        },
        {
            path: "cognitive.focusMode",
            revertsInStandardMode: true,
            kind: "boolean",
            label: "Focus mode",
            detail: "A calmer screen. Separate from quiet mode, because wanting "
                + "less on screen and wanting fewer interruptions are different needs."
        },
        {
            path: "cognitive.reorientEnabled",
            revertsInStandardMode: false,
            kind: "boolean",
            label: "Orientation help",
            detail: "Where you are, how you got here, and how to go back."
        },
        {
            path: "aac.enabled",
            revertsInStandardMode: true,
            kind: "boolean",
            label: "Picture and word board",
            detail: "Compose commands from symbols and words instead of typing."
        },
        {
            path: "pointer.gestures",
            revertsInStandardMode: false,
            kind: "boolean",
            label: "Touch gestures",
            detail: "Every gesture also has a keyboard command, so turning these "
                + "off costs only the shortcut."
        },
        {
            path: "audio.muted",
            revertsInStandardMode: false,
            kind: "boolean",
            label: "Mute all sound",
            detail: "Captions stay on screen regardless."
        }
    ];

    /*
     * What is NOT here, and must never be.
     *
     * A0 built this schema with no master switch (A.70) and the reasoning holds
     * for exactly this list. These are not features to be enabled; they are
     * what makes the client usable at all, and they are unconditional.
     *
     * A client that is only operable by keyboard when a box is ticked is not an
     * accessible client with a toggle. It is an inaccessible client with an
     * apology.
     *
     * Stated as data so the panel can *show* it -- somebody deciding whether to
     * turn accessibility "on" deserves to know what was never off.
     */
    var UNCONDITIONAL = [
        "Every function is operable from the keyboard.",
        "Focus is always visible and never moves on its own.",
        "Landmarks, headings and accessible names on every control.",
        "One announcement channel, so nothing competes to speak.",
        "Colour never carries meaning on its own.",
        "Target sizes that do not require fine pointing."
    ];

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
        "shell.mode": ["standard", "accessible"],
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
                    listener(effective());
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
         * What is actually in force, as opposed to what the player has chosen.
         *
         * In accessible mode the two are the same. In standard mode the
         * governed accommodations read as their defaults -- **without the
         * stored values being touched**, so switching back restores the
         * interface somebody built rather than a fresh one.
         *
         * Subscribers get this rather than `get()`, so every consumer honours
         * the mode without having to know a mode exists. `get()` and `value()`
         * still answer "what did the player choose", which is what the editors
         * need in order to show it.
         *
         * A consumer that subscribed and then wrote back what it received would
         * persist the mask and lose the choice. Nothing does; it is worth
         * knowing that nothing may.
         */
        function effective() {
            var view = clone(current);
            if (view.shell && view.shell.mode === "accessible") {
                return view;
            }
            GOVERNED.forEach(function (entry) {
                if (!entry.revertsInStandardMode) {
                    return;
                }
                var parts = entry.path.split(".");
                if (view[parts[0]] && DEFAULTS[parts[0]]) {
                    view[parts[0]][parts[1]] = DEFAULTS[parts[0]][parts[1]];
                }
            });
            return view;
        }

        /*
         * Whether anything the mode governs is actually set away from default.
         *
         * Used to decide what to say when somebody switches modes: "nothing you
         * chose was in use anyway" and "your five settings have stopped
         * applying" deserve different sentences.
         */
        function activeAccommodations() {
            var names = [];
            GOVERNED.forEach(function (entry) {
                if (!entry.revertsInStandardMode) {
                    return;
                }
                var parts = entry.path.split(".");
                var chosen = current[parts[0]] && current[parts[0]][parts[1]];
                var fallback = DEFAULTS[parts[0]] && DEFAULTS[parts[0]][parts[1]];
                if (chosen !== fallback) {
                    names.push(entry.label);
                }
            });
            return names;
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
            //
            // `effective()`, matching `notify()`. Priming with `get()` would
            // hand every subscriber the unmasked settings once at boot and the
            // masked ones from then on -- so a client started in standard mode
            // would apply the accommodations for exactly as long as it took
            // somebody to change something.
            try {
                listener(effective());
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
            effective: effective,
            activeAccommodations: activeAccommodations,
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
        GOVERNED: GOVERNED,
        UNCONDITIONAL: UNCONDITIONAL,
        VERSION: VERSION,
        DOC_ID: DOC_ID,
        normalize: normalize
    };

})(window);
