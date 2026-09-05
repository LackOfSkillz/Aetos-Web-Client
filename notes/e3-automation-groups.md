# E3 -- Automation groups

Status: **COMPLETE**

Verification: 637 Python tests OK (up from 615). axe clean on the group manager.
Every branch of the effective-state rule verified live.

Also closes the editor gap E2 left open.

## The rule

```text
effective = rule.enabled AND group.enabled
```

Both halves matter and neither overrides the other. Verified live:

```text
enabled rule,  group on    -> runs
disabled rule, group on    -> does NOT run
enabled rule,  group off   -> does NOT run
enabled rule,  unknown group -> runs
```

The second line is the one worth stating. **A group switch never re-enables a
rule the player turned off individually.** They made that decision; a group is a
convenience, not an override.

The fourth matters too: a rule referencing a group the player has since deleted
keeps working. Silent inertness is the failure this module exists to make
visible, and introducing it in the module itself would be perverse.

## The gate: a group changes only when the player changes it

A11Y-COG-007. Nothing else touches it -- not a workspace, not a game event, not
a route. Asserted three ways: `workspaces.js` does not reference the module at
all, no pipeline stage calls `setEnabled` or `toggle`, and no toggle call in the
shell sits near workspace code.

Switching to a "Combat" layout is a statement about where panels go. It is not
consent for combat triggers to start firing, and mid-fight is the worst possible
moment to discover the difference -- in a game with rules about automation, it
is also the most expensive.

## Suppression is visible

The group manager states, for each group, how many rules it currently
suppresses:

```text
Combat      off, 4 rules suppressed
Crafting    on, 2 rules
```

Because a rule that silently does nothing is indistinguishable from a rule that
is broken, and a player without that distinction spends their evening debugging
the wrong thing.

Counts are **derived**, not stored. A stored count can disagree with reality; a
derived one cannot.

## One gate, consulted five times

`groups.allows(rule)` lives in one place and each engine calls it. Five copies
of a two-term expression is five chances for one to drift, and the one that
drifts will be the one nobody tests.

Each engine falls back to its own `enabled` flag when the module is absent, so a
client without it behaves exactly as it did before groups existed. Losing
grouping is acceptable; losing automation is not.

## The editors, including E2's

**The display-rule editor** promised at the end of E2 is here, which was the
whole reason for deferring it -- both editors need the same group field, and
building one now and rebuilding it in a fortnight would have been worse.

Its description says plainly what a rule does *not* do:

> Changes how game output looks. It never changes what happened: a hidden line
> is still in your history, still searchable, and still triggers whatever was
> watching for it.

That wording is deliberate. "Filter" reads like "delete" to anyone who has used
another client, and the difference is the entire point of E2.

The group manager says the equivalent thing about itself:

> Nothing changes a group except you. Switching workspace does not, and neither
> does anything the game sends.

Toggles expose `aria-pressed`, so the switch is readable to somebody who cannot
see the styling.

## Namespace repurposed rather than added

`automation_profiles` was reserved in M5 and never used. Groups took it instead
of claiming a new namespace, which avoids a second `DB_VERSION` bump one
milestone after the first. The privacy panel label moved with it -- "Automation
groups" -- so a player still sees a name matching what they configured.

## BUG: the export landed in the wrong object, twice

`Aetos.automationGroups` came back undefined. My patch anchored on
`displayRules: displayRules,` -- which by then appeared **twice**: once in the
services handed to `settings`, once in the real export. The first match won.

The second attempt was worse. I filtered by `line.startswith("            ")`
for a twelve-space indent, which is also true of every sixteen-space line, so it
matched the same wrong site again. Fixed by comparing the indent exactly.

Fourth occurrence of this family in `aetos.js` -- M12's hotbar, M15's palette,
M16's `help`, now this. The shape is always the same: an anchor that was unique
when written and is not any more. The lesson is not "be careful with replace",
it is that **an anchor chosen from a growing file needs to be verified unique at
the moment it is used**, which a count assertion does in one line.

## Test defect corrected

`test_rules_run_after_state_log_and_automation` asserted
`displayRules.present(event` on one line. E3 wrapped that call across lines when
it started passing the active group map, and the assertion broke on formatting
alone while the behaviour was unchanged. Now matched on the call rather than its
arguments.

## Accessibility -- definition of done (A.97)

- **Keyboard-findable / operable:** the group manager and both editors are
  dialogs reached from the palette; every toggle is a real button.
- **Accessible name:** the group list is a labelled, focusable region; toggles
  carry the group name.
- **Announces?** Yes, on toggle -- through the announcement manager, at
  `important`, saying which way it went and how many rules moved. A switch whose
  effect is invisible is a switch nobody trusts.
- **Steals focus?** No.
- **Colour alone?** No -- `aria-pressed` plus the "on/off, N rules" text.
- **Cognitive interruption?** This milestone *reduces* it: one switch instead of
  thirty, and an explicit statement that nothing flips it behind the player's
  back.
- **axe:** clean on the group manager.
- **Human AT testing:** yes, at A8. The question a machine cannot answer is
  whether "off, 4 rules suppressed" is enough to lead someone to the right rule,
  or whether they need to be taken to it.
