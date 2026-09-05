# M13 -- Aliases and triggers

Status: **COMPLETE** (engines and safety; editor UIs deferred with M15)

Verification: 273 Python tests OK; 217 browser QA checks OK
(36 aliases/triggers, 27 macros/queue, 33 local data, 24 context menu,
22 resources, 38 layout, 35 storage).

## What exists

- `aliases.js` -- expansion with positional arguments, depth bound and cycle
  detection.
- `triggers.js` -- text and structured triggers, cooldowns, global rate limit,
  runaway disabling.
- Both wired into the shell and gated by the game's automation policy.
- `browser-qa/qa-aliases-triggers.js` -- 36 checks.

## Aliases expand only what the player TYPES

Not macro commands, not menu actions, not map routes, not trigger commands.

The reason is concrete: if aliases expanded macro commands, redefining an alias
would silently change what a saved macro does -- a macro the player wrote months
ago and has not thought about since. It would also compound with the recursion
limit in ways nobody could reason about.

Verified end to end through the real input element: typing `l2` sent `look`,
while a macro containing `l2` sent `l2` unchanged.

## BUG FOUND AND FIXED -- `$*` repeated the first argument

`tell $1 $*` applied to `tt Bob hello there` produced **"tell Bob Bob hello
there"**, because `$*` meant "all arguments" rather than "the arguments not
already consumed".

That is the single most common alias shape there is -- a `tell` shorthand -- and
it would have mangled every message. `$*` now takes arguments from after the
highest numbered placeholder used.

## BUG FOUND AND FIXED -- a trigger never fired on its first match

`lastFired[id] || 0` conflates "never fired" with "fired at time zero", so a
trigger's very first match was judged against a cooldown it had not had a chance
to serve.

A real `Date.now()` hides this, because the number is large. An injected clock
starting near zero exposed it immediately -- and the logic was simply wrong
regardless of which clock it runs against.

## Alias recursion: bounded two ways, because one is not enough

A player who defines `a -> b` and later `b -> a` has built an infinite loop
without noticing, since each definition is reasonable alone.

- A **depth limit** stops long chains.
- A **cycle check** stops short loops immediately *and reports which alias is at
  fault*, rather than grinding through ten pointless expansions on every use and
  never explaining why.

Cycle detection is by alias identity, not by comparing output text: `a -> b a`
produces different text each pass while still looping forever.

## Trigger loops: three defences

A trigger sends commands in response to game output; commands produce output.
That is a feedback loop with the player's account on one end (section 62).

1. **Per-trigger cooldown** -- a trigger cannot fire on its own echo.
2. **Global rate limit** -- catches what a cooldown cannot, such as two triggers
   firing each other.
3. **Disable on runaway** -- a trigger tripping the global limit is disabled and
   the player is told. Silently throttling it forever would leave them wondering
   why their client feels broken; "check it for a loop" is actionable.

Order matters: the cheap per-trigger cooldown is checked first, so ordinary
repeated matches do not consume the global budget that exists to catch loops.

## Structured triggers are edge-triggered

They fire when a condition *becomes* true, not while it stays true. A health
trigger must not fire once per sync for as long as the player is hurt.

`resources.health` resolves to a **fraction** when the resource is bounded, so a
player can write "below 20%" without knowing whether the game counts health to
100 or to 3000.

## Text triggers match plain text, not markup

Evennia renders colour to HTML server-side. Matching against that would make a
pattern depend on colour codes the player never sees, so a trigger would
mysteriously stop working when a game recoloured a message.

## Regex is validated at save time

An invalid pattern fails once, when saved, with the engine's own message -- not
by throwing on every line of game output for the rest of the session.

## Deferred

- Alias and trigger editor UIs. The engines, storage and validation are complete
  and tested; only the forms are missing, and they belong with the M15 settings
  and command-palette work that owns that surface.
- Trigger actions other than commands (echo, notify) -- these arrive with M18's
  audio cues, which is what most of them would drive.
