# Aetos Web Client

Contribution by Gary E Mix, 2026

A genre-agnostic graphical webclient framework for Evennia. Aetos replaces the
stock webclient interface while leaving Evennia's transport layer -- `evennia.js`
and the Portal websocket -- completely untouched.

Install it and you immediately get a better client on an ordinary Evennia game,
with no changes to your game code. Teach it about your game's data and it becomes
your game's graphical interface.

Aetos makes no assumptions about genre, combat, magic, character model, map
format, inventory, or resources. Anything a game does not expose simply does not
appear.

## Features

Everything below works today and is covered by tests.

### Out of the box, on a pristine game

No game code, no settings beyond installation.

- Replaces the stock GUI while reusing Evennia's transport unmodified
- Console with bounded scrollback and full ANSI / xterm-256 colour
- Room, exits, people and items panels, honouring your `view` and `search` locks
- Inventory panel, from ordinary `contents`
- Local map built by walking exits the character can actually see, with a
  written equivalent generated from the same data
- Context menus on every listed entity, offering `look`, `get` and `drop`
- Movement and route-walking by clicking the map, one ordinary command at a time
- Command palette (`Ctrl+K`) and in-client help (`F1`)
- Layout editing, workspaces, and a responsive layout from phone to wide monitor

### When your game exposes them

Progressive enhancement: declare a feature and supply a provider, and the
matching interface appears. Declare nothing and nothing appears.

- Generic resource meters with thresholds and spoken announcements
- Equipment by slot, current target, and temporary effects with countdowns
- Game-supplied context actions on any entity

### Player tools, stored only in the player's browser

- Hotbars and macros of up to five commands, run through a visible queue
- Aliases with `$1`/`$*` argument substitution
- Triggers on game output, plain text or regular expression, rate limited
- Timers on a schedule
- Aetos Script: a small sandboxed language with a purpose-built interpreter
- Private notes, relationship tags, map notes and points of interest
- Profile export and import as a single JSON file
- A privacy panel reporting what is stored, counted from storage

### Throughout

- Versioned protocol with handshake and capability manifest
- Provider system for exposing your game's data without editing Aetos
- Allowlist sanitisation of all server-provided markup; `innerHTML` is never used
- Keyboard operation of everything; colour never carries meaning alone
- No CDN, no build step, no JavaScript framework

Still to come: an accessibility foundation and assistive-technology validation
(see Accessibility below), rich chat and event history, audio and multimedia
with captions, themes, a PWA shell and touch gestures, a developer inspector, a
documented widget SDK, a server-described advanced UI manifest,
picture-supported communication, and voice input. See the project repository for
the full roadmap.

## Installation

Add the following to your game's `server/conf/settings.py`:

```python
from evennia.contrib.base_systems.aetos_webclient import AETOS_TEMPLATE_DIR

INSTALLED_APPS += ["evennia.contrib.base_systems.aetos_webclient"]
TEMPLATES[0]["DIRS"].insert(0, AETOS_TEMPLATE_DIR)
INPUT_FUNC_MODULES.append("evennia.contrib.base_systems.aetos_webclient.inputfuncs")
```

Then restart so that static assets are collected:

```
evennia reload
```

Aetos now serves at your existing webclient URL (`/webclient/` by default). No
files are copied into your game directory and no Evennia file is modified.

### What each line does

`TEMPLATES[0]["DIRS"].insert(...)` is what makes Aetos's `webclient.html` take
precedence over Evennia's. It cannot be omitted: Django searches every `DIRS`
entry before any installed app, and Evennia always places its own
`web/templates/webclient` in `DIRS`, so registering the app alone would never win.

`INSTALLED_APPS` is what makes Django's `AppDirectoriesFinder` discover Aetos's
static assets, so `collectstatic` picks them up without further configuration.

`INPUT_FUNC_MODULES` registers the two server-side handlers Aetos adds: the
`aetos_hello` handshake, which replies with the manifest describing what your game
exposes, and `aetos_request_sync`, which the client uses to ask for fresh state.
Those two are the entire server-side surface. Without them the client still loads
and plays, but the server logs an
"Input command not recognized" error on every connect and no manifest is sent, so
no progressive-enhancement features appear.

> Note: setting `WEBCLIENT_TEMPLATE` does **not** work for this. Evennia builds
> the `TEMPLATES` list at import time in `settings_default`, so reassigning
> `WEBCLIENT_TEMPLATE` in your own settings has no effect on the already-built
> list.

## Uninstalling

Delete the block above and restart. The stock webclient returns unchanged.

## Configuration

Aetos requires no configuration. Everything below is optional.

### Automation policy

What the client is permitted to offer. Defaults shown:

```python
AETOS_AUTOMATION = {
    "macros": True,
    "aliases": True,
    "triggers": True,
    "timers": False,
    "scripting": False,
    "voice": True,
}
```

The client honours these. With `scripting` false, no scripting editor is offered
at all. These are policy, not security: they shape the interface, while the server
remains the thing that decides whether any command succeeds.

### Features

Which structured subsystems your game exposes. All default to `False`, which is
why a pristine game gets a clean client rather than empty widgets:

```python
AETOS_FEATURES = {"resources": True, "map": True}
```

## Teaching Aetos about your game

A stock Evennia game works without custom code. For richer systems, tell Aetos
where your data already lives with `AETOS_BINDINGS`. If you do not know where to
start, run the server-side Aetos Discovery helper and review the integrations it
finds. When your data requires calculations or unusual game logic, use the full
provider API.

The Aetos Web Client never scans or guesses your game model during normal player
operation. Discovery is an optional development-time helper, not a gameplay
subsystem.

### Bindings -- the easy path (planned, see the project roadmap)

Most games only need to say *where* their data lives:

```python
AETOS_BINDINGS = {
    "resources": {
        "health": {"label": "Health", "value": "db.hp", "maximum": "db.hp_max"},
    },
}
```

No provider class and no import. Declaring a binding is enough to expose the
matching feature.

If you are not sure what to write, the server-side discovery tool inspects your
own game and suggests it:

```
evennia aetos discover
```

It shows its evidence and confidence, tests each binding against a live
character, and writes suggestions to `aetos-discovery/` for you to review. It
never edits your game, never executes your code, and is not reachable by
players.

Bindings say where data *is*. If a value is *calculated* -- a method call, a
derived stat -- bindings deliberately stop and you write a provider instead.

### Providers -- the advanced path

For anything bindings cannot express. Aetos never assumes where you store
anything:

```python
AETOS_PROVIDERS = {
    "resources": "world.aetos.MyResourceProvider",
}
```

Unlisted slots keep their defaults, so you override one without restating the
rest.

| Slot | Default | What it supplies |
| --- | --- | --- |
| `entities` | works out of the box | what is in the room |
| `map` | works out of the box | the local room and exit graph |
| `inventory` | works out of the box | what a character carries |
| `actions` | `look` / `get` / `drop` | context-menu commands |
| `resources` | exposes nothing | whatever your game measures |
| `equipment` | exposes nothing | equipped items, by slot |
| `target` | exposes nothing | the current target |
| `effects` | exposes nothing | temporary conditions |

The four defaults that work use nothing but ordinary rooms, contents and exits,
and honour your `view` and `search` locks, so hidden objects and secret exits
stay hidden.

The four that expose nothing do so deliberately. There is no genre-neutral way
to guess what your game's resources are, what its equipment slots are called, or
whether it has a notion of a current target -- so Aetos shows no widget rather
than an empty one implying a system you do not have.

A worked example:

```python
# world/aetos.py
from evennia.contrib.base_systems.aetos_webclient.providers.base import (
    AetosResourceProvider,
)


class MyResources(AetosResourceProvider):
    def get_resources(self, character):
        return [
            {
                "id": "health",
                "label": "Health",
                "value": character.db.hp or 0,
                "maximum": character.db.hp_max or 100,
                "thresholds": [
                    {"at": 0.25, "level": "warning", "message": "Health is low."},
                ],
            }
        ]
```

```python
# server/conf/settings.py
AETOS_PROVIDERS = {"resources": "world.aetos.MyResources"}
AETOS_FEATURES = {"resources": True}
```

### Real-time updates (optional)

By default the client asks for a sync after connecting and after each command it
sends, which needs no cooperation from your game. If you want true push, call
`push_sync` from your own hooks:

```python
from evennia.contrib.base_systems.aetos_webclient import state


class Character(DefaultCharacter):
    def at_post_move(self, source_location, **kwargs):
        super().at_post_move(source_location, **kwargs)
        for session in self.sessions.all():
            state.push_sync(session, self)
```

A misconfigured provider fails at startup with a message naming the setting and
the import that failed. A provider that raises at runtime is contained: you lose
that widget, not the player's session.

## Local data and privacy

Aetos never stores personal player data on your server. Layouts, workspaces,
notes, relationship tags, map notes, macros, aliases, triggers, timers, scripts,
keybindings and preferences all live in the player's own browser, scoped to your
game's origin.

This is structural rather than a policy. The contrib adds no models and no
migrations, installing it creates no database rows, and it registers exactly two
input functions -- the handshake and a sync request. There is no code path that
could send player configuration to your server.

Players can see everything stored, export it as a single JSON file, and delete
it, from the client's own privacy panel.

The server keeps only the transient session state the protocol needs.

## Server authority

Aetos is never authoritative for game mechanics. A button labelled "Attack
Goblin" sends exactly the text `attack goblin`, identical to a player typing it.
Locks, cooldowns, permissions and command availability are enforced by your
server exactly as they always were. Nothing in Aetos can bypass a command.

## Accessibility

Accessibility is not a feature of Aetos; it is one of the mechanisms by which
Aetos is built. It is governed by a normative specification, Addendum A, whose
`A11Y-` requirement IDs are release gates rather than aspirations.

**You cannot switch it off, and you are not asked to.** `AETOS_AUTOMATION`
governs gameplay automation -- whether players may script or use timers. It does
not govern whether a player gets a usable interface. Semantic HTML, keyboard
operation, focus management, accessible labels, non-drag alternatives, contrast
and reduced-motion support are always present.

### What your players get, with no work from you

- Every function is operable from the keyboard. Dragging is never the only path.
- Combat spam never floods speech. The transcript is a `role="log"` region with
  `aria-live="off"` set deliberately, so a screen reader is not made to read
  every line as it arrives -- the full text stays reviewable on demand.
- One central announcer. No widget owns its own live region, so nothing competes
  for speech.
- No character-only keyboard shortcuts, which would collide with the single
  letters NVDA and JAWS use for structural navigation.
- Colour never carries meaning alone. Severity, effect tone and status are
  written in words.
- The map has a text equivalent generated from the *same* graph as the picture,
  so the two cannot disagree.
- Game events never move focus. Dialogs trap focus and return it where they
  found it.

### What only you can supply

Aetos can make an ordinary Evennia game substantially more accessible. It cannot
invent information your game does not expose.

- **Captions for meaningful audio.** No caption can be reliably invented. If a
  sound carries information, describe it in the media descriptor.
- **`state_text` on resources** -- a short word for a value, so a bar reads as
  "healthy" rather than only as a number.
- **`description` on actions**, where the label alone is ambiguous.
- **`importance_hint`** on state events, if you want to advise which changes
  matter. It is advisory only; the player's own preference always decides what
  is spoken.

### Honest status

This project is **designed toward WCAG 2.2 Level AA**. It does not claim
compliance, JAWS compatibility or braille compatibility, because the
assistive-technology testing that would justify those claims has not yet been
done. Testing against NVDA, JAWS, Orca and refreshable braille is a scheduled
release gate, and no claim will ship ahead of its evidence.

## Security

All server-provided markup is parsed in an inert document and rebuilt from an
allowlist of elements and attributes. Aetos never uses `innerHTML`. Elements
outside the allowlist are replaced by their text content rather than discarded, so
game output is never silently lost. Nesting deeper than 64 levels is flattened to
text rather than followed, so hostile markup cannot exhaust the stack in the code
path that draws your game's output.

Aetos evaluates no JavaScript at runtime. The scripting language players can
write is tokenised, parsed and interpreted from its own syntax tree; `eval` and
`Function` appear nowhere in the client.

### Content-Security-Policy

The client page carries its own policy:

```text
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
connect-src 'self' ws: wss:; img-src 'self' data: https:;
media-src 'self' https:; font-src 'self'; object-src 'none'; frame-src 'none';
form-action 'none'; base-uri 'none'; worker-src 'self'; manifest-src 'self'
```

It is declared in the document rather than sent as a header, because a contrib
does not own the webclient view, and middleware would apply the policy to your
whole website -- front page, admin, wiki -- which is not a decision a webclient
should make on your behalf.

**Two things that costs you, stated plainly:**

- **`frame-ancestors` cannot be expressed in a `<meta>` policy.** Neither can
  `report-uri` or `sandbox`. If you want clickjacking protection, send
  `X-Frame-Options: SAMEORIGIN` or a real `Content-Security-Policy` header with
  `frame-ancestors` from your own web server or middleware. Aetos will refuse
  `AETOS_CSP = {"frame-ancestors": ...}` with an error rather than let you
  believe it took effect.
- **`style-src` needs `'unsafe-inline'`.** Theme tokens and layout sizes are
  written as inline styles. This permits no script execution, and the sanitiser
  accepts no `style` attribute or `<style>` element from game content at all, so
  there is no injection point for it to widen.

If your game serves media, fonts or scripts from another host, add them --
sources are added to the defaults rather than replacing them:

```python
AETOS_CSP = {"img-src": ["https://cdn.example.com"]}
```

To send your own header instead, turn the page's policy off. Do not run both:
two policies both apply and the result is their intersection, which is very hard
to debug.

```python
AETOS_CSP = False
```

### Rate limiting

Aetos adds no throttle of its own. Every message a client sends -- including
`aetos_hello` and `aetos_request_sync` -- passes through Evennia's Portal, which
applies `MAX_COMMAND_RATE` to all input rather than only to typed commands. A
client that exceeds it gets `COMMAND_RATE_WARNING` and its excess is dropped. If
you want Aetos's sync requests limited differently, change that setting; a second
throttle inside the contrib would only be able to disagree with the first.

## Requirements

Core Evennia only. Aetos adds no Python dependencies, requires no Node or
JavaScript build tooling, and declares no Python version constraint of its own --
it supports whatever your Evennia supports.

## Help for your players

Aetos documents itself. `F1` -- or "Help" in the command palette -- opens a
searchable reference covering every feature, with worked examples.

Topics are gated on your automation policy, so a game with `scripting` disabled
has no scripting topic. Documenting a feature a player cannot use sends them
looking for a button that is not there.

The last topic is written for you rather than your players: provider examples,
settings, and the full slot list.

## Troubleshooting

**The stock client still appears.** The `TEMPLATES` insert is missing or ran
before `settings_default` was imported. It must come after the
`from evennia.settings_default import *` line.

**Styles or scripts 404.** Static files were not collected. Restart with
`evennia reload`, which runs `collectstatic`.

**Colours show as literal tags.** `ansi.css` is not being served; check the same
static-file setup as above.
