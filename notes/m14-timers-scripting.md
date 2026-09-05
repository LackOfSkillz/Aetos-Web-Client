# M14 -- Timers and Aetos scripting

Status: **COMPLETE** (engine and sandbox; editor UI deferred with M15)

Verification: 313 Python tests OK; 286 browser QA checks OK
(47 scripting/timers, 22 responsive, 36 aliases/triggers, 27 macros/queue,
33 local data, 24 context menu, 22 resources, 38 layout, 35 storage).

## Aetos Script is an interpreter, not a sandbox around eval

Blueprint section 33 forbids evaluating arbitrary JavaScript. `scripting.js` is
therefore a real tokenizer, parser and tree-walking interpreter for a language
that cannot express anything dangerous.

**Why not `eval`, `Function`, or a Worker:**

- `eval` and `new Function` hand the script the whole JavaScript runtime. Every
  such sandbox broken in the wild was broken by a reference leaking through --
  a constructor, a prototype, an error object. Auditing for that is a losing
  game because the attacker only needs one route nobody enumerated.
- A Web Worker isolates the DOM but still grants `fetch`, `WebSocket` and
  `importScripts` -- exactly the network reach section 33 forbids.

An interpreter can only do what it implements. That inverts the burden: instead
of enumerating what to block, the language simply has no way to say it.

## The strongest guarantees are absent features, not blocklists

There is no property access, no indexing, and no function definition **in the
grammar**. `window.document` is not "blocked" -- it cannot be tokenised, because
`.` is not punctuation the tokenizer recognises. `a[0]` likewise.

`Function("return 1")()` is rejected as a *syntax error*, not a failed name
lookup, because the grammar has no "call the result of a call" form. That is a
stronger guarantee than the name being absent, and the QA now says so.

Identifiers that merely look dangerous -- `window`, `document`, `globalThis` --
are inert: they are just unset variables, because the language has no global
scope to reach into.

The only callable things are functions the host injects. A host object returned
from one is stringified, so it cannot enter script space as a reference.

## What a script can do

```
send("north")            queue an ordinary command
echo("text")             write to the player's own console
resource("health")       read a resource, 0..1 when bounded
room() / target()        current room and target names
get(key) / set(key, v)   the script's own variables
```

`send` goes through the shared command queue, so a script inherits the same
caps, ordering and stop-on-failure as macros and routes. `echo` reaches only the
player's own console -- if it sent a command instead, a script author would be
broadcasting their debugging to the room.

## Bounded, because there is no halting oracle

Steps, loop iterations, call depth, string length, wall-clock time and source
length are all capped. Wall clock matters separately from steps: a script can be
slow without being long, and the browser must stay responsive either way.

Exceeding a bound stops the script with an explanation. A runaway returns a
*report* rather than throwing, because a script stopping is a normal event the
player should be told about, not an exception the client has to survive.

Division by zero is an error rather than `Infinity` -- a NaN quietly propagating
through a player's automation is worse than stopping.

Syntax errors name the line. An error the player cannot locate is barely better
than none.

## Timers are off by default

Unlike a macro, a timer acts without the player at the keyboard, which is close
enough to unattended play that many games forbid it. `automation.timers` defaults
to **false** and a game must opt in.

A running timer notices policy being withdrawn mid-session: a game can reload its
settings, and a timer that kept firing afterwards would be automation the game
had explicitly refused.

Intervals are clamped rather than rejected -- a player asking for 10ms wants "as
fast as allowed", not an error -- while the floor keeps a game from being
hammered because someone typed a zero too few.

A one-shot timer removes itself after firing, so a stale entry cannot accumulate
and look like it is still pending.

## Deferred

- Script and timer editor UIs, with the alias and trigger editors from M13.
  All four engines are complete, validated and tested; only the forms are
  missing, and they belong together on the settings surface M15 introduces.
- The visual automation editor (section 34) builds on those forms.
