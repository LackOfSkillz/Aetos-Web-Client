# A8 — assistive-technology testing protocol

For the people whose judgement this stage depends on. The automated half is done
and clean; what remains cannot be automated and is not a formality.

**The rule that governs this whole document (A.95):** *"takes too many
keystrokes", "focus jumps", "braille keeps losing its place"* are **defects**,
even when every automated test passes. If something is technically operable and
genuinely unpleasant, say so and it will be treated as a bug. You are not being
asked to confirm that the boxes are ticked.

**And A.100:** nothing gets claimed without evidence. Until you have tested it,
the README says *"designed toward WCAG 2.2 AA"* and claims no screen-reader,
braille or AAC compatibility at all. If your answer is "this does not work for
me", that is a result, and the honest thing it produces is a smaller claim.

---

## Before you start

The client runs at whatever address the game gives you. Nothing needs
installing.

Three things worth knowing:

- **Everything is stored in your browser.** The game is never told what you
  turned on, and closing the tab loses nothing but a session.
- **There are two modes**, and a switch at the top right labelled *Accessible
  mode* moves between them. `Ctrl+Shift+A` does the same from anywhere.
  - **Standard mode** is the client as it comes.
  - **Accessible mode** applies the accommodations you have chosen.
  - Switching back to standard **stops them applying and erases nothing**, so
    you can look and come back with one keystroke.
- **The Options button beside the switch** opens the settings. It works in both
  modes: standard mode offers text size, sound, gestures and orientation help,
  and accessible mode adds contrast, motion, announcements and layout to that
  list.

Please record what you *tried to do* and what happened, not what you think we
want to hear. A blunt "I gave up after two minutes" is more useful than a
completed script.

---

## 0. Both modes, and the way back

**Do this section first, in every technology you are testing.** It is the newest
part of the client, the least tested, and the part most likely to strand
somebody.

The design bet is that the switch is safe to try because nothing is erased. That
is a claim about how it *feels* to somebody who cannot read the screen, and only
you can tell us whether it holds.

```text
 1  Find the mode switch without being told where it is. How long?
 2  Is it obvious that it is a switch rather than a button?
 3  What does your screen reader announce when you focus it? When you flip it?
 4  Turn accessible mode on. Set two or three things you actually want.
 5  Turn it off. What were you told? Was it enough to know what changed?
 6  WITHOUT looking anything up: get back to accessible mode.
 7  Did everything you chose come back?
 8  Now do 4-6 again with the text size at its largest.
 9  And again with high contrast on.
10  Open the Options in STANDARD mode. Is it clear why the list is shorter?
11  Change the text size in standard mode. Does it stick after a reload?
```

**The questions that decide whether this design is right:**

- At step 6, did you ever feel stuck? For how long?
- Would you have found the way back if nobody had told you `Ctrl+Shift+A`?
- Does "standard mode" feel like a reasonable place to be, or like something
  broken?
- Is "your settings are kept" believable from the interface, or did you have to
  test it to trust it?
- Would you rather the switch asked you to confirm before turning things off?

**Everything below should be run in BOTH modes** unless it says otherwise. Where
a task behaves differently in the two, that difference is the finding.

---

## 1. Screen reader — NVDA (A.89)

Windows. Any recent NVDA. Please note your version.

Work through these as a player would, in order. For each, record: **did it work**,
**how many keystrokes**, and **did anything surprise you**.

```text
 1  Arrive at the page. What is read first? Is it clear what this is?
 2  Find the command input without using a mouse.
 3  Send a command and hear the reply.
 4  Send five commands in a row. Is the output readable or a wall?
 5  Move by landmark. Are the regions named usefully?
 6  Move by heading. Is the structure right?
 7  Find the room description.
 8  Find what else is in the room.
 9  Find your inventory.
10  Read the map's text equivalent. Is it a map or a list?
11  Walk one exit using the interface rather than typing.
12  Open help (F1). Find a topic. Read it. Close it.
13  Open the command palette (Ctrl+K). Search for something. Run it.
14  Open the accessibility options. Change one thing. Confirm it happened.
15  Turn on high contrast. Does anything read differently?
16  Change how much is announced. Does it take effect?
17  Enter Review Mode. Read back through what happened.
18  Leave Review Mode. Are you where you expected?
19  Search the history for a word you saw earlier.
20  Trigger a resource threshold announcement. Was it useful or noise?
21  Let the connection drop. Are you told, and does it interrupt appropriately?
22  Type a command while disconnected. Are you told it did not send?
23  Reconnect. Is it clear the panels are current again?
24  Open the settings panel. Find one setting and change it.
25  Create an alias. Use it.
26  Create a macro. Run it.
27  Open a context menu on something in the room (Shift+F10 or the menu key).
28  Use an action from that menu.
29  Add a private note about something.
30  Read your notes back.
31  Open the privacy panel. Is it clear what is stored?
32  Export your profile.
33  Turn on the picture and word board. Compose something. Send it.
34  Switch to the simplified layout. Is anything you needed now missing?
35  Turn everything you changed back off. Did it all come back?
```

**Then, the questions that matter more than the list:**

- Which of those took more keystrokes than it was worth?
- Did any of them work in one mode and not the other?
- Did focus ever end up somewhere you did not expect?
- Was anything read out that you did not want, repeatedly?
- Was anything *not* read out that you needed?
- Would you play a game in this?

---

## 2. Screen reader — JAWS (A.90)

The same list, or as much of it as your time allows. Tasks 1–14 and 21–23 are
the core set if you only have an hour.

Note especially anything where JAWS and NVDA differ — those are usually our bugs,
not the screen reader's.

---

## 3. Screen reader — Orca (A.91)

Linux, on Firefox **and** on a Chromium browser. The core set above.

We have never run the client on Firefox at all, so please note anything visually
or behaviourally odd as well.

---

## 4. Refreshable braille (A.92)

**Real hardware.** A.35 is explicit that an emulator or the NVDA braille viewer
does not substitute for this, so please do not feel the need to work around not
having a display — tell us and we will wait.

Please note your display and its cell count.

Run the list once in each mode.

```text
1  Read a room description on the display.
2  Read five lines of game output in sequence.
3  Read a resource value. Is "HP 82/100" what arrives, or something longer?
4  Move through the panels. Does the display keep its place?
5  Enter Review Mode and move back through history. Does it keep its place?
6  Leave Review Mode. Where does the display land?
7  Read a table (the `who` list, or your inventory).
8  Read the map's text equivalent.
9  Type a command and read the reply.
10 Let the connection drop and come back. What does the display show?
```

**The question this exists to answer:** does the display keep losing position,
and if so, where? That specific complaint is why this stage requires hardware.

There is a setting, "compact status", meant to produce `HP 82/100` rather than
`Health, 82 out of 100`. Please tell us whether it is compact enough, or too
compact to follow.

---

## 5. Cognitive scenario testing (A.93)

Not a checklist. Scenarios, ideally with someone who has not seen the client.

```text
A  You have been away for ten minutes and a lot happened. Catch up.
B  You do not know where you are or how you got here. Find out.
C  You started doing something and were interrupted. What was it?
D  The screen has too much on it. Make it calmer.
E  Something is announcing too often. Make it stop, without losing it.
F  You want to come back to this later. Leave yourself a note.
```

For each: how long, how many wrong turns, and where did they look first?

Where somebody looked *first* is the most useful thing you can write down. It is
usually not where we put it.

---

## 6. AAC and symbol-supported use (A.94)

**This is the review that decides whether the project may describe the board as
serving anyone at all.** It currently does not, and will not until you have
looked at it.

The board offers categories of concepts, each with a symbol and a word, which
compose into an ordinary game command.

```text
1  Is the concept organisation sensible, or is it a programmer's idea of one?
2  Are the categories the ones a user would expect, in an order that helps?
3  Does anything assume literacy it should not?
4  Does anything assume a symbol set the user may not know?
5  Is "symbol and word together" the right default, or patronising?
6  How many selections does a simple request take? Is that acceptable?
7  What is missing that somebody would need in the first five minutes?
8  Is anything here actively wrong or offensive?
```

Two things we have deliberately **not** done, which we would like challenged:

- **No prediction.** The board never guesses the next concept. We thought a board
  that reorders itself under somebody's hands is harder to learn, not easier. Is
  that right?
- **No bundled symbol set.** Symbol packs are installed by the player or the
  game. Is shipping none the right default, or an obstacle?

If your answer is "this is not usable and should not be described as AAC", that
is a complete and welcome result.

---

## 7. Text size (A11Y-VIS-001, and a specific complaint)

Its own section because it is the thing people ask for most and the thing
browser zoom does worst.

```text
1  Make the text bigger without opening any settings. (There are palette
   commands for it -- did you find them?)
2  Take it to its largest. Is anything cut off, overlapped or unreachable?
3  At that size, can you still find and use the mode switch?
4  Narrow the window to about a phone's width and repeat 2 and 3.
5  Does the size survive switching modes? A reload?
6  Compare with your browser's own zoom. Which do you prefer, and why?
```

We think browser zoom is a poor substitute because it scales the page rather
than the client. Tell us if that is wrong.

## 8. Keyboard-only, mouse unplugged (A.88)

Physically unplug it, or turn it off. Then do tasks 1–14 above, **in both
modes**.

This has been reasoned about and never demonstrated — synthetic keystrokes in our
test harness do not reach the page reliably, so nobody has actually driven this
client without a pointer. You would be the first.

---

## Recording

One line per task is plenty:

```text
task | mode | worked? | keystrokes | what surprised you
```

The mode column matters: a task that works in one and not the other is the most
useful kind of report we can get, because it means the two interfaces have
drifted apart somewhere we did not look.

And at the end, three sentences: what was worst, what was better than expected,
and whether you would use it.

Anything you report is going into the record with your name against it if you
want it there, and into the release notes as a limitation if it is not fixed.
