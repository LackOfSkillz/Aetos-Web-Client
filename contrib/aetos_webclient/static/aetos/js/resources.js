/*
 * Aetos resource rendering and threshold announcements.
 *
 * Resources are arbitrary. Nothing here knows what "health" is; a gauge labelled
 * Sanity, Hull or Favour renders through exactly the same code (blueprint
 * section 19).
 *
 * TWO ACCESSIBILITY RULES SHAPE THIS FILE.
 *
 * 1. A gauge is not readable by a screen reader, and a colour change is not
 *    readable by anyone who cannot distinguish the colours. So every resource
 *    renders its value as TEXT alongside the bar, and severity is carried by a
 *    text marker as well as by colour (sections 45, 49).
 *
 * 2. Announcing every change is unusable. A resource that ticks each combat
 *    round would produce continuous speech the player cannot interrupt. So
 *    announcements happen only when a declared threshold is CROSSED, and only
 *    downward -- recovering from 20% to 21% is not news (section 48).
 */

(function (window, document) {
    "use strict";

    /* ------------------------------------------------------------------
     * Threshold tracking
     * ------------------------------------------------------------------ */

    /*
     * Decides when a resource change is worth announcing.
     *
     * A threshold's `at` is read as a fraction when the resource is bounded and
     * `at` lies in 0..1, and as an absolute value otherwise. That lets a game
     * say "below 20%" or "below 5 doses" without a second field to get wrong.
     */
    function createThresholdTracker() {
        var lastValues = {};

        function thresholdValue(resource, threshold) {
            var maximum = resource.maximum;
            var minimum = typeof resource.minimum === "number" ? resource.minimum : 0;
            var isFraction = typeof maximum === "number" &&
                threshold.at >= 0 && threshold.at <= 1;
            if (isFraction) {
                return minimum + ((maximum - minimum) * threshold.at);
            }
            return threshold.at;
        }

        /*
         * Return announcements triggered by this update.
         *
         * Only downward crossings count. If several are crossed at once -- a
         * single large hit -- only the most severe is announced, because
         * reading three messages in a row is worse than reading the one that
         * matters.
         */
        function evaluate(resource) {
            var previous = lastValues[resource.id];
            var current = resource.value;
            lastValues[resource.id] = current;

            if (previous === undefined || previous === current) {
                // First sight of a resource is not a crossing. Announcing on
                // connect would greet every player with their own status.
                return null;
            }
            if (!resource.thresholds || !resource.thresholds.length) {
                return null;
            }

            var crossed = resource.thresholds.filter(function (threshold) {
                var point = thresholdValue(resource, threshold);
                return previous > point && current <= point;
            });
            if (!crossed.length) {
                return null;
            }

            // Thresholds arrive sorted descending, so the last crossed is the
            // lowest and therefore the most serious.
            var worst = crossed[crossed.length - 1];
            return {
                id: resource.id,
                level: worst.level,
                message: worst.label ||
                    (resource.label + " at " + formatValue(resource) + ".")
            };
        }

        function reset() {
            lastValues = {};
        }

        return { evaluate: evaluate, reset: reset };
    }

    /* ------------------------------------------------------------------
     * Formatting
     * ------------------------------------------------------------------ */

    function round(value) {
        return Math.round(value * 10) / 10;
    }

    function formatValue(resource) {
        if (typeof resource.maximum === "number") {
            return round(resource.value) + " of " + round(resource.maximum);
        }
        return String(round(resource.value));
    }

    function percentText(resource) {
        if (typeof resource.maximum !== "number") {
            return null;
        }
        var minimum = typeof resource.minimum === "number" ? resource.minimum : 0;
        var span = resource.maximum - minimum;
        if (span <= 0) {
            return null;
        }
        var pct = ((resource.value - minimum) / span) * 100;
        return Math.max(0, Math.min(100, Math.round(pct)));
    }

    /* ------------------------------------------------------------------
     * Rendering
     * ------------------------------------------------------------------ */

    function severityFor(resource) {
        var pct = percentText(resource);
        if (pct === null || !resource.thresholds || !resource.thresholds.length) {
            return null;
        }
        var minimum = typeof resource.minimum === "number" ? resource.minimum : 0;
        var span = resource.maximum - minimum;
        var worst = null;
        resource.thresholds.forEach(function (threshold) {
            var point = (threshold.at >= 0 && threshold.at <= 1)
                ? minimum + (span * threshold.at)
                : threshold.at;
            if (resource.value <= point) {
                worst = threshold;
            }
        });
        return worst;
    }

    function renderResource(resource) {
        var row = document.createElement("div");
        row.className = "aetos-resource aetos-resource--" + resource.display;
        row.setAttribute("data-aetos-resource", resource.id);

        var severity = severityFor(resource);
        if (severity) {
            row.classList.add("aetos-resource--" + severity.level);
        }

        var label = document.createElement("span");
        label.className = "aetos-resource__label";
        label.textContent = resource.label;

        var value = document.createElement("span");
        value.className = "aetos-resource__value";
        var pct = percentText(resource);
        // The number is always present. A bar alone conveys nothing to a screen
        // reader, and nothing precise to anyone.
        value.textContent = resource.display === "percentage" && pct !== null
            ? pct + "%"
            : formatValue(resource);

        // Severity is stated in words, not only shown as a colour.
        if (severity && severity.level !== "info") {
            var marker = document.createElement("span");
            marker.className = "aetos-resource__severity";
            marker.textContent = " (" + severity.level + ")";
            value.appendChild(marker);
        }

        row.appendChild(label);
        row.appendChild(value);

        if (pct !== null && resource.display !== "number" &&
                resource.display !== "text" && resource.display !== "percentage") {
            var track = document.createElement("div");
            track.className = "aetos-resource__track";
            // A native progress semantic, so assistive technology reports the
            // value without Aetos having to describe the bar.
            track.setAttribute("role", "meter");
            track.setAttribute("aria-valuemin", String(resource.minimum || 0));
            track.setAttribute("aria-valuemax", String(resource.maximum));
            track.setAttribute("aria-valuenow", String(resource.value));
            track.setAttribute("aria-label", resource.label);

            var fill = document.createElement("div");
            fill.className = "aetos-resource__fill";
            fill.style.width = pct + "%";
            track.appendChild(fill);
            row.appendChild(track);
        }

        return row;
    }

    /* ------------------------------------------------------------------
     * Widget definition
     * ------------------------------------------------------------------ */

    function createResourceWidget(services) {
        var announce = services.announce || function () {};
        var tracker = createThresholdTracker();

        return {
            id: "resources",
            displayName: "Resources",
            description: "Numeric values your game exposes about your character.",
            builtin: true,
            defaultRegion: "aside",
            defaultSize: { height: 130 },
            // Gated: a game exposing no resources never sees this widget offered.
            requiredCapabilities: ["resources"],
            subscriptions: ["resources"],

            mount: function (context) {
                context.element.setAttribute("data-aetos-resources", "");
            },

            update: function (context, data) {
                var items = (data && data.items) || [];
                context.element.textContent = "";

                var panel = context.element.closest
                    ? context.element.closest("[data-aetos-widget]")
                    : null;
                if (panel) {
                    // Emptiness, not the player's visibility choice.
                    panel.setAttribute(
                        "data-aetos-empty", items.length ? "false" : "true");
                }
                if (!items.length) {
                    return;
                }

                items.forEach(function (resource) {
                    context.element.appendChild(renderResource(resource));

                    var announcement = tracker.evaluate(resource);
                    if (announcement) {
                        announce(announcement.message);
                    }
                });
            },

            destroy: function () {
                tracker.reset();
            }
        };
    }

    window.AetosResources = {
        createWidget: createResourceWidget,
        createThresholdTracker: createThresholdTracker,
        renderResource: renderResource,
        formatValue: formatValue,
        percentText: percentText
    };

})(window, document);
