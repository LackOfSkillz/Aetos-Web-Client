# A1 -- Widget accessibility contract

Status: **COMPLETE**

Verification: 484 Python tests OK (up from 467). axe clean on the default
workspace after the change. All twelve widgets declare a contract; three
refusal cases verified live.

Retrofits M6 and M7.

## What was built

`accessibility` is now a **required** field on every widget definition:

```javascript
accessibility: {
    landmarkLabel:    "Your inventory",
    heading:          "Inventory",
    keyboardOperable: true,
    liveUpdates:      true,
    graphicalOnly:    false,      // optional
    textAlternative:  null        // required if graphicalOnly
}
```

`registry.register()` **throws** without it.

That is the entire point of A1. A widget author who has not thought about how
their widget is read cannot ship it by accident, and "we'll do accessibility
later" is no longer expressible in the API.

## Two fields with no default, deliberately

**`keyboardOperable`** must be stated. There is no safe default: assuming `true`
hides the widgets that are not, and assuming `false` slanders the ones that are.
The question "can this be used without a mouse" has to be answered by someone
who knows.

**`graphicalOnly` without `textAlternative` is refused outright.** A canvas with
no text form is not a widget with an accessibility gap; it is a widget half the
audience cannot use at all.

Notably the map declares `graphicalOnly: false` despite being an SVG, because
its written surroundings description is generated from the *same graph* as the
picture. It is not a graphic with a caption -- it is one dataset with two equal
renderings, which is what A.29 actually asks for.

## The metadata is consumed, not just collected

Metadata nothing reads is metadata that rots. The layout adapter now builds each
panel from the contract:

- the visible `<h2>` comes from `heading`
- `landmarkLabel` becomes `aria-label` **only when it differs from the heading**
  -- `aria-label` overrides `aria-labelledby`, so setting it unconditionally
  would silently detach every panel from its own heading for nothing
- `liveUpdates` becomes `data-aetos-live`, so QA can assert that a widget
  claiming live updates routes them through the announcement manager rather than
  inventing a live region
- `keyboardOperable: false` becomes `data-aetos-display-only`

Letting the two strings differ is useful rather than pedantic: a panel headed
"Effects" is announced as "Active effects", because a landmark name is read out
of context while a heading is read beside the thing it labels.

## BUG FOUND -- the contract stopped at the adapter boundary

Every widget declared its contract, the registry kept it, and every panel still
rendered `data-aetos-live="false"`.

`layout.js` builds an `instance` object from the definition with a hand-picked
set of fields, and hands *that* to the adapter. `accessibility` was not among
them, so the adapter received `undefined` and fell back for all twelve widgets
at once -- silently, because the fallback is `displayName`, which is usually the
same string.

Fixed by carrying it explicitly on the instance. Deliberately not by having the
adapter reach through `instance.definition`: the adapter's contract *is* the
instance, and an adapter that reached past it would break the moment a second
adapter was written -- which is the entire reason that boundary exists.

## A.26 and A.27 are conditional, and the condition is not met

Both apply *where such a control is used*. Aetos uses neither, so rather than
inventing a splitter to satisfy a requirement, both are recorded as not
applicable **with a test that fails the day that stops being true**.

- **A.26 (keyboard splitter).** There is no draggable boundary. Panels resize by
  keystroke on a selected panel in edit mode, so the requirement *behind* A.26
  -- resize without a pointer -- is met, while its specific mechanism has
  nothing to attach to.
- **A.27 (tabs).** Nothing in the client is a tab set.

## THREE TEST DEFECTS IN A ROW, ALL THE SAME SHAPE

Worth recording as a pattern rather than three incidents. Each was an
over-broad textual sweep that matched something legitimate:

1. Searching for `role="separator"` matched `menu.js`, where it is a **static
   menu divider** between the game's actions and the player's own.
2. Searching instead for `aria-valuenow` matched `resources.js`, where it is on
   `role="meter"` -- a **read-only gauge**, which is supposed to have one.
3. (Earlier, in A0) searching for `filter: contrast` matched the CSS comment
   explaining why a filter is the wrong approach.

The product was right all three times. The correct detector for a window
splitter turned out to be a separator that is *also* focusable or valued, which
is a two-part condition -- and I had been testing one half of it at a time.

The lesson is not "write better greps". It is that a structural test asserting
the *absence* of something needs the absence to be precisely characterised
first, or it will fail on the legitimate uses of whatever token it picked.

## Accessibility -- definition of done (A.97)

Answered for the contract mechanism itself:

- **Keyboard-findable / operable:** unchanged; A1 adds no controls.
- **Accessible name:** this is the milestone that guarantees one for every panel.
- **Semantic role:** panels remain `<section>` with a heading; no roles added.
- **Announces?** No. A1 declares which widgets *do*; it announces nothing itself.
- **Steals focus?** No.
- **Colour alone?** No new presentation.
- **Reduced motion / 200% / 400%:** unaffected -- no new layout.
- **Touch targets:** unchanged.
- **axe:** clean on the default workspace after the change.
- **Human AT testing required?** Not for this milestone. The contract's *claims*
  are what A8 will check -- a widget asserting `keyboardOperable: true` that is
  not is exactly the kind of thing only a person finds.
