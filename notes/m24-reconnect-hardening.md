# M24 -- Reconnect hardening

Status: **COMPLETE**

Verification: 1085 Python tests OK (up from 1066). **axe clean at every level,
including moderate** — the first time the client has had zero violations of any
severity. Disconnect and reconnect exercised live.

## Two defects, one shape

Both were the client presenting something as true that it had no way to know was
still true.

### A command typed during a disconnect was reported as sent

`dispatcher.send` called `evennia.msg` unconditionally and returned `true`
regardless of the connection state.

Evennia's transport does not buffer. `websocket.send` on a closed socket throws
or is dropped, and nothing is delivered on reconnect — I checked the transport
source rather than assuming. So the command went nowhere, and:

- `sendCommand` returned `true`
- the capture recorded it as sent, making a replay that could not reproduce the
  session
- the orientation trail recorded it, so "what you recently sent" would list
  something that never left

Silently losing a command is bad. *Claiming to have sent it* is worse, because it
takes away the player's chance to notice and retype.

Now the send is refused, `sendCommand` returns false, and the player is told
once: **"Not connected. That was not sent."**

**Nothing is queued for later, and that is deliberate.** A player who typed
"attack the dragon" during a thirty-second dropout may be somewhere else
entirely when the socket returns, and replaying it would execute a decision they
made about a situation that no longer exists. Saying it did not send leaves the
choice where it belongs.

The guard sits *above* the capture and the orientation trail, so neither records
a command that was refused.

One subtlety: an unknown connection state counts as connected. Refusing on "not
yet known" would block the very first command of a session, before any
connection event has arrived.

### Everything on screen looked current when it was not

The moment a connection drops, every panel shows the world as it was — and looks
exactly as it did when it was current. A player glancing at their health bar
during a dropout reads a number presented as fact.

Now `data-aetos-stale` goes on the root, the workspace dims slightly, and a
sentence appears: *"Not connected. Everything shown is the last state
received."*

Three decisions inside that:

- **One attribute rather than sixteen widgets.** The panels already render
  correctly; they are simply out of date. Restating that once in the frame is
  cheaper and more honest than having every widget invent its own way to say it.
- **`aria-describedby`, not a live region.** Staleness is a *property* of what is
  on screen, not an event. The disconnection itself is announced once through
  the ordinary announcer; this is what somebody hears when they navigate into a
  panel afterwards. The notice is `hidden` when connected, so it leaves the
  accessibility tree entirely — a description that is always present but
  sometimes false is worse than none.
- **The dimming is not the message.** "Slightly greyer" is not a statement, and
  it is exactly the signal that disappears at high contrast, in bright sunlight,
  or for anyone whose perception of the difference is not the designer's. The
  opacity stays at 0.72 because the panels must stay *readable*: their content
  is the last thing the player was told and remains the best information they
  have. This says it is old, not that it is worthless.

## What already worked, now asserted

The handshake already re-sent on every open (M4) and the command queue already
paused on disconnect (M12). Both are load-bearing for a reconnect, so both got
tests that would notice their removal rather than being rewritten.

## Four accessibility findings, three of them mine

axe found more than the milestone introduced:

1. **`region`** — my stale notice sat outside every landmark. Moved inside the
   `<main>` it describes, which is also simply where it belongs.
2. **`scrollable-region-focusable`** on the state view and the resources panel —
   the fifth and sixth instances in this client. Both found by axe rather than
   by review, which is why it keeps recurring: **the person who writes the panel
   is never the person it fails.**
3. **`landmark-unique`**, which my own fix for (2) introduced. I used
   `role="region"` on the widget bodies, and the enclosing panels are already
   landmarks carrying the same names — so there were two landmarks called
   "Resources". Changed to `role="group"`, which carries a label without
   competing. Third time a role has been the wrong tool in this project, and the
   pattern is consistent: **an added role is more often the bug than the fix.**
4. **`page-has-heading-one`** — pre-existing since M4 and never noticed, because
   the QA gate only fails on serious and critical. The client had no `<h1>` at
   all, so a screen reader user had nothing to jump to and no statement of what
   they were looking at. The game's name in the status bar is now the heading;
   it stays visible rather than becoming a hidden one, because a heading that
   exists only for assistive technology is a heading nobody maintains.

That last one is worth sitting with. It was reported on every axe run since M4
and filtered out every time by a threshold I set deliberately and for good
reasons. The threshold is still right — a stylistic best-practice note should
not block a release while a keyboard trap hides in the noise — but "does not
block" quietly became "never read".

## Accessibility -- definition of done (A.97)

- **Keyboard-findable / operable:** no new controls.
- **Accessible name:** the two newly focusable panels are labelled groups.
- **Announces?** "Connection lost" at `critical` (unchanged, and the only
  category that interrupts), and "that was not sent" at `important`.
- **Steals focus?** No.
- **Colour alone?** No — the dimming is paired with a sentence.
- **axe:** **clean at every severity**, disconnected and connected.
- **Human AT testing:** at A8. The open question is whether the stale
  description should also name *when* the connection dropped. "Last state
  received" is true but undated, and after a long dropout the distance matters.

## Not built here

No reconnect backoff or retry logic. Evennia's transport owns reconnection and
Aetos reflects its state rather than competing with it — two things trying to
reconnect one socket is a race with no upside.

No command buffering, as above. It is the obvious feature request here and the
wrong one.
