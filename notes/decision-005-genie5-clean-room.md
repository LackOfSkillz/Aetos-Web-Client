# Decision 005 -- Genie5 is a design reference, never a source

Date: 2026-09-04
Status: **Accepted** (Addendum C)

## Decision

Genie5 may be studied for **architectural lessons and behaviour patterns only**.
No Genie5 source code, fixture, asset, test corpus or implementation is copied
into Aetos, in whole or in part.

## Why this is a decision and not a footnote

**Genie5 is GPL-3.0. Aetos is BSD-3-Clause**, deliberately, so that it can be
upstreamed into Evennia -- which is itself BSD-3-Clause.

Those licences are not compatible in this direction. GPL-3.0 code carries a
copyleft obligation that would propagate to anything it is combined with, so a
single copied function would make the contrib unmergeable upstream and would put
every game that installed it in a position nobody intended.

This is not a hypothetical risk to be managed carefully. It is a hard boundary
where the failure mode is discovering the problem at PR review, after the design
has already been built around borrowed code.

## What that permits

Ideas are not copyrightable, and Genie5 has genuinely good ones worth learning
from:

- explicit ordering in the incoming event pipeline
- record and replay as a development workflow rather than a debugging luxury
- separation of canonical state from presentation
- a mapper that declines to guess when room identity is ambiguous
- rule grouping with master enable/disable
- non-destructive display transforms
- whole-corpus validation instead of waiting for runtime failure
- review-before-submit diagnostics
- versioned plugin contracts
- optional weighted pathfinding

Every one of those is a *shape*, and Aetos implements each from scratch against
its own protocol, its own accessibility architecture and its own privacy model.

## What that forbids

- Copying source, in any quantity, with or without modification.
- Copying test fixtures or corpora.
- Porting a file and renaming things.
- Consulting Genie5 source while writing the corresponding Aetos file.

The last one is the easy trap. Reading an implementation and then writing "the
same thing" from memory is how clean-room boundaries are lost in practice, so
the rule is that the reference is the *documented behaviour*, not the code that
produces it.

## What Aetos explicitly does not take

Recorded because it is as informative as the borrowing list. Genie5 solves
problems created by a fundamentally different client/server relationship:

```text
DragonRealms XML reconstruction
SGE authentication
client-owned canonical game mechanics
desktop password storage
native application updater
downloadable executable plugin marketplace
game-specific roundtime logic
game-specific movement recovery
skill inference
TTS as a substitute for semantic accessibility
```

Aetos sits on top of Evennia, which already holds authoritative structured
state. A traditional client has to *reconstruct* the game by parsing text;
Aetos receives it. Importing solutions to the reconstruction problem would mean
importing the problem.

The last item matters most for this project's direction: speech synthesis is not
accessibility. Semantic HTML that a screen reader, braille display or AAC
surface can each present in its own way is accessibility, and a client that
speaks at you instead is a client that has given up on the harder half.

## Relationship to the existing clean-room rule

This extends the rule already in force for DireEngine, Dragon's Ire, Maritime,
WorldBuilder and Area Forge. Those were excluded to keep Aetos genre-neutral and
independently born. Genie5 is excluded for that reason **and** for a licensing
one, which makes it the stricter case.

## Consequences

1. Any file implementing an Addendum C idea carries a comment naming the idea,
   not a citation to Genie5 code.
2. A reviewer asking "where did this come from" gets an answer about the
   architecture, which is the honest one.
3. If a future contributor proposes borrowing code, this decision is the
   reason to say no -- and the reason is legal, not stylistic.
