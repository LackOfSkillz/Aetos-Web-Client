# A17 — applying the research to the accessibility screens

Status: **COMPLETE**

Verification: 1606 Python tests OK, 386 accessibility checks OK, `black` and
`isort --profile black` clean.

Gary, with two screenshots of the client at 175% text, focus mode on and
announcements set to "As little as possible":

> *"this is what our accessibility screens look like now. I want you to apply
> what you have learned from our research and lets really make this accessible,
> within great ui/ux practices"*

Five changes, four of them from things measured rather than assumed.

## The settings no longer take the whole screen

At 175% text the options filled about seventy per cent of the viewport and the
console was a three-line sliver — which defeats the reason the panel is inline at
all. A9's argument still holds: somebody adjusting contrast or text size should
be able to watch the game text change while they do it, and a modal covering the
thing you are adjusting *for* is a worse design. But it was pushing rather than
sharing.

Bounded to half the viewport, scrolling its own overflow. Measured after: 52% of
the viewport, and the console back to 331px.

**And a scrollable panel is now focusable**, which a fitting one is not.
`tabindex="0"` on a scroll container buys native arrow-key, Page Up and Page Down
scrolling with no key handler, and the panel is already a labelled
`role="region"` so focusing it announces what it is. Only while it overflows —
Heydon Pickering's rule from *Data Tables*, where a tab stop that does nothing is
a 2.4.3 Focus Order failure.

At 175% eleven settings genuinely do not fit on one screen. That is what reflow
means; the fix is making the overflow operable, not pretending it is not there.

## The frame hugs the column it contains

A12 capped `.aetos-console` and `.aetos-composer` at 80ch. That bounded the
reading line correctly and looked wrong doing it: the frame is
`.aetos-widget--console`, so the border went on spanning the whole window while
the text sat in a column in the middle of it — a ribbon of words in a very large
empty box, with the Send button stranded well short of the edge it appears to
belong to.

The cap moved to the frame. Measured: a 1285px frame around a 1283px console.

## A specificity bug that was invisible at ordinary text sizes

The console still looked badly off-centre after that — 398px of dead space on the
left, 68px on the right.

Focus mode hides the side regions **and** collapses the workspace grid to one
column. The collapse rule was `[data-aetos-focus-mode="true"] .aetos-workspace`,
specificity (0,2,0), against `.aetos-root[data-aetos-size="tablet"]
.aetos-workspace` at (0,3,0) — which won.

So focus mode collapsed the grid only at sizes with no responsive template of
their own. Because the breakpoints are measured in text, **a 1600px window at
175% computes as "tablet"**: the tablet template restored a `--aetos-column`
sidebar track, focus mode dutifully hid the region *inside* it, and what was left
was a dead 339px column.

```text
before   main region x=339, frame 398 → 1532   (left gap 398, right gap 68)
after    main region x=10,  frame 233 → 1367   (left gap 233, right gap 233)
```

**My first attempt at this fix was itself wrong** and worth recording: it scoped
the selector through `.aetos-root[data-aetos-focus-mode]`, but the attribute is
set on `document.documentElement`. That selector matched nothing and changed
nothing — and the only reason I knew is that I re-measured instead of reading the
diff back.

## Accessible names composed from visible text

Tiles carried `aria-label="Text size, 175%"`. They now carry
`aria-labelledby` pointing at the two spans that are already on screen. Two
reasons, both Heydon's and both previously ignored here:

- **`aria-label` is not translated.** Machine translation works on text nodes and
  skips the attribute, so a player reading the client in another language would
  meet an English accessible name on every tile.
- **Parity.** A label assembled from ids cannot drift from what is on screen,
  which matters most for voice control, where somebody says what they *see*.

Verified against Chrome's own accessibility tree: `"Text size 175%"`.

The summary chips lost their `aria-label` entirely. It read "Change Contrast,
currently High contrast" — more words for the same information, untranslated, and
a parity break rather than an addition. The visible text already names the
setting and its value, and the element is a button, which is exactly the
affordance a sighted person infers from the way it is drawn.

## The "In use" strip stands down while the panel is open

The panel lists every one of those settings and its value a few pixels below.
Leaving the strip up duplicated the whole thing — twice the reading for somebody
going through it with a screen reader, and a row of the panel's own space spent
repeating what the panel says. It exists to answer "what is on" *without* opening
anything.

## Considered and deliberately not done

**Heydon's 2024 `<aside aria-label="Notifications">` wrapper**, which makes a
live region re-readable as a landmark. Genuinely tempting — our announcements
vanish. But ours are either game text, which is already in the console, or
feedback about a change the player just made and can see the result of. A
landmark containing only visually-hidden duplicated text is what his own 2025
*Accessible Rickrolling* piece warns against, and the announcer would need to
keep a list it does not currently keep. Recorded rather than built.

**Moving the mode switch from `role="switch"` to `aria-pressed`.** Current
testing (Adrian Roselli) shows switch support is still patchy in VoiceOver/iOS
and NVDA/Firefox, and Heydon's conclusion that `aria-pressed` is safer still
stands. But where `switch` is unsupported it degrades to "button, checked", which
is informative rather than wrong, and A10's reasoning — a screen reader should say
the *state* rather than the *act* — was verified against real NVDA. Left alone,
and the caveat is recorded.

**The bigger question the research raises**, which is not a code change:
Heydon's December 2024 principles say *"If an interface offers the option to
enable accessibility, it is inaccessible."* That is aimed at something shaped
exactly like our mode switch. Our defence is real — the baseline is unconditional
and the mode governs only the optional layer — but it deserves an answer rather
than a dismissal before a reviewer raises it.
