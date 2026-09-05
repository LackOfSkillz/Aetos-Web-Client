# M15 -- Command palette, automation editors, privacy panel

Status: **COMPLETE**

Verification: 334 Python tests OK; 326 browser QA checks OK
(38 palette/settings, 47 scripting/timers, 22 responsive, 36 aliases/triggers,
27 macros/queue, 33 local data, 24 context menu, 22 resources, 38 layout,
35 storage).

Clears the UI work deferred from M5, M7, M12, M13 and M14.

## The palette acts on the client, never the game

Ctrl+K (Cmd+K on a Mac) opens a searchable list of things **Aetos** can do.

That boundary is deliberate. Most palettes in other software run arbitrary
things, but the player already has a command line for the game -- a second one
that looked similar and behaved differently would be a trap. Guarded by a test
asserting `palette.js` never touches the transport.

Bound with capture at the document, so it works while focus is in the game
input, which is where a player's hands actually are.

## No editor for automation the game forbids

Section 32 says that if scripting is disabled, no scripting editor appears. Not
a disabled button, not a form that refuses on save -- **absent**.

Verified live against the lab game, which permits macros/aliases/triggers but
forbids timers and scripting: the palette offers 11 of 14 registered commands,
with `script.new` and `timer.new` simply not present.

A command whose condition throws is hidden rather than fatal, so one bad
condition cannot empty the palette.

## The palette is the discoverability surface

A keyboard shortcut nobody can find is not a feature. Commands carry their
shortcut and display it, so Ctrl+Shift+L for Edit Layout becomes learnable
rather than something you had to read the docs to know.

## Matching is subsequence, not substring

"elay" finds "Edit layout". A player half-remembers a name and types fragments
of it; requiring a contiguous substring would fail the exact case a palette
exists to serve. Contiguous matches still rank first, and description matches
are weighted at half.

That weighting produced a QA failure worth keeping: searching "layout" returns
"Export profile", because its description mentions layouts. My test assumed only
labels could match. The behaviour is right -- the test was wrong, and now
asserts that every result matches *somewhere* while label matches rank first.

## Accessibility: the combobox pattern

Focus stays in the input throughout and `aria-activedescendant` moves the
selection, so a screen reader announces each option as the player arrows through
it without ever losing the field they are typing in.

Options are chosen on `mousedown`, not `click`: a click would blur the input
first and close the palette before the choice registered.

## Privacy panel reports reality

Counts are read from storage rather than assumed. A privacy screen that
under-reports is worse than none, because it is actively reassuring about
something it has not checked.

It also states whether storage is persistent at all -- in private browsing
nothing survives the session, and saying so is more honest than listing counts
that will vanish.

Clearing confirms with specifics: how many items, that it cannot be undone, that
the game account is unaffected, and that nothing belonging to other software is
touched. "Are you sure?" without specifics is not informed consent.

Import reports what it refused as well as what landed, because an import that
silently drops half a file is worse than one that says so.

## Editors for every engine

Aliases, triggers, timers and scripts now have forms, alongside the macro and
note editors from M12 and M11. An engine with no editor is a feature only
reachable from a browser console, which is not a feature a player has.

Two carry warnings rather than assuming knowledge: the script editor states what
the sandbox can and cannot reach, and the timer editor notes that timers run
unattended and the game may have rules about that -- better than a player
finding out from a moderator.

## BUG FOUND AND FIXED -- the same ordering fault as the hotbar

`window.Aetos` was built before the palette block ran, so it captured
`undefined` and `Aetos.palette` was null with no error. Identical in shape to
the M12 hotbar bug.

Both are now guarded by tests asserting definition order. Worth noting the
pattern: in a long `boot()`, anything exported must be defined above the export,
and a plain value capture gives no warning when it is not.

## Also fixed

Overlays are appended to `<body>`, outside `.aetos-root`, so they did not
inherit the client's font -- the palette and dialogs rendered in the browser's
default serif, visibly not part of the client.
