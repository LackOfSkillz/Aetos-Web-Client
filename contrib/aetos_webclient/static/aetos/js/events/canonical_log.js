/*
 * Aetos canonical event log.  Addendum C.7, A.11, A.12.
 *
 * What actually happened, in order, before anybody decided how to show it.
 *
 * THIS IS THE RECORD, NOT THE VIEW. The console is a rendering of some of this;
 * Review Mode will be another; a developer capture is a third. None of them is
 * the truth, and none of them may edit it. A player who filtered combat spam out
 * of their console has changed what they are looking at, not what happened --
 * and when they later need to know what killed them, this is where the answer
 * still is.
 *
 * `originalText` is therefore permanent. A presentation layer may derive a
 * `displayText`, hide an entry, collapse it or highlight it, and every one of
 * those is metadata *about* the entry rather than a change *to* it (RULE-001).
 *
 * BOUNDED, BECAUSE MEMORY IS. A session that runs for eight hours in a busy game
 * produces a great deal of text, and an unbounded array is a slow leak that ends
 * as a dead tab. The cap is one constant so it can be tuned after profiling
 * rather than guessed at in five places (A.12).
 *
 * M17 builds the reading surfaces on top of this -- paging, search, filtering,
 * Review Mode. E0's job is only to establish that the record exists and that
 * nothing downstream can rewrite it.
 */

(function (window) {
    "use strict";

    /*
     * How many events to keep.
     *
     * A.12 suggests 5,000 as a starting point. Deliberately one named constant:
     * the number is a guess until somebody profiles a real session on a real
     * game, and a guess repeated in several files is a guess that can no longer
     * be corrected in one place.
     */
    var MAX_EVENTS = 5000;

    //: Categories a canonical event may carry (A.11). A category the pipeline
    //: does not recognise becomes "other" rather than being dropped -- an
    //: unrecognised event is still something that happened.
    var CATEGORIES = [
        "room", "movement", "tell", "chat", "combat", "system",
        "resource", "effect", "inventory", "target", "command",
        "media", "connection", "other"
    ];

    function createLog(options) {
        var settings = options || {};
        var limit = settings.limit || MAX_EVENTS;
        var events = [];
        var nextId = 1;
        var dropped = 0;

        /*
         * Append an event and return it.
         *
         * The returned object is the canonical one. Callers that intend to
         * derive presentation from it must copy first -- and the pipeline does
         * exactly that, so nothing downstream ever holds a reference it could
         * mutate by accident.
         */
        function append(entry) {
            var event = {
                id: "evt-" + nextId,
                sequence: nextId,
                timestamp: settings.now ? settings.now() : Date.now(),
                category: CATEGORIES.indexOf(entry.category) === -1
                    ? "other"
                    : entry.category,
                priority: entry.priority || "normal",
                // The permanent record. Never rewritten, by anything.
                originalText: entry.originalText || "",
                source: entry.source || null,
                structuredData: entry.structuredData || null
            };
            nextId += 1;

            events.push(event);
            if (events.length > limit) {
                // Counted rather than silently discarded: a player who scrolls
                // to the top of their history is entitled to know the history
                // does not start there (A.56 -- do not silently truncate).
                dropped += events.length - limit;
                events = events.slice(events.length - limit);
            }
            return event;
        }

        /*
         * Read the log.
         *
         * Returns copies. A reader that could mutate the record by holding a
         * reference to it is a reader that will eventually do so, and the bug
         * would be untraceable -- the record would simply be wrong, with
         * nothing to say when it changed.
         */
        function all() {
            return events.map(function (event) { return copy(event); });
        }

        function copy(event) {
            return {
                id: event.id,
                sequence: event.sequence,
                timestamp: event.timestamp,
                category: event.category,
                priority: event.priority,
                originalText: event.originalText,
                source: event.source,
                structuredData: event.structuredData
            };
        }

        function since(sequence) {
            return events
                .filter(function (event) { return event.sequence > sequence; })
                .map(copy);
        }

        function byCategory(category) {
            return events
                .filter(function (event) { return event.category === category; })
                .map(copy);
        }

        function get(id) {
            for (var i = 0; i < events.length; i++) {
                if (events[i].id === id) {
                    return copy(events[i]);
                }
            }
            return null;
        }

        function clear() {
            events = [];
            dropped = 0;
            // `nextId` deliberately keeps counting. Reusing ids after a clear
            // would let a stale reference resolve to a different event, which
            // is worse than a gap in the numbering.
            return true;
        }

        return {
            append: append,
            all: all,
            since: since,
            byCategory: byCategory,
            get: get,
            clear: clear,
            size: function () { return events.length; },
            droppedCount: function () { return dropped; },
            limit: function () { return limit; }
        };
    }

    window.AetosCanonicalLog = {
        create: createLog,
        MAX_EVENTS: MAX_EVENTS,
        CATEGORIES: CATEGORIES.slice()
    };

})(window);
