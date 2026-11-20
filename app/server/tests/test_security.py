"""Tests for security helpers."""
from __future__ import annotations

import uuid

from app.lib.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
    verify_token,
)


def test_password_hash_and_verify() -> None:
    hashed = hash_password("Secret123!")
    assert hashed != "Secret123!"
    assert verify_password("Secret123!", hashed) is True
    assert verify_password("WrongPassword", hashed) is False


def test_access_token_round_trip() -> None:
    user_id = str(uuid.uuid4())
    tenant_id = str(uuid.uuid4())
    token = create_access_token(user_id=user_id, tenant_id=tenant_id, email="a@b.com", role="owner")
    payload = verify_token(token)
    assert payload is not None
    assert payload["sub"] == user_id
    assert payload["tenant_id"] == tenant_id
    assert payload["type"] == "access"
    assert payload["email"] == "a@b.com"


def test_refresh_token_round_trip() -> None:
    user_id = str(uuid.uuid4())
    tenant_id = str(uuid.uuid4())
    token = create_refresh_token(user_id=user_id, tenant_id=tenant_id)
    payload = verify_token(token)
    assert payload is not None
    assert payload["type"] == "refresh"


def test_verify_token_invalid() -> None:
    assert verify_token("not-a-token") is None
