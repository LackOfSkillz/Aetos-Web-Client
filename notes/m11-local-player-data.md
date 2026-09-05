# M11 -- Relationships, notes and personal POIs

Status: **COMPLETE**

Verification: 242 Python tests OK; 154 browser QA checks OK
(33 local data, 24 context menu, 22 resources, 38 layout, 35 storage).

## What exists

- `relationships.js` -- Friend / Neutral / Enemy plus arbitrary local tags.
- `notes.js` -- notebook with search, filter, tags, pinning; and the notes widget.
- `dialog.js` -- accessible modal dialog, used by the note editor.
- Menu groups separating the game's actions from the player's own.
- `browser-qa/qa-local-data.js` -- 33 checks.

## Privacy is enforced two ways, not asserted once

Blueprint section 2.3 forbids this data reaching the server, and section 24 adds
that a relationship tag must not affect server-side social systems.

**Behavioural** (`qa-local-data.js`): the command dispatcher is wrapped while
relationships are set, tags added, and notes saved and deleted. Nothing is sent.

**Structural** (`test_local_privacy.py`): there is nowhere for it to go.

- The only Aetos inputfuncs are `aetos_hello` and `aetos_request_sync`. Evennia
  treats every public function in that module as an inputfunc, so a new one
  accepting notes would be a silent privacy hole -- the set is pinned.
- No protocol message names any personal-data category.
- No models, no migrations.
- No Python module writes any of these categories to `.db.` or `attributes.add`.
- Session state is pinned to exactly `aetos_protocol` and `aetos_capabilities` --
  transient connection state, not a stored profile.
- `relationships.js` and `notes.js` contain no reference to the transport, the
  dispatcher, WebSocket or fetch.

The distinction matters: a behavioural test proves nothing was sent on the paths
it exercised. The structural tests prove there is no path.

**Local menu actions carry a `run` function rather than a `command`.** There is
literally nothing for the dispatcher to transmit. The guarantee is in the shape
of the data, not in remembering not to wire it up.

## The menu tells the player which is which

Game actions and private ones are separated by a `role="separator"`, styled
differently, and each local item carries `aria-description="private to this
browser"`. A player marking someone an Enemy must not have to wonder whether the
game was told -- and a screen-reader user gets the same distinction the separator
conveys visually.

## Keyed by name, not by id

A player thinks "Aric", not "#42". Database ids are also not stable across the
things a player cares about, and mean nothing on a different game. Lookup is
case-insensitive, because a player types names however they like.

## "No opinion" leaves no trace

Setting someone to Neutral with no tags *removes* the record rather than storing
a row saying nothing. Un-tagging someone should leave nothing behind -- this is
the player's private data, and the absence of an opinion is not a fact worth
recording. Neutral *with* tags is kept, because the tags are still theirs.

## BUG FOUND AND FIXED -- saving a note wiped its tags

`notes.save()` replaced the whole record, so a caller that omitted `tags` silently
deleted the player's own tags. Caught by the QA suite reporting only one tag
where two were expected.

Fixed to merge: an omitted field means "leave it alone", not "delete it".
Clearing is still possible by passing an explicit empty value. For personal data
this is the right default -- quiet data loss is far worse than an extra explicit
step to clear something.

## POIs are notes, not a parallel system

Map notes and personal POIs (section 26) are notes with a room subject and a
`poi` flag. Same storage, same search, same privacy guarantee, one implementation
to keep correct rather than two that drift.

## Dialog accessibility

The note editor uses a proper modal: `role="dialog"`, `aria-modal`, an accessible
name, focus moved in on open and **returned to the opener** on close, Escape to
cancel, and a real focus trap.

The trap matters most. Without it, Tab walks into the page behind the dialog,
where a screen-reader user can operate controls they cannot see and have no
obvious way back.

## Deferred

- Right-click POI creation directly on map rooms (notes on rooms work today via
  the exits menu; a map-node menu belongs with pan/zoom).
- Relationship display on entity buttons -- `decorate()` exists and is tested;
  showing the tag in the people list is presentation work for M16's target HUD.
