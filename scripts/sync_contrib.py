"""
Mirror the contrib source between the Evennia work tree and this repository.

Development happens inside the Evennia clone at `evennia/`, because that is where
the tests and the live lab server run. That clone is its own git repository and is
never tracked here (see `.gitignore`), so without this script the actual client
source would be missing from the published repository -- which would make this
repo a set of notes about software nobody could read.

So the clone is the working copy and `contrib/aetos_webclient/` is the published
mirror. This script copies one to the other, and `--check` verifies they agree.

The mirror is byte-identical to the eventual pull request diff. What is in
`contrib/aetos_webclient/` is exactly what would land at
`evennia/contrib/base_systems/aetos_webclient/` upstream -- so reviewing this
repository is reviewing the PR.

Usage::

    python scripts/sync_contrib.py            # copy clone -> repo mirror
    python scripts/sync_contrib.py --check     # exit 1 if they differ

"""

import argparse
import filecmp
import shutil
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

#: Where development happens. Its own git repository, untracked here.
SOURCE = REPO_ROOT / "evennia" / "evennia" / "contrib" / "base_systems" / "aetos_webclient"

#: The published mirror, tracked in this repository.
MIRROR = REPO_ROOT / "contrib" / "aetos_webclient"

#: Never mirrored. Caches are noise, and a stray database or log from the lab
#: would be published by accident.
IGNORED = shutil.ignore_patterns(
    "__pycache__", "*.pyc", "*.pyo", "*.sqlite3", "*.log", ".DS_Store", "Thumbs.db"
)


def _relative_files(root):
    """
    List every file under a root, relative to it.

    Args:
        root (Path): Directory to walk.

    Returns:
        set: Relative paths as POSIX strings.

    """
    if not root.exists():
        return set()
    return {
        str(path.relative_to(root).as_posix())
        for path in root.rglob("*")
        if path.is_file() and "__pycache__" not in path.parts and path.suffix not in (".pyc",)
    }


def check():
    """
    Report whether the mirror matches the working copy.

    Returns:
        int: 0 if they agree, 1 otherwise.

    """
    if not SOURCE.exists():
        print("No Evennia work tree at %s -- nothing to check against." % SOURCE)
        print("The mirror in contrib/ is the published source; this is fine on a")
        print("fresh clone that has not set up the lab.")
        return 0

    source_files = _relative_files(SOURCE)
    mirror_files = _relative_files(MIRROR)

    missing = sorted(source_files - mirror_files)
    extra = sorted(mirror_files - source_files)
    differing = sorted(
        name
        for name in source_files & mirror_files
        if not filecmp.cmp(SOURCE / name, MIRROR / name, shallow=False)
    )

    if not (missing or extra or differing):
        print("Mirror is up to date (%d files)." % len(source_files))
        return 0

    for name in missing:
        print("MISSING from mirror: %s" % name)
    for name in extra:
        print("STALE in mirror:     %s" % name)
    for name in differing:
        print("DIFFERS:             %s" % name)
    print("\nRun: python scripts/sync_contrib.py")
    return 1


def sync():
    """
    Replace the mirror with the current working copy.

    Returns:
        int: 0 on success, 1 if there is no work tree to copy from.

    """
    if not SOURCE.exists():
        print("No Evennia work tree at %s." % SOURCE)
        print("Set up the lab first, or edit contrib/aetos_webclient/ directly.")
        return 1

    # Replaced wholesale rather than merged, so a file deleted upstream cannot
    # survive in the mirror and quietly reappear in the pull request.
    if MIRROR.exists():
        shutil.rmtree(MIRROR)
    MIRROR.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(SOURCE, MIRROR, ignore=IGNORED)

    print("Mirrored %d files to %s" % (len(_relative_files(MIRROR)), MIRROR))
    return 0


def main():
    """Run the script."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check",
        action="store_true",
        help="verify the mirror matches the work tree instead of updating it",
    )
    args = parser.parse_args()
    return check() if args.check else sync()


if __name__ == "__main__":
    sys.exit(main())
