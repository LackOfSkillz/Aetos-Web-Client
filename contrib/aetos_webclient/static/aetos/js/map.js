/*
 * Aetos map widget.
 *
 * Renders the local room graph as SVG, and -- with equal standing -- as text.
 *
 * THE TEXT MAP IS NOT A CAPTION.
 *
 * Blueprint section 47 requires every visual map to have a nonvisual equivalent.
 * That is easy to satisfy badly: bolt a description onto a picture and let the
 * two drift until the description describes a map that no longer exists.
 *
 * Both views here render from the same `map` store section, and the server
 * generates the coordinates and the surroundings description from the same
 * graph in one pass. Neither can silently disagree with the other.
 *
 * Both views are also equally operable. Clicking a room walks to it; so does
 * activating its entry in the text list, because both are real buttons calling
 * the same route function.
 */

(function (window, document) {
    "use strict";

    var CELL = 34;
    var ROOM_SIZE = 18;
    var PADDING = 14;

    /* ------------------------------------------------------------------
     * Routing
     * ------------------------------------------------------------------ */

    /*
     * Breadth-first route between two rooms, mirroring the server's own
     * find_route. Done client-side so clicking a room does not need a round
     * trip, and kept identical in shape so the two cannot disagree about what
     * "shortest" means.
     */
    function findRoute(mapData, from, to) {
        if (from === to) {
            return [];
        }
        var links = {};
        (mapData.rooms || []).forEach(function (room) { links[room.id] = []; });
        (mapData.exits || []).forEach(function (link) {
            if (links[link.from] && links[link.to] !== undefined) {
                links[link.from].push(link);
            }
        });
        Object.keys(links).forEach(function (id) {
            links[id].sort(function (a, b) {
                return (a.direction || "").localeCompare(b.direction || "");
            });
        });

        var previous = {};
        previous[from] = null;
        var queue = [from];

        while (queue.length) {
            var current = queue.shift();
            var options = links[current] || [];
            for (var i = 0; i < options.length; i++) {
                var link = options[i];
                if (previous[link.to] !== undefined) {
                    continue;
                }
                previous[link.to] = { from: current, direction: link.direction };
                if (link.to === to) {
                    var steps = [];
                    var cursor = to;
                    while (previous[cursor]) {
                        steps.push(previous[cursor].direction);
                        cursor = previous[cursor].from;
                    }
                    steps.reverse();
                    return steps;
                }
                queue.push(link.to);
            }
        }
        return null;
    }

    /* ------------------------------------------------------------------
     * SVG rendering
     * ------------------------------------------------------------------ */

    function svgElement(name, attrs) {
        var element = document.createElementNS("http://www.w3.org/2000/svg", name);
        Object.keys(attrs || {}).forEach(function (key) {
            element.setAttribute(key, attrs[key]);
        });
        return element;
    }

    function renderSvg(mapData, onWalk) {
        var positions = mapData.positions || {};
        var ids = Object.keys(positions);
        if (!ids.length) {
            return null;
        }

        var current = mapData.current;
        var currentZ = positions[current] ? positions[current][2] : 0;

        // Only the current Z level is drawn. Overlaying levels produces an
        // unreadable tangle, and a player is on exactly one of them.
        var visible = ids.filter(function (id) { return positions[id][2] === currentZ; });
        if (!visible.length) {
            return null;
        }

        var xs = visible.map(function (id) { return positions[id][0]; });
        var ys = visible.map(function (id) { return positions[id][1]; });
        var minX = Math.min.apply(null, xs);
        var minY = Math.min.apply(null, ys);
        var width = (Math.max.apply(null, xs) - minX) * CELL + ROOM_SIZE + (PADDING * 2);
        var height = (Math.max.apply(null, ys) - minY) * CELL + ROOM_SIZE + (PADDING * 2);

        var svg = svgElement("svg", {
            "class": "aetos-map__svg",
            viewBox: "0 0 " + width + " " + height,
            width: width,
            height: height,
            // The SVG is decorative: the adjacent text map carries the same
            // information in a form assistive technology can actually use.
            "aria-hidden": "true",
            focusable: "false"
        });

        function px(id) {
            return PADDING + ((positions[id][0] - minX) * CELL) + (ROOM_SIZE / 2);
        }
        function py(id) {
            return PADDING + ((positions[id][1] - minY) * CELL) + (ROOM_SIZE / 2);
        }

        (mapData.exits || []).forEach(function (link) {
            if (!positions[link.from] || !positions[link.to]) {
                return;
            }
            if (positions[link.from][2] !== currentZ || positions[link.to][2] !== currentZ) {
                return;
            }
            svg.appendChild(svgElement("line", {
                "class": "aetos-map__link",
                x1: px(link.from), y1: py(link.from),
                x2: px(link.to), y2: py(link.to)
            }));
        });

        var lookup = {};
        (mapData.rooms || []).forEach(function (room) { lookup[room.id] = room; });

        visible.forEach(function (id) {
            var room = lookup[id] || {};
            var isCurrent = id === current;
            var node = svgElement("rect", {
                "class": "aetos-map__room" + (isCurrent ? " aetos-map__room--current" : ""),
                x: px(id) - (ROOM_SIZE / 2),
                y: py(id) - (ROOM_SIZE / 2),
                width: ROOM_SIZE,
                height: ROOM_SIZE,
                rx: 3
            });
            if (!isCurrent && onWalk) {
                node.addEventListener("click", function () { onWalk(id); });
                node.classList.add("aetos-map__room--walkable");
            }
            var title = svgElement("title", {});
            title.textContent = room.name || id;
            node.appendChild(title);
            svg.appendChild(node);
        });

        return svg;
    }

    /* ------------------------------------------------------------------
     * Text rendering
     * ------------------------------------------------------------------ */

    /*
     * The non-visual map (blueprint section 47).
     *
     * Reads as prose rather than as a table of coordinates, because a player
     * navigating by ear needs "North: Tower Road", not "(3, -1, 0)".
     */
    function renderText(mapData, onWalk) {
        var surroundings = mapData.surroundings || {};
        var container = document.createElement("div");
        container.className = "aetos-map__text";

        var location = document.createElement("p");
        location.className = "aetos-map__location";
        location.textContent = surroundings.location
            ? "Current location: " + surroundings.location + "."
            : "Current location unknown.";
        container.appendChild(location);

        var exits = surroundings.exits || [];
        if (exits.length) {
            var exitHeading = document.createElement("h3");
            exitHeading.className = "aetos-map__subheading";
            exitHeading.textContent = "Exits";
            container.appendChild(exitHeading);

            var exitList = document.createElement("ul");
            exitList.className = "aetos-list";
            exits.forEach(function (exit) {
                var item = document.createElement("li");
                var button = document.createElement("button");
                button.type = "button";
                button.className = "aetos-list__button";
                // Names the destination when known: "North: Tower Road" tells a
                // player far more than "North".
                button.textContent = exit.name
                    ? exit.direction + ": " + exit.name
                    : exit.direction;
                if (onWalk) {
                    button.addEventListener("click", function () { onWalk(exit.to); });
                }
                item.appendChild(button);
                exitList.appendChild(item);
            });
            container.appendChild(exitList);
        }

        var landmarks = surroundings.landmarks || [];
        if (landmarks.length) {
            var landmarkHeading = document.createElement("h3");
            landmarkHeading.className = "aetos-map__subheading";
            landmarkHeading.textContent = "Nearby";
            container.appendChild(landmarkHeading);

            var landmarkList = document.createElement("ul");
            landmarkList.className = "aetos-list";
            landmarks.slice(0, 12).forEach(function (landmark) {
                var item = document.createElement("li");
                var button = document.createElement("button");
                button.type = "button";
                button.className = "aetos-list__button";
                var rooms = landmark.distance === 1 ? " room" : " rooms";
                button.textContent = (landmark.name || landmark.id) +
                    ", " + landmark.distance + rooms + " away";
                if (onWalk) {
                    button.addEventListener("click", function () { onWalk(landmark.id); });
                }
                item.appendChild(button);
                landmarkList.appendChild(item);
            });
            container.appendChild(landmarkList);
        }

        return container;
    }

    /* ------------------------------------------------------------------
     * Widget
     * ------------------------------------------------------------------ */

    function createMapWidget(services) {
        var sendCommand = services.sendCommand;
        var announce = services.announce || function () {};
        var queueRoute = services.queueRoute;

        return {
            id: "map",
            // graphicalOnly is FALSE despite the SVG: the written surroundings
            // description is generated from the same graph as the picture, so
            // the map is not a graphic with a caption -- it is one dataset with
            // two equal renderings (A.29).
            accessibility: {
                landmarkLabel: "Local map",
                heading: "Map",
                keyboardOperable: true,
                liveUpdates: true
            },
            displayName: "Map",
            description: "Local room graph, visual and textual.",
            builtin: true,
            defaultRegion: "aside",
            defaultSize: { height: 260 },
            // No required capability: the default provider builds this from
            // ordinary rooms and exits, so it works on a pristine game.
            subscriptions: ["map"],

            mount: function (context) {
                context.element.classList.add("aetos-map");
            },

            update: function (context, mapData) {
                var data = mapData || {};
                var panel = context.element.closest
                    ? context.element.closest("[data-aetos-widget]")
                    : null;
                var hasRooms = (data.rooms || []).length > 0;
                if (panel) {
                    // Emptiness, not the player's visibility choice.
                    panel.setAttribute(
                        "data-aetos-empty", hasRooms ? "false" : "true");
                }
                context.element.textContent = "";
                if (!hasRooms) {
                    return;
                }

                function walkTo(roomId) {
                    var steps = findRoute(data, data.current, roomId);
                    if (!steps || !steps.length) {
                        announce("No route to that location.");
                        return;
                    }
                    // Queued as ordinary movement commands. The server decides
                    // whether each one succeeds; a locked door stops the route.
                    if (queueRoute) {
                        queueRoute(steps);
                    } else {
                        steps.forEach(function (step) { sendCommand(step); });
                    }
                    announce("Walking " + steps.length +
                        (steps.length === 1 ? " step." : " steps."));
                }

                var svg = renderSvg(data, walkTo);
                if (svg) {
                    context.element.appendChild(svg);
                }
                context.element.appendChild(renderText(data, walkTo));

                // Approximate geometry is stated rather than hidden. A map drawn
                // with nudged rooms is still useful; a map that silently lies
                // about the world is not.
                if ((data.conflicts || []).length) {
                    var note = document.createElement("p");
                    note.className = "aetos-map__note";
                    note.textContent = "Layout approximate here: " +
                        data.conflicts.length +
                        (data.conflicts.length === 1 ? " room does" : " rooms do") +
                        " not fit the grid.";
                    context.element.appendChild(note);
                }
            }
        };
    }

    window.AetosMap = {
        createWidget: createMapWidget,
        findRoute: findRoute,
        renderText: renderText,
        renderSvg: renderSvg
    };

})(window, document);
