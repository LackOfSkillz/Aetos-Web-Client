# M7 -- Workspaces and Edit Layout mode

Status: **COMPLETE**

Verification: 148 Python tests OK; 38/38 layout QA and 38/38 storage QA OK.

## What exists

- `static/aetos/js/builtins.js` -- the four surroundings widgets, migrated out of
  the shell and onto the public registry contract.
- `static/aetos/js/workspaces.js` -- Edit Layout mode, keyboard bindings, the
  widget palette, and named workspaces.
- Widget palette markup and styling; Edit Layout button in the status bar.
- `browser-qa/qa-layout-workspaces.js` -- 38 checks.

## Built-in widgets use the public API

The room, exits, people and items widgets are now ordinary registry definitions.
Nothing about them is privileged: they receive `sanitize` and `sendCommand` as
injected services and never touch the store, the adapter or the transport. Guard
tests assert exactly that.

This matters beyond tidiness. If a built-in widget can be written against the
public contract, so can a third-party one -- which is the only real evidence that
the widget SDK (M22) will be usable.

## The keyboard is the primary path, not a fallback

Edit Layout is driven by discrete operations that both the keyboard and the
on-screen controls call. There is one implementation, so the two cannot diverge:

```
Ctrl+Shift+L  toggle edit mode      [ ]           select previous / next
Arrow Up/Down reorder in region     Arrow L/R     move between regions
+ / -         resize                H             hide
R             reset layout          Escape        finish (and save)
```

Two properties tested explicitly, because getting either wrong would be worse
than having no shortcuts at all:

- Layout keys are **inert outside edit mode**. A player typing `n` to go north
  must never move a panel.
- Layout keys **never fire while focus is in the command input**, even in edit
  mode.

Every operation announces its result through the shared announcer, including
refusals ("cannot move up any further"). Silence is indistinguishable from a
broken control when you cannot see the screen.

## GAP FOUND AND FIXED -- hiding was a one-way door

The hide operation announced "Re-add it from the widget palette" -- and no
palette existed. Hiding persisted into the saved workspace, so the only way back
was a full layout reset, which discards everything else the player arranged. The
guidance pointed at something that was not there.

Found because the QA suite failed with a null panel: a previous run had hidden a
widget, the hidden state was saved, and the next page load restored it hidden
with no way to recover.

Fixed by building the palette (blueprint section 16). It lists every supported
widget with a pressed state, and lists unsupported ones with the capability they
need -- so a developer can see *why* an expected widget is missing rather than
finding it silently absent.

## API GAP FOUND -- no public way to send a command

Widgets receive `sendCommand` as an injected service, but nothing exposed it
publicly, so the QA suite reached for `dispatcher.send()` instead. That sends the
command but does not refresh state, leaving widgets showing the world as it was
before the command.

`window.Aetos.sendCommand` is now the public entry point. The distinction is
documented: `dispatcher.send()` transmits, `sendCommand()` transmits and
refreshes, and callers almost always want the latter.

## THREE UI BUGS FOUND BY LOOKING AT IT

Green tests did not catch any of these; a screenshot did.

1. **Every sidebar rendered on the right.** The adapter appends its regions to
   the workspace, and the console section was already there, so all regions
   landed after it. The console is now relocated into the `main` region at boot.

2. **Empty panels still rendered as boxes.** `.aetos-widget { display: flex }` is
   an author rule and beats the user agent's `[hidden] { display: none }`, so a
   widget that correctly hid itself still occupied space. Fixed with an explicit
   `[hidden] { display: none !important }`.

3. **Room descriptions were clipped.** Panels have a fixed height; a long
   description was silently truncated. Bodies now scroll -- losing game content
   because it did not fit is not acceptable.

## Workspaces

Named layouts stored under the `workspaces` namespace, browser-local, per game.
Switching removes current widgets and restores the saved set. `restore()`
re-checks every entry against the registry and the current manifest rather than
trusting it, so a workspace saved before a manifest change cannot resurrect
widgets for capabilities the game no longer exposes.

## Deferred

- Workspace switcher UI (the manager API is complete and tested; only the control
  is missing). Lands with the settings panel.
- Mode-driven automatic workspace switching (section 18) -- needs `aetos_mode`,
  which no provider emits yet.
