# M6 -- Layout manager and widget registry

Status: **Core complete** (edit-layout UI deferred to M7)

Verification: 133 Python tests OK; 35/35 browser QA OK.

## What exists

- `static/aetos/js/widgets.js` -- `AetosWidgetRegistry`: definitions, validation,
  capability gating, built-in protection.
- `static/aetos/js/layout.js` -- `AetosLayoutManager` plus the adapter boundary
  and a dependency-free `VanillaDockAdapter`.
- `templates/aetos/base.html` -- Aetos's own base; see `decision-004`.
- `static/aetos/js/compat.js` -- the 20-line jQuery shim.

## Layering

```
Widget -> AetosLayoutManager -> adapter -> engine
```

No widget references the adapter or the engine. The manager wires store
subscriptions on the widget's behalf, so a widget never touches the transport,
the store wiring, or the DOM outside its own element.

## Accessibility designed in, not added

The manager's primitives are `moveWidget(id, direction)` and `resizeWidget(id,
delta)` -- discrete, keyboard-shaped operations. Dragging, in any adapter that
offers it, resolves to those same calls.

This ordering is deliberate. Blueprint revision 2 requires a keyboard equivalent
for every drag operation (section 16). Designing drag first and adding keyboard
later reliably produces two divergent interaction models; making the discrete
operation the primitive means the keyboard path cannot fall behind.

## Capability gating

`registry.available(manifest)` returns only widgets whose
`requiredCapabilities` are satisfied by the game's declared features. Verified
live: with a pristine game exposing nothing, a `resources` widget is reported
unavailable while a capability-free `console` widget is available. That is
blueprint section 51 -- no unsupported controls clutter the screen.

## Built-in widgets cannot be replaced

Registering over a built-in throws. A third-party widget silently replacing the
console or command input would be unrecoverable for the player (section 57).

## Restore re-checks rather than trusts

A saved layout is local data that may predate a change in the game's manifest or
in Aetos itself. `restore()` re-runs `add()` for every entry, so unknown widget
ids and now-unsupported widgets are skipped and counted rather than resurrected.

## BUG FOUND AND FIXED -- sync wiped the manifest

`store.applySync()` replaced every section except `connection`. But `manifest`
arrives in its own `aetos_manifest` message and is never part of a sync payload,
so the first sync cleared the game's declared capabilities.

Effect: every capability-gated widget would be permanently unavailable for the
rest of the session, and the automation policy (including whether scripting is
allowed) would read as absent. The client looked fine -- it just quietly believed
the game exposed nothing.

Introduced in M4 when `requestSync()` was added; invisible until M6 because
nothing consumed the manifest until capability gating existed.

Fixed by exempting `manifest` alongside `connection`, and guarded by a browser QA
assertion that a sync preserves the manifest while still replacing authoritative
sections.

## Lab note -- static caching masks changes

Evennia serves collected static files with caching, so an edited JS file can
appear unchanged in the browser after `evennia reload`. This briefly looked like
"the handshake stopped being sent".

When a JS change appears to have no effect, load with a cache-busting query
(`/webclient/?cachebust=1`) or `fetch(url, {cache: "reload"})` before diagnosing
it as a code fault. Worth a README troubleshooting entry at M28.

## Deferred to M7

- Edit Layout mode UI (palette, keyboard move/resize bindings, reset)
- Workspaces
- Migrating the hardcoded sidebar widgets onto the registry. The room/exits/
  people/items widgets currently live in `aetos.js` markup; they work and are
  accessible, and moving them is mechanical once Edit Layout exists.
