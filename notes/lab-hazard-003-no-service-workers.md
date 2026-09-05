# Lab hazard 003 -- the lab browser will not register a service worker

Found at M20. Blocks live verification of the PWA shell; blocks nothing else.

## The symptom

```text
TypeError: Failed to register a ServiceWorker for scope
('http://127.0.0.1:4471/webclient/') with script
('.../aetos-service-worker.js'): An unknown error occurred when fetching
the script.
```

Chrome's generic message, which is unhelpful by design -- it covers a wrong MIME
type, a redirect, a syntax error, an insecure origin and a disabled feature
without distinguishing them.

## Isolating it properly

The temptation is to start changing the worker. The cheaper move is to change
**where it is served from** and see whether the error follows.

The same file is present at two paths for unrelated reasons: the Django view at
`/webclient/aetos-service-worker.js`, and `collectstatic`'s copy at
`/static/aetos/aetos-service-worker.js` served by Twisted. Registering the second
one fails identically.

That single test rules out, at once:

- the Django view and its headers (not involved in the second path)
- `Cache-Control`, `Set-Cookie`, `Vary` (not present on the static path)
- the URL, the scope and the redirect question
- the script's own syntax (both paths serve identical bytes)

Leaving the browser itself.

For completeness, the endpoint was confirmed independently with curl: 200,
`application/javascript`, correct cache headers, `ASSET_VERSION` substituted.
The file is served correctly to everything except this browser.

## Why it is almost certainly the pane

The MCP browser pane appears to run without service worker support -- plausibly
sandboxed, or launched with them disabled. Nothing in the environment advertises
this, and `navigator.serviceWorker` is *present*, which is what makes it
confusing: the API exists and registration simply always fails.

## What this means for the work

The PWA code is unit-tested and its endpoints are verified, but **no part of the
worker's lifecycle has been observed**: not installing, not activating, not
serving from cache, not handing over to a new version.

That is recorded as unverified in `notes/m20-pwa-gestures.md` rather than
softened. A green test suite here proves the code is shaped correctly, not that
it works.

## Verifying it for real

In an ordinary browser against the lab:

```text
1. Open http://localhost:4471/webclient/ and check Application ->
   Service Workers shows one activated, scope /webclient/.
2. Application -> Cache Storage should show `aetos-shell-1.0.0` filling as
   assets load, and containing only /static/aetos/ and /static/webclient/
   entries -- no game responses.
3. Go offline in devtools and reload. The client shell should load and show
   Aetos's own reconnecting state rather than the browser's error page.
4. Bump ASSET_VERSION, reload twice. The client should announce an update is
   ready and change nothing until "Apply the waiting update" is run. The old
   cache should be gone after it activates.
5. Privacy panel -> Clear all Aetos data. Cache Storage should be empty.
```

Step 2 and step 5 are the ones that matter most: they are the privacy claims,
and they are the two a unit test cannot make.

Scheduled for A8, where a real browser is in the loop anyway.

## Related

`notes/lab-hazard-001-test-suite-vs-live-server.md` and
`notes/lab-hazard-002-mirror-vs-worktree.md`.
