# Lab hazard 001 -- do not run the test suite and live browser QA concurrently

Observed: 2026-09-04, Phase 0

## What happened

`evennia test evennia` was left running from inside `aetos_testgame/` while browser
QA continued against the live server on 4401. Two symptoms appeared:

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
