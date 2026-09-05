/*
 * Aetos announcement manager.  Addendum A.13, A.14, A.15.
 *
 * A11Y-ANN-001: every automatic announcement passes through here. Widgets do
 * not own live regions.
 *
 * WHY THAT RULE EXISTS. A live region is a shared, serialised channel: the
 * player has one pair of ears and one braille display. Thirty widgets each with
 * their own `aria-live` do not produce thirty conversations, they produce one
 * conversation with thirty interruptions, and whichever widget updated last
 * wins. Centralising it means the client can decide what matters instead of
 * that being settled by render order.
 *
 * TWO REGIONS, USED VERY DIFFERENTLY (A.15).
 *
 *   polite  -- waits for a gap in speech. Almost everything.
 *   urgent  -- interrupts. Connection loss and session failure, essentially.
 *
 * Gameplay never reaches the urgent region. A channel that interrupts you
 * constantly stops being an interruption and becomes noise, at which point the
 * one message that genuinely needed to interrupt is the one that gets ignored.
 *
 * WHAT THIS DOES NOT DO YET. Burst aggregation (A.16) and Review Mode (A.17)
 * need the categorised log store, which is scheduled with M17. The priority
 * and category vocabulary is defined here now so that every call site is
 * already passing the information those stages will need -- retrofitting a
 * category argument onto a hundred call sites later is exactly the kind of
 * churn this foundation exists to avoid.
 */

(function (window, document) {
    "use strict";

    /*
     * Priorities, most to least urgent (A.14).
     *
     * `silent` is a real level, not the absence of one: a caller that decides
     * something is not worth saying still records that decision here, rather
     * than each call site inventing its own way of skipping the announcer.
     */
    var PRIORITIES = ["critical", "important", "normal", "background", "silent"];

    //: Only these interrupt. Deliberately short.
    var URGENT_PRIORITIES = ["critical"];

    /*
     * Default priority per category (A.14).
     *
     * These are defaults, not gameplay truths -- a game where combat is rare
     * and lethal is not the game these were tuned for, and the player's own
     * preferences override them.
     */
    var CATEGORY_PRIORITY = {
        connection: "critical",
        session: "critical",
        tell: "important",
        room: "important",
        chat: "normal",
        combat: "normal",
        command: "normal",
        effect: "normal",
        target: "normal",
        resource: "background",
        inventory: "background",
        media: "background",
        system: "normal",
        ambient: "silent",
        other: "normal"
    };

    //: Preference key governing each category, where one exists. A category
    //: absent from here is not individually switchable.
    var CATEGORY_PREFERENCE = {
        room: "screenReader.announceRoom",
        tell: "screenReader.announceTells",
        chat: "screenReader.announceChat",
        combat: "screenReader.announceCombat"
    };

    function createAnnouncer(services) {
        var politeRegion = services.politeRegion || null;
        var urgentRegion = services.urgentRegion || null;
        var preferences = services.preferences || null;

        // Kept for the Review Mode work in M17: while review is active the
        // manager holds low-priority announcements and counts them, so leaving
        // review can summarise rather than replay.
        var reviewing = false;
        var deferred = [];

        var lastPolite = null;
        var lastUrgent = null;
        var history = [];
        var MAX_HISTORY = 50;

        function preferenceValue(path, fallback) {
            if (!preferences || typeof preferences.value !== "function") {
                return fallback;
            }
            var value = preferences.value(path);
            return value === undefined ? fallback : value;
        }

        /*
         * Decide whether to speak, and how loudly.
         *
         * Returns the effective priority, or null to stay silent. Kept as one
         * pure function so the policy is inspectable and testable rather than
         * scattered through the emit path.
         */
        function resolve(category, requested) {
            var priority = requested || CATEGORY_PRIORITY[category] || "normal";
            if (PRIORITIES.indexOf(priority) === -1) {
                priority = "normal";
            }
            if (priority === "silent") {
                return null;
            }

            // Critical always speaks. A player who has muted everything still
            // needs to know the connection dropped, because every other thing
            // the client tells them is now potentially stale.
            if (priority === "critical") {
                return priority;
            }

            var mode = preferenceValue("screenReader.announcementMode", "selective");
            if (mode === "minimal" && priority !== "important") {
                return null;
            }
            if (mode === "selective") {
                var key = CATEGORY_PREFERENCE[category];
                if (key && preferenceValue(key, true) === false) {
                    return null;
                }
                if (category === "resource") {
                    var setting = preferenceValue("screenReader.announceResources", "thresholds");
                    if (setting === "never") {
                        return null;
                    }
                }
            }

            // Quiet Mode suppresses interruptions without touching the
            // transcript (A.48). Important and critical still get through --
            // quiet is not deaf.
            if (preferenceValue("cognitive.quietMode", false)) {
                if (priority === "normal" || priority === "background") {
                    return null;
                }
            }

            return priority;
        }

        function write(region, message, lastRef) {
            if (!region) {
                return lastRef;
            }
            // Re-setting identical text does not reliably re-trigger an
            // announcement, so the region is cleared first when a message
            // repeats. Without this, "Health is low" said twice is said once.
            if (message === lastRef) {
                region.textContent = "";
            }
            region.textContent = message;
            return message;
        }

        /*
         * Announce something.
         *
         * `options.category` and `options.priority` are both optional; a bare
         * string still works, which is what the existing call sites pass.
         */
        function announce(message, options) {
            if (!message) {
                return null;
            }
            var settings = options || {};
            var category = settings.category || "other";
            var priority = resolve(category, settings.priority);

            if (priority === null) {
                return null;
            }

            if (reviewing && priority !== "critical" && priority !== "important") {
                // Held rather than dropped. The player is reading; interrupting
                // them is the thing Review Mode exists to prevent, but the
                // event still happened and they are entitled to know it did.
                deferred.push({ message: message, category: category, priority: priority });
                return null;
            }

            record(message, category, priority);

            if (URGENT_PRIORITIES.indexOf(priority) !== -1) {
                lastUrgent = write(urgentRegion, message, lastUrgent);
            } else {
                lastPolite = write(politeRegion, message, lastPolite);
            }
            return priority;
        }

        function record(message, category, priority) {
            history.push({ message: message, category: category, priority: priority });
            if (history.length > MAX_HISTORY) {
                history.shift();
            }
        }

        /* --- Review Mode hooks, completed in M17 ------------------------ */

        function beginReview() {
            reviewing = true;
            deferred = [];
        }

        /*
         * Leave Review Mode.
         *
         * Returns a summary rather than replaying the queue. Reading out
         * seventeen held announcements in a row is worse than the interruption
         * they were held to avoid (A.17), so the caller gets counts and can
         * offer to show the detail.
         */
        function endReview() {
            reviewing = false;
            var held = deferred;
            deferred = [];

            if (!held.length) {
                return { total: 0, byCategory: {}, events: [] };
            }
            var byCategory = {};
            held.forEach(function (entry) {
                byCategory[entry.category] = (byCategory[entry.category] || 0) + 1;
            });
            return { total: held.length, byCategory: byCategory, events: held };
        }

        function summarize(result) {
            if (!result || !result.total) {
                return "";
            }
            var parts = Object.keys(result.byCategory).map(function (category) {
                var count = result.byCategory[category];
                return count + " " + category + (count === 1 ? " event" : " events");
            });
            return result.total + " events occurred while reviewing. " + parts.join(", ") + ".";
        }

        return {
            announce: announce,
            resolve: resolve,
            beginReview: beginReview,
            endReview: endReview,
            summarize: summarize,
            isReviewing: function () { return reviewing; },
            deferredCount: function () { return deferred.length; },
            history: function () { return history.slice(); }
        };
    }

    window.AetosAnnouncementManager = {
        create: createAnnouncer,
        PRIORITIES: PRIORITIES.slice(),
        URGENT_PRIORITIES: URGENT_PRIORITIES.slice(),
        CATEGORY_PRIORITY: CATEGORY_PRIORITY,
        CATEGORY_PREFERENCE: CATEGORY_PREFERENCE
    };

})(window, document);
