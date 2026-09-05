# Phase 0.4 -- Evennia baseline test result

Recorded: 2026-09-04
Command: `evennia test evennia` (run from `aetos_testgame/`, using
`evennia.settings_default`)
Environment: Evennia 6.1.0 @ a89a9b94e, Python 3.13.14, Django 6.0.8

## Reference result -- THE BASELINE

```
Ran 1847 tests in 966.325s

FAILED (errors=2, skipped=38)
```

**Aetos must never increase the error count above 2, and must never reduce the
number of tests that run.** Any new failure is an Aetos regression until proven
otherwise.

## The 2 pre-existing errors (not Evennia defects, unrelated to Aetos)

Both are missing optional third-party dependencies of *other* contribs. Neither
touches the webclient.

1. `evennia.contrib.grid.xyzgrid`
   `ModuleNotFoundError: No module named 'numpy'`
   -> "The XYZgrid contrib requires the SciPy package."

2. `evennia.contrib.utils.git_integration`
   `ModuleNotFoundError: No module named 'git'`
   -> requires GitPython.

Both would disappear with `pip install scipy GitPython`. They are deliberately
**left uninstalled**: the lab should reflect a core-only Evennia install, which is
exactly the dependency posture Aetos itself must maintain (blueprint §2.2). Fixing
them by installing extra packages would hide the fact that Aetos needs none.

## GOTCHA -- `evennia test` exit code is unreliable

The run printed `FAILED (errors=2, skipped=38)` and then **exited with code 0**.
The launcher performs a `collectstatic` step after the test run and the successful
result of that step masks the suite's own status.

Consequence: **CI and any automation must parse the summary line, not trust the
process exit code.** A green exit code from `evennia test` does not mean the suite
passed. Any Aetos CI wiring must assert on the `Ran N tests` / `OK|FAILED` output.

## Re-running

Per `lab-hazard-001`, stop the live server first, or run from a directory that does
not share the live game's settings. The suite takes ~16 minutes.
