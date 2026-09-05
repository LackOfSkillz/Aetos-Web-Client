# Phase 0 -- Fresh Evennia Laboratory

Purpose: establish an untouched Evennia baseline before any Aetos code exists, so
that every later Aetos change can be measured against a known-good reference.

Status: **GATE MET** -- Phase 1 may begin

## 0.1 Clone Evennia -- DONE
- Source: https://github.com/evennia/evennia.git (official)
- Location: `evennia/` (untracked by the lab repo; its own git repo)
- Evennia version: **6.1.0**
- Upstream commit at branch point: **a89a9b94e**
- Branch: **feature/aetos-webclient**, cut from `main`
- Source tree unmodified (`git status` clean)

## 0.2 Virtual environment -- DONE
- Python: **3.13.14** (uv-managed), selected by `scripts/find_python.py`
- venv: `evennia/.venv`
- Install: `pip install -e .` -- Evennia 6.1.0, Django 6.0.8
- See `decision-001-python-version-policy.md`

## 0.3 Pristine test game -- DONE
- `evennia --init aetos_testgame`, `evennia migrate` -- clean
- Superuser (account #1) `aetos_dev` created programmatically; Evennia's launcher
  wraps `createsuperuser` and ignores `--noinput`, and refuses every other command
  until account #1 exists, so the account was created via `django.setup()` +
  `evennia._init()` + `create.create_account()`. Credentials in the untracked
  `aetos_testgame/.aetos-dev-credentials.txt`.
- Ports moved off Evennia's stock range -- see `decision-002-lab-port-allocation.md`
- Server + Portal RUNNING; `http://localhost:4401/` and `/webclient/` both 200

## 0.4 Baseline test suite -- DONE
- `evennia test evennia`: **Ran 1847 tests, errors=2, skipped=38** (966s)
- Both errors are missing optional third-party deps of unrelated contribs
  (numpy/scipy for `xyzgrid`, GitPython for `git_integration`) -- deliberately
  left uninstalled to keep the lab core-only.
- GOTCHA: the command exits 0 even when the suite reports FAILED. Automation must
  parse the summary line, never the exit code.
- Full record: `phase-0-test-baseline.md`

## 0.5 Browser baseline -- DONE (with open items)
Full record: `phase-0-browser-baseline.md`

Verified: page load, websocket transport and URL derivation, login, command
input/output round-trip, GoldenLayout panes, layout persistence across reload.

Two findings that constrain later Aetos design:
1. Stock Evennia already occupies `evenniaGoldenLayoutSavedState*` in localStorage;
   Aetos storage must namespace and must never clobber it.
2. Guest sessions emit "No command sets found!" on refresh in **stock** Evennia --
   recorded so it is never misattributed to Aetos later.

Open: reconnect / multi-tab / character-selection baseline needs a persistent
account (guest accounts are destroyed on disconnect).

## Acceptance gate

- [x] Fresh Evennia starts successfully
- [x] Fresh webclient works
- [x] Full baseline test result recorded
- [x] No DireEngine dependencies exist  (clean upstream clone; nothing imported)
- [x] No Maritime dependencies exist    (clean upstream clone; nothing imported)
- [x] Aetos branch created

All gate items met on 2026-09-04. Phase 1 (contrib integration spike) is unblocked.
