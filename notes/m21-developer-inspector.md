# M21 -- Developer inspector

Status: **COMPLETE**

Verification: 973 Python tests OK (up from 940). axe clean on the panel.
Reported the lab's real configuration correctly on the first live run, which is
how the missing registry wiring surfaced.

Addendum C.18.

## Mostly assembly, and that is the point

Almost nothing here is new capability. E1 built capture and replay, E4 the
validator, E5 the diagnostic report. What was missing was a place to reach them
from.

The discovery that justifies the milestone: **capture and replay had no palette
entries at all.** Built at E1, tested, documented in the notes, and reachable
only as `Aetos.capture` from the browser console — which is to say, reachable by
their author. Writing the C.18 coverage test is what found it.

That is the same rule the palette was built on at M15 and the shortcut manager
enforces at A.23, arriving late at the developer surface: a feature nobody can
find is a feature that does not exist. It applies to developers too, and it is
easier to forget there because the author can always find it.

Added along the way: `Download capture`, which E1 never had either. A capture
that can only be read from the console is a capture nobody attaches to a bug
report, which was its entire purpose.

## The hard rule: not an object browser

> C.18: *"It MUST NOT become a general-purpose arbitrary server-object browser."*

So the inspector reads what the client **already has** — its own store, its own
registry, its own log. No query field, no dbref lookup, no path from a
developer's curiosity to a request the game did not expect.

The reasoning is not squeamishness about power. Aetos's whole security posture
is that it asks for nothing the game did not offer: every widget, provider and
action exists only because the game chose to expose it. An inspector that could
fetch arbitrary objects would be a privilege-escalation surface shipped to every
player, and would undo that guarantee rather than observe it.

A test enumerates the services the module may read and fails on any other, which
is a stronger statement than "does not currently call `fetch`".

The player's own data cannot appear either — notes, macros, tags and preferences
live in IndexedDB, not the store. Same "excluded by construction" property as
the diagnostic report (E5): there is no path, so there is nothing to filter.

## Saying what is missing, and why

The sections that matter most are the ones reporting an absence, because
"your game exposes none" and "Aetos cannot do that yet" send a developer to
completely different places:

- **Bindings** says *not implemented, planned for the D-track* rather than
  showing an empty list.
- **Providers** names the setting (`AETOS_DIAGNOSTICS = True`) instead of
  showing nothing.
- **Widgets** distinguishes loaded, offered and **withheld** — with what each
  withheld one needed. On the lab game that reads
  `equipment (needs equipment); effects (needs effects); target (needs target)`,
  which is the difference between "three widgets are broken" and "three widgets
  are waiting for your game to declare something". Those look identical from
  outside and this is the only line that tells them apart.
- **Connection** calls out a missing handshake as *the game may not have Aetos
  installed*, which is the actual first-hour failure.
- **Events** reports dropped events. A developer wondering why an old event is
  missing from a report has usually hit the 5000 cap rather than a bug.

## BUG: a defensive guard turned a crash into a silent wrong answer

The one worth recording.

The registry is built around line 1450; the inspector is created at line 1976. I
wired them with a setter called at 1550 — *before* the inspector exists.

`var` hoisting meant `inspector` was declared and `undefined` at that point, so:

```javascript
if (inspector && inspector.setRegistry) {
    inspector.setRegistry(registry);
}
```

...skipped silently. The panel reported `Registry: not available` forever, and
nothing errored.

Two things are worth separating here. The ordering mistake is the sixth in this
family and unremarkable — E5 recorded the same shape, and the validator very
nearly shipped with six `undefined` engines for the same reason.

The interesting part is that **my own defensive guard is what hid it.** Without
`if (inspector && ...)` this would have thrown a `TypeError` on the first load
and taken thirty seconds to fix. With it, the failure was quiet and I only
noticed because the panel said something faintly wrong in a live run I nearly
skipped.

A guard against a condition that should be impossible does not prevent that
condition. It prevents you finding out about it.

Fixed by removing the handover entirely: the inspector is created *after* the
registry is populated, so it is simply passed in. No setter, no ordering to get
wrong, and a test asserts the creation order rather than the wiring — because
the wiring is now unable to be wrong.

## Two lab hazards, both already documented, both hit again

- The mirror trap ([lab-hazard-002](lab-hazard-002-mirror-vs-worktree.md)) —
  caught immediately this time by running `node --check` with an explicit path.
- Template changes need `evennia reload`; static changes need `collectstatic`;
  and **the browser caches `aetos.js` under an unchanged `?v=1.0.0`**, so a
  fresh page load can still run old code. That last one cost ten minutes of
  chasing a bug that was already fixed. Worth adding to
  [lab-hazard-001](lab-hazard-001-test-suite-vs-live-server.md): during a
  session, `fetch(url, {cache: "reload"})` before reloading is the reliable way
  to be sure of what is running.

## The axe finding

`scrollable-region-focusable` on the state summary list — fourth instance in the
client, fourth caught by axe rather than by reading the code. Every section list
now carries `tabindex="0"` and is labelled with its section name, so tabbing
through nine of them says which is which.

No `role` on the `<ul>`, which would replace its list semantics and orphan every
row — A7 made exactly that mistake and this milestone did not repeat it.

## Accessibility -- definition of done (A.97)

- **Keyboard-findable / operable:** four palette commands (`Inspector`,
  `Capture this session`, `Download capture`, `Replay a capture`), all in the
  Help group.
- **Accessible name:** every section list is labelled with its section.
- **Announces?** Capture start and stop, and the two warnings below, all at
  `important`.
- **Steals focus?** No.
- **Colour alone?** No.
- **Semantic structure:** real `<h3>` headings per section, so a screen reader
  can jump between nine lists rather than reading them in sequence.
- **axe:** clean, and the panel is now in the QA suite — it is the densest
  surface in the client and the most likely to grow an unfocusable region.
- **Human AT testing:** at A8. The open question is whether nine sections in one
  dialog is navigable by heading or whether it wants to be a tabbed panel; I
  suspect headings are fine and tabs would be worse, but that is a guess.

## Two warnings that had to be at the right moment

Capture records what was said, and replay replaces the current session. Both are
stated where the action is taken rather than in documentation:

- *"Capturing. Game text is included, so review it before sharing."*
- *"Capture saved. It contains the game text from this session, so read it
  before sending it to anybody."*
- *"Replaying into this client — your own session state will be replaced by the
  capture's."*

A developer about to attach a capture to a public issue needs the first two
before they do it, not in a note they read afterwards.

## Not built here

No visual layout designer, despite the roadmap line reading "developer
inspector + visual designer". The layout editor already exists and is
keyboard-operable (M7); a second, mouse-driven designer would duplicate it while
being harder to make accessible, and A.57 would then require the keyboard path
anyway. Recorded rather than silently dropped — if a designer is wanted it
should extend M7's editor rather than compete with it.
