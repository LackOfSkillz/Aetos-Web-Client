# Lab hazard 002 -- editing the mirror instead of the work tree

Cost so far: roughly forty minutes across M18 and A7, in one session, twice.

## The shape of it

There are two copies of the contrib:

```text
evennia/evennia/contrib/base_systems/aetos_webclient/   the work tree -- edit this
contrib/aetos_webclient/                                the mirror -- generated
```

`scripts/sync_contrib.py` copies the first over the second. The mirror exists so
the published repository contains the actual client (the Evennia clone is
gitignored), and it is **overwritten on every sync**.

So an edit made in the mirror is not wrong-looking. It is not even wrong *yet*.
It survives, tests pass against it if the tests read the mirror, and it
disappears silently the next time anything syncs.

## Why it happens

The Bash tool keeps its working directory between calls. A command that ends
with `cd /c/Dev/aetos_webclient && ...` leaves the shell at the repository root,
and the next `cd contrib/aetos_webclient` -- or a bare relative path in a patch
script -- lands in the mirror.

Both instances this session followed the same sequence:

1. A `cd` to the repo root, to run `sync_contrib.py` or the test suite.
2. A patch script using relative paths, run without re-establishing the cwd.
3. Everything reporting success.

The failure surfaced later as tests failing on code that was visibly present in
the file I had just edited -- because the file I had just edited was not the file
the tests read.

## What it looks like when it has happened

```bash
grep -c 'newthing' evennia/evennia/contrib/base_systems/aetos_webclient/static/aetos/js/aetos.js  # 0
grep -c 'newthing' contrib/aetos_webclient/static/aetos/js/aetos.js                               # 10
```

## Recovering

The mirror is byte-identical to the work tree immediately after a sync, so if no
work-tree edit happened in between, the mirror's version is simply the newer one
and can be copied back:

```bash
# 1. Prove the work-tree copy is untouched since the last commit.
#    --strip-trailing-cr matters: the repo stores LF, the work tree has CRLF,
#    so a plain diff reports every line as changed and tells you nothing.
diff -q --strip-trailing-cr <(git show HEAD:contrib/aetos_webclient/PATH) \
                            evennia/evennia/contrib/base_systems/aetos_webclient/PATH

# 2. Port each mirror edit back, then reset the mirror and regenerate it.
cp contrib/aetos_webclient/PATH evennia/evennia/contrib/base_systems/aetos_webclient/PATH
git checkout -- contrib/
python scripts/sync_contrib.py
python scripts/sync_contrib.py --check
```

If step 1 shows the work tree *has* its own changes, do not copy -- merge by
hand. That case has not happened yet and would be the expensive one.

## Avoiding it

- Absolute paths in patch scripts, or an explicit `cd` at the top of every
  command that edits source.
- `python scripts/sync_contrib.py --check` before starting a milestone as well
  as before committing. It fails on drift in either direction, so it catches
  this immediately rather than an hour later.
- The Write tool takes absolute paths and never has this problem. Every file
  created this way landed correctly; only the `sed`/python-patch edits went
  astray.

## Why not remove the mirror

Because the alternative is worse. Without it the published repository contains
notes and a README about software nobody can read -- the Evennia clone is
gitignored and always will be, since vendoring a whole framework to distribute a
contrib directory would be absurd.

A generated mirror plus a `--check` that fails on drift is the right trade. The
hazard is entirely in the working-directory discipline, which is mine to fix.
