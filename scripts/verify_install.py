"""
Install Aetos into a brand-new Evennia game, exactly as the README says to.

    python scripts/verify_install.py

WHY THIS EXISTS. The README's first promise is *"Install it and you immediately
get a better client on an ordinary Evennia game, with no changes to your game
code"*, and the installation section is three lines somebody pastes into
`settings.py`. That is the first thing every user does and it had never been
tested end to end -- the lab game has been carrying accumulated settings since
Phase 0, so it could not tell anybody whether a *pristine* install works.

WHAT IT PROVES, on a game created seconds earlier with nothing else configured:

- the three README lines are enough; the client serves at `/webclient/`
- Aetos wins the template race against Evennia's own webclient
- the page is Aetos's, with the console and the composer inside its frame
- the Content-Security-Policy is applied
- **every feature flag is off** -- the progressive-enhancement promise, which is
  what stops a pristine game showing empty widgets
- no diagnostics payload leaks to a client that did not ask for one
- every provider slot resolves to its default rather than raising
- the startup checks report nothing on a correct install...
- ...and *do* report the missing input handlers when a line is left out, which
  is the half that matters: a check that never fires is indistinguishable from
  one that does not work

WHAT IT DOES NOT DO. It never starts the server. Evennia's first `start` prompts
for a superuser, and this needs no account, no password and no listening port to
answer the question it is asking -- Django's test client fetches the page
directly. That also keeps it safe to run while the lab game is up.

The throwaway game is created under the system temp directory and removed
afterwards, so this leaves nothing behind.

"""

import argparse
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
PYTHON = REPO / "evennia" / ".venv" / "Scripts" / "python.exe"
if not PYTHON.is_file():  # pragma: no cover - posix checkouts
    PYTHON = REPO / "evennia" / ".venv" / "bin" / "python"

#: Ports for the throwaway game.
#:
#: Clear of Evennia's stock 4000-4006 and of the lab's 4470-4476 (decision 002),
#: because this may well be run while the lab is up -- and a verification script
#: that takes the lab's ports would produce a failure that looks like a defect in
#: the thing being verified.
PORTS = """
TELNET_PORTS = [4480]
WEBSERVER_PORTS = [(4481, 4485)]
WEBSOCKET_CLIENT_PORT = 4482
AMP_PORT = 4486
TELNET_INTERFACES = ["127.0.0.1"]
WEBSERVER_INTERFACES = ["127.0.0.1"]
WEBSOCKET_CLIENT_INTERFACE = "127.0.0.1"
AMP_INTERFACE = "127.0.0.1"
"""

#: The README's installation block.
#:
#: Not paraphrased. If the README changes, this must be changed to match, and a
#: test asserts the two agree -- the point of the exercise is that what is
#: documented is what was run.
INSTALL_BLOCK = """
from evennia.contrib.base_systems.aetos_webclient import AETOS_TEMPLATE_DIR

INSTALLED_APPS += ["evennia.contrib.base_systems.aetos_webclient"]
TEMPLATES[0]["DIRS"].insert(0, AETOS_TEMPLATE_DIR)
INPUT_FUNC_MODULES.append("evennia.contrib.base_systems.aetos_webclient.inputfuncs")
"""

PROBE = r"""
import sys, os, json
sys.path.insert(0, os.getcwd())
import django
django.setup()
import evennia
evennia._init()

from django.conf import settings
from django.core.checks import run_checks
from django.test import Client

from evennia.contrib.base_systems.aetos_webclient import manifest, providers

out = {}
response = Client().get("/webclient/")
body = response.content.decode("utf-8", "replace")

out["status"] = response.status_code
out["is_aetos"] = "aetos-root" in body
out["console"] = "aetos-console" in body
out["composer"] = "aetos-composer" in body
out["csp"] = "Content-Security-Policy" in body
out["inputfuncs"] = any("aetos_webclient.inputfuncs" in m for m in settings.INPUT_FUNC_MODULES)

built = manifest.build_manifest()
out["features_all_off"] = not any(built["features"].values())
out["no_diagnostics"] = "diagnostics" not in built
out["providers"] = sorted(providers.get_providers())
out["aetos_warnings"] = [w.id for w in run_checks() if str(w.id).startswith("aetos")]

print("AETOS_PROBE_JSON " + json.dumps(out))
"""


def run(command, cwd, env=None):
    """
    Run a command, returning its combined output.

    Args:
        command (list): Argument vector.
        cwd (Path): Working directory.
        env (dict, optional): Environment overrides.

    Returns:
        subprocess.CompletedProcess: The finished process.

    """
    environment = dict(os.environ)
    environment.update(env or {})
    return subprocess.run(
        command, cwd=str(cwd), env=environment, capture_output=True, text=True
    )


def probe(gamedir, source):
    """
    Run a probe script inside the throwaway game's settings.

    Args:
        gamedir (Path): The game directory.
        source (str): Python to run.

    Returns:
        dict: The probe's JSON payload.

    Raises:
        RuntimeError: If the probe did not produce one.

    """
    import json

    result = run(
        [str(PYTHON), "-c", source],
        cwd=gamedir,
        env={"DJANGO_SETTINGS_MODULE": "server.conf.settings"},
    )
    for line in result.stdout.splitlines():
        if line.startswith("AETOS_PROBE_JSON "):
            return json.loads(line[len("AETOS_PROBE_JSON ") :])
    raise RuntimeError(
        "the probe produced no result:\n%s\n%s" % (result.stdout[-2000:], result.stderr[-2000:])
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--keep", action="store_true", help="leave the throwaway game behind")
    options = parser.parse_args()

    workspace = Path(tempfile.mkdtemp(prefix="aetos-install-"))
    gamedir = workspace / "freshgame"
    failures = []

    def check(what, condition, detail=""):
        print(("  ok   " if condition else " FAIL  ") + what + (f"  ({detail})" if detail and not condition else ""))
        if not condition:
            failures.append(what)

    try:
        print(f"creating a pristine game in {gamedir}")
        created = run([str(PYTHON), "-m", "evennia.server.evennia_launcher", "--init", "freshgame"], cwd=workspace)
        if not gamedir.is_dir():
            print(created.stdout[-2000:], created.stderr[-2000:])
            return 2

        settings_file = gamedir / "server" / "conf" / "settings.py"
        original = settings_file.read_text(encoding="utf-8")
        settings_file.write_text(
            original.rstrip() + "\n" + PORTS + INSTALL_BLOCK, encoding="utf-8"
        )

        print("migrating")
        run([str(PYTHON), "-m", "evennia.server.evennia_launcher", "migrate"], cwd=gamedir)

        print("\nwith the README's three lines and nothing else:")
        found = probe(gamedir, PROBE)

        check("the client serves at /webclient/", found["status"] == 200, str(found["status"]))
        check("Aetos wins the template race, not the stock client", found["is_aetos"])
        check("the console is on the page", found["console"])
        check("the composer is inside its frame", found["composer"])
        check("the Content-Security-Policy is applied", found["csp"])
        check("the input handlers are registered", found["inputfuncs"])
        check("every feature flag is off", found["features_all_off"])
        check("no diagnostics payload leaks", found["no_diagnostics"])
        check("all nine provider slots resolve", len(found["providers"]) == 9, str(found["providers"]))
        check("the startup checks report nothing", not found["aetos_warnings"], str(found["aetos_warnings"]))

        print("\nwith the input-handler line left out, which is the common mistake:")
        broken = settings_file.read_text(encoding="utf-8").replace(
            'INPUT_FUNC_MODULES.append("evennia.contrib.base_systems.aetos_webclient.inputfuncs")',
            "# deliberately omitted",
        )
        settings_file.write_text(broken, encoding="utf-8")
        incomplete = probe(gamedir, PROBE)
        check(
            "the startup checks say so",
            "aetos.W003" in incomplete["aetos_warnings"],
            str(incomplete["aetos_warnings"]),
        )

    finally:
        if options.keep:
            print(f"\nleft behind at {workspace}")
        else:
            shutil.rmtree(workspace, ignore_errors=True)

    print("\n" + "-" * 60)
    if failures:
        print(f"{len(failures)} failed:")
        for failure in failures:
            print("  " + failure)
        return 1
    print("a pristine install works exactly as the README describes it")
    return 0


if __name__ == "__main__":
    sys.exit(main())
