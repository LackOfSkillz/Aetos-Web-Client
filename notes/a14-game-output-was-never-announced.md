# A14 — the game was never read aloud

Status: **COMPLETE**

Verification: 1568 Python tests OK, 373 accessibility checks OK, `black` and
`isort --profile black` clean.

Gary:

> *"ok when I turn screen reader on and then go back to the game and type look
> nothing is read to me"*

He is right. **No game output has ever been announced.** Not room descriptions,
not tells, not combat, not anything the server sent. This is the most serious
defect this project has shipped, and it sat under a green suite for the entire
A-track.

## Everything was built. Nothing was connected.

Each piece existed and each piece worked:

- the pipeline has had an **`announce` stage** since E0 — it is in `STAGES`, it
  runs, and `events/pipeline.js` carries a comment about the console being
  *"still announced if the player's announcement settings"* allow;
- the **announcer** has had categories, per-category preferences, priorities,
  flood control, aggregation and review mode since A0;
- **`screenReader.announceRoom`** has defaulted to `true` throughout;
- both **live regions** are in the template and correctly roled;
- the console is deliberately **`aria-live="off"`**, because `role="log"`'s
  implicit polite region would speak every line including combat spam.

The only observer of the `announce` stage was **the capture recorder**. So the
stage ran, handed each event to a debugging tool, and stopped. The announcer was
never given anything to decide about, and the console was told not to speak.

A screen reader user typed `look` and heard silence.

Measured before the fix — emit one line of game text, then read the polite
region:

```text
before   polite: "Connected."
after    polite: "Connected."      <- unchanged
console  contains the text          <- it arrived, it was just never spoken
```

The fix is thirty lines of wiring in `aetos.js`. No new policy: category,
priority, per-category preferences, quiet mode, review mode and burst
aggregation are all the announcer's job, and a second opinion in the shell is
how two places come to disagree about what a player asked for.

Measured after, with a realistic `look`:

```text
polite: "Limbo\nWelcome to your new Evennia-based game!\nExits: down\n
         Characters: aetos_dev"
```

Plain text, no markup — a screen reader must not read span tags aloud.

## Why five gates missed it

This is the part worth keeping, because the same shape has now appeared three
times in this project.

**The browser suite's `announce` check ingested five lines of game text and
asserted only that none of them reached the *urgent* region.** That assertion
was true. It was true because none of them reached *anywhere*.

> A negative assertion is satisfied by nothing happening at all.

That is not a subtle failure mode. It is the default one. "X must not happen"
passes in an empty room, and it will keep passing while the feature it guards is
entirely absent.

The Python tests failed the same way, more quietly. `TestOutputIsNotALiveRegion`
asserts three things, all true, each one end of a wire that was never joined:

- the console is not a live region ✓
- an announcer region exists ✓
- widgets can reach the announcer ✓

Nobody asserted that **game output arrives at it**.

And the rest of the suite could not have seen it either. axe checks names, roles
and states — all correct. The accessibility tree was right. The keyboard walk
reached everything. NVDA read the mode switch correctly, and could not have
caught this: Guidepup captures the speech NVDA produces in response to its own
navigation commands, not spontaneous live-region updates, which
`notes/a11y-suite.md` already records.

**Every gate measured the machinery. None measured the outcome.** A13's slider
was the same lesson about pointer gestures; this is the same lesson about
speech. Gary found both by using the client.

## What changed in the gates

- `checks/announce.js` gained the positive assertion beside the negative one:
  game output **is** announced, and to the polite region. 371 → 373.
- `tests/test_accessibility.py` gained `TestGameOutputIsActuallyAnnounced`,
  which asserts the stage has an observer besides the recorder, that it passes
  the plain text and the category, that it does **not** re-implement the
  announcer's policy, and that the fix was not "turn the console on".
- `test_capture_replay.py`'s "capture observes the announce stage" test anchored
  on the *first* observer, which was only ever correct while there was one. It
  now asserts what it always meant: capture is registered **last**.

## The rule this earns

Any assertion of the form *"X must not happen"* needs a positive one beside it
saying the thing under test happened at all. Otherwise it is measuring an empty
room and reporting a pass.

## A14b — and then quiet mode silenced it again

Gary, with the wiring in and a screen reader on:

> *"ok I have the reading turned on but it doesnt read out loud"*

Two more, both real, and the first is the better find.

### Quiet mode was deaf

```js
if (quietMode) {
    if (priority === "normal" || priority === "background") { return null; }
}
```

Directly above it, in the source: *"quiet is not deaf."*

Every line of game text arrives under the category `other`, which is `normal`.
So **"fewer interruptions" silenced the game itself.** Invisible to a sighted
player -- the console is right there and nothing appears lost. Total silence for
somebody listening, because the console is deliberately `aria-live="off"` and
announcements are the only channel they have.

The setting's own description says *"Nothing is lost -- it is still in the
log."* That is true only if you can read the log, which is exactly the
assumption this client should never make.

Quiet now drops `background` only -- resource ticks, inventory, media, the
incidental chatter people actually mean by interruptions. Combat keeps its own
control, which is a choice a player makes rather than a side effect.

**A claim in a comment is not a property of the code.** Fifth time.

### Presets were additive, so they accumulated

Picking *"Too much going on"* and then *"I use a screen reader"* left
`quietMode: true` from the first. The second preset therefore produced a client
that said nothing at all — a combination nobody chose and nothing on screen
explained.

Applying a preset now writes **every key any preset touches**: to the chosen
preset's value, or back to its default. The key list is derived from the table
rather than maintained beside it, so adding a value to a preset cannot forget to
join it. Preferences no preset has an opinion about are left alone — clearing
those would make picking a starting point a destructive act.

Measured, running the exact sequence:

```text
calm then screen-reader   before: (silence)          after: "The chamber is cold."
quiet mode on             before: (silence)          after: "The chamber is cold."
quietMode after both      before: true               after: false
```

### And the label promised speech we do not produce

*"What is spoken aloud or sent to a braille display"* reads as a promise that
Aetos speaks. It does not: it writes to a live region and a screen reader voices
it. With no screen reader running the setting appears to do nothing, and the
person most likely to meet that is somebody setting up assistive technology for
the first time.

Now: *"Passed to your screen reader or braille display, which reads it. Aetos
does not speak by itself."*

## What is still not verified

That **NVDA speaks it**. The client now writes the right text to the right
region — that is deterministic and tested. Whether a screen reader voices it at
a useful moment, and whether hearing every room description is bearable over an
evening, is `docs/a8-tester-protocol.md`, and it needs a person.

Gary is at the machine; the honest next step is for him to turn the screen
reader on and type `look`.
