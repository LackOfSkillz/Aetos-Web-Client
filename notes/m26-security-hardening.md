# M26 -- Security hardening

Status: **COMPLETE**

Verification: 1134 Python tests OK (up from 1102). axe clean at every severity.
The policy was verified *enforced* in a real browser rather than merely present.

## What the review found, and what it did not

The client was already careful. Server markup is rebuilt from an allowlist and
`innerHTML` appears nowhere; symbol sources are scheme-checked; profile import
strips `__proto__`; the scripting language is interpreted from a syntax tree
rather than handed to `eval`. Going looking for a hole did not find one.

What it found instead was that all of that was **unenforced**. Every one of those
properties held because somebody maintained it, and nothing in the page would
have stopped an injected script from running if one of them ever stopped holding.

## The headline: the client now runs under a real CSP

A Content-Security-Policy turns "an XSS in this client would be bad" into "an XSS
in this client has nothing to execute". Getting one required removing the last
inline script in the page.

That inline script was four lines of transport parameters (`wsactive`, `csessid`,
`wsurl`, `cuid`) that `evennia.js` reads — the obvious place for values the
template renders. **One inline script is all it takes to force a game into
`script-src 'unsafe-inline'`, which is the same as having no script policy at
all.** The values now travel as `<meta>` tags and are read by
`transport_bootstrap.js`.

Verified in the browser, not assumed:

```text
an injected inline <script>       did not run
a script from another origin      refused
eval("1+1")                       refused
the client                        connects and works
axe                               clean at every severity
```

That third line is worth noting: `'unsafe-eval'` is absent, so the "no `eval`"
rule is now enforced by the browser rather than by discipline. If a future change
reached for `eval` the client would break loudly instead of quietly gaining an
attack surface.

### Declared in the document, and what that costs

The policy is a `<meta http-equiv>` rather than a header, because a contrib does
not own the webclient view and middleware would apply the policy to the game's
entire website. This follows a precedent already set two lines above it in the
same template, where `Cache-Control` is declared the same way for the same
reason.

`frame-ancestors`, `report-uri` and `sandbox` are ignored in a meta policy. Rather
than let that be a silent gap, `AETOS_CSP` **refuses** them with an error naming
`X-Frame-Options` — a game that sets `frame-ancestors` there believes it is
protected from framing and is not, and deploy time is a much better moment to
learn that than an incident is.

`style-src` still needs `'unsafe-inline'`, because theme tokens and layout sizes
are written as inline styles. Stated rather than hidden: it permits no script
execution, and the sanitiser accepts no `style` attribute or `<style>` element
from game content at all, so there is no injection point for it to widen. Removing
it would mean moving the theme system to CSSOM `insertRule`, which is a real
option and not this milestone's.

### Extension, not replacement

`AETOS_CSP` adds sources to the defaults per directive, so a game opening up
`img-src` for its CDN cannot silently drop the protections in the others.
`AETOS_CSP = False` declines the policy entirely, for a game sending its own
header — because two policies both apply and the result is their intersection,
which is the failure mode nobody debugs successfully.

## The finding that dissolved: sync flooding

`aetos_request_sync` is reachable before login and each call runs every provider —
game code, database queries. Sending 2000 of them from the browser console looked
exactly like unbounded amplification: 2000 requests sent in 47ms, and the server
returning syncs slowly for seconds afterwards.

It was the opposite. **2000 requests produced exactly 80 syncs and 1920 "You
entered commands too fast" refusals.** Evennia's Portal applies
`MAX_COMMAND_RATE` in `data_in`, before the AMP relay, to *every* inputfunc — not
only to `text`. 80 is the setting's default value, and the match is exact.

I had drafted a rate limiter for Aetos. Two throttles on one path can only
disagree, and the disagreement shows up as a game whose `MAX_COMMAND_RATE` no
longer means what its documentation says. Recorded in the README instead: Aetos
adds no throttle, and a game wanting different limits changes Evennia's.

The lesson is one this project keeps relearning from a different direction: **the
saturation I measured was the defence working.** A measurement that looks like a
vulnerability deserves the same scepticism as one that looks like a fix.

## Smaller things

- **The handshake could fill a game's log.** Unknown capability names were logged
  on every `aetos_hello`. Bounded per message (64 names × 64 characters) but not
  per session, and at 80 handshakes a second that is ~320KB/s of attacker-chosen
  text into the game's log, indefinitely. Now logged once per session, and again
  only if the set actually changes. The rejection path immediately above it
  already declined to log at error level *for exactly this reason* — the
  acceptance path had the same problem and not the same care.
- **The sanitiser is recursive and its input is hostile.** A 64-level depth bound
  flattens deeper content to text rather than following it. Browsers cap their own
  parser's nesting depth, so this is a second bound rather than the only one — but
  the cap differs between engines, and a stack overflow here throws in the path
  that draws the game's own output. Losing a line to a crash is worse than
  flattening one. Verified: 5000 nested tags render as text, nothing crashes, and
  a hostile `<img onerror>` and `<script>` in the same payload both do nothing
  while the surrounding words survive.
- **A referrer policy.** Media a game declares may be hosted anywhere, and the
  browser fetches it directly, so a third-party host learns the player's IP —
  inherent to remote media and not something a client should silently prevent.
  What it need not learn is the page URL. `strict-origin-when-cross-origin`,
  which is a **small** improvement: it matches what modern browsers already
  default to and pins it for those that did not. `no-referrer` would be stricter
  and is not used, because media hosts commonly refuse requests without one and
  the failure would present to a game as "Aetos does not show my images".

## Accessibility -- definition of done (A.97)

- **Keyboard-findable / operable:** no new controls.
- **Accessible name / announces / steals focus / colour alone:** nothing changed
  in the interface.
- **axe:** clean at every severity, with the policy enforced.
- **One thing the CSP could have broken and did not:** axe itself loads from the
  lab's own origin, so the accessibility gate still runs. A game with a stricter
  `script-src` than the default would not be able to run browser QA tooling in
  its own client, which is worth knowing before somebody tries.
- **Human AT testing:** at A8, unaffected.

## Not built here

- **No middleware and no response headers.** Both would reach beyond the
  webclient page.
- **No second rate limiter**, as above.
- **No CSP reporting.** `report-uri` cannot be expressed in a meta policy, and a
  reporting endpoint is game infrastructure rather than client code.
- **`style-src 'unsafe-inline'` not removed.** It needs the theme system to move
  to CSSOM `insertRule`, which is a change to how themes work rather than a
  security fix.
