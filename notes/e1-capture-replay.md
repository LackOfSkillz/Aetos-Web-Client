# E1 -- Developer capture and replay

Status: **COMPLETE**

Verification: 560 Python tests OK (up from 534). Gate proven live: a captured
room/resource/combat sequence reproduced an **identical state snapshot** with no
live server.

Second stage of the E-track. With E0, this clears the last prerequisite for M17.

## What was built

```text
static/aetos/js/developer/
├── capture.js    records a session as versioned JSON Lines
└── replay.js     feeds it back through the live pipeline
```

## The gate

Captured a four-event sequence -- room, combat text, a resource drop, a move --
then wiped the store to a deliberately wrong state (`NOWHERE`, 999 hp), cleared
the log, and replayed with nothing connected:

```text
wiped state          NOWHERE / 999hp
after replay         North Road / 20hp
identical snapshot   true
canonical log        4 events, matching the live run
```

## Why this is release tooling, not a debugging convenience

The hardest behaviours in this client to test are the ones that depend on
**sequence and timing**: announcement prioritisation, flood control, Review
Mode, reconnect, threshold crossings.

None of those can be exercised reliably against a live game. You cannot ask a
MUD to produce twelve combat messages in two seconds on demand, twice,
identically. A capture can.

That is why C.13 lists screen-reader bug reproduction among the mandatory uses:
an accessibility defect that happened once to somebody else is otherwise a story
rather than a test. With a capture it becomes a fixture.

## Replay uses the live seam, and there is no second path

Records go into `pipeline.ingest()` -- exactly where the websocket puts them.
`replay.js` never touches the store, and a test asserts it.

A harness that exercises different code from production tests the harness. The
corollary is the useful part: if E0's ordering guarantee holds during replay it
holds in production, because it is the same pipeline object.

## Replay never sends a command

Outbound records are surfaced to listeners and **not enacted**. A capture is a
recording of what a player did; re-issuing it would act on their behalf against
a game that has moved on -- possibly a different game, possibly a different
character, certainly a different moment.

## What a capture contains, and what it structurally cannot

Game traffic: protocol version, manifest, normalized inbound events, text,
outbound commands, connection markers, relative timings.

The player's own data: never. Not notes, relationships, macros, aliases,
scripts, accessibility preferences, AAC preferences or reminders.

**The exclusion is structural rather than filtered.** Capture observes the
pipeline and the dispatcher, and neither of those ever carries browser-local
data -- so there is no path by which a note could reach a capture file even if
somebody wanted one. A test sweeps `capture.js` for any reference to a local
store.

Credential-shaped keys are redacted anyway, depth-limited to eight levels. Belt
and braces: a developer capturing their own game should not have to audit their
own provider before sharing a bug report, and a provider that hands back a
recursive structure should not hang the tab.

## Privacy is not secrecy

A capture is *meant* to be shared with a maintainer, so `describe()` states
plainly what is in it:

```text
contains: structured game state, resource and effect payloads,
          game text you saw, commands you sent, connection events
excludes: passwords and tokens, your notes and relationship tags,
          your macros/aliases/triggers/scripts,
          your accessibility and AAC preferences,
          anything stored only in this browser
```

"Trust me" is not a privacy model. Saying what is in the file is what makes it
safe to share without reading all of it.

## Design decisions worth keeping

**Nothing records by default.** A client quietly accumulating a session log
would be storing game text nobody asked it to keep.

**The default level is `state+text`, not `full`.** Recording everything by
default means every casual capture carries text the developer must read before
sharing.

**The header is the first record, not a wrapper object.** The file stays
append-only, so a capture interrupted by a crashed tab is a valid readable
prefix rather than an unparseable half-object. Verified: a deliberately
truncated file loaded its first three records and reported one problem.

**An unknown format version is refused, not best-guessed.** A misread capture
produces a convincing wrong answer, and during a bug hunt a convincing wrong
answer costs far more than an honest refusal.

**One malformed line does not lose the capture.** A truncated file is what a
crashed tab produces and it is still worth replaying up to where it stops.

**Outbound is recorded at `sendCommand`**, the single point every command source
converges on (C.11) -- keyboard, button, macro, route, script, voice, AAC.
Recording at each call site would eventually miss one, and a capture missing one
command cannot reproduce the session.

**Capture observes the `announce` stage**, last in the pipeline, so it records
what the client *decided* rather than what arrived. The bugs worth reproducing
live in the second thing.

**The clock is injectable.** A test depending on `Date.now()` is a test that
fails on a slow morning.

## Test defect corrected

`test_every_playback_mode_exists` searched for `"instant"` as a quoted string.
The speed table declares it as a plain identifier -- `instant: 0` -- which is
perfectly valid JavaScript. The mode worked; the test was looking for the wrong
shape. Now asserted against the speed table itself.

Fifth instance of the same pattern in this project: a structural test written as
a textual search that matched the wrong thing. Recorded again because the
frequency is the point.

## Accessibility -- definition of done (A.97)

E1 adds no player interface, so most answers are "not applicable". The two that
matter:

- **Does it expose private accessibility information?** No, and structurally so
  -- accessibility preferences are browser-local and capture cannot reach them.
- **Does it help accessibility?** Substantially, and indirectly. This is the
  milestone that makes announcement prioritisation, pacing, flood control and
  Review Mode testable at all. A8's manual assistive-technology work becomes far
  cheaper when a failing sequence can be replayed rather than re-provoked.
- **axe:** unchanged; no interface.
