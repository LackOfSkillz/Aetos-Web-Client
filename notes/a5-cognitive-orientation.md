# A5 -- Cognitive and orientation layer

Status: **COMPLETE**

Verification: 741 Python tests OK (up from 688). axe clean on the default
workspace and on both new dialogs. Focus Mode, universal search, breadcrumbs,
walk-back and the once-per-visit reminder rule all exercised live.

Addendum A.36–A.51. Closes the A-track through A5; A7 (AAC and the simplified
workspace) is next on that track, after M18 and M19.

## What it is for

Everyone who was interrupted. Somebody who took a phone call, whose screen
reader talked over the game, who lost their place on a braille display, who has
an attention or memory condition, or who simply looked away for two minutes.

The game does not pause for any of them. Scrollback answers "what happened"; it
does not answer "where am I", and reconstructing the second from the first is
work — which is exactly the work the people who need this feature have least
capacity for.

## The rule the whole layer rests on

**A11Y-COG-002: no intention inference.**

Aetos will report that you sent `look at Renn`. It will never report that you
were investigating Renn.

This is not modesty. A client that guessed at intent would be confidently wrong
at precisely the moment somebody was relying on it to reorient, and a wrong
answer delivered with certainty costs the player the time to discover it was
wrong *plus* the trust they had in the feature. Someone using this because
their memory is unreliable is the last person who should be handed a plausible
fabrication.

Enforced by a test that reads the section titles out of `reorient()` and fails
on any that narrate.

## The trail follows outcomes, not intentions

A11Y-COG-003. Breadcrumbs come from authoritative room changes, never from
typed movement. A player who walks into a wall has not moved, and a trail built
from what they *tried* would lead somewhere they have never been.

Verified live: four commands, one of them into a wall, three breadcrumbs.

`walkBack()` reverses only steps whose inverse is unambiguous and stops at the
first that is not — `north` reverses to `south`, `enter the portal` reverses to
nothing anybody can be sure of. It moves by sending ordinary movement commands
through the ordinary queue, so a locked door ends the walk exactly where the
game ends it. Aetos is not authoritative about movement.

## Reminders are only ever created on request

A11Y-COG-005. Aetos never invents one, never notices you have not been
somewhere lately, and never builds a checklist out of your behaviour.

Two objectionable things at once, otherwise: inferring intent, and nagging —
which for somebody who reached for a memory aid is actively counterproductive.
Support means holding what you asked it to hold, not deciding what you ought to
be doing. A memory aid that edits itself is a memory aid you cannot trust.

A room reminder surfaces **once per visit**, and the mark clears when you
leave. A reminder that fires on every sync while you stand in a room stops
being a reminder and becomes an obstacle — and the player who most needs the
feature is the least able to tolerate that.

## Two comfort modes, not one

Focus Mode (A.47) hides everything except the game text and the input. Quiet
Mode (A.48) stops routine announcements.

They are separate because wanting a calmer screen and wanting fewer
interruptions are different needs, and somebody may want either without the
other.

Focus Mode uses `display: none`, not visual hiding. A panel that is merely
invisible is still in the tab order and still read aloud — which would make
Focus Mode a trap, removing the clutter for a sighted player while leaving it
in full for everyone else, plus a screenful of controls nobody could see to
explain.

Neither is ever set by the game. Both follow one preference the player owns.

## Universal search

A11Y-COG-006. The palette now searches notes, reminders and what has been said,
alongside its own commands.

The point is that somebody who half-remembers "that thing about the manifest"
should not have to work out *which panel* they wrote it in before they can look
for it. Reconstructing that is precisely the recall the feature exists to
replace.

Source results are scored *alongside* commands rather than appended after them:
appending would bury an exact title match under a command that happened to
match three scattered letters.

A history hit jumps in Review Mode rather than scrolling the console, so the
line is reachable even when a display rule has since hidden it (E2).

## BUG: a version bump that hangs the whole client

The serious find of this milestone, and it was luck that it surfaced here.

Adding the `reminders` namespace meant `DB_VERSION` 2 → 3. The tripwire test
from E2 caught the bump correctly. What no test caught — and what wedged the
lab for half an hour — is the *other* half of the hazard:

**IndexedDB will not run an upgrade while any connection is still open on the
old version.** Aetos never listened for `versionchange`, so a player with the
client open in two tabs who reloads one after a release that added a namespace
gets a tab whose open never completes. Every local read then hangs forever: no
notes, no macros, no aliases, no error and no message. It is indistinguishable
from the client having lost their data.

`onblocked` was already handled, and is not enough on its own — that rescues
the tab doing the upgrading, while the tab holding the old connection is what
has to yield.

Fixed with one handler:

```javascript
db.onversionchange = function () {
    db.close();
};
```

The blocked fallback now also flags itself, and the privacy panel distinguishes
three cases rather than two: storing normally, blocked by another tab, and
refused by the browser. Both of the last two land on the memory backend, but
they have completely different fixes — "close the other tab and reload" versus
"you are in private browsing" — and a player told the wrong one goes looking in
the wrong place.

## Bugs found and fixed on the way

**Speech ran together.** The reorientation summary joined a section's lines
with a space, so it spoke as *"You recently sent west look at renn east
north"* — a single unparseable phrase. Punctuation is what makes a spoken list
a list; every screen reader pauses on it. Now semicolons within a section and
full stops between them, with the dialog using the same joiner so the two
cannot drift.

**The shortcut and the palette did different things.** Ctrl+Shift+W spoke the
summary; the palette entry spoke it *and* showed it. A sighted player pressing
the shortcut saw nothing happen at all. Both now call one function.

**Focus Mode matched nothing.** The CSS selected `.aetos-root[data-aetos-focus]`,
but the accessibility layer writes its preference attributes to
`document.documentElement` — the same place `data-aetos-quiet`,
`data-aetos-contrast` and `data-aetos-motion` land. It looked right and did
nothing. Caught only by checking `getComputedStyle` in the browser rather than
trusting the rule.

**`scrollable-region-focusable` in the history widget.** Pre-existing, not from
A5, found because the axe run picks up the whole page. Third instance of this
defect in the client and the third caught by axe rather than by anyone reading
the code: arrow keys scroll whatever has focus, so a scrolling region outside
the tab order cannot be scrolled by keyboard at all. Invisible to anyone
testing with a mouse wheel.

## Two test defects, both mine

**Seventh instance of the prose-match mistake.** `assertNotIn("reminders", ...)`
against `diagnostics.js` — where "reminders" appears in the user-facing
`excludes` list, the sentence promising the report does *not* contain them. The
test failed the file for documenting itself. Anchored on accesses now, per the
M17 rule.

**Two tests asserted facts about the deployment.** `test_all_features_default_to_off`
read the ambient `AETOS_FEATURES`, and `test_app_label_does_not_collide` compared
against the live app registry. Both therefore passed only in a game dir that had
*not* installed Aetos — so both failed in the lab, which is exactly the
configuration a maintainer is most likely to have. Now pinned with
`override_settings` and by excluding Aetos's own config from the comparison.

## Accessibility -- definition of done (A.97)

- **Keyboard-findable / operable:** six palette commands across an Orientation
  group and a Comfort group; one shortcut, Ctrl+Shift+W, which names its
  palette command.
- **Accessible name:** every reminder row's Delete button is labelled with the
  item's text — "Delete" repeated down a list is indistinguishable when tabbed
  through out of context.
- **Announces?** The summary at `important`, so it is heard in Quiet Mode:
  somebody who asked where they are has asked a direct question, and quiet is
  about unsolicited interruption rather than refusing to answer.
- **Steals focus?** No.
- **Colour alone?** No. Done state is `aria-pressed`, not a strikethrough.
- **Semantic structure:** the summary uses real `<h3>` headings, so a screen
  reader can jump between sections — which is the whole point of the panel for
  the person most likely to open it.
- **axe:** clean, both dialogs and the default workspace.
- **Human AT testing:** at A8. The open question is whether "Walk back" is
  genuinely usable without sight — it reports how many steps it will take, but
  a player cannot see where it stopped without asking again. My suspicion is
  that it should announce each room as it arrives, and that is a question for a
  tester rather than for me.

## Not built here

`Ctrl+Shift+W` is the only new global binding. The A.50 requirement that help
stay in one place regardless of workspace was already true and is already
guarded, so nothing was needed for it.
