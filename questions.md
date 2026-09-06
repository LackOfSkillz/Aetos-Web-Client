# Questions for Gary

Things I cannot settle without you. I have not stopped on any of them — each
notes what I did in the meantime so the work kept moving.

Delete an entry once it is answered, or answer inline; I will pick it up on the
next pass.

---

## 1. The master engineering blueprint is not in this repository

**Status:** worked around, but it degrades over time.

Addendum A and Addendum B both declare a parent document — *"Aetos Web Client
Complete Engineering Blueprint"* — and both cite it by section number ("section
76 lists voice control as part of the solution"). That document exists only in
our conversation. A reader of this repository cannot follow any of those
references.

Everything derived from it is captured: `notes/roadmap.md` is its schedule, and
`notes/decision-*.md` record the choices made against it. So nothing is blocked.
But the citations dangle, and each new addendum adds more.

**What I need:** the blueprint text, so I can add it as
`docs/blueprint.md`. I will not reconstruct it from memory — a paraphrased
normative document that *looks* authoritative is worse than an absent one,
because the next person will believe it.

**Meanwhile:** recorded as a known gap at the top of Addendum A.

---

## 2. ANSWERED -- voice ships after the upstream PR

**Gary, 2026-09-06:** *"Voice as a follow-up, after the PR."*

The blueprint's original ordering stands, and three things follow from it:

- **The PR description must not claim voice control.** Blueprint section 76
  lists it as part of what Aetos offers, and the first submission will not have
  it. That sentence comes out of the PR text, and the README's "Still to come"
  list keeps naming voice until it is built.
- **A8 validates the interface that actually ships**, which is what makes a
  human tester's pass worth their time. Validating an interface about to gain a
  whole new input mode would have been validating something short-lived.
- **M33 stays last**, after M32, exactly as the roadmap has it.

Nothing outstanding here.

---

## 3. A8 -- get it ready before the tester is asked

**Status:** answered 2026-09-06. No longer a dependency on people -- a
readiness bar I have to clear first. See the end of this entry.

Addendum A.85 and A.101 both say automated testing cannot substitute for these,
and I agree — nothing I can run replaces either.

- **A refreshable braille tester, on real hardware.** A.35 is explicit that an
  emulator or the NVDA Braille Viewer does not substitute. A.92 names Meris as
  the intended tester "if she remains willing" — is she?
- **Someone familiar with AAC / picture-supported communication**, to review the
  concept organisation and symbol assumptions before the project claims AAC
  support at all (A.94).

**Gary's answer, 2026-09-06:** *"Lets test everything we can and get it as ready
for testing as we are able to. I want it to be ready for a human tester as much
as we can before I ask her to test."*

So this is **not blocked on people any more** -- it is blocked on readiness, and
that is mine. The instruction changes what A8 means: a human tester's time is the
scarcest thing this project will ever spend, and it must not be spent finding
defects a machine could have found first.

That makes **A8 readiness a work item rather than a waiting state.** Before she is
asked:

- everything in `docs/a8-tester-protocol.md` that can be automated, is;
- the automated gates run at every viewport, text size and mode they should --
  UI1 found the axe gate had been measuring a single viewport for its whole life,
  and a serious violation was sitting behind that;
- every defect already visible on the assistive-technology surface is fixed, so
  what the protocol turns up is what only a person could have found;
- I walk the protocol end to end myself first, so no step in it is wrong,
  ambiguous or impossible before somebody follows it.

**Update (A7 is now built, so the AAC review has a concrete subject).** The
architecture exists and is deliberately not described anywhere as "AAC support".
What a reviewer would be asked to judge, none of which I can:

- **The concept set and its categories.** I chose sixty-odd words across eight
  categories, with Common first (yes, no, stop, help). Is that the right first
  screen? Is anything important missing, and is anything there that should not
  be?
- **The feelings category.** I included one because a board without it lets
  somebody transact but not converse, and "I am not okay" is not a transaction.
  The set is small and plain on purpose. Whether it is *right* is exactly the
  judgement A.94 reserves.
- **Sentence capitalisation.** A composed sentence sends lower-case —
  `say I want help`, not `say I Want Help`. Whether the first word should be
  capitalised is a real question I guessed at.
- **The strip's cognitive load.** Twelve words maximum, with move-left,
  move-right and remove on each. Is that too many controls per word?
**Gary's answer, 2026-09-05:** *"I think we are good to use the symbols."*

Recorded, and the ARASAAC mapping is a small job whenever it is wanted. One
thing to settle first, because it decides *where* the symbols live rather than
whether they are used:

ARASAAC's terms say plainly that *"the use of these resources within any product
or publication for commercial purposes is therefore excluded"*, and that
redistribution requires the derivative to carry CC BY-NC-SA too. For **you**
using them, and for any non-commercial game, that is fine and no more needs
saying. What it blocks is *shipping them inside the contrib*, because the
contrib is BSD-3-Clause and gets installed by games that may charge money — the
NC term would follow the files to every one of them, and Evennia upstream would
be taking on a mixed-licence tree at M32.

So the version that needs no permission from anyone is the one already built for
Mulberry: **ship the mapping, fetch the artwork on install**. The player or game
accepts ARASAAC's terms for their own use, which is theirs to accept, and the
symbols work. If you would rather bundle the images directly, say so and I will
— it is your project and your call; I would just want the licence stated in the
repo root rather than discovered later.

- **Which symbol set should be the default** — and this got sharper once you
  pointed me at the free libraries, because the answer is genuinely awkward.
  ARASAAC is a complete pictographic system and covers the core words, but it is
  CC BY-NC-SA, so a BSD-licensed client that commercial games install cannot
  ship it. Mulberry is CC BY-SA 4.0 and legally bundleable, but it is a
  vocabulary set: 3,436 symbols led by country flags and professions, with **no
  picture for yes, no, stop, please, thank you, sorry or friend.** Aetos now
  ships a verified Mulberry mapping and an importer, so a player can install
  either. But "install ARASAAC yourself" is a poor answer for the person who
  most needs this to just work.
- **Whether the concept list should change to fit an available set**, rather
  than the set being fitted to my concept list. That is the opposite of how I
  built it and may well be the right way round.
- **Gendered symbol variants.** Mulberry offers `happy_man` / `happy_lady`,
  `sad_man` / `sad_lady`, `confused_man` / `confused_lady`. I mapped none of
  them, because picking one encodes a default I have no business setting and
  offering both doubles the board. A reviewer should decide.
- **Whether a text-only board is usable at all**, since that is what you get
  before installing anything. If the answer is no, the honest fix is to say so
  prominently rather than let it look complete.

**Meanwhile:** A0–A7 are built; none of them depends on this. A8 is the only
stage that does, and nothing in the client, README or help claims AAC support —
a test asserts it, so making the claim means deleting a test that says why not.

---

## 4. ANSWERED -- `evennia aetos discover` works, and needs nothing from Evennia

**Answered by D0, 2026-09-06.** The README's promise stands as written.

Evennia's launcher handles a fixed list of operations itself and passes
everything else to Django's management-command dispatch with the command line
intact. So a management command named `aetos` in an installed app *is*
`evennia aetos` — and Aetos is already an installed app, because it must be for
its templates and static files to load. No settings entry, no launcher patch, no
change upstream.

Proved with a probe command before anything was designed around it.

One trap recorded in `management/commands/aetos.py` for whoever reads the
launcher next: `run_custom_commands` is a real hook, but its docstring names
`CUSTOM_EVENNIA_LAUNCHER_COMMANDS` while its code reads
`EXTRA_LAUNCHER_COMMANDS`. Following the documentation gets you nothing, and it
fails silently. Not the route taken.

Nothing outstanding here. See `notes/d0-discovery-spike.md`.

---

## 6. ANSWERED -- the toggle switches modes, and masks rather than erases

**Gary, 2026-09-05:** *"lets make the default mode and the accessable mode a
toggle so we dont have to try to be everything to everybody"*.

Built as A10. Standard mode stops the governed accommodations applying;
accessible mode resumes them. Nothing is erased, so the way back is one keystroke
and it restores the interface you built.

Three options are deliberately never reverted, because their *off* state is the
accommodation: muting sound, turning gestures off, and orientation help.
See `notes/a10-two-modes.md`.

Nothing outstanding here.

---

## 5. Which track should I prioritise?  — ANSWERED

**Answered 2026-09-04:** proceed in roadmap order.

Addendum C then added the one hard ordering constraint: **E0 and E1 come before
M17**, because M17 builds the canonical log that display rules, announcements,
replay and diagnostics all sit on.

Working order from here:

```text
A2  Current State View + semantic values     <-- current
A3  Accessible map completion
E0  Event pipeline contract
E1  Capture + replay
M17 Rich chat + event history + Review Mode
...
D0  Discovery architecture spike             (independent; can move earlier on request)
```

The D-track remains movable. If getting the Easy Button working matters more
than finishing the accessibility retrofit, say so and I will take D0–D2 next —
it is the thing most likely to get other people using this, since today a
developer must write a Python class to show a health bar.
