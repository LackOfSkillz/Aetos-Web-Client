# M31 -- Release candidate

Status: **CANDIDATE, NOT RELEASABLE.** One blocker, and it is not code.

Verification: 1243 Python tests OK (up from 1222). axe clean at every severity.
A clean Evennia game, installed by following `README.md` verbatim, serves Aetos.

## The audit

Everything a reviewer would check, checked — and now checked every run rather
than once, in `tests/test_release_readiness.py`.

```text
formatting            black --line-length 100, isort --profile black   clean
docstrings            every production definition                      complete
                      (one __repr__ was missing; added)
unfinished markers    TODO / FIXME / XXX / HACK                        none
developer machine     absolute paths, the lab game, its ports          none
third-party loads     any src= or href= to an external host            none
cross-contrib imports                                                  none
mirror vs work tree   132 files                                        identical
size                  2.1MB, of which 1.1MB is unminified JavaScript
```

**The README feeds Evennia's documentation pipeline correctly.** Evennia builds
each contrib's docs page and its index entry by splitting the README on blank
lines — block 0 the title, block 1 the credits, block 2 the blurb. Verified by
running that parse: it yields `Contrib-Aetos-Webclient.md` with the right title,
`Contribution by Gary E Mix, 2026`, and the intended one-paragraph summary.
Reformat the top of the README and the index entry silently becomes a heading or
half a sentence, with no error anywhere — so it now has a test.

That also settles a PR-scope question: contrib docs are **generated**, so nothing
outside `evennia/contrib/base_systems/aetos_webclient/` needs editing. The diff
stays where it was promised to stay.

## The fresh-install test, and what it found

I installed Aetos into a brand-new `evennia --init` game using only the three
lines the README gives, and started it. The client is served — `aetos-root`, the
CSP, 57 deferred scripts, the transport metas, the `<h1>`, the accessibility
toggle, and no trace of the stock golden-layout client.

Then it sat there saying **"Connected"** with a completely empty console.

- `Evennia.isConnected()` was `true`.
- The pipeline had processed zero events.
- A command was accepted and reported as sent.
- A **raw** `new WebSocket("ws://localhost:4482")` opened from the same page
  received the game's greeting immediately — so the game, the port and the
  interface were all fine.
- Telnet on the same game answered.
- Reloading the page a minute later worked perfectly.

So the socket really was open, and `isConnected()` was not lying. Aetos simply
had no way to know that nothing was ever going to arrive.

**This is the M24 family again**: the client presenting something as true that it
had no way to know was still true. M24 fixed "a command reported as sent while
the socket is closed". This is the adjacent case — the socket is open and the
conversation never starts.

### The safeguard

Aetos cannot see this at the transport, but it can see it in its own protocol: it
sends `aetos_hello` and expects `aetos_manifest`. Silence there means it is
connected to something that is not going to answer.

After 8 seconds without a manifest the client says so — *"Connected, but the game
has not answered yet. It may still be starting."* — and re-sends the handshake,
up to four times, then says plainly that reloading may help.

Two decisions inside that:

- **Retrying a handshake is not retrying a command.** M24 refuses to queue a
  command through a dropout because replaying one executes a decision about a
  situation that may no longer exist. A hello asks a question and changes
  nothing, so re-sending it is safe — and it lets the client heal itself the
  moment the server finishes starting.
- **Bounded, not forever.** A client quietly retrying for an hour looks exactly
  like a client that is working.

### What I have not proven

**The cause.** The symptom reproduced once, with logs, and did not reproduce on
demand afterwards. My hypothesis is a socket the Portal accepted without a Server
session behind it, during the seconds after startup — but the Server's log says
it was ready before the page loaded, which does not fit cleanly.

So the safeguard is correct whatever the cause, and its **firing path is pinned
by tests rather than observed live**. That is written here rather than smoothed
over, because "we fixed it" and "we made the symptom survivable" are different
claims and only the second one is earned.

## What blocks the release

**A8 — assistive-technology validation.** It needs two people I cannot supply:

- a refreshable braille tester on real hardware (A.35 is explicit that an
  emulator does not substitute)
- somebody who works with augmentative and alternative communication, to review
  the picture-and-word board before the project describes it as serving anyone

A.100 says the project cannot claim braille or AAC compatibility without them.
The README already claims neither, and tests now pin that it goes on claiming
neither. **This is the only thing standing between here and a release, and no
amount of further code moves it.** `questions.md` 3.

### Known and accepted for a first release

- **The service worker's lifecycle has never been observed** anywhere — the
  development browser will not register one. Unit-tested, endpoints verified,
  behaviour unwitnessed. `lab-hazard-003`.
- **Only Chromium has been tested.** Firefox, Safari, iOS and Android are
  "expected from support data. Not run." `docs/compatibility.md` says so in those
  words.
- **1.1MB of unminified JavaScript**, deferred and served from the game's own
  origin. No build step is the constraint that produces it and the trade is
  deliberate; worth stating in the PR rather than letting a reviewer find it.

### Still open with Gary

1. The master blueprint is not in the repository, so its citations dangle.
2. Voice (M33) before or after the upstream PR (M32).
3. The two A8 people.
6. Whether the accessibility toggle should hide the panel (shipped) or switch the
   accommodations off.

## Accessibility -- definition of done (A.97)

- **Keyboard / name / focus / colour:** no interface changes beyond one new
  announcement.
- **Announces?** Twice: at `important` when the game has not answered yet, and at
  `critical` when it has given up. The second is the category that interrupts,
  which is right — a client that will not receive anything is not a background
  condition.
- **axe:** clean at every severity.
- **Human AT testing:** A8, which is the blocker above.
