# M18 -- Audio, multimedia and captions

Status: **COMPLETE**

Verification: 791 Python tests OK (up from 741). axe clean on the media panel
with captions listed and an image shown. All three caption paths -- captioned,
uncaptioned and decorative -- exercised live against a real provider.

Absorbs A6. Addendum A.58, A.79, A.84.

## The gate, and what it can and cannot enforce

> **A11Y-MEDIA-001.** No gameplay-essential information may exist only in audio.

Aetos cannot enforce that *inside* a sound file. It cannot listen to one and
describe it, and it will not pretend to: an invented caption is confidently
wrong to precisely the player who cannot check it.

So it enforces the structure around one. Every non-decorative sound is also
**text** -- written into the captions panel and announced -- and that text is
emitted **before** any attempt to play the sound, and regardless of whether the
attempt succeeds.

That ordering is the whole design. Muted, volume at zero, no speakers, file
missing, browser blocking autoplay: the caption goes out in every case. Tying
the text to successful playback would mean the players who most need the text
are the ones least likely to get it.

Two tests assert the ordering directly, by index into the function body.

## Uncaptioned audio is reported, not swallowed

A sound that is neither captioned nor marked decorative produces
`"Uncaptioned effect audio."`, and the server counts them:

```text
{"items": [...], "uncaptioned": 1}
```

The alternative was to play it silently. That would let a game publish audio
some of its players never receive, with nobody ever finding out -- the developer
because nothing complained, the player because they cannot know what they did
not hear.

`decorative: true` is the deliberate exception (A11Y-MEDIA-003): the game
asserting that a sound carries nothing. It is an assertion, not a validation. A
game that marks its combat cues decorative has lied to its own players, and no
client can catch that.

## Ambient media is state; one-off media is an event

Two shapes on one message, and conflating them would be audible:

- `{"items": [...]}` -- what should be playing while the player is here. The
  engine **diffs** it, so a sync arriving every few seconds does not restart the
  music. Restarting would be unpleasant for everyone and, for a player relying
  on a sound to know where they are, actively confusing.
- `{"play": [...]}` -- something that happened. Never diffed, because a door
  slamming twice is two sounds.

Verified live: three items synced, the identical payload synced again, caption
count unchanged at 2 and nothing restarted; then an empty sync, and everything
stopped.

## Every category has a slider

A11Y-MEDIA-002. `music`, `ambience`, `effect`, `ui`, `voice`, plus a master and
a mute. A test asserts the server's category list and the client's slider list
agree, because a category with no slider is a sound the player cannot turn down.

A descriptor in an unknown category is **rejected on the server** rather than
played uncontrollably.

Volume is three multipliers -- the game's suggestion, the player's category
slider, the master -- so the player can always reach zero and a game cannot
insist on being heard. A game asking for `volume: 40` gets 1.0.

Native `<input type="range">` elements, not styled divs. A custom slider a
screen reader cannot operate is a volume control that does not exist for the
person most likely to need it.

The master starts at 0.7. A client that arrives at full volume is a client
somebody closes before they find the slider.

## URL safety

A media URL is game-supplied and ends up in an element's `src`. Games are
trusted with their own content, but a game interpolating *player* input into a
URL is not unusual, and `javascript:` in a `src` runs with the client's full
privileges.

Allowlist, not denylist: `http`, `https`, and relative. A denylist would have to
anticipate every scheme a browser has ever supported.

`data:` is deliberately excluded -- the one form where the payload and the
reference are the same string, which makes size unbounded and content
unreviewable. Backslashes are refused outright, because browsers treat them as
forward slashes in some positions and that is how `https:/\evil.example` gets
past a naive parser.

## BUG: numeric preferences never persisted

The serious find, and M18 only exposed it.

`normalize()` in the A0 preferences layer handled enums, one special-cased
number (`visual.scale`), booleans, and strings. A number with **no** special
case fell through to the string branch and was silently discarded.

So every volume slider would have appeared to work -- the control moves, no
error anywhere -- while nothing it set survived a reload. That is the worst
shape a settings bug can take: a player would conclude the client was broken,
and they would have been right.

Fixed with a `RANGES` table, so the next number added is handled by
construction rather than by remembering. A load-time check warns about any
numeric default with no range, and a test enforces it, because the failure it
prevents is silent.

While writing the table I typed `2.0` for `visual.scale`, silently narrowing a
range that had been 2.5 since A0. It now references `SCALE_MIN`/`SCALE_MAX`
rather than repeating them, and a test asserts that.

## The widget contract did its job

The first version of the captions widget invented its own shape -- `title`,
`region`, `render` -- and the A1 registry threw at boot:

```text
Aetos widget registration failed: displayName must be a non-empty string;
accessibility.liveUpdates must be true or false
```

Which is exactly what A1 is for. "We'll do accessibility later" is not
expressible in the API, and a widget author who has not thought about how their
widget is read cannot ship it by accident. It cost ten minutes and caught a real
omission.

## Two axe findings, both mine, both the same mistake

`role="region"` on the caption `<ul>` produced a `listitem` violation across
every caption plus an `aria-allowed-role` note. A role on a list replaces its
semantics and orphans every `<li>`: a screen reader stops announcing "list, 12
items".

A0 made this exact mistake once before, while *fixing* a scrollable region. It
is worth the comment now in the source, because the wrong version looks more
accessible than the right one. `tabindex` and a label are all a scrolling
region needs.

## A closure trap, anticipated for once

The engine writes captions into the widget; the widget's controls drive the
engine. Mutual, and the widget is created first.

`captionsWidget.audio = engine` would have set a property nothing reads, leaving
every control inert while looking entirely correct -- the fifth instance of this
family in the client. This time it was caught while writing it rather than
after, and the fix is a `setAudio()` that assigns the closed-over variable.

## A partial provider dict no longer takes down the sync

Adding a slot broke nine existing tests with `KeyError: 'media'`, because they
pass a hand-built provider dict. The tests were not wrong: a game calling
`build_sync` from its own hook has the same problem, and a slot added in a later
Aetos version should degrade to "this game exposes none of that" rather than
raising.

`build_sync` now fills gaps from the defaults.

## Accessibility -- definition of done (A.97)

- **Keyboard-findable / operable:** the panel, plus "Stop all sound" and "Mute
  all sound" in the palette's Comfort group beside Focus and Quiet Mode.
- **Accessible name:** every slider has a real `<label for>`; the caption list
  is labelled.
- **Announces?** Every non-decorative caption, at `normal` -- media does not get
  to shout. `voice` is raised to `important`, since a game using that category
  is sending speech.
- **Steals focus?** No.
- **Colour alone?** No. The category is a word beside each caption, not a tint.
  Mute is `aria-pressed`, not a colour.
- **Live regions:** none added. Captions go through the shared announcer, so
  media cannot compete with the transcript for speech -- the client still has
  exactly two.
- **axe:** clean, with captions listed and an image shown.
- **Human AT testing:** at A8. The open question is whether the caption panel is
  the right place for a burst of combat sounds, or whether captions should be
  inline in the transcript where the surrounding text is. My instinct is that
  both are wanted and the panel should be the durable copy, but that is a
  question for somebody who reads a game this way rather than for me.

## Not built here

No text-to-speech. A.58 is about the game's media, and Aetos's own speech goes
through the platform screen reader rather than a bundled voice -- decided at
decision-005 and unchanged. Video is unimplemented: the descriptor shape allows
for it, but captions for video are a different problem (timed tracks) and
inventing half of it would be worse than leaving the slot honest.
