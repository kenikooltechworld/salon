"""Cookie helpers for httpOnly auth tokens."""
from __future__ import annotations

from fastapi import Request, Response


def _is_secure_request(request: Request) -> bool:
    forwarded_proto = request.headers.get("x-forwarded-proto")
    if forwarded_proto:
        return forwarded_proto.lower() == "https"
    return request.url.scheme == "https"


def cookie_kwargs(request: Request) -> dict:
    """Build cookie attributes matching legacy behavior."""
    is_secure = _is_secure_request(request)
    kwargs = {
        "httponly": True,
        "secure": is_secure,
        "samesite": "none" if is_secure else "lax",
        "path": "/",
    }

    host = request.headers.get("x-forwarded-host") or request.headers.get("host", "")
    if host:
        host = host.split(":")[0]
        if not host.startswith("localhost") and not host.startswith("127."):
            parts = host.split(".")
            if len(parts) >= 2:
                kwargs["domain"] = "." + ".".join(parts[-2:])

    return kwargs


def set_auth_cookies(
    response: Response,
    request: Request,
    access_token: str,
    refresh_token: str,
    access_max_age: int,
    refresh_max_age: int,
) -> None:
    """Set access_token and refresh_token httpOnly cookies."""
    kwargs = cookie_kwargs(request)
    response.set_cookie(
        key="access_token",
        value=access_token,
        max_age=access_max_age,
        **kwargs,
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        max_age=refresh_max_age,
        **kwargs,
    )


def clear_auth_cookies(response: Response, request: Request) -> None:
    """Delete auth cookies."""
    kwargs = cookie_kwargs(request)
    for name in ("access_token", "refresh_token"):
        response.delete_cookie(key=name, **kwargs)
