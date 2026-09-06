# A8 (part 1) -- the half that does not need people

Status: **AUTOMATED PORTION COMPLETE.** The human portion is unchanged and still
blocks the release.

Verification: 1249 Python tests OK (up from 1243). Twelve views scanned with
axe. Reflow measured at 320px across four text scales. Contrast validated for
every shipped theme.

## I had been treating the whole stage as blocked

A8's checklist has ten items and I had written all ten off as "needs people".
Six do. **Four do not**, and one of the four found a defect that had been in the
client since M4.

```text
axe across every major view       A.87    DONE -- 12 views, clean
keyboard-only, mouse unplugged    A.88    partial -- see below
400% zoom / 320px reflow          VIS-001 DONE -- one defect found and fixed
contrast and reduced motion       A.99    DONE -- both themes pass

NVDA, 35-task script              A.89    needs a person
JAWS, core task set               A.90    needs a person and a licence
Orca on Firefox and Chromium      A.91    needs a person and Linux
refreshable braille, real device  A.92    needs a person and hardware
cognitive scenario testing        A.93    needs people
AAC human review                  A.94    needs a person
```

Writing a stage off wholesale because part of it is blocked is its own failure,
and it cost four milestones.

## The defect: a row of controls off the side of a phone screen

At a 320px viewport the status bar measured **589px** and did not wrap. Its
contents — the connection indicator, the game name, Edit Layout, Help and the
Accessibility toggle — sat off the right-hand edge.

`body` carries `overflow-x: hidden`, so they were not merely off-screen:

- there was no scrollbar
- `window.scrollTo(500, 0)` left the page at 0
- **the controls were unreachable by pointer or touch entirely**
- tabbing to one put focus on something nobody could see

That is WCAG 1.4.10 (Reflow) and 2.4.11 (Focus Not Obscured), at default
settings, on the phone breakpoint M20 shipped. Among the unreachable controls was
the Accessibility toggle A9 had just added *so that people could find the
accessibility options*.

**How it survived.** M20's responsive work has `data-aetos-size="phone"` rules
for the workspace and the widgets and none for the header. axe passed every time,
because axe does not test reflow. And every axe run I have ever done was at the
browser pane's own width.

Fixed by letting the status bar wrap — unconditionally, not at a breakpoint.
Wrapping changes nothing when the row fits (verified at 1280px: still one 40px
line), and a media query would only be another width to be wrong about, which is
precisely what this cost.

## The check I wrote for it was wrong twice

Worth recording, because the measurement is the interesting part.

**First version: "is anything wider than the viewport?"** It passed. These
elements were each narrow and *positioned* outside the viewport. Two different
failures and I checked the wrong one — a check that would have shipped this
release.

**Second version: "is anything outside the viewport?"** It flagged nine more
controls — volume sliders and list buttons inside widget bodies with
`overflow-x: auto`, which scroll and are perfectly reachable. Overcorrected.

**The question is neither.** It is *off-screen with no ancestor that can be
scrolled to reach it*. That is what `browser-qa/qa-reflow.js` measures, and it
now reports zero at 320px across text scales 1.0, 1.5, 2.0 and 2.5.

There is a smaller finding underneath: on a phone the widget region scrolls
sideways, 775px of panels in a 308px viewport. That is within 1.4.10 — the *page*
does not scroll, a region does — but whether it is a good way to use a phone is a
judgement, and A.95 is explicit that "takes too many keystrokes" is a defect even
when every automated test passes. **Left for the human stage rather than
redesigned on my own.**

## axe across every major view

Twelve, not one. Every one clean at every severity:

```text
default            command palette    in-client help
privacy panel      themes             automation groups
diagnostics        picture/word board simplified layout
edit-layout mode   Review Mode        320px wide
```

Previously I had been running axe on the default view and reporting "axe clean"
for the client. That was true of the view I tested and an overstatement of what
it covered.

## Contrast (A.99)

Both shipped themes pass every pair in `REQUIRED_PAIRS` — eleven pairs covering
text, muted text, accents, status colours, borders and the focus ring, against
both the background and panel surfaces.

One thing checked because it would have been a real hole: the high-contrast theme
declares only 10 of the 16 tokens and inherits the rest, and the validator skips
pairs whose tokens it cannot see. The six inherited tokens turn out to be
spacing, fonts, radius and target size — **no colour pair goes unchecked**.
Verified against the merged token set rather than assumed.

Reduced motion was validated at M29, where a blanket M4 rule was found overriding
the player's explicit choice.

## Keyboard-only (A.88): partial, and honestly so

Structural facts verified: every control is a native element, the toggle is in
the natural tab order directly after Help, focus indicators resolve at 3px solid
with the double ring, and nothing has a positive `tabindex`.

What I could **not** do is drive the client keyboard-only end to end. Synthetic
key events from this browser harness do not reliably reach the page — several
attempts left focus unmoved, which is a tooling limit rather than a client one.
So "operable with the mouse unplugged" remains a claim I have reasoned about and
not demonstrated. It goes to the human stage with everything else.

## What still blocks the release

Unchanged, and none of it is code:

- **a refreshable braille tester on real hardware** (A.92, A.35 — an emulator
  does not substitute)
- **somebody who works with augmentative and alternative communication** (A.94)
- NVDA, JAWS and Orca passes by people who use them
- cognitive scenario testing with people

`docs/a8-tester-protocol.md` now holds the scripts and recording sheets, so that
when those people exist their time goes on judgement rather than on working out
what to try.

## Accessibility -- definition of done (A.97)

- **Keyboard-findable / operable:** the fix *restores* five controls that were
  unreachable on a phone.
- **Accessible name / announces / steals focus:** unchanged.
- **Colour alone?** No.
- **axe:** clean at every severity across twelve views.
- **Human AT testing:** still outstanding, and now the only thing outstanding.
