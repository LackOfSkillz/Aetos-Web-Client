# Decision 004 -- Aetos is self-contained; no external resources

Date: 2026-09-04
Status: **Accepted** (developer decision, M6)

## Decision

Aetos provides its own base template and loads **nothing from a third-party
host**. It no longer extends Evennia's `webclient/base.html`.

## What was found

Extending the stock base made every Aetos install load eight external resources
that Aetos does not use, because Aetos is vanilla JavaScript:

```
https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0-beta/css/bootstrap.min.css
https://code.jquery.com/jquery-3.2.1.min.js
https://golden-layout.com/files/latest/js/goldenlayout.min.js
https://golden-layout.com/files/latest/css/goldenlayout-base.css
https://golden-layout.com/files/latest/css/goldenlayout-dark-theme.css
https://cdn.rawgit.com/ejci/favico.js/master/favico-0.3.10.min.js
https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.11.0/umd/popper.min.js
https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0-beta/js/bootstrap.min.js
```

Direct checks from this machine:

| URL | Result |
|---|---|
| `golden-layout.com/files/latest/js/goldenlayout.min.js` | 200, 66602 bytes -- but **unpinned** |
| `cdn.rawgit.com/...favico...` | **301** -- rawgit is a deprecated service |
| `code.jquery.com/jquery-3.2.1.min.js` | 200, 86659 bytes |

## Rationale

1. **Blueprint section 2.2** sets a core-only dependency target: Python, Evennia,
   and universally available browser APIs. Five CDN hosts is not that.
2. **Offline and firewalled networks.** A MUD on a LAN, behind a corporate
   firewall, or on a developer's laptop with no internet must still work.
3. **Privacy.** A player should not have to contact five third parties to play a
   text game. Each is an opportunity to log their IP and referrer.
4. **`latest` is a silent breaking-change vector.** An upstream GoldenLayout
   change would break every Aetos install simultaneously, with no version to pin
   or roll back to.
5. **Upstream acceptance.** A contrib that phones out to five third parties is a
   plausible objection from maintainers. Zero is easier to defend than five.

## What Aetos still uses from Evennia

`evennia.js` -- Evennia's own transport library, referenced unmodified from
Evennia's own static directory. Not copied, not patched, not reimplemented. The
Portal is untouched. That promise is unchanged by this decision; it was never a
consequence of extending the stock base template.

`aetos/base.html` replicates only the four transport globals `evennia.js` reads
(`wsactive`, `csessid`, `wsurl`, `cuid`), from Evennia's own documented view and
context processor.

## The jQuery shim

`evennia.js` uses jQuery in exactly one place -- its final statement:

```js
$(document).ready(function () { setTimeout(function () { Evennia.init() }, 500); });
```

That is a convenience for the stock client, which never calls `Evennia.init()`
itself. Aetos does call it, so the auto-init is redundant here -- but the bare
`$` reference still throws.

Loading 87 KB of jQuery to satisfy one call would defeat the purpose, so
`static/aetos/js/compat.js` provides a ~20-line shim implementing
`$(document).ready(fn)` and nothing else. It only defines `$` if absent, so a game
that legitimately loads jQuery keeps the real one.

**This shim must not grow.** If Aetos ever appears to need more of jQuery, the
correct answer is the platform API instead.

## Cost accepted

- Aetos duplicates ~15 lines of transport-variable setup. If Evennia changes how
  `evennia.js` is bootstrapped, Aetos must follow.
  `tests/test_installation.py` asserts all four variables are present, so a
  missing one fails loudly rather than looking like a server fault.
- Aetos supplies its own layout engine rather than inheriting GoldenLayout. See
  `layout.js`; the adapter boundary means an engine can still be swapped in.

## Guarded by tests

`TestNoExternalResources` fails if any Aetos template gains an `http` src/href,
and names the five stock CDN hosts individually so a regression reports exactly
which dependency crept back in. Comments are stripped first, so documenting *why*
these hosts are avoided does not trip the test.
