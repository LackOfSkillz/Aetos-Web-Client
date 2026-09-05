# Compatibility

What Aetos runs on, what sets the limits, and — separately, because they are not
the same thing — what has actually been tested.

## Browsers

| Engine | Minimum | First released |
|---|---|---|
| Chrome / Edge / Chromium | **87** | November 2020 |
| Firefox | **75** | April 2020 |
| Safari / iOS Safari | **14.1** | April 2021 |

**The floor is set by CSS, not by JavaScript.** That is deliberate. Aetos is
written in ES5 plus promises — no arrow functions, no `let`, no template
literals, no classes — because a syntax the browser cannot parse takes the whole
file with it and there is no way to feature-detect your way out of a parse error.
A layout feature the browser lacks makes the spacing wrong. One of those is
recoverable and the other is a white page.

What each limit comes from:

| Feature | Chrome | Firefox | Safari | Why it is used |
|---|---|---|---|---|
| `gap` on flex containers | 84 | 63 | **14.1** | Spacing between panel controls |
| `inset` shorthand | **87** | 66 | 14.1 | Overlay positioning |
| `min()` / `max()` / `clamp()` | 79 | **75** | 13.1 | Panels that scale without breaking |
| CSS grid | 57 | 52 | 10.1 | The workspace layout |
| Custom properties | 49 | 31 | 9.1 | Themes and accessibility tokens |

Below the floor the client still loads and plays: `gap` degrades to items sitting
flush against one another, which is ugly and legible. Nothing throws.

These numbers are not maintained by hand. `tests/test_compatibility.py` holds the
feature table, scans the stylesheets, computes the floor, and fails if this page
disagrees with it. Adding a CSS feature with a later baseline fails the build
until either the feature goes or this page moves.

### Optional, with a working fallback

| Feature | Absent means | Tested? |
|---|---|---|
| `:focus-visible` | The focus ring shows for pointer clicks too — more often than needed, never less | Yes, by construction |
| Service worker | No offline shell and no install; everything else is unchanged | Not verified live — see below |
| `ResizeObserver` | Panels re-layout on window resize rather than on container resize | Yes |
| IndexedDB | Local data falls back to `localStorage`; the privacy panel says which is in use | Yes |
| `requestAnimationFrame` | Output batches on a timer instead | Yes |
| `forced-colors` | Windows High Contrast refinements are skipped; the ordinary theme applies | Yes |

**On `:focus-visible` in particular.** A comma-separated selector list is
all-or-nothing in CSS: one selector the browser does not recognise invalidates
the *entire* rule. So this, which looks like a fallback, is not one —

```css
/* Wrong. A browser without :focus-visible loses BOTH. */
.thing:focus,
.thing:focus-visible { outline: 3px solid; }
```

Aetos writes it as three separate rules instead: `:focus` for everybody,
`:focus-visible` for browsers that have it, and `:focus:not(:focus-visible)` to
quieten pointer focus — that last one being itself discarded by browsers without
the selector, which is exactly right. They keep the always-on ring rather than
losing it. An older browser shows the indicator slightly more often than
necessary, which is the correct direction to fail in: a keyboard user who cannot
see focus cannot navigate, and a mouse user who sees one ring too many is mildly
annoyed.

## Evennia and Python

| | Requirement |
|---|---|
| Evennia | 1.0 or later (developed against 6.1) |
| Python | Whatever your Evennia supports — Aetos declares no constraint of its own |
| Django | Whatever your Evennia ships |
| Database | Any Evennia supports. Aetos stores nothing server-side. |

Aetos adds **no Python dependencies**, requires no Node and no JavaScript build
step, and loads nothing from a CDN. The only Evennia internals it touches are the
documented webclient view context and `INPUT_FUNC_MODULES`; Evennia's transport
and Portal are untouched.

## What has actually been tested

This is the part of a compatibility page that is usually silent, so it is stated
plainly. "Tested" below means somebody or something exercised the client there,
not that a support table says it should work.

| Platform | Status |
|---|---|
| Chromium 148 on Windows 11 | **Tested** — every milestone, plus automated accessibility checks |
| Everything else in the table above | **Expected from feature support data. Not run.** |
| Firefox, Safari, iOS, Android | **Not tested.** |
| Service worker lifecycle | **Not verified anywhere.** The development browser will not register one, so installing, activating, serving from cache and handing over to a new version have never been observed. The code is unit-tested and its endpoints verified with `curl`; that proves the shape, not the behaviour. |

Cross-browser and mobile testing is scheduled with the assistive-technology
validation stage, where real devices are in the loop for other reasons anyway.

## Assistive technology

Covered separately and to a stricter standard in
[Addendum A](addendum-a-accessibility.md). The short version, unchanged from the
contrib's README: Aetos is **designed toward** WCAG 2.2 Level AA and claims
neither compliance nor screen-reader nor braille compatibility, because the
testing that would justify those claims has not been done. Automated checks
report no violations at any severity, which finds missing names, broken roles and
unreachable regions — and cannot tell whether a label means anything.

## Reporting an incompatibility

The most useful report says which browser and version, what you expected, and
what happened instead. If the client loaded at all, the developer inspector
(`AETOS_DIAGNOSTICS = True`) will capture a session to a file that reproduces it
exactly.
