"""
`evennia aetos <subcommand>` -- the one canonical Aetos command.

WHY THIS WORKS WITHOUT TOUCHING THE LAUNCHER, which was D0's open question.

Evennia's launcher has a fixed list of operations it handles itself. Anything
else falls through to Django's management-command dispatch with the original
command line intact, so a management command named `aetos` in an installed app
*is* `evennia aetos`. Aetos is already an installed app -- it has to be, or its
templates and static files are not found -- so this needs no settings entry, no
`EXTRA_LAUNCHER_COMMANDS`, and no change to Evennia.

Verified rather than assumed: `evennia aetos discover` was run against the lab
game before any of this was designed around it.

There is one trap worth recording for whoever reads the launcher next.
`run_custom_commands` is a real extension hook, but its docstring names the
setting `CUSTOM_EVENNIA_LAUNCHER_COMMANDS` while the code reads
`EXTRA_LAUNCHER_COMMANDS`. Following the documentation gets you nothing, and it
fails *silently*: the missing attribute is caught, the hook returns False, and
the command falls through to Django, which reports an unrelated "unknown
command". Not the route taken here, and worth knowing before somebody spends an
hour on it.

ONE COMMAND, SUBCOMMANDS UNDERNEATH. Addendum B.34 asks the documentation to
expose exactly one command, and this is it. `discover` is the only subcommand
D0 ships; D1 and D2 add to this file rather than adding commands beside it.

"""

from django.core.management.base import BaseCommand, CommandError

SUBCOMMANDS = ("discover",)


class Command(BaseCommand):
    """The Aetos developer command."""

    help = (
        "Aetos web client developer tools. "
        "`evennia aetos discover` suggests AETOS_BINDINGS from your game's own data."
    )

    def add_arguments(self, parser):
        """
        Declare the command line.

        Args:
            parser (ArgumentParser): Django's parser for this command.

        """
        parser.add_argument(
            "subcommand",
            nargs="?",
            default="",
            help="One of: %s" % ", ".join(SUBCOMMANDS),
        )
        parser.add_argument(
            "--all",
            action="store_true",
            dest="include_all",
            default=False,
            help=(
                "Include attributes discovery normally filters out as bookkeeping. "
                "The filter is a guess, so this is here for when it guesses wrong."
            ),
        )
        parser.add_argument(
            "--static-only",
            action="store_true",
            default=False,
            help="Read only the typeclass source, not the database.",
        )
        parser.add_argument(
            "--runtime-only",
            action="store_true",
            default=False,
            help="Read only existing characters, not the source.",
        )

    def handle(self, *args, **options):
        """
        Run the requested subcommand.

        Args:
            *args: Unused.
            **options: Parsed arguments.

        Raises:
            CommandError: If the subcommand is missing or unknown. Named
                explicitly rather than defaulting to `discover`, because a
                command that does something when you have not said what to do is
                a command people run by accident.

        """
        subcommand = options.get("subcommand") or ""

        if not subcommand:
            self.stdout.write(self.help)
            self.stdout.write("")
            self.stdout.write("Subcommands: %s" % ", ".join(SUBCOMMANDS))
            return

        if subcommand not in SUBCOMMANDS:
            raise CommandError(
                "unknown Aetos subcommand %r. Available: %s" % (subcommand, ", ".join(SUBCOMMANDS))
            )

        self._discover(options)

    def _discover(self, options):
        """
        Suggest `AETOS_BINDINGS` from the game's own data.

        Args:
            options (dict): Parsed arguments.

        """
        # Imported here rather than at module level so that `evennia aetos` with
        # no subcommand -- and Django's own command discovery, which imports
        # every command module it finds -- does not pay for a database query or
        # a source walk.
        from evennia.contrib.base_systems.aetos_webclient.discovery import (
            CandidateSet,
            ScanRootError,
            report,
            runtime_scan,
            static_scan,
        )

        found = CandidateSet()
        problems = []

        if not options.get("runtime_only"):
            try:
                candidates, issues = static_scan.scan_files()
            except ScanRootError as error:
                raise CommandError(str(error))
            for candidate in candidates:
                found.add(candidate)
            problems.extend(issues)

        if not options.get("static_only"):
            candidates, issues = runtime_scan.scan_characters()
            for candidate in candidates:
                found.add(candidate)
            problems.extend(issues)

        found.pair_maximums()
        self.stdout.write(
            report.render(found, problems=problems, include_all=options.get("include_all"))
        )
