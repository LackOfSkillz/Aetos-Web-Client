# M27 -- Configuration validation

Status: **COMPLETE**

Verification: 1156 Python tests OK (up from 1134). Both installation checks
proved live by deliberately breaking the laboratory's settings and reading what
`evennia` printed, then restoring them.

## The gap was not validation. It was timing.

Every Aetos setting was already validated, and validated well: a malformed
`AETOS_UI` raises with the section, the key, and a list of what would have been
valid. `AETOS_PROVIDERS` reports the slot, the path and the import error.
`AETOS_FEATURES` names the key and the type it got.

All of it ran **when a player connected**, and reported to that player's browser
and to a log nobody was watching. A developer could misconfigure Aetos on Monday
and hear about it from a player on Friday, described as "the map thing isn't
working".

So M27 adds no new validation. It moves the existing validators to
`evennia start` through Django's system-check framework, and adds checks for the
one thing nothing validated at all: whether Aetos is installed correctly.

## The check worth the milestone

**Template precedence is the only Aetos misconfiguration with no symptom.**

Installing the app but not inserting the template directory produces a game that
starts cleanly, serves `/webclient/` correctly, and shows Evennia's stock client.
Nothing is broken. There is no error to search for. The developer's reasonable
conclusion is that Aetos does not work.

Worse, there is a second version one step further on. `TEMPLATES[0]["DIRS"]` is
searched in order, so:

```python
TEMPLATES[0]["DIRS"].append(AETOS_TEMPLATE_DIR)     # silently loses
TEMPLATES[0]["DIRS"].insert(0, AETOS_TEMPLATE_DIR)  # correct
```

`append` puts Aetos *after* Evennia's own `web/templates`, which has a
`webclient.html` of its own. The setting looks right. The path is present. A
developer checking "is AETOS_TEMPLATE_DIR in DIRS?" gets yes.

Both are now caught, and `aetos.W002` names the directory that is winning:

```text
?: (aetos.W002) Aetos templates are in TEMPLATES[0]["DIRS"] but after a
   directory that also supplies a webclient template, so Evennia's stock
   client will still win.
   HINT: Use insert(0, AETOS_TEMPLATE_DIR) rather than append(...). The first
   matching directory wins, and the entry ahead of Aetos is
   'c:\\dev\\aetos_webclient\\evennia\\evennia\\web\\templates'.
```

Naming the competing path matters. "Something is ahead of you" is a fact;
"`evennia/web/templates` is ahead of you" is a fix.

The check finds it by looking for a `webclient.html` on disk rather than by
importing Evennia's settings to ask which directory is its own. The question is
which directory *wins the lookup*, and a game that copied Evennia's templates
somewhere else wins it just the same.

## Two decisions a reviewer should question

**Everything is a Warning, never an Error.** Django refuses to start on a check
Error. Aetos is an optional webclient on a game that also serves telnet players,
and stopping a whole MUD because its web interface has a typo in a settings key
would be a worse failure than the typo. A startup warning is loud enough: it
prints every time, it names the fix, and the players already connected stay
connected.

**The checks call the runtime's own validators rather than copies.** A check with
its own idea of what is valid is worse than no check, because it *disagrees* --
passing at startup and failing at request time, or the reverse, and sending the
developer to argue with the wrong error. The table in `checks.py` is five pairs
of (setting name, the function the server actually calls).

The consequence is that the original messages survive intact. A check that
replaced "AETOS_UI has unknown section 'resourcs'. Valid sections: panels,
resources" with "AETOS_UI is invalid" would be strictly less useful than the
exception it was meant to surface earlier.

## What cannot be checked, and why it is written down

Aetos's checks are registered by its own `AppConfig.ready()`, so **they only run
if the app is in `INSTALLED_APPS`**. A game that added the template directory and
the inputfuncs but forgot that line gets no warning at all, because the checks
are not loaded to give one.

That is unfixable from inside the contrib and it is the obvious check to reach
for, so it is recorded in `checks.py`'s own docstring: the next person to try
will find out why it cannot work before they build it. The failure has its own
loud symptom -- every static asset 404s and the client renders unstyled -- and
the README's troubleshooting now leads with "if you are seeing no Aetos warnings
*and* no Aetos, that is the line to check".

## Two test defects fixed while writing the tests

Both of the kind this project keeps producing, and both mine, from the first
draft of this milestone's own tests:

- **A test asserting on a formatted Windows path**, with two layers of escaping
  to make it match. It was testing the platform's path rendering rather than the
  message. Now asserts the directory's leaf name appears in the hint.
- **A test claiming to check "a game that configures nothing"** while the
  laboratory's own settings file supplied four of the five settings. It passed
  because those settings happen to be valid, which means it was asserting a fact
  about this deployment. Every settings test now pins all five explicitly. That
  is the third time -- A5, M23, and here -- so the pattern is worth naming:
  **a test that reads ambient settings is testing the machine it runs on.**

## Accessibility -- definition of done (A.97)

Nothing in this milestone reaches the client. No interface change, no new
control, no announcement, no markup. The A.97 answers are all "not applicable",
stated rather than implied.

axe was not re-run, because nothing that axe examines changed. Recorded as a
deliberate omission rather than an oversight.

## Not built here

- **No `evennia aetos check` command.** `evennia start` already runs these and
  prints them, and Django's `check` framework is where a Django app's checks
  belong. A bespoke command would be a second place to look.
- **No check that provider classes actually work.** A provider that imports and
  then throws is caught at runtime by `safe_call`, and calling every provider at
  startup would mean running game code before the game is up.
- **No `AETOS_BINDINGS` check.** The D-track is not built; a check for a setting
  nothing reads would be a promise the code does not keep.
