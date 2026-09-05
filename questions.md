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

## 2. Does voice (M33) ship before or after the upstream PR (M32)?

**Status:** genuinely undecided, and it now affects scheduling.

The blueprint orders M33 *after* M32, but the PR description in section 76 lists
voice control as part of what Aetos offers. Both cannot be true of the first
submission.

Two coherent answers:

- **Voice before the PR.** The submission matches its own description and voice
  is reviewed with everything else. Costs a later, larger first PR.
- **Voice as a follow-up.** Smaller PR, easier review. The PR description must
  then not claim voice.

This got sharper with Addendum A. Voice is a new **input mode**, and A8 is the
assistive-technology validation stage. Validating an interface at A8 that is
about to gain an entire new input mode means validating something short-lived.

**What I need:** a decision, ideally before A8.

**Meanwhile:** the roadmap records both readings and the new constraint. Nothing
downstream is blocked yet.

---

## 3. A8 needs two people I cannot supply

**Status:** hard dependency on the release, recorded rather than worked around.

Addendum A.85 and A.101 both say automated testing cannot substitute for these,
and I agree — nothing I can run replaces either.

- **A refreshable braille tester, on real hardware.** A.35 is explicit that an
  emulator or the NVDA Braille Viewer does not substitute. A.92 names Meris as
  the intended tester "if she remains willing" — is she?
- **Someone familiar with AAC / picture-supported communication**, to review the
  concept organisation and symbol assumptions before the project claims AAC
  support at all (A.94).

**What I need:** to know whether these people exist and are willing, because
A.100 means the project cannot claim braille or AAC compatibility without them —
and I would rather plan around their absence early than discover it at release.

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

## 4. Is `evennia aetos discover` actually achievable? *(D0 will answer this)*

**Status:** not blocking; flagged so it is not a surprise later.

Addendum B.34 asks for one canonical command. Evennia's launcher may not support
contrib-supplied subcommands, in which case the entry point becomes something
less tidy — a management command, or `evennia shell` plus an import.

I am not asking you to solve this; D0's whole job is to determine the cleanest
supported mechanism. I am flagging it because the README now shows
`evennia aetos discover` as the easy button, and if D0 finds it impossible, that
promise needs rewording rather than quietly dropping.

**Meanwhile:** the README marks the binding layer as *(planned, D-track)*, so it
does not claim the command works today.

---

## 6. Does the accessibility toggle hide the panel, or switch the features off?

**Status:** built under reading 1. Still worth your decision.

A9 is done and shipped as **the panel hides; nothing you chose changes**. Closing
it writes exactly one preference -- its own -- and says so on screen: *"Nothing
you chose was changed."*

I chose that reading because the other one can strand somebody: flick a switch
labelled "accessibility" to see what the standard interface looks like, then be
unable to read the screen well enough to find the switch again.

**If you want the sharper version** -- toggle off really means a plain standard
UI regardless of what was configured -- it is a small change, and it needs two
things with it: a confirmation naming what is about to switch off, and a
shortcut that works regardless of state so there is always a way back.

**What I need:** a yes to what shipped, or a "make it the other one".

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
