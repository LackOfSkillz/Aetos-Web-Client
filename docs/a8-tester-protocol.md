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

Two things worth knowing:

- **Everything is stored in your browser.** The game is never told what you
  turned on, and closing the tab loses nothing but a session.
- **The Accessibility button in the bar at the top** opens the options panel;
  `Ctrl+Shift+A` does the same. Turning it off hides the options and changes no
  setting.

Please record what you *tried to do* and what happened, not what you think we
want to hear. A blunt "I gave up after two minutes" is more useful than a
completed script.

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

## 7. Keyboard-only, mouse unplugged (A.88)

Physically unplug it, or turn it off. Then do tasks 1–14 above.

This has been reasoned about and never demonstrated — synthetic keystrokes in our
test harness do not reach the page reliably, so nobody has actually driven this
client without a pointer. You would be the first.

---

## Recording

One line per task is plenty:

```text
task | worked? | keystrokes | what surprised you
```

And at the end, three sentences: what was worst, what was better than expected,
and whether you would use it.

Anything you report is going into the record with your name against it if you
want it there, and into the release notes as a limitation if it is not fixed.
