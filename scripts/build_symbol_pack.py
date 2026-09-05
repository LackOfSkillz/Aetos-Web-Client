"""
Build a self-contained AAC symbol pack from a bundled mapping.

Development tooling. It is not part of the contrib, is never run by a game, and
needs nothing a game does not already have -- standard library only.

    python scripts/build_symbol_pack.py mulberry --out mulberry-pack.json
    python scripts/build_symbol_pack.py mulberry --check

WHY THIS EXISTS

Addendum A.63 permits bundling concept identifiers and mappings, and requires
explicit licensing review before bundling imagery. So Aetos ships the mapping
and this script fetches the artwork, which keeps the licensing decision with
whoever installs it -- where it belongs, since which set is appropriate depends
on the game's own licensing and on which symbols that player already knows.

WHY THE OUTPUT IS SELF-CONTAINED

Images are inlined as `data:` URIs rather than left as URLs. Partly so a pack is
one file that works offline, and partly for privacy: a pack of remote URLs tells
whoever hosts them, every time the board renders, that this browser is showing a
communication board. That is a disclosure about disability, made silently, to a
third party the player never chose to tell.

"""

import argparse
import base64
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

MAPPINGS_DIR = (
    Path(__file__).resolve().parent.parent
    / "evennia"
    / "evennia"
    / "contrib"
    / "base_systems"
    / "aetos_webclient"
    / "aac_mappings"
)

#: Content types a pack may carry, mapped to what the client's `isSafeSource`
#: allowlist accepts. Anything else is refused rather than guessed at.
MEDIA_TYPES = {
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
}

#: Refuse anything implausible for a single pictogram. A pack is loaded into a
#: browser and held in memory; one oversized entry is a bad symbol, and a
#: thousand of them is an unusable client.
MAX_SYMBOL_BYTES = 256 * 1024


def load_mapping(name):
    """
    Read a bundled mapping file.

    Args:
        name (str): Mapping name, e.g. "mulberry".

    Returns:
        dict: The parsed mapping.

    Raises:
        SystemExit: If the mapping does not exist.

    """
    path = MAPPINGS_DIR / (name + ".json")
    if not path.is_file():
        available = sorted(p.stem for p in MAPPINGS_DIR.glob("*.json"))
        raise SystemExit("No mapping %r. Available: %s" % (name, ", ".join(available)))
    return json.loads(path.read_text(encoding="utf-8"))


def symbol_url(mapping, symbol):
    """
    Build the URL for one symbol.

    Args:
        mapping (dict): The mapping file's contents.
        symbol (str): The set's own symbol name.

    Returns:
        str: A fetchable URL.

    """
    source = mapping["source"].rstrip("/")
    if "github.com/" in source:
        # Raw content, not the HTML page.
        source = source.replace("github.com/", "raw.githubusercontent.com/") + "/master"
    relative = mapping["path_template"].format(symbol=urllib.parse.quote(symbol))
    return source + "/" + relative


def fetch(url, timeout=30):
    """
    Fetch one URL.

    Args:
        url (str): The URL to fetch.
        timeout (int): Seconds to wait.

    Returns:
        bytes or None: The body, or None if it could not be fetched.

    """
    request = urllib.request.Request(url, headers={"User-Agent": "aetos-symbol-pack"})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.read()
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, OSError):
        return None


def check(mapping):
    """
    Verify every mapping resolves, without downloading bodies.

    A mapping that 404s renders as a missing image, and the player finds out one
    word at a time, mid-conversation. So the check exists to be run before a
    mapping is committed rather than after somebody relies on it.

    Args:
        mapping (dict): The mapping file's contents.

    Returns:
        int: Count of entries that did not resolve.

    """
    broken = 0
    for concept, symbol in sorted(mapping["concepts"].items()):
        url = symbol_url(mapping, symbol)
        request = urllib.request.Request(
            url, method="HEAD", headers={"User-Agent": "aetos-symbol-pack"}
        )
        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                ok = response.status == 200
        except Exception:
            ok = False
        if not ok:
            broken += 1
            print("  BROKEN  %-14s -> %s" % (concept, symbol))
    return broken


def build(mapping, out_path):
    """
    Download every mapped symbol and write a self-contained pack.

    Args:
        mapping (dict): The mapping file's contents.
        out_path (Path): Where to write the pack.

    Returns:
        int: Process exit status.

    """
    symbols = {}
    skipped = []

    total = len(mapping["concepts"])
    for index, (concept, symbol) in enumerate(sorted(mapping["concepts"].items()), 1):
        url = symbol_url(mapping, symbol)
        suffix = Path(urllib.parse.urlparse(url).path).suffix.lower()
        media_type = MEDIA_TYPES.get(suffix)
        if media_type is None:
            skipped.append((concept, "unsupported type %s" % suffix))
            continue

        body = fetch(url)
        if body is None:
            skipped.append((concept, "could not fetch"))
            continue
        if len(body) > MAX_SYMBOL_BYTES:
            skipped.append((concept, "%d bytes, over the cap" % len(body)))
            continue

        encoded = base64.b64encode(body).decode("ascii")
        symbols[concept] = {
            "src": "data:%s;base64,%s" % (media_type, encoded),
            "alt": None,
        }
        print("  [%2d/%2d] %s" % (index, total, concept))

    pack = {
        "id": mapping["set"],
        "name": mapping["name"],
        "license": mapping["license"],
        "attribution": mapping["attribution"],
        "symbols": symbols,
    }
    out_path.write_text(json.dumps(pack), encoding="utf-8")

    size_mb = out_path.stat().st_size / (1024 * 1024)
    print("\nWrote %s -- %d symbols, %.1f MB" % (out_path, len(symbols), size_mb))
    print("Licence: %s" % mapping["license"])
    print("Attribution: %s" % mapping["attribution"])

    if skipped:
        # Reported, never silent. A pack with holes the builder knew about and
        # did not mention is a board that fails one word at a time.
        print("\nSkipped %d:" % len(skipped))
        for concept, reason in skipped:
            print("  %-14s %s" % (concept, reason))

    covered = set(symbols)
    print(
        "\nThis pack covers %d of Aetos's concepts. Everything else falls back to "
        "its text label, which is correct behaviour rather than a defect (A.62 "
        "forbids substituting a near-miss symbol)." % len(covered)
    )
    return 0


def main(argv=None):
    """
    Entry point.

    Args:
        argv (list, optional): Arguments, defaulting to `sys.argv[1:]`.

    Returns:
        int: Process exit status.

    """
    parser = argparse.ArgumentParser(description=__doc__.strip().split("\n")[0])
    parser.add_argument("mapping", help="mapping name, e.g. mulberry")
    parser.add_argument("--out", type=Path, help="where to write the pack")
    parser.add_argument(
        "--check",
        action="store_true",
        help="verify every mapping resolves, without downloading",
    )
    args = parser.parse_args(argv)

    mapping = load_mapping(args.mapping)

    print("%s -- %s" % (mapping["name"], mapping["license"]))
    print("%s\n" % mapping["attribution"])

    if args.check:
        broken = check(mapping)
        print(
            "\n%d of %d mappings resolve."
            % (len(mapping["concepts"]) - broken, len(mapping["concepts"]))
        )
        return 1 if broken else 0

    if not args.out:
        raise SystemExit("--out is required unless --check is given")
    return build(mapping, args.out)


if __name__ == "__main__":
    sys.exit(main())
