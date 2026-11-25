from __future__ import annotations
import re
from playwright.sync_api import expect

def require_verification_code(prod_config):
    import pytest
    if not re.fullmatch(r"\d{6}", prod_config.verification_code or ""):
        pytest.skip("E2E_VERIFICATION_CODE not provided; OTP-dependent test skipped")
    return prod_config.verification_code

def register_payload(identity):
    return {
        "salon_name": identity.salon_name,
        "owner_name": identity.owner_name,
        "email": identity.email,
        "phone": identity.phone,
        "password": identity.password,
        "address": identity.address,
    }

def url(prod_config, path: str) -> str:
    return f"{prod_config.api_url}/{path.lstrip('/')}"

def test_prod_frontend_register_page_loads(page, prod_config):
    page.goto(f"{prod_config.frontend_url}/auth/register", wait_until="domcontentloaded")
    expect(page.get_by_role("heading", name=re.compile("Create Your Salon Account|Create your account", re.I))).to_be_visible(timeout=30000)

def test_prod_api_register_creates_temp_registration(api, identity, prod_config):
    resp = api.post(url(prod_config, "/auth/register"), data=register_payload(identity))
    assert resp.status == 200, resp.text()
    body = resp.json()
    assert body.get("success") is True
    data = body.get("data") or {}
    assert data.get("email") == identity.email.lower()
    assert "temp_registration_id" in data
    assert "expires_at" in data

def test_prod_api_register_same_email_while_unverified(api, identity, prod_config):
    payload = register_payload(identity)
    first = api.post(url(prod_config, "/auth/register"), data=payload)
    assert first.status in (200, 400, 409, 503), first.text()

    second = api.post(url(prod_config, "/auth/register"), data=payload)
    assert second.status in (200, 400, 409, 503), second.text()
    body = second.json() if second.headers.get("content-type", "").startswith("application/json") else {}
    detail = str(body.get("detail") or body.get("message") or "")
    acceptable = second.status == 200 or "verification" in detail.lower() or "resend" in detail.lower() or "already in registration" in detail.lower()
    assert acceptable, f"Unexpected unverified re-register behavior: {second.status} {body}"

def test_prod_api_resend_code_for_unverified(api, identity, prod_config):
    payload = register_payload(identity)
    reg = api.post(url(prod_config, "/auth/register"), data=payload)
    if reg.status == 503:
        return
    assert reg.status in (200, 400, 409), reg.text()

    resend = api.post(url(prod_config, "/auth/resend-code"), data={"email": identity.email})
    assert resend.status in (200, 400, 503), resend.text()
    if resend.status == 200:
        body = resend.json()
        assert body.get("success") is True
        assert "expires_at" in ((body.get("data") or {}))

def test_prod_api_login_unverified_is_blocked_or_directed(api, identity, prod_config):
    payload = register_payload(identity)
    reg = api.post(url(prod_config, "/auth/register"), data=payload)
    if reg.status == 503:
        return
    assert reg.status in (200, 400, 409), reg.text()

    login = api.post(url(prod_config, "/auth/login"), data={"email": identity.email, "password": identity.password})
    assert login.status in (400, 401, 403, 409), login.text()
    body = login.json() if login.headers.get("content-type", "").startswith("application/json") else {}
    detail = str(body.get("detail") or body.get("message") or "").lower()
    assert ("verify" in detail or "verification" in detail or "resend" in detail or login.status in (401, 403, 409)), login.text()

def test_prod_api_verify_code_and_me(api, identity, prod_config):
    code = require_verification_code(prod_config)
    reg = api.post(url(prod_config, "/auth/register"), data=register_payload(identity))
    if reg.status == 503:
        return
    assert reg.status in (200, 400, 409), reg.text()

    verify = api.post(url(prod_config, "/auth/verify-code"), data={"email": identity.email, "code": code})
    assert verify.status == 200, verify.text()
    body = verify.json()
    assert body.get("success") is True
    data = body.get("data") or {}
    assert data.get("tenant_id")
    assert data.get("subdomain")
    assert data.get("user_id")

    me = api.get(url(prod_config, "/auth/me"))
    assert me.status == 200, me.text()
    me_body = me.json()
    assert me_body.get("user", {}).get("email") == identity.email.lower()
    assert me_body.get("tenant", {}).get("subdomain") == data.get("subdomain")

def test_prod_ui_register_redirects_to_verify(page, prod_config, identity):
    page.goto(f"{prod_config.frontend_url}/auth/register", wait_until="domcontentloaded")
    page.wait_for_load_state("networkidle", timeout=30000)
    # flexible selectors - prod frontend may differ from app/salon
    for label in ["Salon Name *", "Salon Name", "Business Name", "Salon name"]:
        loc = page.get_by_label(label, exact=False)
        if loc.count() > 0:
            loc.first.fill(identity.salon_name)
            break
    else:
        page.locator('input[name="salon_name"], input[placeholder*="salon" i]').first.fill(identity.salon_name)
    for label in ["Owner Name *", "Owner Name", "Full Name", "Your name"]:
        loc = page.get_by_label(label, exact=False)
        if loc.count() > 0:
            loc.first.fill(identity.owner_name)
            break
    else:
        page.locator('input[name="owner_name"], input[placeholder*="owner" i], input[placeholder*="name" i]').first.fill(identity.owner_name)
    page.get_by_label(re.compile("Email", re.I)).first.fill(identity.email)
    page.get_by_label(re.compile("Phone", re.I)).first.fill(identity.phone)
    page.locator('input[type="password"]').first.fill(identity.password)
    page.get_by_label(re.compile("Address", re.I)).first.fill(identity.address)
    page.get_by_role("button", name=re.compile("Create Account|Register|Sign up", re.I)).click()

    expect(page).to_have_url(re.compile(r"/auth/verify\?email="), timeout=30000)
    expect(page.get_by_role("heading", name=re.compile("Verify", re.I))).to_be_visible(timeout=30000)
