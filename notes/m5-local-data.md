# M5 -- Local storage and profile export/import

Status: **COMPLETE**

Verification: 130 Python tests OK; 32/32 browser QA checks OK
(`browser-qa/qa-storage-profile.js`).

## What exists

- `static/aetos/js/storage.js` -- IndexedDB-backed store across the 15 blueprint
  namespaces, scoped per game, with an in-memory fallback.
- `static/aetos/js/profile.js` -- versioned export/import with hard bounds and
  sanitisation.
- `browser-qa/qa-storage-profile.js` -- dependency-free browser QA suite.
- `tests/test_local_data.py` -- contract guards in the Evennia suite.

## Design decisions

**Scoped per game.** The database is `aetos::<origin>|<game>`. IndexedDB is
already origin-scoped, so the game name is what actually separates two games
served from one origin. Directly addresses the Phase 0 finding that stock Evennia
writes unscoped keys.

**IndexedDB, not localStorage.** Structured data belongs in a real store, and it
keeps Aetos entirely out of the namespace where Evennia already writes. Only tiny
boot preferences use localStorage, all prefixed `aetos:`.

**Degrades to memory.** Private browsing can refuse IndexedDB. The client keeps
working for the session rather than failing to start.

**Import rebuilds rather than validates.** `sanitizeValue` constructs a fresh
value from scratch instead of checking the input in place. That guarantees the
result shares no prototype, identity or accessor with the imported data, so a
crafted `__proto__`, a getter with side effects, or a self-referential structure
cannot survive into the store. Verified live: `({}).pwned` stays undefined after
importing a profile carrying `{"__proto__": {"pwned": true}}`.

**Import never executes.** It writes data. Whether a macro may later run is the
server's automation policy, not a property of the file.

**Partial failure is reported, not fatal.** One bad entry must not discard a
whole profile, so import returns a report of what was imported, rejected and
truncated.

## BUG FOUND AND FIXED -- replace-mode import raced its own clear

The browser QA suite failed on `import: replace clears first`.

Cause: the import loop called `storage.put(...)` while building its work list, so
the writes *started immediately*. In replace mode the subsequent `clear()` then
ran concurrently and could wipe the data that had just been imported. The player
would have chosen "replace" and ended up with nothing.

Fix: collect write *descriptors* and only begin the writes after any clear has
resolved.

This is precisely the class of bug the browser suite exists to catch -- it is a
Promise-ordering fault that no static check and no Python test could see.

## CONTRACT -- clearing Aetos data is not destructive to others

"Clear All Aetos Data" clears Aetos's own database and its `aetos:`-prefixed
localStorage keys. It does **not** touch `evenniaGoldenLayoutSavedState`, and it
never calls `localStorage.clear()`, which would wipe every key on the origin
including other software's.

Guarded three ways: a browser QA assertion that the stock key survives a
`clearAll()`, a Python test that no *code* references the key, and a Python test
that `localStorage.clear()` never appears.

Note on that Python test: the first version asserted the string
`evenniaGoldenLayout` never appeared anywhere in the source, which failed --
because the source *documents* why Aetos leaves the key alone. The test was
wrong, not the code; it now strips comments first. A test that punishes useful
documentation is a bad test.

## Still to come

- Privacy & Local Data settings panel UI (section 63) -- the data layer
  (`counts()`, `clearAll()`) is done and tested; the panel itself lands with the
  settings UI.
- Export/import file pickers -- deferred to the same panel.
