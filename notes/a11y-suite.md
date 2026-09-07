# The accessibility suite — `npm run a11y`

Status: **COMPLETE**

Verification: 160 checks, 0 failures, across 8 checks and up to 16 views each.

Gary, on being told what the A8 readiness pass had and had not covered:

> *"what can we do to test our accessibility options before we send them to a
> person to test? there has to be a way to run a full set of tests"*

There was not, and that was the actual problem.

## The real failure was not coverage, it was that nothing could be run

Four gates existed — axe, reflow, responsive, and the new A8 readiness walk —
and **every one of them was driven by hand**: paste a script into a page, read
JSON back out. `browser-qa/` had Node and exactly one dependency.

That is why axe spent its entire life measuring one viewport and came back clean
every time. Not carelessness: a gate that is awkward to run gets run once, in
whatever window happened to be open. UI1 found a serious violation the moment
somebody re-ran it 480 pixels narrower.

So the first half of this is not new tests at all. It is one command.

```text
cd browser-qa && npm run a11y
```

Nothing here ships. `browser-qa/` is development-only and is not a dependency of
the contrib — a game installing Aetos needs no Node, no npm and no Playwright.

## The matrix, and why it is a matrix

Three axes, none of which substitutes for another:

- **viewport** — how much room there is
- **text scale** — how much of it one line uses. Since UI1 the breakpoints are
  measured in text rather than pixels, so a large scale is a *genuinely
  different layout*, not a zoomed picture of the same one
- **mode** — standard masks the governed accommodations, accessible applies
  them. Two interfaces, and A10's whole point is that neither is a compromise
  for the other

Not the full cross product every time: four viewports × three scales × two modes
is twenty-four views, and a full axe sweep takes most of a minute each. **A suite
nobody runs because it takes twenty minutes is worth less than a smaller one that
runs.** So each check declares the axis it is actually sensitive to and gets the
views that matter to it.

## What is new, beyond making the old gates runnable

| Check | What it catches that nothing else did |
|---|---|
| `tree` | The accessibility tree **Chrome computes**, not our approximation of it |
| `keyboard` | Reaching *and operating* everything without a pointer, in every view |
| `announce` | What the client writes to its live regions — our half of what a screen reader says |
| `forcedColors` | Windows High Contrast, where author colours are discarded |
| `reflow` | WCAG 1.4.10 **as written**: 320 CSS px, no two-dimensional scrolling |
| `focus` | Focus not moving unless somebody moved it |

### The accessibility tree, rather than our idea of it

Every name check in this project — including the readiness gate's — computed
accessible names with a hand-rolled function: `aria-labelledby`, then
`aria-label`, then a `<label for>`, then `title`, then text. That approximation
is right for the easy cases, and the easy cases are not where naming goes wrong.
It knows nothing about `aria-labelledby` pointing at a hidden element, a `<label>`
that wraps rather than references, or text removed from the tree by an ancestor's
`aria-hidden`.

Chrome computes the real thing and the DevTools Protocol will hand it over. That
removes a whole layer of *our idea of the name* from between the test and the
truth.

### A claim from A10, finally measured

`notes/a10-two-modes.md` said of the mode switch:

> *"Under Windows High Contrast, where background and border colours are
> discarded, the position is what is left."*

A good argument about a rendering mode nobody had ever put the client into —
which is precisely the shape of the four things A10 itself found that "read as a
guarantee and did nothing".

**Measured: the thumb moves 16px with author colours discarded**, `aria-checked`
survives in the tree, and focus is still shown by an outline (which forced
colours keep) rather than by a border colour (which it does not). The argument
was right. It is no longer only an argument.

### A screen reader's sentences, without a screen reader

Every announcement in the client goes through the announcer into one of two live
regions. Watching those is watching what a screen reader would say — completely
deterministically, with no screen reader involved.

It does not replace NVDA and does not pretend to: it cannot tell whether a
sentence arrives at a useful moment or is exhausting after an hour. What it
replaces is **our half** — did the right sentence get written, once, into the
right region. Three failures it looks for, all of them ours rather than the
reader's:

- the same thing announced twice, because two code paths both said it
- gameplay reaching the *urgent* region, which interrupts mid-sentence and which
  the announcer's own header says never happens
- an announcement fired by a **reconnect**, so every dropped connection replays
  old news — the worst thing this client could do to somebody listening to it

## Four of my own bugs, and why they are in the record

The suite's first full run reported 36 failures. **Every one was the test being
wrong**, and each was worth the finding:

1. **CSP blocked every injection.** Playwright's `addScriptTag({ path })` inlines
   the file, and the client's `script-src 'self'` refuses inline script. The
   obvious fix is to launch Chrome with the policy disabled — and that would be
   testing a different client, one whose defining security property has been
   turned off for the tests' convenience. Instead the file is served *from the
   page's own origin* through a route, so `'self'` is satisfied honestly and the
   policy is exercised rather than bypassed.
2. **A keyboard trap that was not there.** The walk listened for `focusin`, and
   the accessibility panel re-renders on some interactions — an element replaced
   while focused fires `focusin` again for what looks like the same control.
   Reading `document.activeElement` after each press cannot be fooled that way.
   The same lesson as measuring the rendered button rather than the stylesheet.
3. **Four skip links with no id and one shared class** made every one of them
   look like the same element, so the walk reported a trap on the second Tab —
   in some views and not others, depending on where focus started. An
   intermittent false trap is worse than none: it is the kind of result people
   re-run until it passes. Identity now includes the text.
4. **The wrong element measured, in the one claim that mattered.**
   `control.querySelector("*")` is the switch's text label, not its thumb. The
   label does not move, so the check reported that the switch had no visible
   state in high contrast — a serious-sounding failure in exactly the claim A10
   had never verified, produced entirely by measuring the wrong thing.

Number 4 is the one to remember. **A test that is wrong in the direction of
alarm is not harmless.** Had I written the note before re-checking, this would
have recorded a defect in the client that does not exist.

And one leak in the announce check: `capture()` installed a fresh
`MutationObserver` on every call and never disconnected the previous ones, so by
the second view every message was recorded twice — and the check reported *the
client announcing twice*. A test accusing the code of precisely its own mistake
is the worst kind there is.

## What this still cannot do

Named at the bottom of every run, so a clean result cannot be mistaken for a
pass:

> This suite cannot tell you whether any of it is bearable to use.
> That is `docs/a8-tester-protocol.md`, and it needs a person.

A0 shipped a scrolling region a keyboard user could not scroll with every
automated check passing. Nothing here answers "how many keystrokes was that",
"did focus jump", "does braille keep its place", or "would you play a game in
this".

## Next: a real screen reader

[Guidepup](https://www.guidepup.dev/) drives actual NVDA on Windows from
Playwright and captures its speech output, which would convert *"what does your
screen reader announce?"* from a human question into an assertion — most of
protocol §1. Gary has approved the NVDA install; it is the obvious next check and
it is not built here.
