#!/usr/bin/env python3
"""Fail-closed runtime verification for an OpenAlice OpenBB deployment."""

from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import UTC, datetime
from typing import Any
from urllib.error import URLError
from urllib.parse import urlencode
from urllib.request import urlopen


def _json(url: str, timeout: float) -> dict[str, Any]:
    """Read one JSON response with the standard library."""
    with urlopen(url, timeout=timeout) as response:  # noqa: S310 - caller owns URL
        return json.load(response)


def _text(url: str, timeout: float) -> str:
    """Read one UTF-8 response with the standard library."""
    with urlopen(url, timeout=timeout) as response:  # noqa: S310 - caller owns URL
        return response.read().decode("utf-8")


def verify(base_url: str, wait_seconds: int) -> dict[str, Any]:
    """Verify OpenBB readiness, provider coverage, and non-empty market data."""
    base = base_url.rstrip("/")
    health_url = f"{base}/api/v1/coverage/providers"
    deadline = time.monotonic() + wait_seconds
    last_error = "service did not become ready"
    health: dict[str, Any] | None = None
    while time.monotonic() < deadline:
        try:
            candidate = _json(health_url, timeout=4)
            if "ashare" in candidate and "yfinance" in candidate:
                health = candidate
                break
            last_error = "required ashare/yfinance providers are not registered"
        except (OSError, URLError, TimeoutError, ValueError) as exc:
            last_error = f"{type(exc).__name__}: {exc}"
        time.sleep(2)
    if health is None:
        raise RuntimeError(last_error)
    landing_page = _text(f"{base}/", timeout=10)
    if "OpenBB" not in landing_page:
        raise RuntimeError("OpenBB landing page marker is missing")


    parameters = {
        "symbol": "AAPL",
        "provider": "yfinance",
        "start_date": "2024-01-02",
        "end_date": "2024-01-05",
    }
    quote_url = f"{base}/api/v1/equity/price/historical?{urlencode(parameters)}"
    quote = _json(quote_url, timeout=30)
    rows = quote.get("results") or []
    if not rows:
        raise RuntimeError("real provider returned no rows")

    return {
        "status": "passed",
        "checked_at": datetime.now(UTC).isoformat(),
        "base_url": base,
        "providers": sorted(health),
        "landing_page": {"bytes": len(landing_page.encode())},
        "real_data": {
            "provider": quote.get("provider"),
            "parameters": parameters,
            "result_count": len(rows),
            "first_date": rows[0].get("date"),
            "error_category": None,
        },
    }


def main() -> int:
    """Run the verifier and print one machine-readable evidence record."""
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:6900")
    parser.add_argument("--wait-seconds", type=int, default=90)
    args = parser.parse_args()
    try:
        result = verify(args.base_url, args.wait_seconds)
    except Exception as exc:  # noqa: BLE001 - release gate must serialize every failure
        sys.stdout.write(
            json.dumps(
                {
                    "status": "failed",
                    "checked_at": datetime.now(UTC).isoformat(),
                    "error_category": type(exc).__name__,
                    "message": str(exc),
                },
                ensure_ascii=False,
            )
            + "\n"
        )
        return 1
    sys.stdout.write(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
