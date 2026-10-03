"""Web Push destinations: provider policy, public DNS and pinned TLS transport."""

import ipaddress
import re
import socket
from dataclasses import dataclass
from urllib.parse import urlsplit

import requests
from requests.adapters import HTTPAdapter
from urllib3 import HTTPSConnectionPool

PUSH_TIMEOUT_SECONDS = 10


class InvalidPushEndpoint(ValueError):
    pass


@dataclass(frozen=True)
class PushDestination:
    endpoint: str
    hostname: str
    address: str


def validate_push_endpoint(endpoint: str) -> PushDestination:
    # Browser providers only. Paths are opaque and must not be rewritten.
    # Apple: developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers
    # Mozilla: mozilla-services.github.io/autopush-rs/
    if not isinstance(endpoint, str) or not endpoint or len(endpoint) > 4096:
        raise InvalidPushEndpoint()
    if any(ord(char) <= 32 or ord(char) >= 127 for char in endpoint) or "\\" in endpoint or "#" in endpoint:
        raise InvalidPushEndpoint()
    try:
        parsed = urlsplit(endpoint)
        host = parsed.hostname
        port = parsed.port
    except ValueError:
        raise InvalidPushEndpoint() from None
    if (
        parsed.scheme != "https" or not host
        or parsed.username is not None or parsed.password is not None
        or port not in (None, 443)
        or parsed.netloc.lower() not in (host, f"{host}:443")
    ):
        raise InvalidPushEndpoint()
    if len(host) > 253 or any(not re.fullmatch(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?", label) for label in host.split(".")):
        raise InvalidPushEndpoint()
    if (
        host not in {"fcm.googleapis.com", "updates.push.services.mozilla.com"}
        and not host.endswith((".push.apple.com", ".notify.windows.com"))
    ):
        raise InvalidPushEndpoint()
    try:
        records = socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM, proto=socket.IPPROTO_TCP)
        addresses = []
        for family, _, _, _, sockaddr in records:
            if family not in (socket.AF_INET, socket.AF_INET6) or "%" in sockaddr[0]:
                raise InvalidPushEndpoint()
            address = ipaddress.ip_address(sockaddr[0])
            if not address.is_global or any((address.is_private, address.is_loopback, address.is_link_local, address.is_reserved, address.is_multicast, address.is_unspecified)):
                raise InvalidPushEndpoint()
            addresses.append(str(address))
        if not addresses:
            raise InvalidPushEndpoint()
    except (OSError, ValueError, IndexError):
        raise InvalidPushEndpoint() from None
    return PushDestination(endpoint, host, addresses[0])


class _PinnedAdapter(HTTPAdapter):
    def __init__(self, destination: PushDestination):
        super().__init__(max_retries=0)
        # Public urllib3 API: connect to the validated IP, authenticate the
        # original hostname (SNI + certificate), never resolve it again.
        self.pool = HTTPSConnectionPool(
            destination.address, port=443, server_hostname=destination.hostname,
            assert_hostname=destination.hostname, cert_reqs="CERT_REQUIRED",
        )

    def get_connection_with_tls_context(self, request, verify, proxies=None, cert=None):
        return self.pool

    def get_connection(self, url, proxies=None):
        # requests < 2.32.2 uses this adapter hook.
        return self.pool

    def close(self):
        self.pool.close()
        super().close()


class SafePushSession(requests.Session):
    def __init__(self, destination: PushDestination):
        super().__init__()
        self.destination = destination
        self.trust_env = False
        self.mount("https://", _PinnedAdapter(destination))

    def send(self, request, **kwargs):
        if request.method != "POST" or request.url != self.destination.endpoint:
            raise InvalidPushEndpoint()
        request.headers["Host"] = self.destination.hostname
        kwargs.update(allow_redirects=False, timeout=PUSH_TIMEOUT_SECONDS, verify=True, proxies={})
        response = super().send(request, **kwargs)
        if 300 <= response.status_code < 400:
            response.close()
            raise InvalidPushEndpoint()
        return response
