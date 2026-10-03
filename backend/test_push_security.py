"""Offline SSRF regressions: no DNS or HTTP leaves these tests."""
import socket
import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

import requests
from fastapi import HTTPException
from pywebpush import WebPushException, webpush

from app import push_security as security
from app.routes import notifications

ENDPOINT = "https://fcm.googleapis.com/fcm/send/opaque-token"


def records(*addresses):
    return [(socket.AF_INET6 if ":" in ip else socket.AF_INET, socket.SOCK_STREAM,
             socket.IPPROTO_TCP, "", (ip, 443)) for ip in addresses]


class PushSecurityTests(unittest.TestCase):
    def setUp(self):
        self.dns = patch.object(security.socket, "getaddrinfo", return_value=records("8.8.8.8")).start()
        self.http = patch.object(requests.adapters.HTTPAdapter, "send", side_effect=AssertionError("Unmocked HTTP")).start()
        self.addCleanup(patch.stopall)

    def test_malformed_and_unapproved_urls_never_resolve(self):
        for endpoint in ["", "http://fcm.googleapis.com/x", "https://user:pass@fcm.googleapis.com/x",
                         "https://localhost/x", "https://127.0.0.1/x", "https://[::1]/x",
                         "https://169.254.169.254/x", "https://10.0.0.1/x",
                         "https://fcm.googleapis.com.evil.example/x", "https://evilpush.apple.com/x",
                         "https://example.com/x", "https://fcm.googleapis.com:80/x",
                         "https://fcm.googleapis.com:/x",
                         "https://fcm.googleapis.com:bad/x", "https://[bad/x",
                         ENDPOINT + "#fragment", ENDPOINT + "\n", "https://fcm.googleapis.com\\@localhost/x"]:
            with self.subTest(endpoint=endpoint), self.assertRaises(security.InvalidPushEndpoint):
                security.validate_push_endpoint(endpoint)
        self.dns.assert_not_called()

    def test_all_dns_addresses_must_be_public(self):
        for ip in ["127.0.0.1", "10.0.0.1", "172.16.0.1", "192.168.1.1", "169.254.169.254",
                   "0.0.0.0", "224.0.0.1", "240.0.0.1", "100.64.0.1", "192.0.2.1",
                   "::1", "::", "fc00::1", "fe80::1", "ff02::1", "2001:db8::1", "::ffff:127.0.0.1"]:
            self.dns.return_value = records("8.8.8.8", ip)
            with self.subTest(ip=ip), self.assertRaises(security.InvalidPushEndpoint):
                security.validate_push_endpoint(ENDPOINT)
        self.dns.return_value = []
        with self.assertRaises(security.InvalidPushEndpoint):
            security.validate_push_endpoint(ENDPOINT)
        self.dns.side_effect = socket.gaierror("DNS unavailable")
        with self.assertRaises(security.InvalidPushEndpoint):
            security.validate_push_endpoint(ENDPOINT)

    def test_supported_providers_and_public_ipv6(self):
        self.dns.return_value = records("2606:4700:4700::1111", "8.8.8.8")
        for host in ["fcm.googleapis.com", "updates.push.services.mozilla.com",
                     "web.push.apple.com", "wns.notify.windows.com"]:
            destination = security.validate_push_endpoint(f"https://{host}/opaque?token=secret")
            self.assertEqual(destination.hostname, host)

    def test_transport_pins_ip_tls_host_disables_redirects_proxies_and_timeout(self):
        destination = security.validate_push_endpoint(ENDPOINT)
        self.dns.side_effect = AssertionError("Rebinding: DNS must not run again")
        response = requests.Response()
        response.status_code = 201
        with security.SafePushSession(destination) as session:
            adapter = session.get_adapter(ENDPOINT)
            self.assertEqual(adapter.pool.host, "8.8.8.8")
            self.assertEqual(adapter.pool.assert_hostname, "fcm.googleapis.com")
            self.assertEqual(adapter.pool.conn_kw["server_hostname"], "fcm.googleapis.com")
            with patch("urllib3.util.connection.create_connection") as connect:
                adapter.pool._new_conn()._new_conn()
                self.assertEqual(connect.call_args.args[0], ("8.8.8.8", 443))
            self.assertFalse(session.trust_env)
            self.http.side_effect = None
            self.http.return_value = response
            session.post(ENDPOINT, data=b"encrypted", allow_redirects=True, verify=False,
                         proxies={"https": "http://localhost"}, timeout=None)
            request = self.http.call_args.args[0]
            kwargs = self.http.call_args.kwargs
            self.assertEqual(request.headers["Host"], "fcm.googleapis.com")
            self.assertEqual(kwargs["timeout"], 10)
            self.assertTrue(kwargs["verify"])
            self.assertEqual(kwargs["proxies"], {})
            response.status_code = 307
            response.request = request
            response.headers["Location"] = "http://169.254.169.254/latest/meta-data"
            response._content = b""
            with self.assertRaises(security.InvalidPushEndpoint):
                session.post(ENDPOINT)
            self.assertEqual(self.http.call_count, 2)
            with self.assertRaises(security.InvalidPushEndpoint):
                session.post("https://localhost/")
            self.assertEqual(self.http.call_count, 2)

    def test_subscribe_rejects_before_database_and_preserves_ownership(self):
        db = Mock()
        user = SimpleNamespace(id=1)
        payload = notifications.PushSubscriptionCreate(endpoint="https://localhost/", keys={"p256dh": "key", "auth": "auth"})
        with self.assertRaises(HTTPException) as caught:
            notifications.subscribe(payload, db, user)
        self.assertEqual(caught.exception.status_code, 400)
        db.scalar.assert_not_called()
        db.commit.assert_not_called()
        payload.endpoint = ENDPOINT
        db.scalar.return_value = None
        notifications.subscribe(payload, db, user)
        db.add.assert_called_once()
        db.scalar.return_value = SimpleNamespace(user_id=2)
        with self.assertRaises(HTTPException) as caught:
            notifications.subscribe(payload, db, user)
        self.assertEqual(caught.exception.status_code, 409)
        existing = SimpleNamespace(user_id=1, p256dh="old", auth="old")
        db.scalar.return_value = existing
        notifications.subscribe(payload, db, user)
        self.assertEqual(existing.auth, "auth")
        self.dns.return_value = records("127.0.0.1")
        payload.keys.auth = "unsafe-update"
        with self.assertRaises(HTTPException):
            notifications.subscribe(payload, db, user)
        self.assertEqual(existing.auth, "auth")

    def test_installed_pywebpush_uses_safe_session(self):
        destination = security.validate_push_endpoint(ENDPOINT)
        response = requests.Response()
        response.status_code = 201
        response._content = b""
        self.http.side_effect = None
        self.http.return_value = response
        with security.SafePushSession(destination) as session:
            webpush(subscription_info={"endpoint": ENDPOINT}, data=None,
                    timeout=security.PUSH_TIMEOUT_SECONDS, requests_session=session)
        self.assertEqual(self.http.call_count, 1)
        self.assertEqual(self.http.call_args.args[0].url, ENDPOINT)
        self.assertEqual(self.http.call_args.kwargs["timeout"], 10)

    def test_send_revalidates_legacy_entries_and_handles_failures(self):
        subscription = SimpleNamespace(endpoint=ENDPOINT, p256dh="key", auth="auth")
        with patch.object(notifications, "get_vapid_private_key_path", return_value="mock.pem"), \
                patch.object(notifications.Path, "exists", return_value=True), \
                patch.object(notifications, "webpush") as push:
            self.dns.return_value = records("127.0.0.1")
            self.assertEqual(notifications.send_push(subscription, {}), "error")
            push.assert_not_called()
            self.dns.return_value = records("8.8.8.8")
            self.assertEqual(notifications.send_push(subscription, {}), "sent")
            self.assertEqual(push.call_args.kwargs["timeout"], 10)
            self.assertIsInstance(push.call_args.kwargs["requests_session"], security.SafePushSession)
            for failure in [requests.Timeout("secret"), requests.ConnectionError("secret"), ValueError("secret")]:
                push.side_effect = failure
                with self.assertLogs(notifications.logger) as logs:
                    self.assertEqual(notifications.send_push(subscription, {}), "error")
                self.assertNotIn("secret", str(logs.output))
            for code, expected in [(404, "expired"), (410, "expired"), (500, "error")]:
                push.side_effect = WebPushException("secret", response=SimpleNamespace(status_code=code))
                self.assertEqual(notifications.send_push(subscription, {}), expected)
        self.http.assert_not_called()


if __name__ == "__main__":
    unittest.main()
