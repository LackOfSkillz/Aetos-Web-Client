# Decision 001 -- Python version policy

Date: 2026-09-04
Status: **Accepted**

## Decision

**Aetos declares no Python version requirement of its own.** Its supported range is
whatever the host Evennia supports, and it is developed on the newest version in
that range while being verified against the oldest.

## Rationale

Aetos is a contrib living inside a developer's existing Evennia installation. It
does not own the interpreter and must never be a reason for anyone to upgrade
Python. The floor belongs to Evennia:

```
evennia/pyproject.toml:  requires-python = ">=3.12"   (Evennia 6.1.0)
```

Pinning a version in Aetos would either be redundant (if it matched Evennia's) or
a defect (if it exceeded it). Both are worse than saying nothing.

## Rules that follow

1. **No version-gated syntax or stdlib.** Aetos source must not use any language
   feature or standard-library API newer than Evennia's declared minimum, currently
   3.12. This is enforced mechanically, not by discipline -- the contrib's lint
   configuration sets `target-version = "py312"`, derived from Evennia's
   `requires-python` rather than hardcoded independently.
2. **Develop high, verify low.** Authoring happens on the newest supported version
   (3.13.14). The Phase 29 compatibility matrix must run the Aetos suite on the
   floor version as well; "works on 3.12" is a tested claim, not an assumption.
3. **Never force an upgrade.** Setup tooling detects the developer's existing
   interpreters and selects a compatible one rather than requiring an install.
   Installing a new Python is a fallback for when nothing compatible exists.
4. **Re-derive, don't hardcode.** When Evennia raises or lowers its floor, Aetos
   follows automatically. Nothing in Aetos should need editing for that to happen.

## Tooling

`scripts/find_python.py` parses Evennia's `requires-python` from the checkout and
reports every interpreter on the machine that satisfies it, across four discovery
sources: the running interpreter, `python3.X` names on PATH, the Windows `py`
launcher registry (`py -0p`), and uv-managed installs.

```bash
python scripts/find_python.py --evennia evennia
```

`--select lowest` picks the floor interpreter (used to build the compatibility-matrix
venv); `--quiet` prints just the path, for scripting venv creation.

On this machine it correctly rejected the Python 3.11.0 that was first on PATH --
a plain `python -m venv` would have silently built the lab on an interpreter
Evennia does not support.

## This lab

- Authoring venv: `evennia/.venv` on Python 3.13.14 (highest compatible)
- Floor venv for the compatibility matrix: to be created on 3.12.13 at Phase 29
