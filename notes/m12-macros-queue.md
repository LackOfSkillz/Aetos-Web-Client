# M12 -- Hotbars, five-command macros and the command queue

Status: **COMPLETE**

Verification: 258 Python tests OK; 181 browser QA checks OK
(27 macros/queue, 33 local data, 24 context menu, 22 resources, 38 layout,
35 storage).

## What exists

- `queue.js` -- `AetosCommandQueue`, the single path for every chained sequence.
- `macros.js` -- macro storage, execution, and the hotbar widget.
- Macro editor dialog, reusing the accessible modal from M11.
- `browser-qa/qa-macros-queue.js` -- 27 checks.

## One queue, as section 28 requires

Click-to-walk (M9) had its own walker with its own timer. It has been **moved
onto the shared queue** and the old walker deleted.

That matters more than tidiness. Each of the queue's safety properties -- order,
length caps, stop-on-failure, pause-on-disconnect, no interleaving -- is the kind
of thing that gets re-derived slightly differently in a second implementation and
then forgotten in a third. One queue means one place to be correct.

Route-stop was re-verified after the refactor: walking `down, nowhere, north`
moved one room, halted with "Route stopped: could not go nowhere.", and never
sent the third command.

## Safety properties, each with a reason

| Property | Why |
|---|---|
| Order preserved | obvious, but easy to lose with async sends |
| Length capped (100 queued, 5 per macro) | a runaway sequence must not spam a game |
| Failed step stops the rest | continuing after a failure is how a player walks into a room they never chose |
| Disconnect pauses, does not discard | the sequence may still be wanted |
| Reconnect does **not** auto-resume | section 60 forbids dumping accumulated commands without an explicit policy |
| New sequence replaces, never interleaves | two at once produces an order neither caller intended |

Failure detection is **structural**, not text matching: the caller supplies a
`verify` with `snapshot()` and `check()`. Routes check whether the room id
changed. Parsing failure messages would be fragile and English-only.

## The five-command limit is enforced, not documented

Section 27 sets five as a hard cap. It is applied **on save**, which means an
over-long macro cannot be smuggled in by editing an exported profile and
importing it -- the import path and the editor path both go through the same
normalisation.

## Macros are the player's; permission is the game's

Macro definitions are browser-local like all personal data. Whether macros may
run at all is the game's decision, declared in `manifest.automation.macros`
(section 32).

When a game sets `macros: false`:
- the hotbar widget hides itself entirely rather than showing disabled buttons
- `macros.run()` refuses and says so

Refusing **audibly** matters: a button that silently does nothing reads as a
broken client, whereas "This game does not allow macros" is information.

Absent policy defaults to allowed, matching the documented default and avoiding a
hotbar that flickers away while the handshake completes.

## Still no authority

A five-command macro is five ordinary commands sent through the ordinary
dispatcher. Tested that every emitted command is plain text. A macro can no more
bypass a lock, cooldown or permission than typing the same five lines by hand.

## Accessibility

The hotbar is a `role="toolbar"` with an accessible name, so assistive technology
announces the buttons as a related group rather than as unrelated controls. Each
button's accessible name states **what it will do** -- "Recover: stand, look" --
so a screen-reader user knows before pressing rather than after.

Per-macro confirmation is opt-in. A player who put "drop all" on a button may
want a second chance; one who put "north" does not want to be asked every time.

## BUG FOUND AND FIXED -- hotbar never registered

The queue and macros were created *after* the widget registration block, so
`macros` was still undefined when the hotbar tried to register. The widget simply
never appeared, with no error.

Moved the block above registration. The block only depends on hoisted function
declarations and on store/storage/announcer, all of which exist earlier, so the
move is safe -- and now guarded by a test asserting the queue is defined before
the hotbar registers.

## Deferred

- Keyboard shortcuts bound to macros (the `shortcut` field is stored and
  normalised; binding it belongs with the M15 command palette, which owns the
  keyboard map).
- Inter-command delay in the editor UI (the queue honours a per-macro `delay`;
  only the editor field is missing).
- Drag-reordering the hotbar (the `order` field exists; reordering is an M6-style
  layout operation and needs the keyboard equivalent designed with it).
