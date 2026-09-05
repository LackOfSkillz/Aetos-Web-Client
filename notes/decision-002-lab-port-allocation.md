# Decision 002 -- Lab port allocation

Date: 2026-09-04
Status: **Accepted** — revised 2026-09-05, see *Revision* below.

## Decision

The `aetos_testgame` lab binds **4470-4476 on loopback only**, never Evennia's
stock 4000-4006 range.

## Rationale

Other Evennia games run on this machine. A lab that squats the stock range either
fails to start when another game holds it, or -- worse -- silently wins the race and
makes an unrelated game fail later, at a moment that looks like an Aetos bug.
Isolation here removes a whole class of false signals from Phase 0 onward.

Loopback binding is a second, independent guard: the stock defaults bind
`0.0.0.0`, so even a differently-ported game can contend for a wildcard bind. The
lab is a single-developer sandbox that is never meant to be reachable, so
`127.0.0.1` costs nothing and removes that interaction entirely.

## Mapping

Uniform +470 offset from stock, so the correspondence stays obvious:

| Service              | Stock        | Aetos lab    |
|----------------------|--------------|--------------|
| telnet               | 4000         | 4470         |
| webserver (proxy)    | 4001         | 4471         |
| websocket client     | 4002         | 4472         |
| SSL                  | 4003         | 4473         |
| SSH                  | 4004         | 4474         |
| webserver (internal) | 4005         | 4475         |
| AMP (portal<->server)| 4006         | 4476         |

Set in `aetos_testgame/server/conf/settings.py`. All interfaces set to `127.0.0.1`.

Browser entry point for all QA work: **http://localhost:4471/webclient/**

## Verified

- Portal and Server start clean on the new range.
- `netstat` confirms listeners only on 4470/4471/4472/4475/4476, all `127.0.0.1`.
- Nothing of ours listens anywhere in 4000-4008.
- `http://localhost:4471/` and `http://localhost:4471/webclient/` both return 200.

## Note for the contrib

This is a **lab** decision, not an Aetos one. The contrib must never hardcode a
port or assume one; it derives its websocket endpoint the way stock Evennia does,
so a game on any port works unchanged. Any port literal appearing in
`aetos_webclient/` source is a defect.

## Revision, 2026-09-05: 4400 was taken

Moved from 4400-4406 to **4470-4476**. Dragon's Ire, another game on this
machine, already owned 4401.

The original reasoning was sound and the choice was not. "Avoid Evennia's
defaults" identified the wrong risk: the collision that actually bites is not
with the stock range everyone knows to avoid, it is with **another game the same
developer runs** — and +400 is the second-most-obvious offset, which is exactly
where somebody else's game lands for exactly the same reason.

4470 is chosen for being unobvious rather than tidy. That is the whole property
worth having here, and "memorable" was never one of the requirements.

The symptom this avoids is worth stating, because it is nasty: two games both
bound to 4401 do not fail cleanly. One wins the bind and the other reports a
port error at a moment that looks like a bug in whichever was started second —
and if the lab wins, the failure surfaces in the *unrelated* game, which is a
false signal pointing at entirely the wrong project.
