"""Discover Python interpreters usable for Evennia/Aetos development.

Reads the Evennia checkout's declared ``requires-python`` floor and reports every
interpreter on this machine that satisfies it, so a developer can build the lab
venv on a Python they already have instead of being forced to install a new one.

Usage:
    python scripts/find_python.py [--evennia PATH] [--select highest|lowest]

Exits non-zero and explains why if no compatible interpreter is found.
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

VERSION_PROBE = "import sys,json;print(json.dumps(list(sys.version_info[:3])))"


def read_requires_python(evennia_root):
    """Parse ``requires-python`` from the Evennia checkout's pyproject.toml.

    Args:
        evennia_root (Path): Root of the Evennia source clone.

    Returns:
        tuple: (minimum_version_tuple, raw_specifier_string).

    """
    pyproject = Path(evennia_root) / "pyproject.toml"
    if not pyproject.exists():
        raise SystemExit(f"No pyproject.toml at {pyproject}")
    import tomllib

    data = tomllib.loads(pyproject.read_text(encoding="utf-8"))
    spec = data.get("project", {}).get("requires-python", "")
    match = re.search(r">=\s*(\d+)\.(\d+)", spec)
    if not match:
        raise SystemExit(f"Could not parse a minimum version from requires-python={spec!r}")
    return (int(match.group(1)), int(match.group(2))), spec


def candidate_executables():
    """Collect candidate interpreter paths from every discovery source available.

    Returns:
        list: Absolute paths to candidate interpreters, de-duplicated.

    """
    found = []

    # 1. The interpreter running this script.
    found.append(sys.executable)

    # 2. Named interpreters on PATH.
    for minor in range(8, 30):
        for name in (f"python3.{minor}", f"python3.{minor}.exe"):
            path = shutil.which(name)
            if path:
                found.append(path)
    for name in ("python", "python3"):
        path = shutil.which(name)
        if path:
            found.append(path)

    # 3. The Windows launcher's registry of installed versions.
    if os.name == "nt":
        try:
            output = subprocess.run(
                ["py", "-0p"], capture_output=True, text=True, timeout=30
            ).stdout
            for line in output.splitlines():
                match = re.search(r"(\S:\\S.*?python\.exe)", line, re.IGNORECASE)
                if match:
                    found.append(match.group(1))
        except (OSError, subprocess.SubprocessError):
            pass

    # 4. uv-managed interpreters.
    if shutil.which("uv"):
        try:
            output = subprocess.run(
                ["uv", "python", "list", "--only-installed"],
                capture_output=True,
                text=True,
                timeout=30,
            ).stdout
            for line in output.splitlines():
                parts = line.split()
                if len(parts) >= 2 and ("python" in parts[-1].lower()):
                    found.append(parts[-1])
        except (OSError, subprocess.SubprocessError):
            pass

    seen, unique = set(), []
    for path in found:
        resolved = str(Path(path).resolve()) if Path(path).exists() else path
        if resolved.lower() not in seen:
            seen.add(resolved.lower())
            unique.append(resolved)
    return unique


def probe(executable):
    """Ask an interpreter for its own version.

    Args:
        executable (str): Path to a candidate interpreter.

    Returns:
        tuple or None: (major, minor, micro), or None if it could not be run.

    """
    try:
        result = subprocess.run(
            [executable, "-c", VERSION_PROBE], capture_output=True, text=True, timeout=30
        )
        if result.returncode != 0:
            return None
        return tuple(json.loads(result.stdout.strip()))
    except (OSError, subprocess.SubprocessError, ValueError):
        return None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--evennia", default="evennia", help="path to the Evennia clone")
    parser.add_argument(
        "--select",
        choices=("highest", "lowest"),
        default="highest",
        help="which compatible interpreter to print as the recommendation",
    )
    parser.add_argument(
        "--quiet", action="store_true", help="print only the selected interpreter path"
    )
    args = parser.parse_args()

    minimum, spec = read_requires_python(args.evennia)
    compatible, rejected = [], []
    for executable in candidate_executables():
        version = probe(executable)
        if version is None:
            continue
        (compatible if version[:2] >= minimum else rejected).append((version, executable))

    compatible.sort(reverse=(args.select == "highest"))

    if not compatible:
        print(f"No interpreter satisfies Evennia's requires-python = {spec!r}.", file=sys.stderr)
        for version, executable in sorted(rejected, reverse=True):
            print(f"  rejected {'.'.join(map(str, version))}  {executable}", file=sys.stderr)
        print(
            "\nInstall one, e.g.:  uv python install "
            f"{minimum[0]}.{minimum[1]}",
            file=sys.stderr,
        )
        return 1

    selected = compatible[0][1]
    if args.quiet:
        print(selected)
        return 0

    print(f"Evennia requires-python = {spec!r}  (minimum {minimum[0]}.{minimum[1]})\n")
    print("Compatible interpreters found:")
    for version, executable in sorted(compatible, reverse=True):
        marker = "->" if executable == selected else "  "
        print(f" {marker} {'.'.join(map(str, version)):10s} {executable}")
    if rejected:
        print("\nToo old for Evennia (ignored):")
        for version, executable in sorted(rejected, reverse=True):
            print(f"    {'.'.join(map(str, version)):10s} {executable}")
    print(f"\nSelected ({args.select}): {selected}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
