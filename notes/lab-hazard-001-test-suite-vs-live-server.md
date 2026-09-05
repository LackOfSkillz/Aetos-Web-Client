# Lab hazard 001 -- do not run the test suite and live browser QA concurrently

Observed: 2026-09-04, Phase 0

## What happened

`evennia test evennia` was left running from inside `aetos_testgame/` while browser
QA continued against the live server on 4471. Two symptoms appeared:

1. **A transient HTTP 500** from `/webclient/`. The same URL returned 200 seconds
   later with no code change and no traceback in `server/logs/`.
2. **Test artifacts written into the live game's log directory**:
   `channel_testchan.log`, `channel_testchan.log.1/.2/.3`, `channel_testchannel.log`,
   `evscaperoom_Testroom.log`.

## Cause

`evennia test evennia` run from the game directory loads that game's settings, so
it shares `LOG_DIR` and other path settings with the live server. The suite also
exercises server startup/reload paths.

## Consequences

- Browser QA results gathered while the suite is running are **not trustworthy** and
  must not be recorded as baseline.
- A 500 seen under these conditions is not evidence of an Aetos defect.

## Rule

**Serialize them.** Either:

- run `evennia test evennia` with the live server stopped, or
- run it from a directory that does not share the live game's settings.

Never interleave. When a browser QA result looks anomalous, confirm no test run is
in flight (`Get-CimInstance Win32_Process` filtered on `evennia.exe test`) before
investigating it as a real bug.

## Follow-up

Once Aetos has its own suite, the QA harness should assert that no test process is
running before it captures a baseline, so this cannot silently recur.

## Addendum (M21): the browser caches `aetos.js` under an unchanged version

Asset URLs carry `?v=ASSET_VERSION`, which is exactly right between releases and
unhelpful within a session: edit `aetos.js`, run `collectstatic`, reload the
page, and the browser serves the copy it already has because the URL did not
change.

That cost ten minutes at M21 chasing a bug that was already fixed — and worse,
it can do the reverse and make a real bug look fixed.

Before trusting what a reloaded page is running:

```javascript
fetch("/static/aetos/js/aetos.js?v=1.0.0", {cache: "reload"})
```

then navigate. Or check directly that the running page contains the change,
rather than assuming a reload was enough.

The three-way version of the rule now reads:

- changed a **template**? `evennia reload`
- changed a **static file**? `collectstatic`
- changed **JavaScript** and about to judge the result? bust the cache too

