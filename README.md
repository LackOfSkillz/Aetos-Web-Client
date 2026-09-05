# Aetos Web Client

A genre-agnostic graphical webclient framework for [Evennia](https://www.evennia.com).

![The Aetos Web Client running on a stock Evennia game](assets/Aetos_Web_Client.png)

Aetos replaces the stock webclient interface while leaving Evennia's transport
layer — `evennia.js` and the Portal websocket — completely untouched.

Install it and you immediately get a better client on an ordinary Evennia game,
with no changes to your game code. Teach it about your game's data and it becomes
your game's graphical interface.

Aetos assumes nothing about genre, combat, magic, character model, map format,
inventory or resources. **Anything a game does not expose simply does not appear** —
you never get an empty widget implying a system you do not have.

---

## Quick start

Requires an existing Evennia game. Nothing else — no Node, no build step, no CDN.

**1. Get the contrib into your Evennia**

```bash
cp -r contrib/aetos_webclient "$(python -c 'import evennia,os;print(os.path.dirname(evennia.__file__))')/contrib/base_systems/"
```

**2. Add three lines to `server/conf/settings.py`**

```python
from evennia.contrib.base_systems.aetos_webclient import AETOS_TEMPLATE_DIR

INSTALLED_APPS += ["evennia.contrib.base_systems.aetos_webclient"]
TEMPLATES[0]["DIRS"].insert(0, AETOS_TEMPLATE_DIR)
INPUT_FUNC_MODULES.append("evennia.contrib.base_systems.aetos_webclient.inputfuncs")
```

**3. Restart**

```bash
evennia reload
```

Aetos now serves at your existing webclient URL (`/webclient/` by default). No
files are copied into your game directory and no Evennia file is modified. To
uninstall, delete the three lines and restart.

> `WEBCLIENT_TEMPLATE = "aetos"` does **not** work for this. Evennia builds the
> `TEMPLATES` list at import time in `settings_default`, so reassigning it in
> your own settings has no effect on the already-built list. The `DIRS.insert`
> is what makes Aetos win.

**4. Press `F1`**

Aetos documents itself. `F1` opens a searchable reference covering every feature
with worked examples, and `Ctrl+K` opens the command palette.

### Teaching it about your game

Aetos never reaches into your data directly — it asks a provider, and you replace
any provider through one setting.

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

That is the whole pattern. Twenty lines gets you resource meters with thresholds,
spoken announcements when they are crossed, and a target's bars rendered
identically to the player's own.

Full provider reference: [`contrib/aetos_webclient/README.md`](contrib/aetos_webclient/README.md).

---

## The four rules

Every decision in this project answers to these.

**1. Server authority is absolute.** A button labelled "Attack Goblin" sends
exactly the text `attack goblin`. Macros, map movement, aliases, triggers,
scripts and voice never bypass normal commands, locks, cooldowns, permissions or
game rules. The client renders; the server decides.

**2. No player profile on your server.** Layouts, notes, macros, aliases,
triggers, tags and preferences live in the player's browser and nowhere else.
This is structural, not a policy: there are no models, no migrations, and exactly
two input functions. There is no code path that could send them.

**3. Genre-agnostic.** No stat name, combat system, equipment slot or genre
concept appears anywhere in the client. An "effect" is only "something
temporarily true about this character"; a resource is only a number your game
declared.

**4. Core dependencies only.** Python, Evennia and universally-available browser
APIs. No React, Vue, Angular, Svelte, Node, Webpack or Vite. No CDN — everything
is served from your own host.

---

## What is built

Roughly 6,900 lines of Python, 9,200 of JavaScript and 1,800 of CSS, with
**407 Python tests and 326 browser checks** passing.

### Works on a pristine game, with no configuration

| | |
| --- | --- |
| **Console** | Bounded scrollback, full ANSI / xterm-256 colour, allowlist-sanitised |
| **Room, exits, people, items** | Honouring your `view` and `search` locks |
| **Inventory** | From ordinary `contents` |
| **Map** | Built by walking visible exits, with a written equivalent from the same data |
| **Context menus** | On every entity — right-click, Menu key or Shift+F10 |
| **Route walking** | Click a room; commands are sent one at a time and the server decides each |
| **Command palette** | `Ctrl+K`, subsequence matching, teaches its own shortcuts |
| **In-client help** | `F1`, searchable, gated on your automation policy |
| **Layout and workspaces** | Keyboard-operable editing, named arrangements |
| **Responsive** | Phone, tablet, desktop and wide, measured from the container |

### Appears when your game exposes it

| | |
| --- | --- |
| **Resources** | Any numbers you declare, with thresholds and spoken announcements |
| **Equipment** | By slot; empty slots stated rather than blank |
| **Target** | Rendered with the same resource renderer as the player's own |
| **Effects** | Countdowns that show *expiring*, never removing on the client's clock |
| **Actions** | Your own commands in context menus |

### Player tools, browser-local

| | |
| --- | --- |
| **Macros and hotbar** | Up to five commands, run through a visible, cancellable queue |
| **Aliases** | `$1` / `$*` argument substitution, no recursive expansion |
| **Triggers** | Text or regex on game output, rate limited |
| **Timers** | On a schedule, with a warning about unattended play |
| **Aetos Script** | A sandboxed language with a purpose-built interpreter — not `eval` |
| **Notes and relationships** | Private records on people, places and things |
| **Map notes and POIs** | Yours, never sent |
| **Export / import** | One JSON file; import reports what it refused |
| **Privacy panel** | Counts read from storage, not assumed |

### Throughout

Versioned protocol with a capability manifest. Everything keyboard-operable.
Colour never carries meaning alone. `innerHTML` is never used.

---

## What is left

| Milestone | |
| --- | --- |
| M17 | Rich chat and event history |
| M18 | Audio and multimedia, with nonverbal cues |
| M19 | Themes, with High Contrast in core |
| M20 | PWA shell and touch gestures *(responsive layout done)* |
| M21 | Developer inspector and visual designer |
| M22 | Documented widget SDK |
| M23 | Server-described advanced UI manifest |
| M24 | Reconnect hardening |
| M25 | Performance hardening |
| M26 | Security hardening |
| M27 | Configuration validation |
| M28 | Documentation |
| M29 | Compatibility matrix |
| M30 | Accessibility review *(needs a real assistive-technology pass)* |
| M31 | Release candidate |
| M32 | Upstream pull request |
| M33 | Voice input and speech accessibility |

Detail and reasoning: [`notes/roadmap.md`](notes/roadmap.md).

**Two open questions.** M33 sits after the upstream PR in the blueprint's
ordering, but the PR description lists voice as part of the solution — that
wants settling before M30. And M30 needs a human: NVDA and VoiceOver, keyboard
only, 200% zoom. Nothing automated substitutes for it.

---

## Repository layout

```
contrib/aetos_webclient/   The client. Byte-identical to the eventual PR diff.
docs/                      Feature reference, mirroring the in-client help.
notes/                     Engineering record: roadmap, decisions, milestones.
browser-qa/                Live-browser QA suites and baseline screenshots.
scripts/                   Interpreter detection and the contrib mirror.
assets/                    Images.
```

Development happens inside an Evennia clone at `evennia/`, which is its own
git repository and is not tracked here. `contrib/aetos_webclient/` is the
published mirror of it — reviewing this repository is reviewing the pull request.

```bash
python scripts/sync_contrib.py           # refresh the mirror
python scripts/sync_contrib.py --check   # fail if it has drifted
```

### Running the tests

From a game directory with the contrib installed:

```bash
evennia test evennia.contrib.base_systems.aetos_webclient
```

Browser QA runs against a live server; the suites in `browser-qa/` are evaluated
in the page. Never run the Python suite concurrently with live browser QA — see
[`notes/lab-hazard-001-test-suite-vs-live-server.md`](notes/lab-hazard-001-test-suite-vs-live-server.md).

---

## Clean room

Aetos is written against untouched Evennia. No source file has been imported
from DireEngine, Dragon's Ire, Maritime, WorldBuilder or Area Forge; those were
consulted for design lessons only. The intended destination is
`evennia/contrib/base_systems/aetos_webclient`, with the pull request diff
limited to that directory.

## Licence

BSD 3-Clause, matching Evennia's own so the contrib can be upstreamed without
friction. See [LICENSE](LICENSE).

Changes are recorded in [CHANGELOG.md](CHANGELOG.md).
