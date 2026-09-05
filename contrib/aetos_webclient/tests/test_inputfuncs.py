"""
Tests for the Aetos server-side handshake handler.

The handler receives untrusted browser input, so the malformed cases matter as
much as the happy path. A handshake that raises would surface to the player as a
dead client with no explanation.

"""

from django.test import TestCase, override_settings

from evennia.contrib.base_systems.aetos_webclient import inputfuncs, protocol


class FakeSession:
    """
    Minimal stand-in for an Evennia session.

    Only what the handler touches: an id, a puppet, and a msg() that records
    outgoing messages so tests can assert on them.

    """

    def __init__(self):
        self.sessid = 1
        self.puppet = None
        self.sent = []

    def msg(self, **kwargs):
        self.sent.append(kwargs)

    def last(self, name):
        """
        Return the kwargs payload of the last message of a given name.

        Args:
            name (str): Outputfunc name, e.g. "aetos_manifest".

        Returns:
            dict or None: The payload, or None if no such message was sent.

        """
        for message in reversed(self.sent):
            if name in message:
                return message[name][1]
        return None


class TestHandshakeSuccess(TestCase):
    """A well-formed handshake."""

    def setUp(self):
        self.session = FakeSession()

    def test_replies_with_a_manifest(self):
        inputfuncs.aetos_hello(self.session, **protocol.build_hello())
        self.assertIsNotNone(self.session.last("aetos_manifest"))

    def test_manifest_declares_the_protocol_version(self):
        inputfuncs.aetos_hello(self.session, **protocol.build_hello())
        self.assertEqual(self.session.last("aetos_manifest")["protocol"], 1)

    def test_records_capabilities_on_the_session(self):
        """
        Transient connection state, so later milestones can tailor what they
        send. It dies with the session -- Aetos stores no player profile.

        """
        inputfuncs.aetos_hello(self.session, **protocol.build_hello())
        self.assertIn(protocol.CAPABILITY_MAP, self.session.aetos_capabilities)
        self.assertEqual(self.session.aetos_protocol, 1)

    def test_tolerates_evennias_own_bookkeeping_kwargs(self):
        """
        Evennia adds `options` and `cmdid` to every inputfunc call. Treating
        those as client-supplied fields would reject every real handshake.

        """
        payload = protocol.build_hello()
        payload["options"] = {"foo": "bar"}
        payload["cmdid"] = 7
        inputfuncs.aetos_hello(self.session, **payload)
        self.assertIsNotNone(self.session.last("aetos_manifest"))

    def test_accepts_unknown_capabilities(self):
        """A newer client must not be locked out by an older server."""
        inputfuncs.aetos_hello(
            self.session, protocol=1, client="aetos", capabilities=["map", "telepathy"]
        )
        self.assertIsNotNone(self.session.last("aetos_manifest"))


class TestHandshakeFailure(TestCase):
    """Malformed handshakes, all reachable by anyone who can open a websocket."""

    def setUp(self):
        self.session = FakeSession()

    def test_malformed_handshake_gets_an_error_not_an_exception(self):
        """
        A raising handler would leave the player with a dead client and no
        explanation. The client is told instead.

        """
        inputfuncs.aetos_hello(self.session, protocol="not-a-number")
        error = self.session.last("aetos_error")
        self.assertIsNotNone(error)
        self.assertEqual(error["stage"], "hello")

    def test_malformed_handshake_sends_no_manifest(self):
        """A rejected client must not receive game data anyway."""
        inputfuncs.aetos_hello(self.session, protocol=0)
        self.assertIsNone(self.session.last("aetos_manifest"))

    def test_missing_protocol_is_rejected(self):
        inputfuncs.aetos_hello(self.session, client="aetos")
        self.assertIsNotNone(self.session.last("aetos_error"))

    @override_settings(AETOS_AUTOMATION={"nonsense_key": True})
    def test_server_misconfiguration_is_reported_not_raised(self):
        """
        A developer's bad settings must not take down a player's session. The
        error is logged for the developer and the client is told plainly.

        """
        inputfuncs.aetos_hello(self.session, **protocol.build_hello())
        error = self.session.last("aetos_error")
        self.assertIsNotNone(error)
        self.assertIn("misconfiguration", error["message"])
        self.assertIsNone(self.session.last("aetos_manifest"))
