# Phase 1 -- Contrib integration spike

Status: **COMPLETE -- gate fully met 2026-09-04**

Goal: the smallest, cleanest, upstream-friendly way to install Aetos, with
`evennia.js` untouched, the Portal untouched, and no core patching.

## How stock Evennia resolves the webclient page

```
ROOT_URLCONF = "web.urls"                          # the GAME's urls.py
  -> path("webclient/", include(...))
  -> evennia.web.webclient.views.webclient(request)
  -> render(request, "webclient.html", pagevars)   # BARE template name
```

Template search order (`settings.TEMPLATES[0]`):

```
DIRS:                                              # searched FIRST, in order
  GAME_DIR/web/templates
  GAME_DIR/web/templates/website
  GAME_DIR/web/templates/webclient
  EVENNIA_DIR/web/templates
  EVENNIA_DIR/web/templates/website
  EVENNIA_DIR/web/templates/webclient   <- stock webclient.html lives here
APP_DIRS: True                                     # searched SECOND
  <each INSTALLED_APP>/templates/
```

## The mechanism

```python
from evennia.contrib.base_systems.aetos_webclient import AETOS_TEMPLATE_DIR

INSTALLED_APPS += ["evennia.contrib.base_systems.aetos_webclient"]
TEMPLATES[0]["DIRS"].insert(0, AETOS_TEMPLATE_DIR)
```

- The DIRS insert puts Aetos's `webclient.html` ahead of Evennia's, so the stock
  view renders Aetos at the stock `/webclient/` URL. Existing links keep working.
- `INSTALLED_APPS` gives static discovery: `django.contrib.staticfiles` is enabled
  and `STATICFILES_FINDERS` is not overridden, so `AppDirectoriesFinder` collects
  `static/aetos/` with no further configuration.
- Uninstall = delete the block and restart. Nothing copied, nothing patched.

## CORRECTION -- the first proposed mechanism was wrong

The initial design for this spike was:

```python
WEBCLIENT_TEMPLATE = "aetos"     # DOES NOT WORK
```

The reasoning was that `WEBCLIENT_TEMPLATE` is interpolated into the DIRS list, so
pointing it at a nonexistent directory would make those entries miss and let
resolution fall through to the app-directory loader.

**It does not work, and the failure is silent.** `settings_default.py` builds the
`TEMPLATES` list at import time using the value of `WEBCLIENT_TEMPLATE` *at that
point in that module*. A game's `settings.py` does `from evennia.settings_default
import *`, which imports the already-computed list. Reassigning
`WEBCLIENT_TEMPLATE` afterwards changes nothing -- the DIRS entries still say
`webclient`.

Verified directly:

```
WEBCLIENT_TEMPLATE = aetos
aetos installed = True
DIRS: ... C:\...\evennia\web\templates\webclient      <- still 'webclient'
RESOLVED -> C:\...\evennia\web\templates\webclient\webclient.html   <- stock won
```

`WEBCLIENT_TEMPLATE` is effectively a **dead setting** for template resolution
unless `TEMPLATES` is rebuilt after it. Worth reporting upstream: it reads as a
supported customisation point and silently is not one.

Consequence for Aetos: prepending to DIRS is **required**, not a stylistic choice.
An app-level template alone can never win, because DIRS is always searched before
installed apps and stock Evennia always has its own webclient directory in DIRS.
`tests/test_installation.py::TestStockAssumptionsStillHold` encodes this.

## Verified end to end

Against the pristine `aetos_testgame`, zero custom game code:

| Check | Result |
|---|---|
| `/webclient/` serves the Aetos shell | 200, `aetos-root` present |
| `aetos.js` / `aetos.css` / `ansi.css` served | 200 each, via collectstatic |
| `evennia.js` still loaded | yes -- transport untouched |
| `webclient_gui.js` no longer loaded | correct, stock GUI displaced |
| Console errors | none |
| Websocket connects | "Connected"; `Evennia.isConnected() === true` |
| Login through the Aetos input | `connect guest` -> "You become Guest1." |
| Command round-trip | room description rendered |
| ANSI colour | 14 colour spans, `color-012` computes to `rgb(0,0,255)` |
| Aetos test suite | 14 tests, OK |

Screenshot: `browser-qa/baseline-screenshots/02-aetos-shell-logged-in.png`

## Design decisions taken during the spike

**Extend `webclient/base.html`, override `guilib_import`.** Stock base.html
documents this block for "using your own gui lib". It loads `evennia.js` and sets
up `wsurl`/`csessid`/`cuid`, so extending it means the transport bootstrap is
inherited rather than reimplemented. This is the cleanest possible evidence for
the PR that Aetos does not touch Evennia's networking.

**Replace the emitter.** Evennia's `DefaultEmitter` stores one listener per event
(`listeners[cmdname] = listener` overwrites). Aetos needs many widgets observing
the same event, so it passes its own multi-subscriber emitter to
`Evennia.init({emitter})` -- a documented extension point, not a patch. Each
handler is isolated so one broken widget cannot starve the others.

**Sanitise, never `innerHTML`.** Evennia renders colour markup to HTML
server-side, so the `text` payload legitimately contains tags and cannot be
inserted as plain text. Aetos parses it in an inert `DOMParser` document and
rebuilds from an allowlist. Disallowed elements are replaced by their text content
rather than dropped, so nothing a game says is lost. Verified against a payload
carrying `<script>`, `<img onerror>`, `<iframe>`, `javascript:` hrefs and
`onclick`/`style` attributes: nothing executed, safe `class` attributes survived,
trailing text preserved.

**Ship an own ANSI palette.** Loading the stock `webclient.css` would bring layout
rules that fight the Aetos shell, so Aetos generates `ansi.css`. Two notes on the
values, both deliberate:
- The colour cube uses Evennia's levels (`00/5f/87/af/df/ff`). Evennia uses `df`
  where textbook xterm uses `d7` -- a systematic 93-colour difference, matched so
  games look the same in Aetos as in the stock client.
- The greyscale ramp uses the arithmetic `8 + 10i`. Evennia's own stylesheet
  deviates at exactly two of 24 entries (241, 242) while following the formula
  everywhere else; those read as typos and are not reproduced.

## Phase 1 acceptance gate

- [x] Aetos shell loads in fresh Evennia
- [x] `evennia.js` remains untouched (loaded from stock, unmodified)
- [x] Portal remains untouched (no PORTAL_SERVICES changes; ports only, lab-local)
- [x] No DireEngine / Maritime files involved
- [x] Installation procedure documented (contrib README.md)
- [x] collectstatic / restart procedure verified (`evennia reload` runs it)
- [x] Uninstall verified: removing the block restores the stock client exactly
      (`aetos-root` gone, `webclient_gui.js` returns, 200)
- [x] Python style: `black --line-length 100` and `isort --profile black` clean,
      matching Evennia's own pyproject/Makefile configuration
- [x] Full Evennia suite still at the 2-error baseline with Aetos installed:
      **1861 tests, errors=2, skipped=38** (1847 stock + 14 Aetos at the time of
      the run). Same two pre-existing dependency errors, no new failures.

## Repo conventions adopted

Evennia's `AGENTS.md` governs work inside the clone:

- `make format` (black + isort) rather than hand-formatting
- Google-style docstrings on all code
- TDD: tests first, preferring no-DB tests over mocks over DB-backed tests
- `uv` preferred over `pip`

The Aetos test suite is currently no-DB (pure structural assertions), which is the
preferred tier in that guidance.
