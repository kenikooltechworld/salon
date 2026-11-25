from __future__ import annotations

import os
import re
import time
import uuid
from dataclasses import dataclass
from pathlib import Path

import pytest
from playwright.sync_api import APIRequestContext, Page, sync_playwright

ROOT = Path(__file__).resolve().parents[2]
ENV_TEST = ROOT / ".env.test"


def load_env_test() -> None:
    if not ENV_TEST.exists():
        return
    for raw in ENV_TEST.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        k = k.strip()
        v = v.strip().strip('"').strip("'")
        if k and k not in os.environ:
            os.environ[k] = v


load_env_test()


def _env(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


@dataclass(frozen=True)
class ProdConfig:
    frontend_url: str
    api_url: str
    test_email: str
    test_password: str
    run_id: str
    verification_code: str


@pytest.fixture(scope="session")
def prod_config() -> ProdConfig:
    return ProdConfig(
        frontend_url=_env("E2E_FRONTEND_URL", "https://kenikoolsalon.com").rstrip("/"),
        api_url=_env("E2E_API_URL", "https://api.kenikoolsalon.com/api/v1").rstrip("/"),
        test_email=_env("TEST_EMAIL"),
        test_password=_env("TEST_PASSWORD"),
        run_id=_env("E2E_RUN_ID") or f"pw-{int(time.time())}-{uuid.uuid4().hex[:6]}",
        verification_code=_env("E2E_VERIFICATION_CODE"),
    )


@pytest.fixture(scope="session")
def playwright_instance():
    with sync_playwright() as p:
        yield p


@pytest.fixture(scope="session")
def browser(playwright_instance):
    browser = playwright_instance.chromium.launch(headless=True)
    yield browser
    browser.close()


@pytest.fixture()
def context(browser):
    ctx = browser.new_context(ignore_https_errors=False)
    yield ctx
    ctx.close()


@pytest.fixture()
def page(context) -> Page:
    page = context.new_page()
    yield page


@pytest.fixture()
def api(playwright_instance, prod_config: ProdConfig) -> APIRequestContext:
    ctx = playwright_instance.request.new_context(
        base_url=prod_config.api_url,
        extra_http_headers={"Accept": "application/json"},
    )
    yield ctx
    ctx.dispose()


@dataclass
class TestIdentity:
    run_id: str
    salon_name: str
    owner_name: str
    email: str
    phone: str
    password: str
    address: str
    expected_subdomain_prefix: str


@pytest.fixture()
def identity(prod_config: ProdConfig) -> TestIdentity:
    slug = re.sub(r"[^a-z0-9]+", "-", prod_config.run_id.lower()).strip("-")
    local, domain = (prod_config.test_email.split("@", 1) + ["example.com"])[:2]
    # Use plus-addressing so OTPs go to the real inbox owner while keeping identity unique.
    email = f"{local}+{slug}@{domain}" if prod_config.test_email else f"{slug}@example.invalid"
    return TestIdentity(
        run_id=prod_config.run_id,
        salon_name=f"PW Salon {prod_config.run_id}",
        owner_name="Playwright Tenant",
        email=email,
        phone="+2348012345678",
        password="Pw!Test12345",
        address="123 Playwright Test Street, Lagos",
        expected_subdomain_prefix=re.sub(r"[^a-z0-9-]", "", f"pw-salon-{slug}")[:20],
    )


def require_verification_code(prod_config: ProdConfig) -> str:
    if not re.fullmatch(r"\d{6}", prod_config.verification_code or ""):
        pytest.skip("E2E_VERIFICATION_CODE not provided; OTP-dependent test skipped")
    return prod_config.verification_code
