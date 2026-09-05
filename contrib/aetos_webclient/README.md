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

Still to come: audio and multimedia, themes, a PWA shell and touch gestures, a
developer inspector, a documented widget SDK, a server-described advanced UI
manifest, and voice input. See the project repository for the full roadmap.

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

### Providers

How Aetos reads your game's data. Aetos never assumes where you store anything:

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

## Security

All server-provided markup is parsed in an inert document and rebuilt from an
allowlist of elements and attributes. Aetos never uses `innerHTML`. Elements
outside the allowlist are replaced by their text content rather than discarded, so
game output is never silently lost.

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
