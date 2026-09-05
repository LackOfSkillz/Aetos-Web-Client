# Decision 002 -- Lab port allocation

Date: 2026-09-04
Status: **Accepted**

## Decision

The `aetos_testgame` lab binds **4400-4406 on loopback only**, never Evennia's
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

Uniform +400 offset from stock, so the correspondence stays obvious:

| Service              | Stock        | Aetos lab    |
|----------------------|--------------|--------------|
| telnet               | 4000         | 4400         |
| webserver (proxy)    | 4001         | 4401         |
| websocket client     | 4002         | 4402         |
| SSL                  | 4003         | 4403         |
| SSH                  | 4004         | 4404         |
| webserver (internal) | 4005         | 4405         |
| AMP (portal<->server)| 4006         | 4406         |

Set in `aetos_testgame/server/conf/settings.py`. All interfaces set to `127.0.0.1`.

Browser entry point for all QA work: **http://localhost:4401/webclient/**

## Verified

- Portal and Server start clean on the new range.
- `netstat` confirms listeners only on 4400/4401/4402/4405/4406, all `127.0.0.1`.
- Nothing of ours listens anywhere in 4000-4008.
- `http://localhost:4401/` and `http://localhost:4401/webclient/` both return 200.

## Note for the contrib

This is a **lab** decision, not an Aetos one. The contrib must never hardcode a
port or assume one; it derives its websocket endpoint the way stock Evennia does,
so a game on any port works unchanged. Any port literal appearing in
`aetos_webclient/` source is a defect.
