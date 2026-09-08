# A15 — the client reads the game aloud

Status: **COMPLETE**

Verification: 1589 Python tests OK, 380 accessibility checks OK (375 → 380),
`black` and `isort --profile black` clean.

Gary, after A14 wired game output into the announcer:

> *"ok I have the reading turned on but it doesnt read out loud"*

And then, asked directly whether a screen reader was running:

> *"No — I turned the option on in Aetos and expected it to speak"*

**The client was behaving exactly as designed, and the design was wrong.**

## The assumption nobody had stated

Every accessibility decision in this project assumed that "announce" means "hand
it to assistive technology". Aetos wrote to an ARIA live region and left the
speaking to a screen reader — correct for somebody running NVDA, and **silence
for everybody else**.

The setting's own label made it worse: *"What is spoken aloud or sent to a
braille display"* reads as a promise that Aetos speaks. It never did.

That assumption is also wrong about the actual population. The people who want
text read to them are far more numerous than the people running a screen reader:
dyslexia, low vision that has never involved setting up assistive technology,
tired eyes at the end of a long session, or simply wanting to listen while doing
something else. **Telling all of them to install NVDA is not an accessibility
answer.**

If the person who commissioned this client expected it to speak, players will
too.

## What was built

`speech.js`, on `window.speechSynthesis` — part of the platform at the published
floor. Nothing downloaded, no CDN, nothing sent anywhere, and the voices are the
ones the machine already has.

**It is a renderer, not a second channel.** The hook sits inside the announcer's
`write()`, at the moment the announcer has already decided a message should be
heard. Category, priority, per-category preferences, announcement mode, quiet
mode, review mode and burst aggregation are all upstream of it, and `speech.js`
mentions none of them. Duplicating any of that policy would guarantee the two
eventually disagreed about what a player asked for.

Measured:

```text
while off                 0 utterances
while on                  "A dusty chamber. Exits: north."   rate 1.3
markup                    stripped before speaking
turning it off            cancels mid-sentence
```

### The decisions worth naming

- **Off by default, and it must stay that way.** A client that starts talking is
  alarming, and for a screen reader user it would be two voices over the same
  text. Aetos cannot detect a screen reader and **must never try** — A.72 calls
  that fingerprinting, and a player must never have to disclose a disability in
  order to play. So the overlap is handled by saying so in the control's own
  description: *"Leave this off if you already use a screen reader, or you will
  hear everything twice."*
- **It is not a screen reader and does not pretend to be one.** It reads what the
  client decided to announce. It cannot describe the interface, navigate by
  heading, or read a control's state.
- **A gesture arms it.** Browsers refuse audio until the player has interacted
  with the page, and speaking before that leaves some synthesisers dropping the
  *next* utterance too. Requests before that are discarded rather than queued — a
  queue would empty itself in one burst the moment somebody clicked, reading out
  everything since the page loaded.
- **Stopping matters more than starting.** Turning it off cancels the current
  utterance. Otherwise switching it off lets a two-hundred-word room description
  run to the end, which reads as the control not working at exactly the moment
  somebody wants the talking to stop.
- **Survives the mode switch**, like text size. Somebody who asked to be read to
  has not asked for that to stop when they look at the standard interface — the
  same class of defect as A14b's quiet mode silencing the game.

## The pattern, now four deep

| | Found by | Every automated gate said |
|---|---|---|
| A0 scrolling region | a person | correct |
| A13 slider | Gary, dragging it | correct |
| A14 announcements | Gary, typing `look` | correct |
| A15 speech | Gary, expecting sound | correct |

Every one was something the machinery did faithfully and no person could use.
Names, roles, states and structure were right in all four cases.

## What is still not verified

Whether the voice is intelligible, whether the reading speed is bearable over an
evening, and whether being read a room description is useful or maddening.

None of that is assertable: the check records `speechSynthesis.speak` rather than
listening to it, which is honest about what a test can know. That is
`docs/a8-tester-protocol.md`, and it needs a person.
