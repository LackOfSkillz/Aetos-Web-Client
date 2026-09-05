# E5 -- Diagnostic reporting

Status: **COMPLETE**

Verification: 688 Python tests OK (up from 667). Leak test run live against six
sentinel values: **zero leaks**.

Completes the E-track through E5. Only E6 (mapper metadata and widget SDK
hardening) remains, and it is scheduled with M22/M23.

## What it is for

The alternative is a maintainer asking twelve questions -- which browser, which
Evennia, which providers, was the manifest right, what was the last thing that
happened -- and a reporter answering them one at a time over three days.

Or, worse, the reporter pasting their whole console. Which is how private
conversations end up in public issue trackers.

## The leak test

Seeded a note, an alias, a tell and an accessibility preference, then built a
report and searched it for all six:

```text
SECRET-NOTE-TEXT          absent
SECRET-ALIAS-EXPANSION    absent
SECRET-TELL-CONTENT       absent
announceCombat            absent
screenReader              absent
password                  absent
```

And what it *did* contain:

```text
recentEventTypes: { other: 1, room: 1, tell: 1 }
```

The shape of what was happening, without a word of its content. That is the
whole design in one field: "12 combat, 3 tell" tells a maintainer what they need;
the text of the tells tells them something that is none of their business.

## Excluded by construction, not by filtering

The report is assembled from a fixed list of sources -- store, canonical log,
navigator, registry -- and **none of them is the local data store**. There is no
path by which a note reaches a report, so there is nothing to filter.

A test asserts the module never reads `settings.notes`, `settings.macros`,
`settings.preferences` and the rest.

## Accessibility preferences are excluded deliberately

A.73 and A.74. A report saying `screenReader: true` would disclose a disability
to whoever reads the issue, and **nobody should have to choose between reporting
a bug and keeping that to themselves.**

If a report *is* about an accessibility feature, the reporter can say so in
their own words -- which is a decision they get to make, rather than one the
tool makes for them.

The one adjacent thing that *is* included is `prefersReducedMotion`, because it
is a rendering fact rather than a statement about the person: every visitor has
one of two values and it says nothing about them.

## Provider names are opt-in

C.17 permits provider class names, and they are genuinely useful -- half of
"why is my health bar empty" is answered by seeing which class is in the slot.

But they are the *game's* internals, so the game decides: `AETOS_DIAGNOSTICS =
True`. Off by default. When on it carries class names and slot names only, never
a value and never source.

When off, the report says so rather than showing an empty section -- an empty
section reads as a bug in Aetos rather than a setting in the game.

A provider that cannot even describe itself is reported rather than swallowed,
since that is precisely the situation a diagnostic exists to explain.

## Nothing is sent

Built locally, shown in full, and the module makes no requests of any kind --
asserted for `fetch`, `XMLHttpRequest`, `sendBeacon`, `WebSocket` and the
dispatcher.

`issueUrl()` returns a URL and does **not** open it. A tool that filed an issue
on somebody's behalf, with a payload they had not read, would be indefensible
however convenient.

The report is shown in a read-only `<textarea>` rather than a `<pre>`:
selectable, scrollable, keyboard-reachable and copyable with the keys everybody
already knows, without Aetos reimplementing any of that.

## BUG: the closure trap again

I passed `widgets: []` and `modules: []` at creation, then assigned
`diagnostics.widgets = [...]` later once the registry existed.

That does nothing. The module had already captured the empty arrays, and every
report would have listed zero widgets -- while looking entirely healthy.

Fixed by passing **accessors** and resolving them at report time. The module
accepts either a list or a function, so the caller can supply whichever it has.

Fifth instance of this family, and the first where the fix was structural rather
than positional: moving the creation later would not have helped, because the
registry is built inside a branch. An accessor is the right answer whenever the
value does not exist yet.

## Test defect corrected -- sixth of a kind

`test_it_never_reads_accessibility_preferences` searched the raw file for
"preferences" and "screenReader". Both appear in the header comment explaining
why they are excluded, and in the `excludes` list that is **shown to the
player** saying the report does not contain them.

So the test failed the file for documenting itself. Again.

That is now six instances, and the M17 rule applies cleanly: strip comments,
strip user-facing strings, and anchor on something that cannot appear in prose
-- here `settings.preferences` and `preferences.value`, which are accesses
rather than words.

## Accessibility -- definition of done (A.97)

- **Keyboard-findable / operable:** palette command; the report is a labelled
  read-only textarea; every action is a button.
- **Accessible name:** the textarea has a visually hidden label, because an
  unlabelled textarea is announced as "edit, blank".
- **Announces?** Once, on copy -- and honestly reports failure, since
  `execCommand("copy")` is refused in some contexts and silently doing nothing
  would leave the player believing they had copied it.
- **Steals focus?** No.
- **Colour alone?** No text in the dialog relies on colour.
- **Discloses accessibility information?** **No** -- this is the milestone where
  that question mattered most, and the answer is enforced by a test.
- **axe:** clean.
- **Human AT testing:** yes, at A8. The open question is whether a JSON blob in
  a textarea is genuinely reviewable by somebody using a screen reader, or
  whether the summary above it is doing all the real work. My suspicion is the
  latter, which would make the summary the thing to invest in.
