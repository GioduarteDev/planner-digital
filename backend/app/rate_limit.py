from collections import deque
from math import ceil
from threading import Lock
from time import monotonic

from fastapi import HTTPException, status


class SlidingWindowRateLimiter:
    def __init__(
        self,
        max_requests: int,
        window_seconds: int,
        detail: str,
    ) -> None:
        if max_requests < 1:
            raise ValueError(
                "max_requests precisa ser maior que zero."
            )

        if window_seconds < 1:
            raise ValueError(
                "window_seconds precisa ser maior que zero."
            )

        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.detail = detail

        self._requests: dict[
            str,
            deque[float],
        ] = {}

        self._lock = Lock()
        self._last_cleanup = monotonic()

    def _cleanup(
        self,
        now: float,
    ) -> None:
        if (
            now - self._last_cleanup
            < self.window_seconds
        ):
            return

        cutoff = now - self.window_seconds

        stale_keys = []

        for key, timestamps in self._requests.items():
            while (
                timestamps
                and timestamps[0] <= cutoff
            ):
                timestamps.popleft()

            if not timestamps:
                stale_keys.append(key)

        for key in stale_keys:
            self._requests.pop(
                key,
                None,
            )

        self._last_cleanup = now

    def check(
        self,
        key: str,
    ) -> None:
        now = monotonic()
        cutoff = now - self.window_seconds

        with self._lock:
            self._cleanup(now)

            timestamps = self._requests.setdefault(
                key,
                deque(),
            )

            while (
                timestamps
                and timestamps[0] <= cutoff
            ):
                timestamps.popleft()

            if (
                len(timestamps)
                >= self.max_requests
            ):
                retry_after = max(
                    1,
                    ceil(
                        self.window_seconds
                        - (
                            now
                            - timestamps[0]
                        )
                    ),
                )

                raise HTTPException(
                    status_code=(
                        status.HTTP_429_TOO_MANY_REQUESTS
                    ),
                    detail=self.detail,
                    headers={
                        "Retry-After": str(
                            retry_after
                        )
                    },
                )

            timestamps.append(now)


login_rate_limiter = SlidingWindowRateLimiter(
    max_requests=10,
    window_seconds=60,
    detail=(
        "Muitas tentativas de login. "
        "Tente novamente em instantes."
    ),
)


register_rate_limiter = SlidingWindowRateLimiter(
    max_requests=5,
    window_seconds=300,
    detail=(
        "Muitas tentativas de cadastro. "
        "Tente novamente mais tarde."
    ),
)
