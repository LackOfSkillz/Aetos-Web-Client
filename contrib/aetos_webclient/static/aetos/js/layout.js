/*
 * Aetos layout manager.
 *
 * Widgets ask the layout MANAGER to place them; they never speak to a layout
 * engine directly (blueprint section 15):
 *
 *     Widget -> AetosLayoutManager -> <adapter> -> engine
 *
 * The adapter boundary is the point. Aetos ships a vanilla dock adapter with no
 * external dependencies; a game or a future version can supply a different one
 * (GoldenLayout, or anything else) without touching a single widget.
 *
 * ACCESSIBILITY IS PART OF THE ENGINE, NOT A LAYER ON TOP.
 *
 * Blueprint revision 2 requires every drag operation to have a keyboard
 * equivalent (section 16), and no widget is finished until it is usable without a
 * mouse (section 72). So the manager's primitives are `moveWidget(id,
 * direction)` and `resizeWidget(id, delta)` -- discrete, keyboard-shaped
 * operations. Dragging, when an adapter offers it, is implemented in terms of
 * those, rather than the keyboard being bolted onto a drag-first design.
 */

(function (window, document) {
    "use strict";

    // Regions a widget can occupy in the vanilla adapter. Deliberately few:
    // a simple, predictable set is far easier to operate blind than free
    // positioning, and covers what a MUD client actually needs.
    var REGIONS = ["sidebar", "main", "aside", "bottom"];

    var MIN_SIZE = 120;
    var MAX_SIZE = 900;
    var RESIZE_STEP = 20;

    /* ------------------------------------------------------------------
     * Vanilla dock adapter
     *
     * Panels docked into named regions. No external library, no drag
     * dependency, and every operation reachable from the keyboard.
     * ------------------------------------------------------------------ */
    function VanillaDockAdapter(rootElement) {
        var regionElements = {};
        var panels = {};

        function ensureRegions() {
            REGIONS.forEach(function (region) {
                var existing = rootElement.querySelector('[data-aetos-region="' + region + '"]');
                if (!existing) {
                    existing = document.createElement("div");
                    existing.className = "aetos-region aetos-region--" + region;
                    existing.setAttribute("data-aetos-region", region);
                    rootElement.appendChild(existing);
                }
                regionElements[region] = existing;
            });
        }

        ensureRegions();

        function mount(instance) {
            var panel = document.createElement("section");
            panel.className = "aetos-widget aetos-widget--panel";
            panel.setAttribute("data-aetos-widget", instance.id);

            /*
             * Heading and landmark name come from the widget's declared
             * accessibility contract (A.28), not from `displayName`.
             *
             * They are usually the same string, and they are allowed to differ
             * for a good reason: a panel titled "Effects" may want to be
             * announced as "Active effects on your character", because a
             * landmark name is read out of context while a visible heading is
             * read next to the thing it labels.
             *
             * Falling back to displayName keeps the adapter working if a widget
             * somehow arrives without metadata -- though the registry refuses
             * to produce one.
             */
            var meta = instance.accessibility || {};

            var heading = document.createElement("h2");
            heading.className = "aetos-widget__title";
            heading.id = "aetos-widget-title-" + instance.id;
            heading.textContent = meta.heading || instance.displayName;

            panel.setAttribute("aria-labelledby", heading.id);
            if (meta.landmarkLabel && meta.landmarkLabel !== heading.textContent) {
                // aria-label wins over aria-labelledby, so it is only set when
                // the two genuinely differ -- otherwise it would silently
                // detach the heading from the region for no benefit.
                panel.setAttribute("aria-label", meta.landmarkLabel);
            }

            // Declared, so QA can assert that a widget claiming live updates
            // routes them through the announcement manager rather than
            // inventing a live region (A11Y-ANN-001).
            panel.setAttribute("data-aetos-live", meta.liveUpdates ? "true" : "false");
            if (meta.keyboardOperable === false) {
                panel.setAttribute("data-aetos-display-only", "true");
            }

            var body = document.createElement("div");
            body.className = "aetos-widget__body";

            panel.appendChild(heading);
            panel.appendChild(body);

            regionElements[instance.region].appendChild(panel);
            panels[instance.id] = { panel: panel, body: body, heading: heading };
            return body;
        }

        function unmount(id) {
            var entry = panels[id];
            if (!entry) {
                return;
            }
            if (entry.panel.parentNode) {
                entry.panel.parentNode.removeChild(entry.panel);
            }
            delete panels[id];
        }

        function setRegion(id, region) {
            var entry = panels[id];
            if (!entry || !regionElements[region]) {
                return false;
            }
            regionElements[region].appendChild(entry.panel);
            return true;
        }

        // Reorder within a region, which is what "move up/down" means for a
        // docked panel.
        function shift(id, delta) {
            var entry = panels[id];
            if (!entry) {
                return false;
            }
            var parent = entry.panel.parentNode;
            var siblings = Array.prototype.slice.call(parent.children);
            var index = siblings.indexOf(entry.panel);
            var target = index + delta;
            if (target < 0 || target >= siblings.length) {
                return false;
            }
            if (delta < 0) {
                parent.insertBefore(entry.panel, siblings[target]);
            } else {
                parent.insertBefore(entry.panel, siblings[target].nextSibling);
            }
            return true;
        }

        function setSize(id, size) {
            var entry = panels[id];
            if (!entry) {
                return false;
            }
            if (size.height) {
                entry.panel.style.height = size.height + "px";
            }
            if (size.width) {
                entry.panel.style.width = size.width + "px";
            }
            return true;
        }

        function setVisible(id, visible) {
            var entry = panels[id];
            if (!entry) {
                return false;
            }
            entry.panel.hidden = !visible;
            return true;
        }

        function focus(id) {
            var entry = panels[id];
            if (!entry) {
                return false;
            }
            // Panels are not normally in the tab order; make it focusable on
            // demand so keyboard layout editing can move focus with the panel.
            entry.panel.setAttribute("tabindex", "-1");
            entry.panel.focus();
            return true;
        }

        return {
            name: "vanilla-dock",
            regions: REGIONS.slice(),
            mount: mount,
            unmount: unmount,
            setRegion: setRegion,
            shift: shift,
            setSize: setSize,
            setVisible: setVisible,
            focus: focus
        };
    }

    /* ------------------------------------------------------------------
     * Layout manager
     * ------------------------------------------------------------------ */
    function createLayoutManager(options) {
        var opts = options || {};
        var registry = opts.registry;
        var store = opts.store;
        var storage = opts.storage;
        var adapter = opts.adapter;
        var instances = {};
        var unsubscribers = {};

        function defaultRegionFor(definition) {
            return definition.defaultRegion || "sidebar";
        }

        /*
         * Add a widget instance.
         *
         * Refuses widgets the manifest does not support, so an unsupported
         * widget can never be added by a stale saved layout.
         */
        function add(widgetId, config) {
            var definition = registry.get(widgetId);
            if (!definition) {
                return null;
            }
            var manifest = store ? store.get("manifest") : {};
            if (!registry.isSupported(definition, manifest)) {
                return null;
            }
            if (definition.singleton && instances[widgetId]) {
                return instances[widgetId];
            }

            var instance = {
                id: widgetId,
                displayName: definition.displayName,
                // Carried explicitly rather than left for the adapter to dig out
                // of `definition`, because the adapter's contract is the
                // instance -- an adapter that reached through it would break the
                // moment a second adapter was written.
                accessibility: definition.accessibility,
                region: (config && config.region) || defaultRegionFor(definition),
                size: (config && config.size) || definition.defaultSize,
                visible: config ? config.visible !== false : true,
                definition: definition
            };

            var body = adapter.mount(instance);
            instance.element = body;
            instances[widgetId] = instance;

            var context = { id: widgetId, element: body, store: store, storage: storage };
            instance.context = context;
            definition.mount(context);

            // Wire store subscriptions on the widget's behalf so a widget never
            // reaches for the transport or the store wiring itself.
            if (store && definition.update && definition.subscriptions.length) {
                var deliver = function (section, data) {
                    try {
                        definition.update(context, data, section);
                    } catch (err) {
                        window.console.error(
                            "Aetos widget \"" + widgetId + "\" update failed", err);
                    }
                };

                unsubscribers[widgetId] = definition.subscriptions.map(function (section) {
                    return store.subscribe(section, function (data) {
                        deliver(section, data);
                    });
                });

                /*
                 * Prime with the CURRENT value.
                 *
                 * The store notifies on change, so a widget mounted after its
                 * section already arrived would never be told about it and would
                 * sit empty until the next update. That affects any widget added
                 * from the palette mid-session, and any widget whose mount loses
                 * a race with the first sync.
                 *
                 * Subscribing and priming together is the only way a widget can
                 * be correct regardless of when it happens to be mounted.
                 */
                definition.subscriptions.forEach(function (section) {
                    deliver(section, store.get(section));
                });
            }

            adapter.setSize(widgetId, instance.size);
            adapter.setVisible(widgetId, instance.visible);
            return instance;
        }

        function remove(widgetId) {
            var instance = instances[widgetId];
            if (!instance) {
                return false;
            }
            (unsubscribers[widgetId] || []).forEach(function (off) {
                if (typeof off === "function") { off(); }
            });
            delete unsubscribers[widgetId];
            if (instance.definition.destroy) {
                try {
                    instance.definition.destroy(instance.context);
                } catch (err) {
                    window.console.error("Aetos widget \"" + widgetId + "\" destroy failed", err);
                }
            }
            adapter.unmount(widgetId);
            delete instances[widgetId];
            return true;
        }

        /* --- Keyboard-shaped layout primitives ------------------------- */

        /*
         * Move a widget.
         *
         * `direction` is one of "up", "down", or a region name. These are the
         * primitives a keyboard user drives directly; a drag implementation in
         * some future adapter resolves to the same calls.
         */
        function moveWidget(widgetId, direction) {
            var instance = instances[widgetId];
            if (!instance) {
                return false;
            }
            if (direction === "up" || direction === "down") {
                return adapter.shift(widgetId, direction === "up" ? -1 : 1);
            }
            if (adapter.regions.indexOf(direction) !== -1) {
                if (adapter.setRegion(widgetId, direction)) {
                    instance.region = direction;
                    return true;
                }
            }
            return false;
        }

        function resizeWidget(widgetId, delta) {
            var instance = instances[widgetId];
            if (!instance) {
                return false;
            }
            var height = (instance.size && instance.size.height) || 200;
            var next = Math.min(MAX_SIZE, Math.max(MIN_SIZE, height + (delta * RESIZE_STEP)));
            instance.size = { width: instance.size && instance.size.width, height: next };
            return adapter.setSize(widgetId, instance.size);
        }

        function setVisible(widgetId, visible) {
            var instance = instances[widgetId];
            if (!instance) {
                return false;
            }
            instance.visible = !!visible;
            return adapter.setVisible(widgetId, instance.visible);
        }

        /* --- Persistence ----------------------------------------------- */

        function serialize() {
            return {
                version: 1,
                adapter: adapter.name,
                widgets: Object.keys(instances).map(function (id) {
                    var instance = instances[id];
                    return {
                        id: id,
                        region: instance.region,
                        size: instance.size,
                        visible: instance.visible
                    };
                })
            };
        }

        /*
         * Restore a saved layout.
         *
         * A saved layout is local data that may predate a change in the game's
         * manifest or in Aetos itself, so every entry is re-checked rather than
         * trusted: unknown widget ids and now-unsupported widgets are skipped.
         * Restoring blindly would resurrect widgets for capabilities the game
         * no longer exposes.
         */
        function restore(saved) {
            if (!saved || !Array.isArray(saved.widgets)) {
                return { restored: 0, skipped: 0 };
            }
            var result = { restored: 0, skipped: 0 };
            saved.widgets.forEach(function (entry) {
                if (!entry || typeof entry.id !== "string") {
                    result.skipped += 1;
                    return;
                }
                var added = add(entry.id, {
                    region: entry.region,
                    size: entry.size,
                    visible: entry.visible
                });
                if (added) {
                    result.restored += 1;
                } else {
                    result.skipped += 1;
                }
            });
            return result;
        }

        function save(name) {
            if (!storage) {
                return window.Promise.resolve(false);
            }
            return storage.put("layouts", name || "default", serialize());
        }

        function load(name) {
            if (!storage) {
                return window.Promise.resolve(null);
            }
            return storage.get("layouts", name || "default");
        }

        function listInstances() {
            return Object.keys(instances).map(function (id) {
                return instances[id];
            });
        }

        return {
            adapterName: adapter.name,
            regions: adapter.regions.slice(),
            add: add,
            remove: remove,
            moveWidget: moveWidget,
            resizeWidget: resizeWidget,
            setVisible: setVisible,
            focusWidget: function (id) { return adapter.focus(id); },
            serialize: serialize,
            restore: restore,
            save: save,
            load: load,
            instances: listInstances
        };
    }

    window.AetosLayout = {
        createManager: createLayoutManager,
        VanillaDockAdapter: VanillaDockAdapter,
        REGIONS: REGIONS.slice()
    };

})(window, document);
