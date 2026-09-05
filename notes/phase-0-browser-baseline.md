# Phase 0.5 -- Stock Evennia browser baseline

Captured: 2026-09-04
Target: http://localhost:4401/webclient/ (Evennia 6.1.0, rev a89a9b94e, pristine
`aetos_testgame`, zero custom game code, no Aetos code in existence yet)

Harness: Playwright MCP. The in-app Browser pane could not composite frames in this
session, so screenshots and synthetic input failed there; Playwright is the correct
harness for browser QA regardless (blueprint §58) and is what all QA now uses.

## Verified working

| Behaviour | Result |
|---|---|
| Page load | 200, title `aetos_testgame` |
| Websocket transport | `Evennia.isConnected() === true`, `wsurl = ws://localhost:4402` |
| Websocket URL derivation | Auto-derived correctly from `WEBSOCKET_CLIENT_PORT`; no hardcoding |
| Login | `connect guest` -> "You become Guest1." |
| Command input -> output | `look` returned the Limbo room description |
| GoldenLayout | Present, 2 panes ("Main", "input"), 4 containers |
| Layout persistence | Survives reload via localStorage |

Screenshot: `browser-qa/baseline-screenshots/01-stock-webclient-logged-in.png`

## Stock plugin load order (the Aetos integration surface)

From the console, in order:

```
Popups Plugin Initialized.
Client-Side Message Routing plugin initialized
OOB Plugin Initialized.
Notifications Plugin Initialized.
Is Typing plugin initialized
DefaultOut initialized
Multimedia plugin initialized
HTML plugin initialized
Text2Html plugin initialized
Options 2.0 Loaded
IFrame plugin Loaded
Completed Webclient setup
```

This is the plugin contract Aetos must register into rather than replace. Note that
stock already ships `Multimedia`, `HTML` and `Text2Html` plugins -- blueprint §43's
multimedia work builds on an existing platform concept, it does not invent one.

## FINDING 1 -- localStorage keys are already occupied

Stock Evennia writes:

```
evenniaGoldenLayoutSavedState        (full serialized GoldenLayout config)
evenniaGoldenLayoutSavedStateName    ("default")
```

Consequences for Aetos:

- Aetos local storage (blueprint §13) **must** namespace its keys and must not
  collide with or clobber these. A bare `layouts` key is a defect.
- Blueprint §13's requirement to scope data by game origin is not optional polish;
  stock already demonstrates unscoped keys, and two Evennia games on the same
  origin would share them.
- "Clear All Aetos Data" (§56) must clear only Aetos keys and must leave stock
  Evennia's layout state alone. Deleting a user's stock layout would be a
  destructive bug.

## FINDING 2 -- guest sessions break on refresh (stock behaviour, pre-Aetos)

After logging in as a guest and reloading the page, stock Evennia prints:

```
No command sets found! This is a critical bug that can have
multiple causes.
```

The guest account is destroyed on disconnect, so the restored session has no
account behind it. **This is stock Evennia behaviour with zero Aetos code present.**

Recorded explicitly so that this exact string is never misattributed to Aetos during
Phase 24 (reconnect hardening) regression work.

It also means **guest accounts are unsuitable for reconnect/refresh baselining**.
Those legs of the baseline need a persistent account. Open item below.

## Open items

- [ ] Reconnect / refresh / multi-tab baseline with a **persistent** (non-guest)
      account. Blocked: requires typing a password into the login form. Needs a
      decision -- either the developer performs those logins, or a dedicated
      fixture account is agreed for automated QA.
- [ ] Confirm whether "No command sets found!" also occurs for persistent accounts
      on refresh, or is strictly a guest artifact.
- [ ] Character-selection baseline (multisession behaviour).

## Lab configuration used

- Guest accounts enabled (`GUEST_ENABLED = True`) so QA logs in without any
  password being typed or stored. Lab-only; Aetos must never assume guests exist.
