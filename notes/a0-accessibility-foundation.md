# A0 -- Accessibility Foundation

Status: **COMPLETE**

Verification: 467 Python tests OK (up from 409). axe-core 4.13 clean on six
views: default workspace, help overlay, command palette, privacy dialog, edit
layout, and high-contrast + minimal-stimulation. Zero serious or critical
violations.

First stage of the A-track. Blocks M17, and did.

## What was built

Four managers under `static/aetos/js/accessibility/`, loaded before everything
else because every module after them may announce, trap focus or register a
shortcut -- and one that loads late is one the rest of the client silently did
without.

```
preferences.js   granular schema, local-only, boot mirror + canonical store
announcer.js     priorities, categories, polite + urgent regions
focus.js         save/restore stack, trap, no-theft guard
shortcuts.js     register / view / rebind / disable / restore, conflict table
accessibility.js composition, and preferences applied to the document
```

Plus the semantic shell -- skip links, `<nav>`, `<aside>`, an urgent region --
and `accessibility.css`.

## The decision that shaped the rest: shortcuts leave their modules

`palette.js`, `help.js` and `workspaces.js` each bound their own global key.
Every one of those bindings is now registered with `AetosShortcutManager`
instead.

The reason is A.23: a key a module binds for itself cannot be listed, rebound or
disabled. That is fine until it collides with something on a particular player's
machine, at which point they have no recourse at all -- and the collision is
invisible to whoever added the binding.

Two rules are now enforced rather than encouraged:

**A bare character is refused, not discouraged.** `register` throws. NVDA and
JAWS use single letters for structural navigation -- `h` for headings, `b` for
buttons, `l` for lists -- so binding `i` to Inventory does not add a shortcut,
it takes a letter away from someone's ability to move around the page. Shift
does not rescue it either, because shifted letters are reverse navigation.

**Registration requires naming the palette command it accelerates.** Also
throws. A feature reachable only by keystroke does not exist for anyone who does
not already know the keystroke. Verified live: disabling `palette.toggle` kills
the key and leaves the palette perfectly reachable.

## One announcer, because a player has one pair of ears

Thirty widgets with their own `aria-live` do not produce thirty conversations.
They produce one conversation with thirty interruptions, arbitrated by render
order. So there are exactly two live regions in the whole client and widgets may
not create more -- guarded by a test that sweeps every module and permits
`aria-live` only when it is being set to `"off"`.

Only `critical` reaches the urgent region, and only connection and session
failure are critical. A channel that interrupts constantly stops being an
interruption, and then the one message that genuinely needed to interrupt is the
one that gets ignored.

Combat is **off** by default and resources announce on thresholds only. "Health
61, health 60, health 59" is not information; it is noise with a number in it.

## Preferences are not a switch

There is no "accessibility mode". Semantic HTML, keyboard operation and focus
management are unconditional and are not represented in the preferences schema
at all -- a game developer cannot turn them off, and neither can a player,
because they were never optional (A11Y-BASE-001).

What varies between people is how much the client says out loud, how much it
moves, and how much it helps with orientation. That is what the schema holds.

**An explicit motion choice overrides the system setting in both directions.** A
player may want motion their operating system is suppressing, and overriding
them "for their own good" is the same paternalism pointed the other way.

**Two stores, on purpose.** The canonical copy lives in the `preferences`
namespace so the privacy panel counts it and export carries it. A mirror lives
in the boot channel, because reading motion and contrast settings only after the
database opens means a player who asked for no motion sees motion first -- which
is exactly the harm the setting exists to prevent.

## Aetos has no screen-reader detection, deliberately

Nothing probes for NVDA, JAWS, Orca, braille hardware or AAC use, and a test
asserts the absence of every such probe. Detection is fingerprinting, and a
player must never have to disclose a disability to a MUD operator in order to
play (A.73). Nothing in the subsystem can reach the transport at all.

## TWO REAL DEFECTS FOUND BY AXE

Both invisible to anyone testing with a mouse. This is the whole argument for
the automated gate.

**`scrollable-region-focusable` on the help article.** The article pane scrolls,
and I had given it `tabindex="-1"` so that choosing a topic could move focus
there programmatically. That satisfies the screen-reader requirement and fails
the keyboard one: arrow keys scroll whatever has focus, and `-1` keeps an
element out of the tab order, so a keyboard user could see there was more text
and had no way to reach it. Fixed to `tabindex="0"`, which serves both.

**The same defect in the privacy panel list**, which caps at `40vh` and scrolls.

**And then a third defect, in my own fix for the second.** I added
`role="group"` to the `<ul>` to give the focusable region a name. That stripped
the implicit `list` role and orphaned all fifteen `<li>` children -- axe caught
it immediately as `listitem`, serious. A list carries an accessible name
perfectly well *as a list*; `aria-label` alone was the correct fix.

Worth keeping: an accessibility fix is as capable of introducing an
accessibility defect as any other change. The gate caught mine within a minute.

## Lab hazard: static files went stale mid-session

The `listitem` fix appeared not to work. The source on disk was correct and the
collected copy under `server/.static` was not -- `evennia reload` had not
re-collected it after I copied axe-core in manually. `evennia collectstatic
--noinput` fixed it.

Worth remembering: when a browser-verified change appears to have no effect,
check the collected copy before doubting the change.

## Test-harness defects I corrected (product was right)

- A rebind check reported the old key still working. My harness dispatched
  Escape on `document` while the palette's Escape handler is on its input field,
  so the palette never closed between steps. Re-tested against `isOpen()` and
  every case passed.
- `test_the_sync_path_never_focuses` looked for `function applySync` in
  `aetos.js`; it lives in `store.js`. Rewritten to sweep every server-driven
  module, which is the stronger property.
- A focus sweep flagged `layout.js`. That call is keyboard layout editing moving
  focus *with* the panel it just moved -- a direct response to a keystroke, and
  correct. The test now asserts it stays confined to the explicit `focus(id)`
  entry point rather than banning it.
- The high-contrast test matched the comment explaining *why* `filter: contrast`
  is wrong. CSS comments are now stripped before asserting on declarations --
  the same defect this project hit in the palette QA.

## Not in A0, and deliberately

Burst aggregation (A.16) and Review Mode (A.17) need the categorised log store,
which is M17. The priority and category vocabulary ships now anyway, so every
call site is already passing the information those stages will need --
retrofitting a category argument onto a hundred call sites later is exactly the
churn a foundation exists to prevent. `beginReview` / `endReview` exist and hold
and summarise; what they lack is a log store to page through.

## Carried forward

- `announcer.announce(message)` still accepts a bare string. Call sites gain
  categories as each milestone revisits its own widget, rather than A0 touching
  a hundred of them at once.
- The focus guard reports rather than prevents, and is only armed when a
  violation handler is supplied. Wiring it into QA is A1's business.
