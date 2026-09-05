# M20 -- PWA shell and touch gestures

Status: **COMPLETE, with one part unverified live** (see below)

Verification: 940 Python tests OK (up from 885). Gesture classifier, palette
resolution and the served endpoints all checked live. **Service worker
registration could not be exercised in the lab browser** and needs a real one.

Addendum A.57. The responsive layout half of M20 shipped earlier; this is the
PWA shell and gestures.

## What "offline" honestly means

Nothing. A MUD is a live connection; there is no offline mode and there never
will be. The worker caches the **shell** -- the JavaScript, CSS and template --
and nothing else.

The benefit is narrow and real: a player whose train enters a tunnel gets
Aetos's own reconnecting state instead of the browser's dinosaur, and when
signal returns the client is already loaded. That is the whole of it, and it is
worth stating because "works offline" is exactly the claim a PWA invites and it
would be false.

## Game content is never cached

Not the transcript, not a sync payload, not a tell. A cache is a data store, and
section 63 requires local data to be enumerable and clearable. A worker quietly
holding last night's conversation would be invisible in the privacy panel, would
survive "clear all Aetos data", and would be readable by anyone who picks up the
device.

Enforced structurally rather than by filtering: the fetch handler declines
anything that is not a same-origin GET under `/static/aetos/` or
`/static/webclient/`. There is no branch that could cache a response from the
game. A request it does not own is not handled at all, so the browser behaves
exactly as if no worker existed.

The privacy panel's "clear all" now clears the cache too. A cache the panel does
not clear is data a player was told they had deleted, which is a worse failure
than not offering to delete it.

## Network first, which is the opposite of the usual advice

Cache-first is right for immutable, content-addressed assets. Aetos's are
neither, and a player on a working connection should be running the code the
server currently has. The cache is a fallback for when the network fails, which
is the situation it was added for.

A worker serving yesterday's JavaScript against an upgraded server presents as
features mysteriously missing -- which nobody diagnoses as caching. So the cache
name carries `ASSET_VERSION`, substituted at serve time from `constants.py` so
there is one version rather than two that can disagree, and activation deletes
every Aetos cache that is not the current one.

Nothing is precached. A precache list is a second copy of the template's script
tags, and the two drift: the copy goes stale, the worker caches a file that no
longer exists, and installation fails for everybody.

The worker itself is served uncached. A cached service worker cannot be
replaced, which turns any mistake in it into a permanent one for everyone who
loaded it -- the single failure mode a service worker must not have.

## Updates are never applied under the player

`skipWaiting` is never called by the client on its own. A new version waits, the
player is told it is ready and that **nothing has changed yet**, and they reload
when it suits them.

Reloading the client under somebody mid-fight, mid-conversation, or mid-sentence
on the communication board would be a data-loss bug wearing a feature's clothes.

Install is captured rather than left to the browser, for the same reason plus
one more: the browser's own banner is not reliably focusable, so a palette
command is the only way a keyboard-only player could reach it at all.

## Gestures: every one duplicates a palette command

A.57 forbids *requiring* dragging, double clicks, precision placement,
multi-point gestures or hover. Aetos reads that as a design rule: a gesture may
make something faster and may never be the only way to do it.

The reason is broader than motor disability, though that is reason enough. A
gesture is invisible -- it cannot be discovered, listed, rebound or announced --
so a feature reachable only by swipe does not exist for anyone using a screen
reader, a switch device, a desktop, or anyone who simply never guessed.

Four, deliberately. A phone-sized screen has room for a handful of learnable
movements; a client with twelve has none, because they stop being shortcuts and
become a language to memorise.

```text
up      command palette      (the only palette route on a touch device)
left    where am I
right   review mode
down    stop queued commands (the one reached for in a hurry)
```

Single pointer only, and a second finger arriving mid-gesture cancels rather
than completing with whichever lifted last. Handlers are passive, so a gesture
can never block a scroll -- one that fights the browser's own scrolling makes a
page feel broken. Text fields and scrolling regions are excluded entirely: a
swipe that stole a scroll would make the transcript unreadable on the device
where it is already hardest to read.

Thresholds are set for a tremor rather than a steady hand. Verified live: a
100px horizontal swipe with 40px of vertical wobble still classifies as `left`,
while a 30px movement, a 45-degree diagonal and a 1.5-second drag all classify
as nothing.

## The year-old defect this found

`Ctrl+K` has named `palette.toggle` as the command it accelerates since **A0**,
and no such command was ever registered.

The A.23 rule -- every shortcut names its palette command -- was checked by
asserting the string `paletteCommand:` appeared. That is spelling, not
substance. The point of the rule is that a player can find the feature in the
palette and learn its shortcut there, and a dangling reference defeats that
entirely while looking compliant.

M20's gesture guard found it within a minute of first running, because that one
checks against the live palette rather than against the source text. The
up-swipe simply refused to register, which is exactly what it should do for a
command that does not exist.

Fixed by registering the command -- which earns its place beyond tidiness, since
a touch device has no Ctrl+K and the up-swipe needs something real to duplicate.
And the check is now a static test that every `paletteCommand` and every gesture
reference resolves to a registered `addCommand` id.

Worth noting what made the difference: the new check tests that a *reference
resolves*, the old one tested that a *field is present*. The second is much
easier to write and catches almost nothing.

## Four regressions in existing tests, all worth the noise

Adding gestures broke four tests, and none of them was wrong to fail:

- The shortcut test counted `paletteCommand:` across the whole shell, which
  started matching gestures. Both rules were being honoured; the measurement had
  become wrong. Now counts within each `shortcuts.register` block.
- The wiring tripwire flagged `palette: palette` appearing twice -- and it was
  right. `gestures.js` accepted a `palette` it never used, because the
  registration check lives in the shell where the palette already is. Dead
  wiring, removed.
- `reorientNow` gained a third caller. All three doing the same thing is the
  point.
- Rewording the "clear all data" confirmation split a phrase the privacy test
  asserts. The test was right that the words matter; rewrapped.

## NOT VERIFIED: the service worker never registered in the lab

Honest status, because this is the part most likely to be assumed working.

Registration fails in the lab browser with *"An unknown error occurred when
fetching the script"*. Isolated properly rather than guessed at: the same file
served from a **completely different path** (Twisted's static handler, scope
`/static/aetos/`) fails identically, which rules out the Django view, the
headers and the script.

What *was* verified:

```text
GET /webclient/aetos-service-worker.js   200, application/javascript,
                                         Cache-Control: max-age=0, no-cache
                                         ASSET_VERSION substituted
GET /webclient/aetos-manifest.json       200, valid manifest
<link rel="manifest">                    present, resolves relatively
theme-color                              #14171c, matches --aetos-bg (tested)
```

So the endpoints are right and the code is unit-tested, but **nobody has yet
seen this worker install, activate, serve from cache, or hand over to a new
version**. Recorded in `notes/lab-hazard-003-no-service-workers.md` and flagged
for A8, where a real browser is in the loop.

I would rather say that plainly than let a green test suite imply otherwise.

## Accessibility -- definition of done (A.97)

- **Keyboard-findable / operable:** install and update are palette commands;
  every gesture duplicates one.
- **Accessible name:** no new controls beyond palette entries.
- **Announces?** An available update once, at `important`. A fired gesture
  announces what it did -- a gesture is invisible and its result may be too, so
  somebody who swiped by accident needs to know in order to undo it.
- **Steals focus?** No.
- **Colour alone?** No new colour meaning.
- **Target size:** unchanged; A.57's 44px was already met at M20's responsive
  stage and is asserted again for the AAC keys.
- **axe:** unchanged -- this milestone adds no new UI surface.
- **Human AT testing:** at A8, and this milestone contributes two specific
  questions: whether four gestures is too many to learn or too few to bother
  with, and whether announcing every fired gesture is helpful or becomes noise
  for somebody who swipes often.

## Not built here

No push notifications. A MUD client that could notify you of a tell while closed
is a plausible feature and a genuinely bad idea to build casually: it needs a
server-side subscription store, which is a persistent per-player record on the
game server, and blueprint 2.3 forbids exactly that.

No background sync, for the same reason plus the simpler one that there is
nothing to sync -- commands are meaningless once the moment has passed.
