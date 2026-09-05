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

**Meanwhile:** A0–A7 proceed normally; none of them depends on this. A8 is the
only stage that does.

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

## 5. Which track should I prioritise?

**Status:** I am proceeding in roadmap order. Say the word if that is wrong.

There are now three tracks, and they are independent:

- **A-track** (accessibility) — A0 done, A1 done, A2 next.
- **D-track** (developer integration) — D0 next. This is the one that most
  changes who *can* use Aetos, since today a game developer must write a Python
  class to show a health bar.
- **M-track** (features) — M17 next.

My default is to keep going down the A-track, because Addendum A made it the
gate for everything else and half of it is retrofit work that gets more
expensive the more widgets exist.

But if you want the easy button working sooner — it is the thing most likely to
get other people using this — say so and I will take D0–D2 next instead.
