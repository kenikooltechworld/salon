"""Domain configuration for tenant subdomain resolution.

This module is the single source of truth for domains/hosts that should NOT
be treated as tenant public subdomains. Add new entries here as needed.
"""
from __future__ import annotations

# Exact hostnames that are platform/infrastructure hosts, never tenant subdomains.
NON_PUBLIC_EXACT_HOSTS: set[str] = {
    "kenikoolsalon.com",
    "www.kenikoolsalon.com",
    "api.kenikoolsalon.com",
}

# Hostname suffixes that indicate platform/preview/dev hosting.
# A hostname is excluded if it equals the suffix (without leading dot) or ends
# with the suffix as a domain boundary.
NON_PUBLIC_HOST_SUFFIXES: tuple[str, ...] = (
    ".pages.dev",
    ".dev",
)

# Subdomain labels that are reserved/infrastructure even on the platform domain.
EXCLUDED_SUBDOMAIN_LABELS: set[str] = {
    "www",
    "api",
    "admin",
    "app",
}

# Hosting platform domains where subdomain extraction should be skipped.
HOSTING_PLATFORM_DOMAINS: tuple[str, ...] = (
    "fly.dev",
    "workers.dev",
    "vercel.app",
    "netlify.app",
    "herokuapp.com",
    "onrender.com",
)


def _normalize_host(host: str | None) -> str:
    value = (host or "").strip().lower()
    if not value:
        return ""
    # Strip port
    if value.startswith("["):
        # IPv6 [::1]:port
        end = value.find("]")
        if end != -1:
            value = value[1:end]
            return value
    value = value.split(":")[0]
    return value.strip(".")


def is_ip_address(host: str) -> bool:
    h = _normalize_host(host)
    if not h:
        return False
    if ":" in h:
        return True
    parts = h.split(".")
    if len(parts) != 4:
        return False
    try:
        return all(0 <= int(p) <= 255 for p in parts)
    except ValueError:
        return False


def is_local_host(host: str) -> bool:
    h = _normalize_host(host)
    return h in {"localhost", "127.0.0.1", "::1"} or h.endswith(".localhost")


def _matches_suffix(host: str, suffix: str) -> bool:
    s = suffix.lower().strip()
    if not s:
        return False
    if s.startswith("."):
        return host.endswith(s) or host == s[1:]
    return host == s or host.endswith("." + s)


def is_non_public_host(host: str | None) -> bool:
    h = _normalize_host(host)
    if not h:
        return True
    if is_local_host(h) or is_ip_address(h):
        return True
    if h in NON_PUBLIC_EXACT_HOSTS:
        return True
    if any(_matches_suffix(h, s) for s in NON_PUBLIC_HOST_SUFFIXES):
        return True
    if any(_matches_suffix(h, d) for d in HOSTING_PLATFORM_DOMAINS):
        return True
    return False


def extract_tenant_subdomain(host: str | None, platform_domain: str | None = None) -> str | None:
    """Extract tenant subdomain from host.

    Returns None when host is non-public/infrastructure, has no tenant subdomain,
    or uses an excluded subdomain label.
    """
    h = _normalize_host(host)
    if not h or is_non_public_host(h):
        return None

    parts = h.split(".")
    if len(parts) < 2:
        return None

    # Handle *.localhost for local dev (e.g. demo.localhost)
    if len(parts) == 2 and parts[1] == "localhost":
        label = parts[0]
        return None if label in EXCLUDED_SUBDOMAIN_LABELS else label

    # For platform domain, require subdomain.platform.domain
    if platform_domain:
        pd = _normalize_host(platform_domain)
        if pd and (h == pd or h.endswith("." + pd)):
            remainder = h[: -(len(pd) + 1)] if h != pd else ""
            if not remainder:
                return None
            label = remainder.split(".")[0]
            if not label or label in EXCLUDED_SUBDOMAIN_LABELS:
                return None
            return label

    # Generic: first label when there are 3+ parts
    if len(parts) >= 3:
        label = parts[0]
        if label in EXCLUDED_SUBDOMAIN_LABELS:
            return None
        return label

    return None
