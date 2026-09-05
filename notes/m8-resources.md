# M8 -- Generic resources and threshold announcements

Status: **COMPLETE**

Verification: 175 Python tests OK; 95 browser QA checks OK (22 resources,
38 layout, 35 storage).

## What exists

- `resources.py` -- server-side validation and normalisation of provider output.
- `static/aetos/js/resources.js` -- rendering and the threshold tracker.
- Resource widget registered as capability-gated (`requiredCapabilities:
  ["resources"]`), so a game exposing none never sees it offered.
- `templatetags/aetos_tags.py` -- versioned static URLs (see below).
- Lab-only demo provider proving the architecture end to end.

## Nothing knows what a resource means

Aetos never special-cases a resource name. The tests deliberately use Sanity,
Hull, Fuel, Favour, Oxygen and Blood rather than health and mana, so a hardcoded
assumption would fail. Presentation is a hint from the game (`gauge`, `radial`,
`number`, `percentage`, ...), never a rule.

Neither `resources` nor `actions` has a default provider that invents data. A
game with no resource system exposes none and simply gets no resource widget.

## Thresholds are in the schema, not bolted on

Blueprint revision 2 requires this at M8 rather than at the M30 accessibility
review, and the reason is structural: a resource that ticks every combat round
would produce continuous speech a screen-reader user cannot interrupt.

The game declares where the meaningful crossings are, because only the game knows
what counts as trouble. Aetos announces the crossing; it never decides what is
worth announcing.

Rules, all tested:

- First sight of a resource is **not** announced (connecting must not greet a
  player by reciting their own status).
- Only **downward** crossings announce. Recovering from 20% to 21% is not news.
- Staying below an already-crossed point does not re-announce.
- A single hit crossing several thresholds reports **only the most severe**.
- Re-crossing after recovering announces again.
- A resource declaring no thresholds is never announced at all.

`at` is read as a fraction for a bounded resource and as an absolute value
otherwise, so a game can say "below 20%" or "below 3 doses" without a second
field to get wrong.

Verified end to end against the running game: 100 -> 40 announced "Health below
half."; 40 -> 10 announced "Health critical."; 10 -> 95 announced nothing.

## Accessibility built in

- The numeric value is **always** rendered as text. A bar alone conveys nothing
  to a screen reader and nothing precise to anyone.
- Bars carry `role="meter"` with `aria-valuenow`/`valuemax`/`label`, so
  assistive technology reports the value without Aetos describing the bar.
- Severity is stated in words -- `(warning)`, `(critical)` -- with colour only
  reinforcing it.

## BUG FOUND AND FIXED -- state never reached widgets in a hidden tab

The store batched notifications through `requestAnimationFrame` alone. Browsers
**do not run rAF in a hidden or backgrounded tab**, so subscribers were never
notified while the tab was not visible.

Consequence: a player who switched tabs kept receiving state that never reached a
widget, and returned to a client showing the world as it was when they left --
wrong room, wrong health, wrong everything, with no error and no clue why.
Blueprint section 60 lists browser sleep and tab resume as cases that must work.

Fixed by arming rAF and a timeout together, first to fire wins: visible tabs
still coalesce updates to paint, hidden tabs still get their updates.

Found only because the QA browser runs pages that are not composited, which made
the hidden-tab case the *default* rather than an edge case. A visible-tab-only
test would never have caught it.

## BUG FOUND AND FIXED -- widgets mounted after their data stayed empty

The store notifies on change, so a widget mounted *after* its section already
arrived was never told about it and sat empty until the next change.

This affected any widget added from the palette mid-session, and any widget whose
mount lost a race with the first sync. The layout manager now primes each
subscription with the current value at mount time, so a widget is correct
regardless of when it happens to be mounted.

## Versioned static assets (real upgrade bug, found via lab friction)

Static files are served with caching headers. After a game upgrades Evennia (and
with it Aetos), a returning player's browser can keep serving the *previous*
Aetos JavaScript against the *new* server. The symptoms are baffling -- features
silently missing, or a protocol mismatch that looks like a server fault -- and
the player has no reason to suspect their cache.

`{% aetos_static %}` stamps each Aetos asset URL with `constants.ASSET_VERSION`,
so an upgrade changes the URL. While `DEBUG` is on it appends the file's mtime
instead, so a contributor editing Aetos JavaScript sees their change immediately
rather than concluding their code does not work.

This surfaced as repeated lab confusion -- an edit appearing to have no effect --
before being recognised as a genuine defect that would affect real upgrades.

## Deferred

- Radial and vertical gauge rendering (the display hints are accepted and
  validated; only the alternative visual forms are missing).
- Resource grouping (section 19's "Resource Group" widget) -- needs M16.
