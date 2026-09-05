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


## Addendum (M25): `navigate` does not reload a page the pane already has

The browser pane's `navigate` tool, given the URL it is already showing, does
nothing. It reports success either way.

At M25 that produced two consecutive measurements against stale code, both of
which read as **"the fix does nothing"** rather than as a tooling problem. That
is the dangerous shape: a false negative that looks like an honest result, and
that a reasonable person acts on by reverting a correct change.

It compounds with the M21 addendum above rather than replacing it, because the
symptom is identical — the page runs old code — while the cause is different.
Checking `?v=` is not enough, because the URL can be perfectly correct on a page
that was never re-fetched.

Reliable:

```javascript
location.href = "http://localhost:4471/webclient/?cb=" + Date.now();
```

The unique query defeats both the pane's no-op and the document cache. Then
assert on something the change introduced — a new exported function, a new
attribute — before believing any measurement taken from that page.

The rule generalises past this tool: **before measuring a fix, prove the fix is
what is running.** Every step between the editor and the browser is a place the
old version can survive.

## Addendum (M28): the cache can be poisoned under a *correct* version stamp

The third variant, and the most deceptive of the three.

`?v=` is computed from the **source** file's mtime, but `/static/` serves the
**collected** copy. Those are updated at different moments, and between them
there is a window where the URL is already new and the bytes are still old.

Requesting the page in that window caches stale content under the new,
correct-looking version — after which the M21 advice ("check `?v=` changed")
gives a false all-clear, because it did change. Editing the file again does not
help either: the mtime is already newer than the cached entry's URL.

At M28 that cost three reload cycles and produced two measurements of an
unchanged client, each of which looked like "the new help topics did not
register".

The window is entered by doing the obvious thing: edit, reload the browser to
look, *then* restart the server. Reloading the browser first is what poisons it.

Order that avoids it entirely:

```text
1. edit
2. evennia reload          (runs collectstatic)
3. only now look
```

And to recover once poisoned, from the page's console:

```javascript
fetch(document.querySelector('script[src*="js/help.js"]').src, {cache: "reload"})
```

then reload the page. `{cache: "reload"}` is the only thing that replaces an
entry whose URL has not changed.

The general rule from the M25 addendum still covers all three variants:
**before measuring, assert on something the change introduced.** Here that is
`window.AetosHelp.TOPICS.length` — one number, checked before believing
anything else on the page.
