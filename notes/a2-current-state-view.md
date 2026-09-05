# A2 -- Current State View and semantic values

Status: **COMPLETE**

Verification: 486 Python tests OK (up from 484). axe clean. Live-verified with a
full synthetic sync.

Retrofits M8 and M16.

## What was built

**The Current State View** (`state_view.js`) -- one widget answering *what is
true right now*, assembled from the same authoritative store the visual widgets
read.

```text
CURRENT STATE
LOCATION        Town Square
EXITS           north to North Road
PEOPLE HERE     Captain Renn (allied)
YOUR CHARACTER  Health 82/100 healthy
                1 item equipped
                1 item carried
EFFECTS         Poisoned (harmful), 47s
TARGET          a goblin (hostile), Health 12/30 bloodied
```

Plus the semantic fields that make those lines readable: `state_text` and
`units` on resources (A.77), and `description`, `disabled` and `reason` on
actions (A.78).

## Why a snapshot is not a summary of the console

The transcript answers *what happened*, and answers it in the worst possible
order for someone who arrived late: newest last, mixed with everything else, at
whatever length the game felt like.

A player who looked away, or whose screen reader was interrupted, or who lost
their place on a braille display, should not have to reconstruct the present by
reading the past. So this reads the **store**, never the rendered text. A.4
forbids scraping the console, and doing it would mean reconstructing information
Aetos already holds in structured form.

## It does not announce, and that is what makes it usable

A11Y-STATE-002. A snapshot that spoke every time the room changed would
duplicate every announcement the announcement manager already makes, and the
player would hear everything twice.

`aria-live` is set to `"off"` explicitly rather than left unset, so the decision
is documented where the next person will look for it. It is somewhere you *go*,
not something that talks.

## Fixed section order, deliberately not configurable

Predictability is the feature (A.49). Location, exits, who is here, what is
here, what is true of me, effects, target, what I am in the middle of.

A player who learns that exits are the second heading finds them there on every
game and after every update. The structure is learned once.

## Exits are shown even when empty; everything else is not

An empty section is omitted -- fifteen headings, twelve of them saying
"nothing", is a worse snapshot than four that all carry information.

Exits are the exception, because **"No visible exits" is a fact a player
urgently needs**, and omitting the heading makes it indistinguishable from a
game that does not report exits at all. The difference between *nowhere to go*
and *I do not know* matters most at the exact moment someone is trying to leave.

## Compact by default (A11Y-BRL-002)

`Health 82/100 healthy` rather than `Health, 82 out of 100, healthy`.

On a 40-cell braille display that is the difference between two resources
fitting on one line and one resource taking two. A player panning back and forth
across padding is being slowed down by their own status bar. Verbose is
available; compact is the default, because the compact reader is the one who
pays for the choice.

`state_text` is the game's own word for a value -- "healthy", "bloodied" -- and
is worth more than the numbers to anyone who has not memorised the scale.

## Rounded durations (A11Y-BRL-005)

`47s`, `10m`. Never `4.973, 4.941, 4.902`, which is not a countdown but a denial
of service against the accessibility tree: it costs a braille reader an entire
line of churn every frame, for precision nobody wants on a buff timer.

## BUG FOUND -- M16's inventory and equipment never reached the client

The state view rendered no item counts. The cause was not the new widget:
`store.js` keeps an allowlist of sections and `applySync` **discards anything
absent from it**. M16 added `inventory` and `equipment` to `build_sync`, added
two widgets that subscribed to them, and never added them to that array.

The failure was completely silent. The server sent the payload, the widgets
subscribed, the store dropped it on the floor, and both panels rendered empty
forever -- no error, no warning, and nothing visible in a screenshot, because an
empty inventory looks exactly like an empty inventory.

It shipped in M16 and survived A0 and A1 undetected. Confirmed fixed: with the
sections added, the inventory panel rendered its contents for the first time.

Guarded by `TestTheStoreKnowsEverySyncSection`, which builds a real sync and
compares its keys against the array parsed out of `store.js` -- in both
directions, so a dead entry is caught too.

I then checked that the extraction is not vacuous, because a test comparing two
empty sets passes beautifully and proves nothing. It reads 14 sections.

## Also fixed

`1 items equipped`. Trivial to get wrong, grating to read, and worse to hear: a
screen reader gives a mis-pluralised count the same weight as any other word, so
it lands as a stumble in the middle of a line the player is trying to read
quickly.

## Design note: use the API that already exists

The "in progress" section first called `commandQueue.activeRoute()`, which does
not exist -- I had invented an accessor for information `queue.state()` already
reports. Corrected to use the real one. A second accessor for the same fact is a
second thing that can disagree with the first.

## Accessibility -- definition of done (A.97)

- **Keyboard-findable:** yes, an ordinary panel with a heading.
- **Accessible name:** "Current state", distinct from the visible heading.
- **Semantic role:** section with `h2` and ordered `h3` subheadings.
- **Operable without a mouse:** nothing to operate -- declared
  `keyboardOperable: false`. Acting on anything listed is done from the widget
  that owns it, so this stays a place to find out rather than a second way to do
  the same things slightly differently.
- **Graphical?** No.
- **Announces?** No, deliberately (A11Y-STATE-002).
- **Steals focus?** No.
- **Preserves review position?** It rebuilds on update, which is acceptable only
  because it never holds focus. Revisit if it ever gains controls.
- **Colour alone?** No -- relationship, effect tone and severity are all words.
- **Reduced motion / 200% / 400%:** text and lists only.
- **Touch targets:** none.
- **axe:** clean.
- **Human AT testing:** yes, at A8. This is one of the surfaces where "does it
  actually help" cannot be answered by a machine. The question is whether a
  player who lost their place can recover in a single read, and only a person
  can say.
