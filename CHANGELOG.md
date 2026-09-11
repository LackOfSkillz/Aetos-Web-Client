# Changelog

All notable changes to the Aetos Web Client.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project has not yet cut a release; everything below is unreleased work
towards `0.1.0`, recorded by milestone so the reasoning stays attached to the
change. Each milestone has a fuller record in [`notes/`](notes/).

---

## [Unreleased]

### Added — discovery reads live characters properly, and explains itself (D3)

`evennia aetos discover` now does what Addendum B asks of its runtime and
structural passes.

- **`--character #12` reads one representative** a developer chooses (B.20);
  `--typeclass` samples a typeclass *and its subclasses*. D0 matched the exact
  path, so a game whose characters use a subclass read nobody.
- **Every suggestion is `HIGH`, `MEDIUM` or `LOW`** and says what was found,
  where, why, and what accepting it would put on screen (B.28, B.33). `LOW` is
  printed commented out, so pasting the block unchanged activates only what
  discovery could justify.
- **Credentials are never read, printed or suggested** (B.46). The decision is
  made on the attribute's name, before its value is loaded.
- **Pairing works for games that are not fantasy** (B.65): `hull_integrity` /
  `hull_capacity`, `oxygen` / `oxygen_capacity`, `max_hp`, and by structure alone
  when two readings support it.
- **A structural pass** reads the Character typeclass, its `AttributeProperty`
  fields, and the game's own commands as candidate actions. A game's own
  *handler* produces advice to write a provider, never a binding (B.66).
- **Fixed:** D0 filed every kind under `resources`, so a text attribute became a
  bar that never draws. Numbers, flags and game objects now go to the slot that
  can use them.
- **Fixed:** under a management command Evennia's flat API was not initialised,
  a game's command set failed to import, and Evennia silently substituted an
  empty one, so discovery reported no commands. It now initialises Evennia the
  way the launcher does, and reports a substituted error set out loud.

See [`notes/d3-runtime-discovery.md`](notes/d3-runtime-discovery.md).

### Changed — the accessibility screens, against the research (A17)

Gary, with screenshots of the client at 175% text: *"apply what you have learned
from our research and lets really make this accessible, within great ui/ux
practices."*

- **The settings no longer take the whole screen.** At 175% they filled about
  seventy per cent of the viewport and left the console a three-line sliver —
  which defeats the reason the panel is inline rather than a dialog. Bounded to
  half the viewport, scrolling its own overflow, and **focusable only while it
  overflows**: `tabindex="0"` on a scroll container buys arrow-key and Page
  Up/Down scrolling for free, and a tab stop that does nothing is a 2.4.3 Focus
  Order failure.
- **The console frame hugs the column it contains.** The 80ch cap was on the
  contents while the border spanned the whole window, leaving a ribbon of text in
  a large empty box with the Send button stranded short of the edge.
- **A specificity bug, invisible at ordinary text sizes.** Focus mode's grid
  collapse was `[data-aetos-focus-mode="true"] .aetos-workspace` (0,2,0) against
  `.aetos-root[data-aetos-size="tablet"] .aetos-workspace` (0,3,0), so it only
  worked at sizes with no responsive template. Breakpoints are measured in text,
  so a 1600px window at 175% is "tablet" — the tablet template restored a sidebar
  track, focus mode hid the region *inside* it, and a dead 339px column was left.
  Main region moved from x=339 to x=10; the frame is now centred with 233px
  either side.
- **Accessible names are composed from visible text.** Tiles use
  `aria-labelledby` pointing at the two spans already on screen rather than an
  `aria-label` string: `aria-label` is skipped by machine translation, and a name
  assembled from ids cannot drift from what a voice-control user reads aloud.
  Verified against Chrome's accessibility tree.
- **The summary chips lost their `aria-label`** — "Change Contrast, currently
  High contrast" was more words for the same information and a parity break — and
  **the strip stands down while the panel is open**, since the panel lists every
  one of those settings a few pixels below.

See [`notes/a17-applying-the-research.md`](notes/a17-applying-the-research.md),
which also records what was considered and deliberately not done.

### Fixed — a backgrounded tab no longer announces into a screen reader (A16)

A MUD sits in a background tab for hours, and the live region kept firing while it
did — so a screen reader reading somebody's email was interrupted by a room
description from a game they were not currently playing.

Both live regions now take `role="none"` / `aria-live="off"` while
`document.hidden`, and are restored on return. From Heydon Pickering's
*Notifications* article, which notes that some screen reader and browser pairings
already do this themselves, but "you can't rely on all your users having these
setups and — where they don't — the experience is very off-putting."

- **The original attributes are captured, not assumed.** The two regions are not
  symmetrical: polite is `role="status" aria-live="polite"`, urgent is
  `role="alert"` with no `aria-live` at all. A hardcoded restore would have given
  the urgent region an attribute it never had.
- **Nothing is queued.** Replaying on return would read twenty minutes of combat
  to somebody who just came back. The console holds the transcript regardless.
- **Speech is deliberately not silenced.** Somebody using Aetos's own read-aloud
  has very likely backgrounded the tab *in order to listen*.
- **The regions come back empty.** Messages arriving while hidden are still
  written, so without clearing, the region returned holding a stale line that
  could be announced out of nowhere on restore. Found by measuring the first
  version of the fix.

See [`notes/a16-a-backgrounded-tab-does-not-talk.md`](notes/a16-a-backgrounded-tab-does-not-talk.md).

### Added — the client reads the game aloud (A15)

Gary, after the announcer was wired up: *"ok I have the reading turned on but it
doesnt read out loud"* — and, asked whether a screen reader was running: *"No — I
turned the option on in Aetos and expected it to speak."*

**The client was behaving exactly as designed, and the design was wrong.** Every
accessibility decision here assumed "announce" means "hand it to assistive
technology", so Aetos wrote to an ARIA live region and left the speaking to a
screen reader. Correct for somebody running NVDA; silence for everybody else. The
setting's own label — *"what is spoken aloud"* — promised speech the client never
produced.

That assumption is wrong about the population. The people who want text read to
them are far more numerous than the people running a screen reader: dyslexia, low
vision that never involved setting up assistive technology, tired eyes at the end
of a session, or simply wanting to listen. Telling all of them to install NVDA is
not an accessibility answer.

`speech.js` uses `window.speechSynthesis` — part of the platform at the published
floor. No dependency, no CDN, nothing downloaded and nothing sent anywhere; the
voices are the ones the machine already has.

- **A renderer, not a second channel.** The hook sits inside the announcer's
  `write()`, where the decision to say something has already been made. Category,
  priority, per-category preferences, quiet mode, review mode and burst
  aggregation stay upstream, and `speech.js` mentions none of them.
- **Off by default**, and it must stay so: a client that starts talking is
  alarming, and for a screen reader user it is two voices over the same text.
  Aetos cannot detect a screen reader and **must never try** — that is
  fingerprinting, and A.72 forbids it — so the overlap is handled by saying so in
  the control's description.
- **A gesture arms it**, because browsers refuse audio until the player has
  interacted; pending requests are discarded rather than queued, or a queue would
  empty in one burst on the first click.
- **Turning it off stops it mid-sentence.** Speech that cannot be stopped is worse
  than no speech.

New `speech` check (**375 → 380**): silent when off, speaks when on, markup
stripped, the chosen rate used, and stopping works.

This is the fourth defect in a row that every automated gate called correct and
no person could use — after A0's scrolling region, A13's slider and A14's
announcements. Gary found all four by using the client.

See [`notes/a15-reading-the-game-aloud.md`](notes/a15-reading-the-game-aloud.md).

### Fixed — game output was never announced at all (A14)

Gary: *"when I turn screen reader on and then go back to the game and type look
nothing is read to me."*

**No game output had ever been announced.** Not room descriptions, not tells, not
anything the server sent.

Every piece existed. The pipeline has had an `announce` stage since E0. The
announcer has had categories, per-category preferences, priorities, flood control
and review mode since A0. `screenReader.announceRoom` has defaulted to `true`
throughout. Both live regions are in the template. The console is deliberately
`aria-live="off"`, because `role="log"`'s implicit polite region would speak every
line including combat spam.

The only observer of the `announce` stage was **the capture recorder**. The stage
ran, handed each event to a debugging tool, and stopped. The announcer was never
given anything to decide about, and the console was told not to speak.

Fixed with wiring and no new policy — category, priority, per-category
preferences, quiet mode, review mode and burst aggregation stay the announcer's
job. Verified with a realistic `look`: the full room description reaches the
polite region as plain text, with the markup stripped.

**Why five gates missed it, which is the part worth keeping.** The browser
suite's `announce` check ingested five lines of game text and asserted only that
none reached the *urgent* region. That was true — because none reached anywhere.

> A negative assertion is satisfied by nothing happening at all.

The Python tests failed the same way more quietly: `TestOutputIsNotALiveRegion`
asserted the console is not a live region, an announcer region exists, and widgets
can reach it. All true, each one end of a wire that was never joined. Nobody
asserted that game output arrives at it. axe checks names, roles and states — all
correct. NVDA could not have caught it either: Guidepup captures speech produced
by its own navigation commands, not spontaneous live-region updates.

Every gate measured the machinery; none measured the outcome. The rule this earns:
**any "X must not happen" assertion needs a positive one beside it saying the
thing under test happened at all.**

`checks/announce.js` gained that positive assertion (**371 → 373 checks**), and
`test_capture_replay.py`'s announce-stage test now asserts what it always meant —
capture is registered *last* — which was only testable once a second observer
existed.

See [`notes/a14-game-output-was-never-announced.md`](notes/a14-game-output-was-never-announced.md).

### Fixed — the text-size slider could not be dragged (A13)

Gary: *"I try to slide it smoothly back and forth but the slider redraws every
time... for every increment I have to reclick the slider and move in one click,
wait one click wait."*

Every `input` event wrote a preference, every write notified subscribers, and the
panel's subscriber calls `render()`, which begins `host.textContent = ""`. The
slider **destroyed the element being dragged** on the first pixel of movement.

Measured with the fix reverted, across one twelve-step drag: **2 distinct values**
(against 12), the value moving **backwards** from 1.0 to 0.9, and focus lost to
the document. It went backwards because a rebuilt slider registers the pointer as
a fresh click at the gesture's origin.

**No automated gate could see this.** axe found a correctly named, correctly
roled, correctly valued `<input type="range">`. The keyboard walk operated it,
because arrow keys do not care whether an element survives a pointer gesture. The
accessibility tree was right. NVDA read it correctly. Every check passed a control
that could not be used with a mouse — the same shape as A0's scrolling region, and
the second time this project has met it.

The panel no longer repaints for writes it made itself. The subscription stays,
because Settings, the palette and the shortcuts write the same preferences; the
flag is lowered in a `finally`, because a stuck one would leave the panel
permanently blind to outside changes.

### Changed — the panel is tiles you drill into (A13)

Gary: *"I liked the tiles and then opening a box for that specific setting so if
you are visually impaired, its easy to see choices and drill down into those
choices."*

- **A hub of tiles**, each carrying its setting's name *and current value* —
  "Text size / 150%". The value is what turns a settings screen into an answer to
  "what is on", and the accessible name carries both halves.
- **A detail screen per setting**, with every choice visible at once as a native
  radio group. A `<select>` shows one option at a time in small text and hides the
  rest — the wrong control for somebody who drilled in *because* small text is
  hard. Radios keep A0's native-control rule: arrow-key operable and announced as
  "2 of 4" with no ARIA.
- **Three ways back**, where there had been none: out of a setting (the button is
  first in the DOM, so Tab reaches it first), back to the starting points (which
  changes no settings), and out of the panel (which returns to the hub).
- **Steppers beside the slider**, so the one setting somebody may need before they
  can see anything else does not require a drag.

### Added — what is in use, with the panel closed (A13)

Gary: *"once options are selected I dont see them on the main screen."*

A strip under the status bar, only when there is something to say. Each item opens
that setting. In standard mode it lists **only what is still applying**, which is
the genuinely confusing case: somebody who switched back and kept their text size
should see that their text size is still theirs and their contrast is not.

Three further defects the work turned up: the strip was **outside every landmark**
(axe's `region` rule caught it, and only at 250% text — the one view where a
setting is off-default and the strip is on screen); `:has()` would have shipped
against a Chrome 87 floor because **the compatibility gate only knows the features
listed in its own table**; and a tile carried a comment claiming a 24px floor it
did not declare.

New `dragging` check — the first here to ask whether a gesture destroys its own
target. **368 → 371 checks**, 0 failed.

See [`notes/a13-tiles-and-drilling-down.md`](notes/a13-tiles-and-drilling-down.md).

### Changed — accessible mode now does something when you turn it on (A12)

Gary, with all 288 automated accessibility checks passing, NVDA announcing the
mode switch correctly and axe clean across 144 scans:

> *"this doesnt feel accessible to me, but I dont have this particular challenge
> so its hard for me to tell, but what we have now 'feels' like we are way off
> the mark"*

He was right. Every gate this project owned measured **machine-readable
correctness** — name, role, state, reachability. Nothing measured **legibility,
density or effort**, which is what a sighted person with low vision, dyslexia,
ADHD or a tremor actually meets. Measured against WCAG 2.5.8 the client passed
too, with twelve controls under 24×24, all of them inside the spacing exception.

The finding that mattered most: **accessible mode and standard mode rendered
byte-identically.** Not a bug in the masking — the mode masks preferences, and
every governed preference defaults to its standard value, so there was nothing
to mask. But it meant flipping the switch changed nothing on screen, and the
route to an accessible client ran through 242 words and eleven technical
decisions in a vocabulary nobody had been taught.

- **Five starting points, asked once**, in a person's words rather than a
  specification's — "Hard to see small text", "Too much going on". A preset is a
  bulk write of ordinary preferences, so `effective()` is untouched and never
  learns presets exist. "Let me choose each setting myself" is a recorded answer,
  not a dismissal, so the question never comes back.
- **Two typefaces.** Proportional for the client's prose; monospace for the
  console, the map and the command input, where the server aligned text by
  counting characters. `visual.typeface` puts prose back, because the evidence
  splits: Vision Australia and APA Style say avoid monospace for long passages,
  and Rello & Baeza-Yates found it *improved* reading for dyslexic readers.
- **Options grouped** into four named sections of four or fewer, against eleven
  in one five-column grid — W3C COGA asks for about seven per section.
- **A 24px target floor on every pointer.** `--aetos-target` was `0px` unless
  the pointer was coarse, and the rules using it lived inside that media query,
  so it had always been a no-op on a mouse. Every slider thumb 16px → 24px.
- **The reading line bounded in characters**, unconditionally: 127 → 84.

Four further defects the work turned up: axe had **never scanned the
accessibility panel** (it was in none of the nine overlays the check opens);
`--aetos-text-dim` was used four times and defined nowhere; three headings were
sized in `rem`, which the client's text scale deliberately never touches, so at
150% the panel's group headings were smaller than their own labels; and
`<select>` does not inherit `font`, so the dropdowns ignored the scale.

### Added — a gate for the axis that had none (A12)

`npm run a11y` grew a **`legibility`** check: line length, leading, target size
without the spacing exception, and how many decisions are on screen at once,
across three viewports × two scales × two modes. **288 → 368 checks**, 0 failed.

Two mistakes in writing it, both caught by running it. It measured whatever was
on screen, and the panel is never open in an ordinary view — so the density
assertion never ran once across thirty-six views while printing "ok". And
`MIN_TARGET` reached only the failure *message*, with `< 24` hardcoded in the
page function, so changing the threshold changed nothing. **A threshold that
does not reach the measurement is a comment**, and it reads like a guard.

See [`notes/a12-accessible-ux-research.md`](notes/a12-accessible-ux-research.md),
which also records two measurements in its own first draft that were wrong.

### Submitted — the upstream pull request (M32)

[evennia/evennia#3981](https://github.com/evennia/evennia/pull/3981). 154 files,
confined entirely to `evennia/contrib/base_systems/aetos_webclient/`.

**Converted to draft the same day**, before any reviewer had commented, so that
A12 lands before the client is read cold.

Submitted with its gaps stated rather than with claims that cannot be evidenced.
The description says plainly what is **not** validated — refreshable braille on
hardware, the AAC review, JAWS and Orca — and does not claim voice control,
which is not built.

**Merging is Evennia's decision.** Their contrib guidelines say a PR is reviewed,
may go through several iterations, and that not all can be accepted, because
merging a contrib means the project takes on maintaining it.

### Verified — real NVDA says the mode switch is a switch

`npm run a11y:nvda` run against an unlocked desktop: 6 checks pass, 0 fail. The
one that matters is that **the mode control is announced as a switch, not a
button**, with its state and its name. A10 chose `role="switch"` over
`aria-pressed` on the argument that a screen reader should say the state rather
than the act; that is now measured rather than argued.

Three assertions were removed as unmakeable, not left red. The client writes the
right sentence into its live region (confirmed by reading the element), NVDA
speaks it (confirmed by a person hearing it), and Guidepup's spoken-phrase log
is empty for that window — it captures speech produced by its own navigation
commands, not spontaneous live-region or focus announcements. A check that
reports a defect the client does not have is worse than no check. That behaviour
is covered deterministically by `checks/announce.js`, which reads the regions
directly.

### Fixed — a mistyped `AETOS_UI` threw out of every player's handshake

`build_manifest()` has always documented that it raises `AetosManifestError`.
With a malformed `AETOS_UI` it raised `AetosUIError` — a *sibling* class, not a
subclass — and `aetos_hello` catches only the documented one. So the exception
left the handshake unhandled and the player got a connection that neither
completed nor explained itself, instead of the "server misconfiguration" reply
the client is built to receive. The startup check had only warned.

`build_manifest` now keeps its own documented contract. The fix is there rather
than in a longer `except` clause at the call site, because a list of sibling
exceptions to catch is a list that goes stale the next time somebody adds a
validator.

**Two tests were covering this and both were looking slightly the wrong way.**
The handshake's misconfiguration test used `AETOS_AUTOMATION`, which happened to
raise the one exception that was caught. And `test_ui_manifest` asserted that
`build_manifest` raised `AetosUIError` and read that as "the handshake reports
it" — pinning the mechanism one layer below the outcome, so it went on passing
while the outcome was the opposite of its own docstring.

Both now check the outcome: every Aetos setting a game can write is given a
malformed value, and each must either degrade or produce a reply. Whatever a
developer gets wrong, a player gets an answer.

### Added — the licensing position is now enforceable rather than only argued

`aac_mappings/README.md` says *"These files contain no artwork"*, and the whole
reason Aetos ships no symbol set is that the licences do not allow it inside a
BSD-3 tree — ARASAAC is NonCommercial, the aggregators are per-set. A mapping
names a symbol; the picture is fetched by whoever installs the pack.

That is a careful argument recorded in prose, and prose does not stop somebody
dropping a PNG into the directory in a later milestone. If one arrived, the
contrib would quietly become a mixed-licence tree and Evennia would be the one
distributing it.

So the contrib now ships text only, checked: no binary files, no base64 image
payloads, and nothing in the mappings but identifiers. Not "no artwork" — no
binaries at all, because the narrower rule needs somebody to judge what counts
as artwork and the broader one does not.

The first version of that check was stricter than the concern it protects and
failed on the inline SVG favicon: sixteen pixels, one text character, authored
here, no third party involved. A rule stricter than its own justification
produces findings a reviewer rejects and teaches people to skip the output. It
now forbids what actually distinguishes artwork from a drawn glyph — being
encoded rather than written, or being large.

### Added — `scripts/verify_install.py`, which installs Aetos the way the README says to

The README's first promise is *"install it and you immediately get a better
client on an ordinary Evennia game, with no changes to your game code"*, and the
installation section is three lines somebody pastes into `settings.py`. That is
the first thing every user does and it had never been tested end to end — the lab
game has carried accumulated settings since Phase 0, so it could not say whether
a *pristine* install works.

It does. On a game created seconds earlier with nothing else configured: the
client serves, Aetos wins the template race against Evennia's own webclient, the
console and composer are on the page, the CSP is applied, **every feature flag is
off** — the progressive-enhancement promise — no diagnostics payload leaks, and
all nine provider slots resolve.

It also checks the half that matters more: leaving out the input-handler line
makes the startup checks say so (`aetos.W003`). A check that never fires is
indistinguishable from one that does not work.

The script never starts the server. Evennia's first `start` prompts for a
superuser, and answering this question needs no account and no listening port —
Django's test client fetches the page directly, which also makes it safe to run
while the lab game is up. A test asserts the script pastes the README's block
verbatim, because a verifier running slightly different lines would prove those
lines work and say nothing about the ones people copy.

### Added — guards for two things the upstream PR depends on

**The contrib depends on nothing, and now something checks that.** The README's
selling point is core-only dependencies — Python, Evennia, Django, browser APIs —
and nothing verified it. An `import requests` added in a hurry would have
shipped, and the first anybody would know is a game failing to start with an
ImportError naming a package they never asked for. Checked by parsing, so an
import hidden inside a function counts too.

The single allowed exception is `black`, imported only from a test and only
behind a `skipTest`, because the formatting check has to live where it will
actually be run. A test asserts that exception stays test-only.

**The README's opening shape is load-bearing.** Evennia generates this contrib's
published page by splitting the README on blank lines: the second paragraph
becomes the credits line and the third becomes the blurb in the contrib index
everyone browses. No marker, no validation. A badge or a note near the top would
silently become the description. Guarded — and the guard checks its own
assumption against Evennia's generator, so if that parsing changes we are told
rather than left with three tests that pass while guarding nothing.

Good news for the diff: nothing upstream needs hand-editing to register a
contrib, so the PR stays confined to this directory.

### Fixed — the contrib was not formatted the way Evennia's CI demands

Evennia runs `black --check`, and **twelve files would have been reformatted**.
The PR would have failed CI on the first push.

`AGENTS.md` says it plainly -- *"Don't manually format code. Run `make format`
after editing"* -- and across the whole D-track and the UI work it was never run,
because nothing failed when it was skipped. That is this project's recurring
shape in a new place: a rule that reads as a guarantee and is enforced by nobody.

Now formatted with black and isort, and guarded: a test runs black over every
Python file in the contrib and fails naming the files it would change. Only this
contrib is checked, because formatting somebody else's file to satisfy a test
here would put changes in the PR diff that have nothing to do with Aetos.

Verified by breaking the formatting deliberately and watching the guard fail,
rather than trusting a green run on a test that had never been red.

### Fixed — the README claimed the client honours an automation flag it ignores

Found while preparing the upstream PR. `AETOS_AUTOMATION` is printed as a whole
table under the sentence *"The client honours these"*, and
`automationAllowed("voice")` has no caller anywhere in the client -- voice input
is not built. A game reading that would have set `voice: False` believing it had
forbidden something.

The key stays, so setting it is not an error and the capability keeps its place,
but the README now says plainly that it is reserved and does nothing. A test ties
the two together in both directions: every automation key must be either
consulted by the client or listed in `manifest.RESERVED_AUTOMATION`, and nothing
listed as reserved may be consulted. When voice input lands, that test is what
tells somebody the README sentence is now wrong the other way.

### Added — `npm run a11y:nvda`, asserting on what a real screen reader says

Drives actual NVDA through Guidepup and checks the words it speaks, which takes
several questions the tester protocol puts to a person and makes them string
comparisons: that the mode control is announced as a *switch* rather than a
button (the reason `role="switch"` was chosen over `aria-pressed`), that its
state and name are both spoken, and that leaving accessible mode is announced
with the way back in it.

A separate command from `npm run a11y`, because a screen reader reads the
foreground window of a real desktop — headed browser, unlocked session — and the
fast suite should not inherit that.

**Not yet verified.** The machine was locked when it was written, so NVDA was
reading the Windows lock screen; the check detects that and refuses rather than
reporting failures that have nothing to do with the client. Its first run
against an unlocked desktop is still outstanding.

### Fixed — the new axe check had quietly stopped scanning the overlays

It scanned the page in whatever state it was in — the default workspace, and
nothing else — while the gate it replaced opened thirteen views. Moving axe into
the runner would have swapped thirteen scans for one while the number in the
report went up, because it now ran at four viewports. Dialogs are where
accessibility defects concentrate, so it now opens nine overlays per view: 144
axe scans across the matrix, all clean.

### Added — `npm run a11y`, one command for the whole accessibility suite

Four gates existed and every one was driven by hand: paste a script into a page,
read JSON back. That is why axe spent its life measuring a single viewport. There
is now one command, and it sweeps a matrix of viewport x text scale x mode --
160 checks, 0 failures.

Six of the eight checks are new ground:

- **the accessibility tree Chrome computes**, rather than our hand-rolled idea of
  what each element is named
- **keyboard reachability and operation**, in every view rather than once by hand
- **what the client writes to its live regions** -- our half of what a screen
  reader says, tested deterministically without one: nothing announced twice,
  gameplay never reaching the urgent region, and a reconnect not replaying old
  news at somebody
- **Windows High Contrast**, which measured a claim A10 had only ever argued:
  with author colours discarded the switch's thumb still moves 16px, and focus is
  shown by an outline (which forced colours keep) rather than a border colour
  (which it does not)
- **WCAG 1.4.10 as written** -- 320 CSS px, no two-dimensional scrolling, with
  every control still present and usable
- **focus not moving unless somebody moved it**, which for a client receiving
  unprompted game output is the hard case

Nothing here ships. `browser-qa/` is development-only and is not a dependency of
the contrib.

Every run ends by saying what it cannot do: whether any of this is bearable to
use is `docs/a8-tester-protocol.md`, and it needs a person.

### Fixed — `setMode("standard")` turned accessible mode on

The argument was coerced with `!!wanted`, so the name of a mode was truthy and
switched the client into the other one. No player could reach it: every call site
inside the client passes nothing and toggles, which is how it survived A9, A10
and four milestones after them. It was found by the first caller from outside the
client falling into it immediately.

`setMode` now understands `"accessible"` and `"standard"`, still toggles on a
bare call, still accepts booleans, and refuses anything else with `null` rather
than guessing.

### Added — an A8 readiness gate (`browser-qa/qa-a8-readiness.js`)

Walks the assistive-technology tester protocol task by task and checks that every
destination exists, opens, is named, closes, and returns focus where it started.
38 checks pass, none fail, at four viewports; 13 tasks need a logged-in character
and 13 need a person's judgement, which is what the protocol reserves them for.

It refuses to run against a hidden browser pane, where `innerWidth` is 0 and every
layout measurement is meaningless — a way the QA harness had been able to report
confident nonsense. It also restores the client's mode, contrast and text size
afterwards, and reports whether it managed to.

### Changed — the tester protocol says what has actually been demonstrated

It claimed synthetic keystrokes never reached the page, so nobody had driven the
client without a pointer. That was wrong; they reach it once the window has
focus. The keyboard path is now walked rather than assumed — 33 focus stops,
every one named, wrapping correctly — and the document says plainly that a
number of stops is not a verdict on whether the journey is worth making.

### Added — bindings for equipment, effects, target and actions (D2)

The declarative path now covers all five slots, so a game can expose equipment
slots, temporary effects, a current target and context actions from settings
alone:

```python
AETOS_BINDINGS = {
    "equipment": {"weapon": {"label": "Weapon", "value": "db.gear.weapon"}},
    "effects": {"poison": {"label": "Poisoned", "value": "db.poison",
                           "remaining": "db.poison_left", "kind": "harmful"}},
    "target": {"name": {"label": "Target", "value": "db.target_name"},
               "health": {"label": "Health", "value": "db.target_hp",
                          "maximum": "db.target_max"}},
    "actions": {"attack": {"label": "Attack", "command": "attack {target}"}},
}
```

The gate is that **the client cannot tell which route supplied the data**: each
payload is built twice, once from a binding and once from a hand-written
provider, and compared after normalisation. A second code path into the client
would be a second set of bugs, and the accessibility surface — thresholds,
announcements, labels — is computed from the normalised shape.

Four rules that look shared and are not: equipment keeps its empty slots while
resources drop absent ones; an effect is active when its value is truthy, and
zero is not; `target` has one reserved key, `name`, and no name means no target;
and an action is an ordinary command with a single `{target}` placeholder —
offering it never makes it legal.

A binding still cannot declare thresholds, so a resource declared this way is
never announced. That limit is now stated in the README rather than left to be
found.

### Removed — an `order` field that would have done nothing (D2)

Dicts keep insertion order, so settings.py order is already screen order.
Removed while it was still a draft, and generalised: a test now fails on any
optional field the schema accepts that no provider reads.

### Added — a resource bar from settings alone, with no Python (D1)

`AETOS_BINDINGS` declares *where* a value lives, and Aetos fetches it:

```python
AETOS_BINDINGS = {
    "resources": {
        "health": {"label": "Health", "value": "db.hp", "maximum": "db.hp_max"},
    },
}
```

No provider class, no import path, no file. Proved live against the lab game's
real database with its resources provider removed.

A binding is a **path, not an expression**: `db.name`, or `db.name.child` for a
key inside a stored dict, and nothing else. The second level is a *mapping
lookup* rather than `getattr`, which is what makes it safe by construction — a
dict lookup on a dict cannot run game code, and traversing an arbitrary object
would run the game's `__getattr__`. A value that has to be computed still wants a
provider, and the error message says so.

Errors are written for somebody who did not want to write Python. `db.hp()` is
told it looks like a method call; `db.stats[0]` is told to use `db.stats.hp`;
`hp` is told that `db.` is where `character.db.hp = 50` puts things. A test
asserts no message ever contains a regular expression.

**Precedence is custom > binding > default**, and **a binding switches its own
feature flag on** — though an explicit `AETOS_FEATURES` entry wins in both
directions, so a game can still turn the widget off on purpose.

`resources` is served this way today; the other four slots validate and are
suggested by discovery, and follow.

### Changed — the binding grammar moved out of the discovery tool (D1)

D0 defined it in `discovery/`, which is a development-time source scanner.
Leaving it there would have made the live client import that scanner in order to
read a setting. The dependency now runs one way, and a test walks the imports to
keep it that way.

### Added — `evennia aetos discover` (D0)

Putting a number on screen used to mean writing a provider class. The D-track's
answer is `AETOS_BINDINGS`, a declaration in settings, and discovery writes the
first draft of it by reading the game: the typeclass source, parsed with `ast`
and never imported, and the attributes of characters that already exist. It
prints a settings block with the evidence for each line beside it, and changes
nothing.

The open question was whether the command could exist at all
(`questions.md` 4). It can, and needs nothing from Evennia: the launcher passes
unrecognised operations to Django's management-command dispatch, and Aetos is
already an installed app.

D0 is a spike. It settles the entry point, the package boundary, the candidate
model and the security model, and proves the two scans. The resolver is D1.

### Fixed — the binding grammar accepted `db.__class__` (D0)

Caught by its own test on the first run, which is the point of writing the
rejection list from Addendum B.59 before the pattern. A dunder *is* an
identifier — it starts with an underscore and continues with word characters —
so an identifier whitelist admits every one of them, and `db.__class__` is the
first step of every attribute-traversal escape there is. Each segment now
carries `(?!__)`.

### Changed — the composer moved into the console frame (UI1)

Gary: *"first move the text input and send button into the actual text output
frame"*. It was a `<footer>` at the bottom of the whole client, the full height
of the workspace away from the text it answers. It is now the bottom edge of the
console's own frame, so the transcript and the reply to it are one object.

### Fixed — larger text produced a maze of nested scrollbars (UI1)

Gary, with a screenshot at a larger text size and most of the scrollbars circled:
*"I upped the text size and its creating a scroll bar maze from hell"*. Four
separate causes, and only the first is scrollbars:

- **Nested scroll containers.** A region scrolled, every panel body inside it
  scrolled, and lists inside those scrolled again. The inner two were defensive:
  panels already grow to their content. Now one scroll per column.
- **A resized panel got a fixed `height`**, which clips as soon as content
  outgrows it. Now a `minHeight` — a floor rather than a lid.
- **Seven `font-size` declarations were in `px`** and so ignored the text-size
  setting entirely. Turning the text up grew the game output and left every panel
  title, status-bar button and dialog label at its original size. Now guarded
  generally: no stylesheet may pin a `font-size` in pixels.
- **The responsive breakpoints were in pixels**, and pixels do not know the text
  got bigger. At 250% text an 800px client still called itself "desktop" and kept
  three columns of a few characters each. Breakpoints are now measured against
  the width expressed in the client's own rendered text, so 150% folds to two
  columns and 250% to one. Browser zoom comes out right for free.

Changing the text size also now asks the layout to re-measure. Nothing else would
have: the responsive manager watches the root element's *size*, and the text
scale changes only what is inside it.

### Fixed — help examples could only be scrolled with a mouse (UI1)

Found by running the axe gate at 800x600 instead of 1280x800:
`scrollable-region-focusable`, serious. An example long enough to overflow its
column is a horizontal scroll region, and it had no `tabindex`.

The content is right to scroll — several examples are column-aligned tables, and
wrapping them would destroy the alignment, which is the two-dimensional-layout
exception WCAG 1.4.10 makes. So every example is now focusable, with
`role="group"` and a name. Every one rather than the overflowing ones: whether an
example overflows depends on window width and text size and changes under both.

Help's focus trap collected `button, input, [tabindex='-1']` — the three kinds of
element it happened to contain — so an example after the last button would have
been skipped, Tab wrapping straight past it. Widened to include `[tabindex='0']`.

### Fixed — the accessibility gate had only ever measured one viewport (UI1)

Every rule about overflow, reflow and target size depends on how much room there
is, so a clean axe run is only ever clean *for the viewport it ran at*.
`qa-axe.js` now records the viewport and rendered text size in its results and
names the four views to run. Clean at all four: 1280x800, 800x600, 390x844, and
1280x800 at 200% text.

### Changed — one frame instead of a page of boxes (UI1)

Gary: *"our ui needs to be slick, clean and beautiful to look at"*. Every widget
was a bordered, filled card, including the console — so the transcript had the
same visual weight as the sound widget. The console slab is now the only framed
object; side panels sit on the background separated by hairlines, the status bar
is a row with a rule under it, and scrollbars are thin and in the client's own
palette. No colour token changed.

Both `prefers-contrast: more` and the client's high-contrast setting put the
surfaces, borders and full-width scrollbars back. Unframed panels are a
decoration decision and the wrong one for anybody who needs an edge to find an
edge.

### Fixed — the client had lost ANSI colour on every line

The worst thing the M29 plain-text work produced, found by Gary in a screenshot.

The console chose between "draw the sanitised markup" and "draw the substituted
plain text" by comparing `displayText` with the original. That comparison was
only meaningful while the two started out as the same string. Once `displayText`
became the **plain** rendering, they differed on every line carrying any markup
— so the console treated every coloured line as substituted and drew it as text.
**Colour was gone from the whole client**, and no test noticed, because every one
of them asserts on text and the text was right.

The giveaway in the screenshot was not the missing colour but the words:
`needhelp`, `buildtutorial`, `LimboWelcome`. `<br>` contributes no text, so the
plain rendering welded together the words on either side of every line break.

Both fixed: `present()` now *states* whether a rule rewrote the line instead of
the console inferring it, and the plain rendering replaces `<br>` with a newline
before taking the text.

### Added — a Settings dashboard, with a player list and a developer list

Gary: *"consolidate the settings into a nice settings dashboard and lets expose
for admins and deves appropriate settings and for players only a sub set of
settings appropriate for players"*.

Aetos had **no Settings button at all**. Privacy, themes, automation groups,
reminders, symbol packs and diagnostics were each a command-palette entry and
nothing else, so reaching any of them meant knowing to press `Ctrl+K` and knowing
what to type — the discovery problem A9 answered for accessibility, one layer up.

- **Your client** — eight destinations, all of which change this player's own
  client and are stored in this browser.
- **For game developers** — the inspector, diagnostics report, automation
  validator and contrast report. Shown only when the game sets
  `AETOS_DIAGNOSTICS`, which reaches the client as a `diagnostics` key in the
  manifest.
- **The gate is game-wide, and the panel says so.** It is a switch a developer
  sets in `settings.py`, not a per-account permission. Per-account gating needs
  the server to mark the session as staff; when it arrives it feeds the same
  function and nothing else changes.
- **It grants no authority**, and is written not to look as though it does.
  Hiding a section is tidiness; treating it as a security boundary would be the
  more dangerous mistake, because somebody would eventually rely on it.

Rows that would do nothing are not shown — automation groups only where the game
permits automation — and the list is built at open time, because the manifest
arrives after boot.

It reuses `dialog.js` rather than being a fourth overlay implementation, gaining
its focus trap, Escape handling and focus return. `dialog.js` learned a
`dismissOnly` mode for it: a list of choices that act immediately has nothing to
save, and labelling its only button "Cancel" would suggest what you already
clicked could be undone.

Verified live in both states — one group of eight with diagnostics off, two
groups of twelve with it on — and axe clean with the dashboard open.

### Added — a Settings button

Aetos never had one. Privacy, themes, automation groups, reminders, symbol packs
and diagnostics were each reachable only by knowing to press `Ctrl+K` and what to
search for — the same discovery problem A9 answered, one layer up. The button
opens the palette with the search filled in; a consolidated dashboard is next.

### Fixed — the history panel was still showing raw markup

The M29 fix derived a plain rendering and stored it on the canonical event. The
log hands out **copies** rather than its own records, and `copy()` has an
explicit field list that did not include `plainText` — so every reader received
an event without one and fell back to the markup. The history panel went on
showing `<span class="color-012">` for a whole milestone after this was called
fixed, and the tests passed because they checked the write path and the helpers
rather than what a reader ends up holding.

Found by looking at a screenshot. There is now a test on the read path, and a
second, general one asserting that no field `append()` stores is dropped by
`copy()` — the specific bug will not recur and the shape will.

### A10 — Two modes, two control panels, and a switch at the top right

1284 tests. axe clean in standard mode, accessible mode with the panel open, and
accessible mode at high contrast with the text at 180%.
[`notes/a10-two-modes.md`](notes/a10-two-modes.md)

**The switch does one thing.** It was a button that also opened a panel of
options, so it read as an options button — because that is what it was. Now a
`role="switch"` at the top right, outside the navigation landmark, with a visible
track and thumb whose **position** carries the state. Beside it, an **Options**
button. Switching the mode does not open the options; opening the options does
not change the mode.

**Two control panels.** Standard mode offers text size, sound, gestures and
orientation help. Accessible mode adds contrast, motion, visual detail,
announcement verbosity, quiet and focus modes, and the picture and word board.

**Text size is in both modes and survives the switch.** Being able to set the
size of text is not an accommodation somebody opts into; it is a basic property
of a text interface, and browser zoom scales the page rather than the client.
`Larger text`, `Smaller text` and `Reset text size` are palette commands, so
nobody has to read a settings panel in order to fix the size of the text.

### A10 (first version) — the mode itself

1265 tests. axe clean in standard mode, accessible mode, and accessible mode at
high contrast. [`notes/a10-two-modes.md`](notes/a10-two-modes.md)

Gary: *"lets make the default mode and the accessable mode a toggle so we dont
have to try to be everything to everybody"*. This answers `questions.md` 6 in the
sharper direction.

**Changed — the accessibility toggle now switches modes rather than revealing a
panel**

- A9 shipped it as a disclosure: the panel hid and every accommodation stayed
  applied. Standard mode now genuinely stops the governed accommodations
  applying, so neither interface is compromised to accommodate the other.
- **It masks; it never erases.** `effective()` builds a view over the stored
  preferences and never assigns into them, so switching back restores the
  interface somebody built rather than an empty one. That is the difference
  between a mode and a reset, and it is what makes the switch safe to try.
- The way back is stated at the moment it matters: *"Standard mode. Contrast,
  Text size, Quiet mode no longer applied, and nothing was erased. Press Control
  Shift A to bring them back."* `Ctrl+Shift+A` works in both modes, and the
  switch keeps its position and 32px height in both.
- `aria-pressed` replaces `aria-expanded` — it switches which interface you are
  in, and the panel appearing is a consequence rather than the point.

**Three options are never reverted by the mode**, because their *off* state is
the accommodation: `pointer.gestures` (default on — somebody with a tremor turns
them off), `audio.muted` (default off — muting is the accommodation) and
`cognitive.reorientEnabled` (default on — reverting would *add* a feature).
Getting that backwards would have made standard mode hostile to exactly three of
the people it is meant to leave alone.

**Fixed while building it** — three things that read as guarantees and did
nothing: `min-height: var(--aetos-target)` on the switch (that token is `0px` on
a fine pointer); `min-height: 28px` in `aetos.css` (a 24px rule of equal
specificity in `accessibility.css` loads later and won); and the shell dropping
the announcement priority, which would have sent the one message somebody needs
to hear into the quietest category there is. All three found by measuring the
rendered button rather than reading the CSS.

**Unchanged: the baseline.** Keyboard operation, focus management, landmarks,
accessible names, the announcer and colour never carrying meaning alone are
unconditional in both modes, and still listed in the panel under "Always on".

### A8 (part 1) — the automated half of assistive-technology validation

1249 tests. axe clean across **twelve** views, not one.
[`notes/a8-partial-automated-validation.md`](notes/a8-partial-automated-validation.md)

**I had written the whole stage off as "needs people".** Six of its ten items do.
Four do not, and one of the four found a defect that had been in the client since
M4.

**Fixed — a row of controls unreachable on a phone (WCAG 1.4.10, 2.4.11)**

- At 320px the status bar measured 589px and never wrapped, so the connection
  indicator, game name, Edit Layout, Help and the Accessibility toggle sat off
  the right-hand edge. `body` has `overflow-x: hidden`, so there was no
  scrollbar, `window.scrollTo` did nothing, and they were **unreachable by
  pointer or touch at all**. Tabbing to one put focus on something invisible.
- Among them was the Accessibility toggle A9 had just added so people could find
  the accessibility options.
- M20's responsive rules cover the workspace and the widgets and not the header.
  axe never caught it because axe does not test reflow, and every axe run had
  been at the browser pane's own width.
- Fixed by letting the bar wrap, unconditionally rather than at a breakpoint —
  wrapping changes nothing when the row fits, and a media query is only another
  width to be wrong about.

**The check for it was wrong twice, which is the interesting part.** "Is anything
wider than the viewport?" passed — the elements were narrow and *positioned*
outside. "Is anything outside the viewport?" flagged nine controls inside
scrollable widget bodies that are perfectly reachable. The question is
*off-screen with no ancestor that can be scrolled*, which is what
[`browser-qa/qa-reflow.js`](browser-qa/qa-reflow.js) now measures — zero, at text
scales 1.0 through 2.5.

**Also done:** axe across twelve views (previously one, reported as if it covered
the client); contrast validated for both themes including the high-contrast
theme's *merged* token set, so no colour pair goes unchecked.

**Still blocked, and now the only thing blocking release:** the braille tester,
the AAC reviewer, NVDA/JAWS/Orca passes and cognitive scenarios.
[`docs/a8-tester-protocol.md`](docs/a8-tester-protocol.md) now holds their
scripts, so their time goes on judgement rather than working out what to try.

### M31 — Release candidate (audit complete; **not releasable**)

1243 tests. axe clean at every severity.
[`notes/m31-release-candidate.md`](notes/m31-release-candidate.md)

**A clean Evennia game, installed by following the README verbatim, serves
Aetos.** Formatting, docstrings, self-containment, no third-party loads, no
developer-machine references, mirror identical to the work tree — all checked,
and now checked on every run rather than once.

- Verified that Evennia's docs pipeline parses the README correctly into
  `Contrib-Aetos-Webclient.md`. It builds each contrib's index entry by splitting
  the README on blank lines, so reformatting the top of the file silently changes
  what everyone browsing the contribs reads. Now pinned by a test.
- That also settles the PR scope: contrib docs are generated, so nothing outside
  the contrib directory needs editing.

**Fixed — a connected client that hears nothing now says so**

- Found by the fresh install: the client sat reporting "Connected" with an empty
  console. `Evennia.isConnected()` was `true` and honest — the socket really was
  open — while a raw `new WebSocket` from the same page received the game's
  greeting immediately. Aetos had no way to know nothing would ever arrive.
- It can see it in its own protocol: it sends `aetos_hello` and expects
  `aetos_manifest`. After 8 seconds of silence it says so and re-sends the
  handshake, up to four times, then says reloading may help.
- **Retrying a handshake is not retrying a command** — M24 refuses to replay a
  command through a dropout because that executes a decision about a situation
  that may have moved on; a hello asks a question and changes nothing.
- **The cause is not proven.** The symptom reproduced once, with logs, and not on
  demand afterwards. The safeguard is correct whatever the cause, and its firing
  path is pinned by tests rather than observed live. "We fixed it" and "we made
  the symptom survivable" are different claims; only the second is earned.

**Blocked — A8, and it is not code.** Assistive-technology validation needs a
refreshable braille tester on real hardware and someone who works with
augmentative communication. A.100 forbids claiming braille or AAC compatibility
without them; the README claims neither and tests now pin that it goes on
claiming neither. Nothing else stands between here and a release.

### A9 — The accessibility toggle and its feature picker

1222 tests. axe clean at every severity with the panel open, including in high
contrast. [`notes/a9-accessibility-toggle.md`](notes/a9-accessibility-toggle.md)

**Added — one visible control that reveals the accessibility options**

- Nothing behind it is new. Every option has worked since the A-track built it
  and every one is in Settings — spread across five groups of a panel reached
  from the command palette, where almost nobody found them. Granularity was
  right and it created a discovery problem; this answers that and nothing else.
- A button reading **Accessibility** in the status bar, plus `Ctrl+Shift+A` and
  a command-palette entry. A word rather than an icon, because an icon would be
  a symbol somebody has to recognise before they can ask for help reading
  symbols.
- Eleven independent controls — contrast, text size, motion, visual detail,
  announcement verbosity, quiet mode, focus mode, orientation help, the picture
  and word board, gestures, mute. No preset, no bundle.

**The line, which is the deliverable as much as the UI is**

- The toggle governs the optional, opinionated layer. It does **not** govern
  keyboard operation, focus management, landmarks, accessible names, the
  announcer, colour never carrying meaning alone, or target sizes. A client only
  operable by keyboard when a box is ticked is not an accessible client with a
  toggle; it is an inaccessible client with an apology.
- Those are not merely excluded — the panel **lists them** under "Always on",
  because somebody deciding whether to turn accessibility "on" deserves to know
  what was never off. Both lists are code, so the roadmap's table is now what the
  panel is built from.

**Toggling changes what is offered, never what is on.** Closing the panel writes
exactly one preference — its own — and says so: *"Nothing you chose was
changed."* The alternative reading can strand somebody who flicks the switch to
look and then cannot read the screen well enough to find it again.
`questions.md` 6 asks whether that is the reading you want.

### Fixed — raw markup shown to the player (reported by Gary)

Running a macro put lines like `<span class="color-002"><a id="mxplink" ...` on
screen. The canonical event carried one text field, `originalText`, which is what
the server sent — markup included, since Evennia renders ANSI colour to HTML
server-side. The console's sanitiser handles that. Four other places did not:

- **Display rules** matched, substituted and computed highlight offsets against
  the markup, and the console renders `displayText` as text — so any rule
  touching a coloured line showed the player the tags.
- **The history panel** rendered `originalText` as text unconditionally, so every
  coloured line showed as markup there.
- **History search** matched markup: "span" matched every coloured line, a word
  split by a colour change matched none.
- **Review Mode's announcement** read the tag names aloud to a screen reader.

Triggers were the one place that got it right, separately, with a comment
explaining exactly why. Fixed by deriving the plain rendering once, in
`normalize`, and carrying it as `plainText`. `originalText` is untouched, so
colour is preserved.

### M29 — Compatibility matrix

1199 tests. axe clean at every severity.
[`notes/m29-compatibility-matrix.md`](notes/m29-compatibility-matrix.md)

**Fixed — a `:focus` fallback that removed the thing it was falling back to**

- `x:focus, x:focus-visible { ... }` is not graceful degradation. A
  comma-separated selector list is all-or-nothing in CSS: one unrecognised
  selector invalidates the **entire** rule. On a browser without
  `:focus-visible` — Safari before 15.4 — that rule vanished with the plain
  `:focus` styling inside it, and the client's main focus indicator had no
  `:focus` form at all. Focus fell back to the browser default, which is not the
  3px 3:1 indicator A11Y-FOCUS-004 requires: a WCAG 2.4.7 failure, silent because
  the author's browser supports the selector.
- Now three separate rules, the last of which (`:focus:not(:focus-visible)`) is
  itself discarded by browsers lacking the selector — so they keep the always-on
  ring rather than losing it.

**Fixed — an accessibility preference that could not be honoured**

- A0's reduced-motion rule respects an explicit player choice in both
  directions, because somebody may want motion their OS is suppressing. An M4
  blanket rule in the other stylesheet ignored the preference entirely and
  silently won. Deleted.

**Added — [`docs/compatibility.md`](docs/compatibility.md)**

- Chrome/Edge 87, Firefox 75, Safari 14.1. **The floor is set by CSS, not
  JavaScript** — `gap` on flex, `inset`, `clamp()`. The client is ES5 plus
  promises on purpose: an unparseable syntax takes the whole file, a missing
  layout feature only makes the spacing wrong.
- The numbers are computed by the tests from the stylesheets, so the page cannot
  quietly stop being true.
- It distinguishes **tested** from **expected**, including "the service worker
  lifecycle has not been verified anywhere". A matrix that does not make that
  distinction reads as evidence when it is assumption.

### M28 — Documentation

1168 tests. [`notes/m28-documentation.md`](notes/m28-documentation.md)

**Fixed — the README described nine shipped features as "still to come"**

- Event history, audio and captions, themes, the PWA shell, touch gestures, the
  developer inspector, the widget SDK, the server-described UI manifest and the
  accessibility foundation had all shipped. Only voice was outstanding. The
  README is the file that ships with the contrib and the first thing an Evennia
  reviewer reads, and it had been quietly wrong for nine milestones.

**Fixed — the integration guide recommended a setting that does not exist**

- "Teaching Aetos about your game" opened by telling developers to declare
  `AETOS_BINDINGS` and to run `evennia aetos discover`. Nothing reads that
  setting and there is no management command in the contrib. Following the
  documentation top-down produced a settings block that did nothing, silently.
  Bindings are now a blockquote saying plainly that they are not built.

**Fixed — one help topic used markdown the client cannot render**

- The same string is rendered as markdown on the website and as `textContent`
  in the client, so `**bold**` worked in one and showed asterisks in the other.

**Added**

- A settings reference table; `AETOS_UI`, `AETOS_DIAGNOSTICS` and `AETOS_CSP`
  were readable by the code and undocumented.
- Three in-client help topics for features players had no way to discover:
  Review Mode and history search, automation groups, and installing the client
  / what happens offline.
- Tests that pin the three ways this documentation can become false: a settings
  example that stops validating, a shipped feature described as forthcoming,
  and the generated reference falling behind the help topics it comes from.
  **Voice is pinned in both directions** — the test fails when voice ships and
  the README still promises it, which is the mechanism that would have caught
  the other nine.
- `export_help_docs.js` now refuses to run when the mirror it reads differs
  from the work tree, instead of silently generating docs from the older copy.

**Changed — the accessibility section states what it does not claim.** The
picture-and-word board is described as symbol-supported command composition and
explicitly **not** as AAC support, because no one who works with augmentative and
alternative communication has reviewed it. The section also says what a clean
axe run is and is not worth.

### M27 — Configuration validation

1156 tests.
[`notes/m27-configuration-validation.md`](notes/m27-configuration-validation.md)

**Added — Aetos checks its own installation and settings at `evennia start`**

- The settings were already validated, and validated well. What was missing was
  *when*: validation ran when a player connected, and reported to that player's
  browser and to a log nobody was watching.
- `aetos.W001` / `aetos.W002` catch the only Aetos misconfiguration with **no
  symptom** — the template directory missing from `TEMPLATES[0]["DIRS"]`, or
  present but appended rather than inserted so Evennia's own directory still
  wins. The game starts, `/webclient/` works, and it serves the stock client.
  `W002` names the directory that is winning, because "something is ahead of
  you" is a fact and "`evennia/web/templates` is ahead of you" is a fix.
- `aetos.W003` catches unregistered input handlers — a client that loads and
  plays with every configured feature silently absent.
- `aetos.W01x` runs each `AETOS_*` setting through **the validator the runtime
  uses**, not a copy. A check with its own idea of what is valid disagrees with
  the code, and the original messages — which name the key and list the valid
  options — survive intact.
- **Every finding is a Warning, never an Error.** Django refuses to start on a
  check Error, and stopping a MUD that also serves telnet because its webclient
  has a settings typo would be worse than the typo.
- Known limit, recorded in the source: the checks are registered by Aetos's app
  config, so they cannot warn about `INSTALLED_APPS` itself. The README's
  troubleshooting leads with that.

### M26 — Security hardening

1134 tests. axe clean at every severity.
[`notes/m26-security-hardening.md`](notes/m26-security-hardening.md)

**Added — the client page carries a Content-Security-Policy**

- `script-src 'self'`, no `'unsafe-inline'`, no `'unsafe-eval'`. Verified
  *enforced* in a browser, not merely present: an injected inline `<script>` did
  not run, a script from another origin was refused, and `eval("1+1")` was
  refused — so "Aetos evaluates no JavaScript" is now a browser guarantee rather
  than a maintained discipline.
- Declared as `<meta http-equiv>` rather than a header, because a contrib does
  not own the webclient view and middleware would apply the policy to the game's
  entire website. `frame-ancestors`, `report-uri` and `sandbox` cannot be
  expressed that way, so `AETOS_CSP` **refuses** them with an error naming
  `X-Frame-Options` rather than letting a game believe it is protected.
- `AETOS_CSP` adds sources to the defaults per directive; `AETOS_CSP = False`
  declines the policy for a game sending its own header.

**Changed — the page's last inline script became a file**

- The four transport globals `evennia.js` reads now travel as `<meta>` tags and
  are assigned by `transport_bootstrap.js`. One inline script is all it takes to
  force a game into `script-src 'unsafe-inline'`, which is the same as having no
  script policy at all.

**Fixed — a client could fill a game's log through its handshake**

- Unknown capability names were logged on every `aetos_hello`: bounded per
  message, unbounded per session. Now logged once, and again only if the set
  changes. The rejection path directly above already declined to log at error
  level for exactly this reason.

**Fixed — the sanitiser could be made to recurse until the stack ran out**

- Nesting deeper than 64 levels is flattened to text rather than followed.
  Content is not discarded — flattening is what already happens to any tag off
  the allowlist.

**Added — a referrer policy**, `strict-origin-when-cross-origin`. A small
improvement, stated as one: it matches the modern browser default and pins it for
browsers that sent the full URL.

**Investigated and deliberately not changed — request rate limiting**

- `aetos_request_sync` is reachable before login and runs every provider, which
  looked like unbounded amplification. Measured: 2000 requests produced exactly
  80 syncs and 1920 "You entered commands too fast" refusals. Evennia's Portal
  applies `MAX_COMMAND_RATE` to every inputfunc, not only to `text`. A second
  throttle inside the contrib could only disagree with the first.

### M25 — Performance hardening

1102 tests. axe clean at every severity.
[`notes/m25-performance-hardening.md`](notes/m25-performance-hardening.md)

**Fixed — the console forced a full layout for every line of game output**

- `append` read `scrollHeight`, added a node, then wrote `scrollTop`.
  Interleaved, a geometry read after a DOM mutation makes the browser lay out
  the entire scrollback — once per line.
- **The 5000-line cap was what made it expensive.** That cap exists so a long
  session stays responsive, and `scrollTop = scrollHeight` over a list held at
  its maximum is the most costly possible version of that write. It kept memory
  flat and made latency quadratic. Measured at **68ms per line** with the
  scrollback full: a 200-line burst — one `help`, one long room, one busy combat
  round — froze the client for thirteen seconds.
- Lines are now batched into the next animation frame: one geometry read, one
  fragment insert, one trim, one scroll write, however many lines arrived.
  **0.28–0.73ms per line** at the same cap.
- A `setTimeout` backstop runs *alongside* the animation frame, because a
  backgrounded tab runs no frames; a burst over 500 lines flushes itself, so the
  batch cannot grow without bound where frames never run at all.
- Behaviour is unchanged: output still follows to the bottom, and still does not
  yank the view when the player has scrolled up to read.

**Fixed — the history widget redrew from the whole canonical log on every event**

- A redraw filters up to 5000 events and rebuilds a page of DOM. Doing it per
  event made the cost of one line proportional to the length of the session.
  Coalesced to once per frame.

**Changed — every script now loads with `defer`**

- All 55 scripts sat in `<head>` as parser-blocking: nothing was parsed or
  painted until the last of them had downloaded and run.
- `defer` rather than `async`, because execution order is load-bearing — the
  accessibility subsystem must exist before anything that can announce — and
  `async` does not preserve it.

**Added**

- [`browser-qa/qa-performance.js`](browser-qa/qa-performance.js) — measures the
  per-line cost at three session lengths, so the numbers above can be taken
  again rather than believed.

### M24 — Reconnect hardening

1085 tests. **axe clean at every severity, including moderate** — a first for
this client. [`notes/m24-reconnect-hardening.md`](notes/m24-reconnect-hardening.md)

**Fixed — a command typed during a disconnect was reported as sent**

- `send()` called `evennia.msg` unconditionally and returned `true` regardless.
  Evennia's transport does not buffer: `websocket.send` on a closed socket
  throws or is dropped and nothing is delivered on reconnect. So the command
  went nowhere while the capture recorded it as sent — making a replay that
  could not reproduce the session — and the orientation trail listed it as
  something the player had sent.
- Silently losing a command is bad; *claiming* to have sent it is worse, because
  it removes the player's chance to notice and retype.
- **Nothing is queued for later, deliberately.** A player who typed "attack the
  dragon" during a thirty-second dropout may be somewhere else entirely when the
  socket returns, and replaying it would execute a decision about a situation
  that no longer exists.

**Fixed — stale state looked current**

- The moment a connection drops every panel shows the world as it was, looking
  exactly as it did when it *was* current. The workspace now dims and says *"Not
  connected. Everything shown is the last state received."* — via
  `aria-describedby` rather than a live region, because staleness is a property
  of the screen rather than an event. The dimming is never the only signal.

**Four accessibility findings, three introduced by this milestone**

- `region`: the stale notice sat outside every landmark. Moved inside the
  `<main>` it describes.
- `scrollable-region-focusable` on two panels — fifth and sixth instances here,
  both found by axe rather than review. The person who writes a panel is never
  the person it fails.
- `landmark-unique`, introduced by my own fix for the above: `role="region"` on a
  widget body duplicated the panel's landmark, giving two called "Resources".
  Changed to `role="group"`. Third time a role has been the wrong tool — an added
  role is more often the bug than the fix.
- `page-has-heading-one`: the client had **no `<h1>` at all** since M4, so a
  screen reader user had nothing to jump to and no statement of what they were
  looking at. Reported on every axe run since and filtered out every time by a
  severity threshold that is still correct but had quietly turned "does not
  block" into "never read".

**Changed**

- The lab moved from ports 4400–4406 to **4470–4476**. Dragon's Ire already owned
  4401 on this machine — "avoid Evennia's defaults" identified the wrong risk,
  since the collision that bites is with another game the same developer runs,
  and +400 is exactly where somebody else's game lands for the same reason.

**Roadmap**

- New stage **A9 — accessibility toggle and feature picker**, from Gary: one
  top-level standard/accessibility toggle, and when on, a granular picker.
  Scheduled after A8 so that stage validates the client people will actually
  use. The baseline — keyboard operation, focus management, landmarks,
  announcements — stays unconditional and explicitly outside the toggle.

### E6 — Mapper metadata and weighted routing

1066 tests. Addendum C.19. [`notes/e6-weighted-map.md`](notes/e6-weighted-map.md)
(E6's widget-SDK half shipped at M22.)

**Added**

- Optional `cost` and `available` on a map edge, with Dijkstra replacing
  breadth-first search. **Without declared costs this is exactly the search it
  replaced** — every edge defaults to 1, so the cheapest route is the one with
  fewest moves. Not an approximation of the old behaviour; the same behaviour
  reached by a more general route.
- Three cheap moves now beat one expensive one, which is the case a
  move-counting search gets wrong.
- `blocked_exits()` reports what a game says is shut, with the game's own
  reason. Routing excludes a blocked edge; **describing the map does not** — a
  player is entitled to know a door exists and is closed, and a map that
  silently omits it looks like a map with a missing room.
- A failed route now says why, where the game said: *"No route to that
  location. The gate is barred."*

**The ambiguity rule, where it bites**

- No reason is ever invented. C.19 forbids inferring skill, class, guild,
  weather or roundtime restrictions, and C.6 prefers `unknown` to wrong. A
  guessed explanation is the confident error that costs a player their trust in
  the whole map — and once lost, that is not recovered by being right
  afterwards. A test strips comments and fails on those words appearing in
  executable code.

**Both implementations pinned together**

- The server routes and so does the client. Verified live against the same
  fixtures rather than only asserted structurally: weighted, uniform, blocked,
  longer-but-cheaper, five cost edge cases and unreachable all agree.
- `true` is not a cost of 1 (in Python `True` is an int, so it would have meant
  1 by accident — right by accident is wrong as a habit). A negative cost is
  refused, since it would let a route improve by walking in circles. Costs clamp
  at 10000, which is arithmetic hygiene rather than a view on what "expensive"
  means.
- Ties break on room id on both sides, because a map that suggests a different
  equally-good route on each sync is one nobody can follow.

### M23 — Server-described UI manifest

1036 tests. [`notes/m23-ui-manifest.md`](notes/m23-ui-manifest.md)

**Added**

- `AETOS_UI`, letting a game describe its interface in settings: what its
  resources are called, what order they sit in, what thresholds announce, and
  what to title a panel. The manifest's `resources` key had been an empty
  placeholder since protocol v1; this fills it, and adds `panels`.
- A declared resource renders **labelled and pending** before its first value
  arrives. Without it the panel is blank until the first sync, so a player on a
  slow link cannot tell whether the game has no health bar or has not spoken
  yet. It says "waiting", never a zero — a zero is a *value*, and showing one
  for a health bar that merely has not loaded is the worst available wrong
  answer. Pending gauges are never announced, since announcing the absence of
  news would fire on every reconnect.
- Declared order wins over arrival order. A gauge that moves between second and
  fourth place between syncs is not cosmetic for somebody navigating by position
  or by screen reader. Undeclared resources are kept and sorted last rather than
  dropped, because a vanished resource is much harder to diagnose than a
  misplaced one.

**The boundary it holds**

- This is **description, not data**. It says a resource exists and what to call
  it; it says nothing about where the number comes from, which is the D-track's
  job. Tests refuse a `bindings` section, drop a `value` on a descriptor, and
  assert the module never touches `.db.`, `.attributes` or a character class.
- It cannot escalate: `features` and `automation` sections are refused, so a UI
  description cannot switch on a capability `AETOS_FEATURES` already owns.

**Fixed**

- **The wrong threshold keys were accepted silently.** Writing the lab settings
  from A.77's example produced `{"at": 0.25, "state_text": ..., "announce": ...}`
  — but `state_text` belongs to a *resource*, and the canonical threshold shape
  has been `at`/`label`/`level` since M8. The result was a threshold with an
  empty label that would never announce anything useful, with nothing to say why.
  Unknown threshold keys and empty labels are now refused **in the settings path
  only**: a provider is runtime game code and stays tolerant, a setting is a
  developer typing a literal and is strict. Tolerant at runtime, strict at
  configuration.
- A malformed `AETOS_UI` raises at the handshake, where a developer sees it, and
  is caught in the sync path, so one settings typo cannot also empty the
  player's resource panel.

### M22 — Widget SDK and failure isolation

1000 tests. Addendum C.20. [`notes/m22-widget-sdk.md`](notes/m22-widget-sdk.md)
and [`docs/widget-sdk.md`](docs/widget-sdk.md).

**Fixed — one bad widget took every widget after it**

- `mount` was unguarded, and widgets are mounted in a `forEach`. A
  game-authored widget throwing during mount **aborted the loop, so every widget
  registered after it silently never appeared** — and the half-mounted one was
  left as a blank panel, which is indistinguishable from a widget with nothing
  to show. Demonstrated in the lab before fixing rather than argued from code.
- All five of C.20's requirements now hold: catch, disable, log, show a
  recoverable placeholder, preserve the others. A mount failure disables
  immediately (a widget that could not build itself has nothing to retry with);
  update failures are allowed three, then the widget is switched off and its
  subscriptions released so it stops failing invisibly.
- Failures reach the diagnostic report and the inspector, because a failed
  widget's own panel says so only if you happen to be looking at that panel.

**Fixed — the store's test seam delivered exactly one update**

- The batching guard compared `frameHandle !== null`, conflating "a flush is
  pending" with "the scheduler returned a cancellable handle". `rAF` returns a
  number so it worked in a browser; an **injected** synchronous scheduler
  returns `undefined`, so every flush after the first was skipped. That seam
  exists precisely so update behaviour can be tested without animation frames —
  which a backgrounded browser does not run at all — so a test relying on it was
  exercising nothing.

**Added**

- `SDK_VERSION`, optionally declared by a widget and checked at registration,
  with a message saying which way the mismatch runs.
- [`docs/widget-sdk.md`](docs/widget-sdk.md) — the contract written down,
  including the four accessibility mistakes this client has actually made, since
  those are the ones that look correct while being wrong.

**Still refused**

- No plugin marketplace. Downloading and executing third-party JavaScript brings
  code trust, supply chain, signing and sandboxing problems whose failure mode is
  remote code execution, in a client whose whole posture is asking for nothing
  the game did not offer. A test asserts the widget layer contains no `import()`,
  injected `<script>`, `eval`, `new Function` or `fetch`.

### M21 — Developer inspector

973 tests. Addendum C.18.
[`notes/m21-developer-inspector.md`](notes/m21-developer-inspector.md)

**Added**

- One panel showing what the client believes: connection, manifest, providers,
  bindings, widgets, state summary, recent event types, errors and validation.
- **Palette entries for capture and replay, which had none.** Both were built at
  E1 and reachable only as `Aetos.capture` from the console — which is to say,
  reachable by their author. Writing the C.18 coverage test is what found it.
- `Download capture`, which E1 also never had. A capture readable only from the
  console is one nobody attaches to a bug report, which was its whole purpose.

**The boundary C.18 draws**

- It reads only what the client already has — its own store, registry and log.
  No query field, no dbref lookup, no path from a developer's curiosity to a
  request the game did not expect. A test enumerates the services the module may
  read and fails on any other, which is stronger than "does not call `fetch`".

**What it says about absences**

- Withheld widgets name what they needed: `equipment (needs equipment)`. The
  difference between "three widgets are broken" and "three widgets are waiting
  for your game to declare something" is otherwise invisible.
- Missing bindings say *not implemented, D-track*; ungated providers name the
  setting; a missing handshake says the game may not have Aetos installed.

**Fixed**

- The registry never reached the inspector: the handover ran six hundred lines
  before the inspector was created, `var` hoisting made it `undefined`, and
  **my own defensive guard skipped it in silence** — the panel reported
  "Registry: not available" forever and nothing errored. A guard against a
  condition that should be impossible does not prevent it; it prevents you
  finding out about it. Removed the handover entirely by passing the registry
  directly, since it is already built by then.
- `scrollable-region-focusable` on a section list — fourth instance in the
  client, fourth caught by axe rather than by reading the code.

### M20 — PWA shell and touch gestures

940 tests. Addendum A.57. [`notes/m20-pwa-gestures.md`](notes/m20-pwa-gestures.md)

**Added**

- A service worker that caches the client's own static files and **nothing
  else** — not the transcript, not a sync payload, not a tell. Enforced
  structurally: the fetch handler declines anything that is not a same-origin GET
  under two known asset prefixes, so there is no branch that could cache a
  response from the game.
- An optional `urls.py` a game includes to make the client installable. Optional
  by construction — without it there is no PWA rather than a broken one.
- Four touch gestures, each duplicating a palette command and none of them the
  only way to do anything (A.57). Single pointer only; passive handlers so a
  gesture can never block a scroll; thresholds set for a tremor rather than a
  steady hand.
- The privacy panel's "clear all data" now clears the cache too.

**Deliberately not done**

- **No offline mode.** A MUD is a live connection. The worker's value is that a
  tunnel gets Aetos's reconnecting state instead of the browser's dinosaur — and
  "works offline" is exactly the claim a PWA invites and would be false.
- **No silent updates.** A new version waits and says nothing has changed yet.
  Reloading under somebody mid-fight or mid-sentence on the communication board
  would be a data-loss bug wearing a feature's clothes.
- **No push notifications or background sync.** Both need a server-side
  per-player subscription record, which blueprint 2.3 forbids.

**Fixed — a defect that had been there since A0**

- `Ctrl+K` named `palette.toggle` as the command it accelerates, and no such
  command was ever registered. The A.23 rule was checked by asserting the string
  `paletteCommand:` was present, which is spelling rather than substance. M20's
  gesture guard found it within a minute of first running, because that one
  checks the reference *resolves* against the live palette. Now a static test
  requires every shortcut and gesture reference to resolve.
- `gestures.js` accepted a `palette` service it never used; the wiring tripwire
  caught it.

**Not verified**

- The service worker has never been seen to register: the lab browser refuses
  all service workers, proven by serving the identical file from a second path.
  Endpoints, headers and version substitution are verified; the lifecycle is not.
  Scheduled for A8 — see
  [lab-hazard-003](notes/lab-hazard-003-no-service-workers.md).

### A7 follow-up — symbol packs, and a correction

895 tests. Prompted by Gary pointing out that free AAC symbol libraries exist.

**Corrected**

- A7 originally said the symbol sets AAC users know are all restrictively
  licensed. **That was wrong.** Checked properly: ARASAAC is CC BY-NC-SA (the
  NonCommercial clause genuinely does block bundling in a BSD-3 client that
  commercial games install), but **Mulberry is CC BY-SA 4.0 and its own
  documentation permits use "in any project or product, commercial or
  otherwise"**. Licensing was never the obstacle there.
- The real obstacle for Mulberry turned out to be **coverage**, which only
  showed up by going and looking: 3,436 symbols led by country flags, country
  maps and professions, with no symbol for `yes`, `no`, `stop`, `please`,
  `thank you`, `sorry` or `friend`. It is a vocabulary set to supplement a core
  board, not to be one — and bundling it would leave the six most urgent words
  as the only ones without a picture.
- The correction is kept in the source rather than quietly replaced, with a test
  asserting it stays. The wrong reason produced the right decision, which is
  exactly how a bad assumption survives to be repeated somewhere it matters.

**Added**

- `aac_mappings/` — bundled concept-to-symbol mappings containing no artwork,
  which is precisely what A.63 permits. Ships a verified Mulberry mapping: 33
  concepts, every one checked against the set's own index and then against the
  repository. Nothing guessed.
- `scripts/build_symbol_pack.py` — downloads the mapped artwork and writes a
  self-contained pack, keeping the licensing decision with whoever installs it.
  `--check` re-verifies every mapping without downloading.
- A **Symbol packs** panel that leads with coverage: it names every word the
  installed pack cannot illustrate, so a player finds out there rather than by
  hitting a blank key mid-sentence.
- Packs report whether they are **self-contained**. A pack of remote URLs tells
  its host, every time the board renders, that this browser is showing a
  communication board — a disclosure about disability made silently to a third
  party. Built packs inline their images and send nothing.

### A7 — AAC architecture and the simplified workspace

885 tests. Addendum A.51, A.59–A.69. Gate A.94 **outstanding**.
[`notes/a7-aac-simplified.md`](notes/a7-aac-simplified.md)

**Added**

- A concept model separating what is meant, what is on the key, what a word says
  in a sentence, what is drawn, and what is sent (A.60).
- A picture and word board with a sentence strip, a text preview and an ordinary
  game command as its output — `say i want help` goes through the same seam as
  anything typed, and the server is never told the player uses a board (A.68).
- A pluggable symbol provider (A.62), a simplified four-panel layout (A.51), and
  palette entries for both.

**What Aetos deliberately does not do**

- **Claim AAC support.** A.94 says standards compliance is not expertise. Until
  an AAC practitioner has reviewed the concept organisation and cognitive load,
  the honest description is "an architecture" — and a test asserts the source
  still says so, so making the claim means deleting a test explaining why not.
  `questions.md` §3 lists the five judgements a reviewer would be asked for.
- **Invent W3C concept identifiers.** Every `waiAdaptConcept` is null. An
  identifier is a claim that this concept *is* that published concept, and a
  plausible-looking invented one propagates into other tools as though checked.
- **Bundle symbol artwork.** Aetos ships *mappings*, which is the line A.63
  draws. Every key shows its word until a player installs a pack; a pack must
  state its licence or registration is refused, and the panel reports which
  words it cannot illustrate before anyone relies on it.
- **Guess a replacement symbol.** A symbol *is* the word for somebody using one,
  so a near-miss is a different word — and the player has no way to know it
  happened.
- **Infer anything.** No prediction, no phrase suggestions, no rewriting prose
  into symbols (A.69). A system that speaks for somebody has to be one they can
  predict completely.
- **Require a pointer.** Drag-and-drop is not implemented at all: A.66 permits
  it as an addition and forbids requiring it, and building the pointer version
  first is how a keyboard path becomes an afterthought nobody tests.
- **Remove anything in the simplified layout.** All sixteen widgets stay
  registered and all fifty-seven palette commands stay available. A "simple mode"
  that quietly took features away would be deciding what somebody is capable of
  because they asked for a calmer screen.

**Fixed**

- Sentences were built from key labels, so they read `say I Want Help` — which
  is what every public message somebody sent would have looked like. Key caps
  and speech are now separate fields.
- `aria-label` on the word grid sat on a plain `<div>`, which is prohibited and
  silently ignored — the grid was simply unlabelled, and axe reported it only as
  *incomplete* rather than as a violation.

### M19 — Themes and contrast validation

830 tests. Addendum A.55, `A11Y-VIS-003`.
[`notes/m19-themes-contrast.md`](notes/m19-themes-contrast.md)

**Added**

- Named themes, stored in this browser, plus a light theme (Paper) alongside
  the shipped dark one. A theme sets **colours only** — an allowlist of ten
  tokens, no spacing, no type size, no stylesheet. A theme that could ship CSS
  could hide content, override a focus ring, or reintroduce every accessibility
  defect the client spent a year removing; restricted to colours, a bad theme is
  illegible, which is visible and reversible, rather than broken, which is
  neither.
- A WCAG contrast validator over eleven named pairs, run at save time —
  `A11Y-VIS-003` requires validation to be part of *acceptance*, not to be a
  checker somebody could run.
- A theme editor and a contrast report that names each failing pair, its ratio
  and **what that pair is for**. A ratio alone tells an author they are wrong
  without telling them what to change.

**It warns; it does not refuse**

- A failing theme still saves. A player who wants a theme Aetos considers unwise
  is entitled to have it — blocking would be a tool overruling somebody about
  their own eyes, and would push people out of the theme system entirely, where
  nothing is checked at all. What they are not entitled to is not being told,
  and the warning notes that an exported theme reaches people who did not choose
  those colours.

**Fixed — found by turning the validator on Aetos itself**

- **The default theme failed contrast, and had since M4.** `--aetos-border` was
  1.37:1 against the background — and since a panel differs from the page by
  only 1.09:1, that border is the *only* thing separating one region from
  another. There were effectively no panel edges at all for anyone with reduced
  contrast sensitivity. Nobody caught it in a year of looking at this client,
  which is the point: a palette chosen by eye passes for the person who chose it.
- `--aetos-focus` was undeclared in the default theme, relying on a CSS
  fallback. A token the validator cannot find is a token nobody checks.
- **A theme could silently strip an accommodation.** Themes set tokens inline on
  the root, which beats a `:root` rule — so a player with high contrast on who
  chose a theme lost it, with nothing to say so. The high-contrast preset now
  uses `!important`: high contrast is a need, a theme is a preference, and a
  preference does not overrule a need.
- Renamed `data-aetos-focus` (Focus Mode, added in A5) to
  `data-aetos-focus-mode`, since `--aetos-focus` is now a real token two lines
  away.

### M18 — Audio, multimedia and captions

791 tests. Absorbs A6. Addendum A.58, A.79, A.84.
[`notes/m18-audio-captions.md`](notes/m18-audio-captions.md)

**Added**

- A `media` provider slot, so a game declares its sound the same way it
  declares resources or a map. Inert by default: Evennia models no media, and a
  client that invented some would be guessing at a game's art direction.
- `state.push_media()` for one-off sound, alongside ambient media from the
  provider. Ambient media is **state** and is diffed, so a sync every few
  seconds does not restart the music; one-off media is an **event** and is not,
  because a door slamming twice is two sounds.
- A Sound panel: per-category volume for music, ambience, effects, interface
  and voice, plus a master, mute-all and stop-all — all native `<input>` and
  `<button>` elements, because a custom slider a screen reader cannot operate is
  a volume control that does not exist for the person most likely to need it.
- A durable caption list, and images shown with their description as `alt`.
- `audio.*` accessibility preferences; palette entries for stop and mute.

**The gate**

- `A11Y-MEDIA-001`: every non-decorative sound is also **text**, emitted
  *before* any attempt to play it and regardless of whether that attempt
  succeeds. Muted, volume at zero, no speakers, missing file, autoplay blocked
  — the caption goes out in every case. Tying it to successful playback would
  mean the players who most need the text are the least likely to get it.
- Uncaptioned audio is **reported**, not swallowed. Aetos will not invent a
  caption: an invented description is confidently wrong to exactly the player
  who cannot check it. The server counts uncaptioned items so a developer sees
  a number rather than auditing a list.
- `A11Y-MEDIA-002`: a category with no volume slider is refused on the server
  rather than played uncontrollably.

**Security**

- Media URLs are checked against a scheme **allowlist** — `http`, `https`,
  relative. A denylist would have to anticipate every scheme a browser has ever
  supported. `data:` is excluded and backslashes are refused, because browsers
  treat them as forward slashes in some positions.

**Fixed**

- **Numeric preferences never persisted.** The preferences normaliser handled
  enums, one special-cased number, booleans and strings — so any *other* number
  fell through to the string branch and was silently discarded. Every volume
  slider would have appeared to work while nothing it set survived a reload.
  Replaced with a range table, plus a load-time warning and a test for any
  numeric default that lacks one.
- A partial provider dict passed to `build_sync` raised `KeyError` for any slot
  added since the caller was written. It now fills gaps from the defaults, so a
  new slot degrades to "this game exposes none of that".
- `role="region"` on the caption list orphaned every caption (`listitem`), the
  same mistake A0 made once while *fixing* a scrollable region. The wrong
  version looks more accessible than the right one.

### A5 — Cognitive and orientation layer

741 tests. Addendum A.36–A.51. [`notes/a5-cognitive-orientation.md`](notes/a5-cognitive-orientation.md)

**Added**

- **Reorient Me** (Ctrl+Shift+W). Reads back location, exits, who is present,
  character state, target and the last few commands sent — spoken *and* shown.
- **How I Got Here** and **Walk Back**. The trail is built from authoritative
  room changes, never from typed movement: a player who walked into a wall has
  not moved. Walking back sends ordinary movement commands through the ordinary
  queue and stops wherever the game stops it, or wherever a step has no
  unambiguous reverse.
- **Reminders and tasks**, stored in the browser. Pin one, attach one to a
  room, or hold one for the next session. A room reminder surfaces once per
  visit, and the mark clears on leaving.
- **Session resume**, labelled "Last known" until a sync arrives.
- **Universal search**: the palette now searches notes, reminders and what has
  been said, scored alongside its own commands. A history hit jumps in Review
  Mode, so the line is reachable even when a display rule has hidden it.
- **Focus Mode** (A.47) and a palette toggle for **Quiet Mode** (A.48), kept
  separate because a calmer screen and fewer interruptions are different needs.
- `reminders` storage namespace; `DB_VERSION` 2 → 3.

**Hard rules encoded**

- `A11Y-COG-002` — **no intention inference.** Aetos reports that you sent
  `look at Renn`; it never reports that you were investigating Renn. A client
  that guessed would be confidently wrong exactly when somebody was relying on
  it, and that costs the trust as well as the time.
- `A11Y-COG-005` — reminders are only ever created on request. Aetos never
  invents one and never builds a checklist out of your behaviour.
- Neither comfort mode can be set by the game.

**Fixed**

- **A schema upgrade could hang the entire client.** IndexedDB will not upgrade
  while a connection is open on the old version, and Aetos never listened for
  `versionchange` — so a player with two tabs open, reloading one after a
  release that added a namespace, got a tab where every local read hung
  forever, with no error. Indistinguishable from having lost their data. Fixed
  by closing on `versionchange`; the privacy panel now also distinguishes
  "blocked by another tab" from "this browser refuses to store anything",
  because those have completely different fixes.
- The reorientation summary joined a section's lines with a space, so it spoke
  as one unparseable run-on phrase.
- Ctrl+Shift+W spoke the summary while the palette entry spoke *and* showed it,
  so a sighted player pressing the shortcut saw nothing happen.
- `scrollable-region-focusable` in the history widget — a scrolling region a
  keyboard user could not scroll. Pre-existing; third instance of this defect in
  the client and the third caught by axe rather than by reading the code.
- Two tests asserted facts about the *deployment* rather than about the code,
  and so passed only in a game dir that had not installed Aetos.

### E5 — Diagnostic reporting

688 tests. Addendum C.17. [`notes/e5-diagnostics.md`](notes/e5-diagnostics.md)

**Added**

- A bug report a maintainer can act on: versions, browser, features, manifest
  capabilities, widgets, connection state, recent event **types**, and recorded
  errors.
- Optional `AETOS_DIAGNOSTICS` setting, letting a game include provider class
  names — its own internals, so its own decision. Off by default.

**Excluded by construction**

- The report is assembled from a fixed list of sources, none of which is the
  local data store, so there is no path by which a note reaches it.
- Accessibility preferences are excluded deliberately: a report saying
  `screenReader: true` would disclose a disability to whoever reads the issue,
  and nobody should have to choose between reporting a bug and keeping that to
  themselves.
- Nothing is sent. `issueUrl()` returns a URL and does not open it.

### E4 — Unified validator

667 tests. [`notes/e4-unified-validator.md`](notes/e4-unified-validator.md)

**Added**

- One validator across triggers, aliases, timers, scripts, display rules and
  macros. Six would give six different answers to the same question, and a
  player told once that a pattern is dangerous should not have to discover it
  again in a different dialog.
- Findings report counts and messages only — never patterns or commands — so
  they are safe to include in a diagnostic report.

### E3 — Automation groups

637 tests. [`notes/e3-automation-groups.md`](notes/e3-automation-groups.md)

**Added**

- One switch for a set of related automation. A rule runs only when both it and
  its group are enabled; turning a group on never re-enables a rule the player
  switched off themselves.
- The group list states how many rules each group currently suppresses, because
  "I turned it off" and "my group turned it off" have completely different
  fixes and a rule that silently does nothing is indistinguishable from a rule
  that is broken.

### E2 — Non-destructive presentation rules

615 tests. [`notes/e2-presentation-rules.md`](notes/e2-presentation-rules.md)

**Added**

- Highlight, substitute, filter and collapse rules. Presentation only: they
  produce metadata describing how a line should look and cannot touch the
  record, the store, or what a trigger saw.
- `display_rules` storage namespace; `DB_VERSION` 1 → 2.

**Gate proven live**

- A filtered line is not drawn, and is still logged, still seen by automation,
  and still searchable in history.

### M17 — Rich chat, event history and Review Mode

593 tests. Absorbs A4. [`notes/m17-history-review.md`](notes/m17-history-review.md)

**Added**

- A filterable event history reading the canonical log, so a line hidden by a
  display rule is still reachable.
- **Review Mode**: pause announcements and read back, with jump-to-previous and
  jump-to-next by category. Leaving summarises what arrived rather than
  replaying it.
- **Announcement flood control**: during a burst, a screen reader gets a
  summary rather than fifty individual interruptions — except for categories
  that are never aggregated, such as tells.

### E1 — Capture and replay

560 tests. [`notes/e1-capture-replay.md`](notes/e1-capture-replay.md)

**Added**

- Session capture to JSONL and replay through `pipeline.ingest` — the same seam
  the websocket uses. There is deliberately no second path: a harness that
  exercises different code from production tests the harness.

**Gate proven live**

- A captured sequence reproduced an identical state snapshot with no server
  running.

### E0 — Event pipeline contract

534 tests. **Blocked M17, and did.** [`notes/e0-event-pipeline.md`](notes/e0-event-pipeline.md)

**Added**

- A fixed, frozen stage order — validate, normalize, state, log, automation,
  presentation, announce — with only `state` and `log` permitted to write.
- A canonical log every later feature reads from, bounded, handing out copies.

**Gate proven live**

- Against a deliberately hostile presenter that tried to mutate the event.

### A3 — Accessible map completion

508 tests. Retrofits M9. [`notes/a3-accessible-map.md`](notes/a3-accessible-map.md)

**Fixed**

- The search box rebuilt the whole widget on every keystroke and then called
  `focus()`. Restructured to a stable skeleton — `A11Y-FOCUS-005`.

### A2 — Current State View and semantic values

486 tests. Retrofits M8 and M16. [`notes/a2-current-state-view.md`](notes/a2-current-state-view.md)

**Added**

- One widget answering *what is true right now*, degrading section by section
  so a missing widget means less to say rather than an error.

### A1 — Widget accessibility contract

484 tests. Retrofits M6 and M7. [`notes/a1-widget-contract.md`](notes/a1-widget-contract.md)

**Added**

- Every widget declares an accessibility contract; registration refuses one
  that does not. Three refusal cases verified live.

### Addendum A — accessibility becomes architectural

**Added**

- [`docs/addendum-a-accessibility.md`](docs/addendum-a-accessibility.md), a
  normative accessibility specification covering WCAG 2.2 AA, NVDA/JAWS/Orca,
  refreshable braille, cognitive and executive-function support, and AAC.
  Requirement IDs beginning `A11Y-` are release gates.
- An **A-track** in the roadmap (A0–A8) interleaved with the feature
  milestones, with every `A11Y-` requirement assigned to a stage.
- An audit of the client at M16 against the addendum, recording what is already
  met with the evidence, and what is absent.

**Changed**

- **M30 "Accessibility review" is withdrawn.** A single late review is replaced
  by a foundation (A0), requirements inside every milestone, continuous axe and
  keyboard testing, and a final validation stage (A8) that validates an
  architecture rather than discovering its absence.
- **A0 blocks M17.** No further feature milestone starts until the foundation
  exists, because everything after it inherits the foundation's correctness.

**Recorded as a deviation**

- The addendum places the accessibility foundation immediately after clean
  Evennia setup and explicitly warns against retrofitting. It arrived at M16,
  with sixteen milestones built, so A0 *is* a retrofit. That is recorded
  openly rather than absorbed quietly, per the addendum's own rule that a MUST
  is never silently downgraded.
- Mitigating: accessibility has been a merge gate since `decision-003`, so the
  audit found `role="application"` absent, a single central announcer already in
  place, the transcript already non-live by explicit choice, no character-only
  shortcuts, and the dialog pattern already correct. The retrofit is narrower
  than the ordering implies.

**Open dependencies on release**

- A refreshable-braille tester on real hardware (an emulator does not
  substitute), and an AAC-familiar reviewer. Neither can be filled by tooling.

**Reconciled**

- The contrib README -- the file that ships with the client and the one an
  Evennia reviewer reads -- contained no mention of accessibility at all. It now
  documents what players get with no work from the game developer, what only the
  developer can supply (audio captions, `state_text`, action descriptions), and
  the honest conformance status.
- `decision-003` predated the addendum and still said M30 remained in the plan.
  Amended rather than reversed: the addendum agrees with the decision and goes
  further. The decision's one error was scope, not direction -- it assumed
  contrast and ARIA labels were safely fixable late, whereas braille review
  position and cognitive orientation turn out to be structural too.
- The M33 note still deferred to M30. It now points at A8, and records that
  voice sharpens the question rather than settling it: A8 would otherwise
  validate an interface about to gain an entire new input mode.
- Addendum A cites a parent blueprint held outside this repository, so its
  "section 76"-style references point somewhere a reader here cannot follow.
  Recorded as a known gap rather than left dangling.
- Added `docs/README.md` as an index.

---

### Addendum C — mature client engine (E-track)

**Added**

- [`docs/addendum-c-engine.md`](docs/addendum-c-engine.md): a normative event
  pipeline contract, capture/replay tooling, non-destructive presentation rules,
  automation groups, a unified validator and sanitised diagnostics.
- An **E-track** (E0–E6) in the roadmap.
- [`decision-005`](notes/decision-005-genie5-clean-room.md) — Genie5 is a design
  reference, never a source.

**Changed — a scheduling decision, not a preference**

- **E0 and E1 now come before M17.** M17 builds the canonical log and Review
  Mode, and those decisions determine the foundation that display rules,
  accessibility announcements, replay testing and every future diagnostic sit
  on. Building M17 first would mean rebuilding it. A0 already demonstrated how
  much cheaper an ordering fix is before twelve things depend on it.
- The integration documentation now teaches in the order a newcomer needs it:
  zero config → Discovery → bindings → providers. The in-client developer help
  leads with the three levels instead of the provider class.

**The rules this establishes**

- **Presentation can never rewrite reality.** Highlight, substitute, filter,
  hide and collapse may not touch the store, the canonical event, the canonical
  log, server state or provider data.
- **A trigger fires on canonical text, not on what is visible.** Hiding a line
  is a display choice; it is not a fact about the game. This is the most common
  bug in clients that treat gagging as deletion.
- **A visual filter never silently suppresses an announcement.** A player who
  hid combat spam and then needs to know what killed them must still be able to
  find out.
- **Hidden is not deleted** — filtered events stay in search, Review Mode,
  canonical history and developer captures.
- **The ambiguity rule, project-wide:** where evidence cannot distinguish
  between valid interpretations, Aetos declines to guess. `unknown` beats wrong,
  and never silently choose the first candidate.

**Licensing**

- The engine ideas are informed by a review of Genie5, which is **GPL-3.0**.
  Aetos stays **BSD-3-Clause** for Evennia upstreaming, so this is ideas and
  research only. No Genie5 source, fixtures or implementation. The decision
  record also lists what is deliberately *not* borrowed: solutions to the
  text-reconstruction problem that Aetos does not have, because Evennia already
  holds authoritative structured state.

---

### A0 — Accessibility Foundation

First stage of the A-track. Blocked M17, and did.

**Added**

- An accessibility subsystem under `static/aetos/js/accessibility/`, loaded
  before everything else: preferences, announcement manager, focus manager and
  shortcut manager.
- Skip links, `<nav>` and `<aside>` landmarks, and a second (assertive)
  announcement region.
- `accessibility.css`: focus indicator, pointer targets, reduced motion,
  presentation intensity, a high-contrast palette and forced-colours handling.
- `browser-qa/qa-axe.js`, a development-only axe-core audit. Not a dependency of
  the contrib — a game developer needs no Node.

**Changed**

- **Every global keyboard shortcut moved out of its module.** `palette.js`,
  `help.js` and `workspaces.js` each bound their own key; all three now register
  with `AetosShortcutManager`. A key a module binds for itself cannot be listed,
  rebound or disabled, which leaves a player no recourse when it collides with
  their screen reader.
- Two rules are now enforced rather than encouraged, both by throwing:
  registering a bare character is refused (screen readers use single letters for
  structural navigation), and registering a shortcut without naming the palette
  command it accelerates is refused (no feature may exist only behind a
  keystroke).
- All announcements route through one manager with categories and priorities.
  Only connection and session failure reach the interrupting region. Combat is
  off by default; resources announce on thresholds only.

**Fixed — found by axe, invisible to a mouse**

- `scrollable-region-focusable`: the help article scrolls, and `tabindex="-1"`
  made it programmatically focusable but kept it out of the tab order — so a
  keyboard user could see there was more text and had no way to scroll to it.
- The same defect in the privacy panel's list.
- And a third, introduced by the first attempt at fixing the second:
  `role="group"` on the `<ul>` stripped its implicit list role and orphaned all
  fifteen `<li>` children. An accessibility fix is as capable of causing an
  accessibility defect as any other change.

**Tests** — 467 Python tests passing (up from 409). axe-core 4.13 clean across
six views including the high-contrast and minimal-stimulation presets.

---

### Addendum B — server-side discovery and easy game integration

**Added**

- [`docs/addendum-b-discovery.md`](docs/addendum-b-discovery.md), a normative
  specification for a declarative `AETOS_BINDINGS` layer and a server-side
  Discovery tool. `DISC-` IDs are release requirements.
- A **D-track** (D0–D6) in the roadmap, parallel to the M and A tracks and
  independent of both. It produces no player interface.

**Changed**

- The README's integration story inverts. It led with "write a provider class",
  which is correct and is also a wall; it now presents three levels — zero
  config, bindings, providers — with the provider example moved to Advanced.
- The claim that Aetos "never reaches into your data directly" was true of the
  runtime and became ambiguous once a development-time inspector was planned. It
  now distinguishes the two explicitly: the client never guesses during
  gameplay; Discovery is a separate server-side developer tool.

**The boundary this establishes**

- Bindings describe *where* data is; providers describe *how* it is calculated.
  `db.hp` is a location, `stats.get("health").current` is a method call. Keeping
  that line sharp is what stops the binding grammar becoming an undocumented
  programming language with no debugger.
- Discovery never runs during play, is unreachable from the player protocol,
  never transmits source to the browser, never modifies game files, and never
  executes the code it reads.
- Its hardest test is the one that sounds easiest: pointed at a pristine Evennia
  game it must find nothing at all.

---

### M16 — Inventory, equipment, target and effects

**Added**

- `AetosInventoryProvider`, `AetosEquipmentProvider`, `AetosTargetProvider` and
  `AetosEffectProvider`, with matching registry slots.
- `DefaultInventoryProvider`, reading ordinary `contents`. This is the only one
  of the four with a working default: carrying things is something every Evennia
  game has, so a pristine game gets an inventory panel with no code at all.
  Equipment slots, a current target and a buff list are genre decisions, so those
  three expose nothing rather than implying a system the game does not have.
- `character_state.py`, normalising all four sections. A provider is game code,
  so nothing it returns is trusted; one bad entry costs that entry, not the panel.
- Four client widgets in `character.js`. Inventory is ungated; the other three
  are gated on their capability flags.
- Carried items now carry their own context actions, resolved against the
  character rather than the room.

**Design notes**

- An effect's `remaining` is a *duration*, not a timestamp. The player's clock
  may be minutes off the server's, and an absolute time would be silently wrong
  for them.
- A countdown reaching zero shows the effect as **expiring**, never removing it.
  Only the server knows when an effect ends; a client that removed it on its own
  clock would show a player as clean while the server still had them poisoned.
- Effect gains and losses are announced; the second-by-second countdown is not.
  A live region updating every second would make the client unusable with a
  screen reader.
- Empty equipment slots are kept rather than dropped. "Nothing on your head" is
  information; omitting empty slots would make a bare character indistinguishable
  from a game with no equipment.
- A target's resources go through the *same* normaliser and the *same* renderer
  as the player's own, so the two can never disagree about thresholds or
  rounding.

**Tests** — 409 Python tests passing (up from 334).

---

### Documentation and release preparation

**Added**

- In-client help (`help.js`), opened with `F1` or from the command palette.
  Fifteen topics covering every feature, with worked examples and, for game
  developers, real provider and settings code.
  - Topics are gated on the same automation policy as the editors. A game that
    forbids scripting has no scripting topic — documenting a feature a player
    cannot use sends them looking for a button that is not there.
  - Every topic is individually registered in the palette, so searching for
    "privacy" reaches the privacy topic rather than a generic "Help" entry.
  - Two panes, both keyboard-operable; choosing a topic moves focus into the
    article so a screen-reader user lands on the content.
- `LICENSE` — BSD 3-Clause, matching Evennia's own so the contrib can be
  upstreamed without friction.
- Project `README.md` with hero shot, quick start, and an honest built/remaining
  split.
- `scripts/sync_contrib.py`, mirroring the working copy into
  `contrib/aetos_webclient/` so the published repository contains the actual
  client rather than only notes about it. `--check` fails on drift.
- This changelog.

**Changed**

- The contrib README's feature list, which had drifted three milestones behind
  the code, and its provider documentation, which listed four slots when there
  are eight.

---

### M15 — Command palette, automation editors, privacy panel

**Added**

- Command palette (`palette.js`), opened with `Ctrl+K` / `Cmd+K`, bound with
  capture at the document so it works from the game input.
- Editors for aliases, triggers, timers and scripts, clearing the UI work
  deferred from M12–M14.
- Privacy panel: counts read from storage rather than assumed, a statement of
  whether storage is persistent at all, and profile export/import.

**Design notes**

- The palette acts on the client and never sends game commands. The player
  already has a command line; a second one that looked similar but behaved
  differently would be a trap.
- Matching is subsequence, not substring — "elay" finds "Edit layout" — because
  a player half-remembers a name and types fragments of it.
- Clearing confirms with specifics: how many items, that it cannot be undone,
  that the game account is unaffected. "Are you sure?" without specifics is not
  informed consent.
- Import reports what it refused as well as what landed.

**Fixed**

- The palette and settings surfaces were defined *after* `window.Aetos` captured
  them, so `Aetos.palette` was null with no error — the same ordering fault as
  the M12 hotbar. Both are now guarded by tests.
- Overlays append to `<body>`, outside `.aetos-root`, so they did not inherit the
  client's font and rendered in the browser's default serif.

---

### M14 — Timers and Aetos Script

**Added**

- Scheduled timers.
- Aetos Script: tokenizer, parser and tree-walking interpreter. Not `eval` with a
  blocklist — the grammar has no property access, no indexing and no function
  definition, so there is nothing to escape from.
- Limits: 10,000 steps, 1,000 iterations per loop, 16 call levels, 250 ms
  runtime, 20,000 characters of source. These protect the player's own tab.

---

### M13 — Aliases and triggers

**Added**

- Alias engine with `$1`…`$9` and `$*` substitution, and no recursive expansion.
- Trigger engine on game output, plain text or regular expression, rate limited.

**Fixed**

- `$*` repeated the first argument: `tell $1 $*` on `tt Bob hello` produced
  "tell Bob Bob hello".
- A trigger never fired on its first match, because `lastFired[id] || 0`
  conflates "never fired" with "fired at time 0".

---

### M12 — Hotbars, macros and the command queue

**Added**

- Macros of up to five commands, a hotbar, and a visible cancellable queue that
  paces commands rather than flooding the server.

**Fixed**

- The hotbar was never registered: it was defined after `window.Aetos` captured
  it.

---

### M11 — Relationships, notes and personal points of interest

**Added**

- Private notes, relationship tags, map notes and POIs — all browser-local.

**Fixed**

- Saving a note wiped its tags, because a full replace treated an omitted field
  as an empty one. Saves now merge.

---

### M10 — Context actions

**Added**

- Context menus on every listed entity, reachable by right-click, the Context
  Menu key and Shift+F10 — the last two being the ones a keyboard user can press.
- Actions travel *with* the entity rather than in a parallel list, so a menu can
  never be rendered against the wrong target.

---

### M9 — Universal mapper

**Added**

- Local room graph built by walking visible exits, honouring `view` and `search`
  locks so secret exits stay hidden.
- A written description of the surroundings generated from the *same* graph as
  the picture, so the two cannot disagree.
- Route walking, sending ordinary movement commands one at a time.

---

### M8 — Generic resources

**Added**

- Resource meters for any numbers a game declares, with thresholds and spoken
  announcements on crossing.
- The number is always shown, not only the bar; severity is stated in words as
  well as colour.

---

### M7 — Workspaces, layout editing and the widget palette

**Added**

- Named workspaces, keyboard-operable layout editing, and a widget palette.

**Fixed**

- Every widget landed in `sidebar` because the registry's `normalize()` dropped
  `defaultRegion`.
- The console was squeezed to 303px: the workspace was a single flex row, so the
  bottom region sat beside `main`. Converted to CSS grid with named areas.
- Empty widgets rendered as empty boxes, because the layout manager and the
  widgets both wrote `panel.hidden`. Split into `hidden` (the player's choice)
  and `data-aetos-empty` (the widget's).

---

### M6 — Layout manager and widget registry

**Added**

- Widget registry with capability gating, and a region-based layout manager.

**Fixed**

- Widgets mounted after their data arrived stayed empty, because the store only
  notifies on change. `layout.add()` now primes on subscribe.

---

### M5 — Local storage and profile export/import

**Added**

- IndexedDB-backed storage across fifteen namespaces, scoped to the game's
  origin, with export and import of the whole profile as one JSON file.

---

### M4 — Client shell and first widgets

**Added**

- The Aetos shell, batched state store, and the first widgets.

**Fixed**

- Raw colour markup (`|wEvennia|n`) appeared in widgets: the Portal only converts
  the `text` outputfunc. Values are now split into `name` (plain, safe for
  commands) and `display` (HTML).
- `applySync` wiped the manifest, which arrives in its own message.
- The store used `requestAnimationFrame` alone, which does not run in a hidden
  tab, so subscribers never fired. Now a rAF/timeout race.
- The client did not fill the screen: `<html>` had no background and the root was
  sized at `100vh`. Also found the page carried no cache headers while embedding
  `browser_sessid`; a no-store directive was added.

---

### Phase 1 — Integration spike

**Added**

- Template override, static asset pipeline, versioned protocol and handshake,
  capability manifest, allowlist sanitiser.

**Fixed**

- `_classify` reported ordinary items as characters, because
  `hasattr(obj, "at_pre_puppet")` is true for every `DefaultObject`. A brass lamp
  appeared under "People Here". Now uses `settings.BASE_CHARACTER_TYPECLASS`.

**Corrected**

- `WEBCLIENT_TEMPLATE = "aetos"` does not work: `settings_default` builds
  `TEMPLATES` at import time. `AETOS_TEMPLATE_DIR` must be prepended to
  `TEMPLATES[0]["DIRS"]`.

---

### Phase 0 — Baseline

**Added**

- Clean-room lab against pristine Evennia 6.1.0, on a non-standard port.
- Interpreter detection parsing Evennia's own `requires-python`, so a developer
  is not forced to upgrade.
- Baseline test run, baseline screenshots, and an accessibility audit of the
  stock client to measure against.

**Decisions**

- [`decision-001`](notes/decision-001-python-version-policy.md) — develop on the
  latest Python, support anything Evennia supports.
- [`decision-002`](notes/decision-002-lab-port-allocation.md) — non-standard
  port, because other games run on this machine.
- [`decision-003`](notes/decision-003-accessibility-is-a-gate.md) —
  accessibility is a merge gate, not a later pass.
- [`decision-004`](notes/decision-004-self-contained-client.md) — self-contained.
  Eight CDN resources dropped, including two whose URLs were deprecated or
  unpinned. A ~20-line shim replaced jQuery for `evennia.js`'s single use of it.
