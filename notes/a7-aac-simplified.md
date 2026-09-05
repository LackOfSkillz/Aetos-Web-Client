# A7 -- AAC architecture and the simplified workspace

Status: **COMPLETE** (architecture), **BLOCKED on human review** (the claim)

Verification: 885 Python tests OK (up from 830). axe clean on the board with a
sentence in the strip. Concept model, sentence strip, symbol provider,
simplified layout and the licence refusal all exercised live.

Addendum A.51, A.59–A.69. Gate: **A.94, unmet.**

## What was built, and what was not

An AAC **architecture**: a concept model, a symbol provider seam, a picture
board, a sentence strip, a text preview and a simplified layout.

**Not reviewed AAC support**, and nothing in the client, the README, the help or
the changelog says otherwise. A.94 requires somebody familiar with
picture-supported communication to review the concept organisation, the symbol
assumptions, the terminology and the cognitive load first, and adds: *do not
claim AAC expertise solely from standards compliance.*

A test asserts the source still says so, which means making the claim requires
deleting a test that explains why it should not be made. `questions.md` §3 now
lists the five specific judgements a reviewer would be asked for.

The distinction is not pedantry. Standards compliance is checkable and I checked
it; whether sixty words in eight categories is a usable board for somebody who
communicates this way is not checkable by me at all, and asserting it would be
claiming a competence I do not have on behalf of people who would bear the cost.

## Four things, kept separate (A.60)

```text
concept    what is meant              help
label      what is on the key         "Help"
text       what it says in a sentence "help"
symbol     what is drawn              from a pack, usually nothing
command    what is sent               say ...
```

`text` was not in the original design and the live test is why. Joining the
labels produced:

```text
say I Want Help
```

That is what every message somebody sent would have looked like in public chat.
Looking like that is not a neutral cost for a player already using a board to be
heard, and it took thirty seconds of actually using the thing to see.

Lower-casing is a mechanical transformation rather than an inference -- A.69
forbids guessing what somebody *means*, not knowing that a key cap is not
speech. Where lower-casing would be wrong, the text is declared: `"I"` is the
only one in this set, and an English rule about one pronoun is exactly the kind
of thing to write down rather than encode as cleverness.

## No invented identifiers (A.60)

`waiAdaptConcept` is `null` on every concept, and a test asserts the word
appears exactly once in the whole file -- in the definition, never overridden.

A W3C AAC Registry identifier is a *claim* that this concept is that published
concept. Aetos cannot verify one, and a plausible-looking invented ID would be
worse than none: it propagates into other tools as though it had been checked.

The `adapt-symbol` attribute (A.61) is emitted only when a non-null id exists,
so today it emits nothing at all. It is there so a pack or game supplying
verified ids gets it for free -- and so nobody later adds invented ids in order
to make the attribute appear.

## No bundled artwork (A.63)

**The first version of this note gave the wrong reason, and Gary caught it.** I
wrote that the sets AAC users know are all restrictively licensed. That is not
true, and it took one screenshot of a search result to show it.

What is actually the case, checked against the sources rather than remembered:

| Set | Licence | Bundleable? |
| --- | --- | --- |
| ARASAAC | CC BY-NC-SA | **No** — NonCommercial. Aetos is BSD-3 and games may charge. |
| Mulberry | CC BY-SA 4.0 | **Yes**, legally. Its own docs permit commercial use. |
| Global Symbols / Open Symbols | mixed, per set | Aggregators; nothing uniform to verify. |

So for Mulberry, licensing was never the obstacle. **Coverage is**, and this is
the part I would not have found without going and looking: Mulberry has 3,436
symbols whose largest categories are country flags (254), country maps (188) and
professions (164). It has no symbol for `yes`, `no`, `stop`, `please`,
`thank you`, `sorry` or `friend` — the entire Common category, the words that
must never be more than one press away.

It is a vocabulary set built to supplement a core board for adults, not to be
one. Bundling it would produce a board where the six most urgent words are the
only ones *without* a picture, which is worse than a board with none: the
inconsistency is itself something to decode, and it is worst exactly where
hesitation costs most.

ARASAAC does cover that vocabulary, and is the one Aetos may not ship. That is
not coincidence — a complete pictographic system is the kind of work whose
authors reasonably attach conditions.

**So the answer is an importer, not a bundle**, which is the line A.63 already
drew: mappings may be bundled, imagery requires licensing review. Aetos ships a
verified Mulberry mapping (33 concepts, every one checked against the set's own
index and then against the repository), a `build_symbol_pack.py` that fetches
the artwork and inlines it, and a panel that tells a player which words a pack
cannot illustrate *before* they rely on it.

The correction is kept in the source rather than quietly replaced, and a test
asserts it stays. The wrong reason produced the right decision, and that is
precisely how a bad assumption survives long enough to be repeated somewhere it
matters.

The provider still starts empty and every key falls back to its word. That is a
real limitation, stated plainly in the help rather than papered over. The
alternative -- drawing generic icons and calling them AAC symbols -- would be
worse: an AAC user knows a *specific* set, and an unfamiliar picture is not a
hint, it is noise on top of the word.

Packs are also checked for whether they are **self-contained**. A pack of remote
URLs tells whoever hosts them, every time the board renders, that this browser is
showing a communication board — a disclosure about disability, made silently, to
a third party the player never chose to tell. `build_symbol_pack.py` inlines
images as `data:` URIs for that reason as much as for offline use, and the panel
says which kind is installed.

A pack **must** state its licence or registration is refused. Defaulting to
"unknown" would let an unattributable pack spread anyway, with the question
quietly settled in the worst direction.

And a missing symbol returns `null`, never a substitute (A.62). This one is
specific to AAC rather than general tidiness: a symbol *is* the word for
somebody using one, so a near-miss is a different word, and the player has no
way to know it happened -- they would simply have said something they did not
mean.

## Keyboard operable is the requirement, not a feature (A.66)

Drag-and-drop is **not implemented at all**. A.66 permits it as an addition and
forbids requiring it; the population most likely to use a communication board
includes people for whom dragging is difficult or impossible, and building the
pointer version first is reliably how a keyboard path ends up as an afterthought
nobody tests. A test asserts no drag handlers exist.

The strip comes before the board in the DOM. Reading order matters more than
visual order here: the sentence being built is the thing to check, and putting
sixty keys ahead of it means tabbing past all of them to reach what you just
said.

Each per-word control names its word -- "Move left: want" -- because "left"
repeated five times down a strip is indistinguishable when tabbed through, and
this is the surface where picking the wrong one means saying something you did
not mean.

## The preview is the point (A.67)

Not a confirmation dialog. Without it, a mapping that meant something slightly
different from what the player expected would be said in public, under their
name, without them seeing it. That is the specific harm the subsystem exists to
prevent.

Send, **Edit text**, Cancel. Edit text matters as much as the other two: the
player is the authority on what they meant, and a board is a keyboard, not a
translator.

If no dialog is available, nothing is sent -- send nothing rather than send
unseen. And a failed send keeps the sentence, because clearing it would throw
away something that took a minute to build.

## The simplified workspace removes nothing (A.51)

Four panels: people, map, character, Talk. The console is always in `main`
regardless of layout, and help is an overlay that stays in one place whatever
the workspace (A.50) -- so two of the six A.51 names are present by construction
rather than by being added.

Verified live: all sixteen widgets stay registered and all fifty-seven palette
commands stay available.

A "simple mode" that quietly removed functionality would be making a decision
about what somebody is capable of on the basis of them having asked for a calmer
screen. Those are not the same request, and conflating them is the specific
condescension A.51's "this is not an inferior client" exists to forbid.

It also places only what the game has. A map panel on a game with no map is one
permanently empty box, which is worse than three panels and is precisely the
confusion the layout removes.

## The axe finding: a label that was silently ignored

`aria-label` on the word grid, which was a plain `<div>`. Prohibited -- and
worse, **silently ignored**: the grid was simply unlabelled, and axe reported it
only as *incomplete* rather than as a violation, so a normal pass would not have
flagged it.

Fixed with `role="group"`, which is right for buttons in a container. The same
role on a `<ul>` would orphan its list items, which this client has got wrong
twice already -- so the strip keeps its list semantics and takes `aria-label`
without a role, and both cases now have tests.

Worth noting the general shape: an "incomplete" is axe saying it could not
determine the answer. Usually that is a contrast check behind an overlay and
genuinely not actionable. Here it was a real defect hiding in the category the
QA suite deliberately does not fail on.

## Two test defects, ninth of a kind

`assertNotIn("label", ...)` against the pack registrar -- where the block
necessarily *explains* that it does not touch the label. Ninth instance of
failing a file for documenting itself; the M17 rule applies unchanged.

And `assertIn("data:image/", ...)` against a regex literal, where the source
reads `data:image\/`. My search string did not account for the escaping.

## LAB HAZARD: the mirror trap, twice in one session

Recorded in `notes/lab-hazard-002-mirror-vs-worktree.md`. Roughly forty minutes
lost across M18 and A7 to editing `contrib/aetos_webclient/` (the generated
mirror) instead of the Evennia work tree, because a `cd` in an earlier command
had moved the working directory.

## Accessibility -- definition of done (A.97)

- **Keyboard-findable / operable:** "Simplified layout" in Layout; "Clear my
  sentence" and "Preview and send my sentence" in Comfort. Every board and strip
  control is a button.
- **Accessible name:** every strip control names its word; the grid is a labelled
  group; keys carry their word as text.
- **Announces?** The word and the resulting sentence on every change -- what
  matters is what the sentence now says, not that a button was pressed.
- **Steals focus?** No.
- **Colour alone?** No. The active category is `aria-pressed`.
- **Target size:** 44x44 minimum on keys. A.57 asks for that "wherever
  practical", and this is the surface where it matters most: a mis-tap here does
  not waste a click, it says the wrong word.
- **axe:** clean, with a sentence in the strip.
- **Human AT testing:** **required and outstanding.** This is the one stage where
  that is not a note for A8 but a condition on the feature being described as
  working at all.

## Not built here

No word prediction, no phrase suggestions, no rewriting of game prose into
symbols (A.69). Not deferred -- forbidden, and rightly. A system that speaks for
somebody has to be one they can predict completely; anything else is putting
words in their mouth, which is the harm AAC exists to prevent.

No custom concepts yet. The "Mine" category exists and is empty. Letting a
player add their own words is clearly wanted, and it is also the point where
somebody's own vocabulary starts living in the client -- which needs the same
privacy treatment as notes, and is better designed alongside an AAC reviewer
than ahead of one.
