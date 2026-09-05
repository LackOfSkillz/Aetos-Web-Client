# Widget SDK

How to write an Aetos widget for your game.

A widget is a panel in the client. Aetos ships sixteen; a game can add its own
for anything the built-ins do not cover — a faction standing, a ship's helm, a
crafting queue. This document is the contract.

**SDK version: 1.**

---

## The shortest widget that works

```javascript
Aetos.registry.register({
    id: "faction",
    displayName: "Standing",
    description: "How the factions currently regard you.",
    defaultRegion: "sidebar",
    subscriptions: ["character"],

    accessibility: {
        landmarkLabel: "Faction standing",
        heading: "Standing",
        description: "How the factions currently regard you.",
        keyboardOperable: false,
        liveUpdates: true,
        graphicalOnly: false,
        textAlternative: null
    },

    mount: function (context) {
        context.element.textContent = "No standing yet.";
    },

    update: function (context, data) {
        context.element.textContent = (data.factions || [])
            .map(function (f) { return f.name + ": " + f.standing; })
            .join(", ") || "No standing yet.";
    }
});
```

Load that after Aetos's own scripts and it appears in the widget palette.

---

## The accessibility contract is not optional

`register()` **throws** without it. That is deliberate and it is the whole point
of the field: a widget author who has not thought about how their widget is read
cannot ship it by accident, and *"we'll do accessibility later"* is not
expressible in this API.

| Field | Meaning |
| --- | --- |
| `landmarkLabel` | Names the panel's region for a screen reader. |
| `heading` | The visible heading. |
| `description` | Shown in the widget palette. |
| `keyboardOperable` | `false` means display-only. If anything in your widget can be activated, this must be `true` and it must actually work. |
| `liveUpdates` | Whether the content changes on its own. |
| `graphicalOnly` | A canvas or SVG with no text form. |
| `textAlternative` | **Required** if `graphicalOnly` is `true`. |

`graphicalOnly: true` without a `textAlternative` is refused outright. A canvas
with no text form is not a widget with an accessibility gap — it is a widget
half the audience cannot use at all.

The metadata is not decoration: the layout uses `landmarkLabel` and `heading` to
build the panel, so declaring them badly is visibly wrong to *you* rather than
silently wrong for somebody else.

### Things the client already guarantees, and you should not fight

- **Colour is never the only signal.** If you colour something, also say it.
- **Announcements go through the shared announcer**, not your own `aria-live`.
  The client has exactly two live regions on purpose; a third competes with the
  transcript for speech. Use `context.announce` if you have one, or leave it to
  the store.
- **A scrolling region needs `tabindex="0"` and a label.** Arrow keys scroll
  whatever has focus, so a scrolling region outside the tab order cannot be
  scrolled by keyboard at all. This client has got that wrong four times; all
  four were caught by axe rather than by review.
- **Never put `role` on a `<ul>`.** It replaces the list semantics and orphans
  every `<li>`. Aetos has made that mistake twice, both times while *improving*
  accessibility.

---

## Lifecycle

```text
register(definition)     once, at load
  └─ mount(context)      when the widget is added to a layout
       └─ update(...)    when a subscribed store section changes
  └─ destroy(context)    when removed, before the element goes
```

`mount` receives `{ id, element, store, storage }`. Write into `element`; it is
yours. Do not reach outside it.

`update(context, data, section)` is called with the new value of a subscribed
section. It is also called **once immediately after mount** with the current
value — so a widget added mid-session is correct straight away rather than
sitting empty until the next change. Write `update` so that calling it with the
current state is always safe.

`destroy` should release timers and listeners. Anything you attached to
`context.element` goes with the element.

### Subscriptions

Declare the store sections you need:

```javascript
subscriptions: ["resources", "target"]
```

Valid sections are `connection`, `manifest`, `character`, `room`, `entities`,
`resources`, `inventory`, `equipment`, `target`, `effects`, `map`, `actions`,
`mode`, `media`.

Aetos wires and unwires these for you. **A widget never touches the websocket
and never subscribes to the transport**, which is what lets the client replay a
captured session through the same code path as a live one.

### Capabilities

```javascript
requiredCapabilities: ["equipment"]
```

The widget is offered only when the game's manifest declares that feature. A
game with no equipment system gets no equipment panel, rather than an empty one.

This is why the inspector distinguishes *offered* from *withheld*: a widget that
never appeared usually is not broken, it is waiting for the game to declare
something.

---

## Sending commands

Through the client, as an ordinary command:

```javascript
Aetos.sendCommand("look");
```

That is the single outbound seam. Everything — keyboard, buttons, macros,
routes, scripts, voice, the communication board — funnels through it, and the
server applies every lock, cooldown and permission exactly as if it had been
typed.

A widget that reached the transport directly would bypass all of that, and the
first time it mattered would be the time somebody got into trouble for a command
the game had already refused.

---

## Failure isolation

**Your widget breaking must not break the client**, and Aetos enforces that
rather than trusting it.

If `mount`, `update` or `destroy` throws:

1. The error is caught and logged.
2. It is recorded in the diagnostic report, so a bug report carries it.
3. After three failures — or immediately, for a `mount` failure — the widget is
   **switched off**: its subscriptions are released so it stops consuming
   events.
4. Its panel shows a plain-language explanation and a **Try again** button.
5. Every other widget carries on.

The placeholder matters. An empty panel is indistinguishable from a widget with
nothing to show, and a player looking at a blank inventory needs to know whether
they are carrying nothing or looking at something broken.

`Try again` remounts from scratch rather than resuming, because whatever state
the widget had when it broke is exactly the state that broke it.

You can see what is currently switched off:

```javascript
Aetos.layout.disabledWidgets();   // [{id, phase, message}]
```

> Before M22 none of this was true of `mount`. Widgets are mounted in a loop, so
> one game-authored widget throwing aborted the loop and **every widget after it
> silently never appeared**. If you are reading this because your widget broke,
> the good news is that it now only breaks itself.

---

## Declaring which SDK version you wrote against

Optional, and worth doing for a widget you ship with a game:

```javascript
sdkVersion: 1
```

Registration refuses a version this client does not support, and says which way
the mismatch runs — *update Aetos*, or *this widget was written for an older
contract*.

Without it, a widget written for an older SDK fails as a mount error in somebody
else's game months later, with nothing pointing at the cause. With it, the
failure is one sentence naming both numbers.

The version bumps only when a change would break a widget written against the
previous one — a new required field, a changed lifecycle call, a different
context shape. Adding an optional field does not bump it.

---

## There is no plugin marketplace

Aetos will not download and execute third-party widget code, and this is not a
gap to be filled later.

A marketplace brings code trust, supply chain, signing, update and sandboxing
problems, and the failure mode is remote code execution in a client that is
otherwise careful to ask for nothing the game did not offer. None of that is
worth carrying in a contrib whose entire security posture rests on that
restraint.

The SDK targets **game-bundled and developer-authored** widgets: code that
arrives because a game's own developer put it there, reviewed by whoever runs
the game, and shipped with it.

---

## Testing your widget

The store's scheduler is injectable, so you can drive updates synchronously
rather than waiting for animation frames:

```javascript
var store = AetosStore.create({ schedule: function (fn) { fn(); } });
```

That matters more than it looks: a backgrounded browser tab does not run
animation frames at all, so a test relying on them silently does nothing.

Aetos's own capture and replay (`Inspector → Capture this session`) record a
real session to a file and play it back through the same seam the websocket
uses. If your widget misbehaves on a particular sequence of game output, a
capture reproduces it exactly, without the game running.

---

## A checklist before you ship one

- [ ] `register()` does not throw
- [ ] Works with a keyboard alone, if it is interactive at all
- [ ] Nothing conveyed by colour alone
- [ ] Any scrolling region is focusable and labelled
- [ ] `update` is safe to call with the current state at any moment
- [ ] `destroy` releases timers and listeners
- [ ] Commands go through `Aetos.sendCommand`
- [ ] Declares `requiredCapabilities` if it needs a game feature
- [ ] Run axe over the client with your widget mounted
