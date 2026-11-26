"""Paystack payment gateway service (async)."""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class PaystackService:
    """Async client for the Paystack API."""

    def __init__(self) -> None:
        self.base_url = settings.paystack_base_url.rstrip("/")
        self.secret_key = settings.paystack_secret_key
        self.public_key = settings.paystack_public_key
        self.webhook_secret = settings.paystack_webhook_secret
        self._client: httpx.AsyncClient | None = None

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.secret_key}",
            "Content-Type": "application/json",
        }

    async def _request(
        self,
        method: str,
        path: str,
        *,
        json_body: dict[str, Any] | None = None,
        params: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        if not self.secret_key:
            raise ValueError("Paystack secret key is not configured")
        url = f"{self.base_url}{path}"
        client = self._client or httpx.AsyncClient(timeout=15.0)
        try:
            response = await client.request(
                method,
                url,
                headers=self._headers(),
                json=json_body,
                params=params,
            )
            response.raise_for_status()
            data = response.json()
            if not data.get("status"):
                raise ValueError(data.get("message") or "Paystack error")
            return data.get("data", {})
        except httpx.HTTPStatusError as exc:
            body = exc.response.text
            try:
                payload = exc.response.json()
                message = payload.get("message") or body
            except Exception:
                message = body
            raise ValueError(f"Paystack error: {message}") from exc

    async def close(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    # ── Transactions ──────────────────────────────────────────────

    async def initialize_transaction(
        self,
        *,
        email: str,
        amount_kobo: int,
        reference: str,
        callback_url: str | None = None,
        subaccount: str | None = None,
        bearer: str | None = None,
        currency: str | None = None,
        channels: list[str] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        if not email:
            raise ValueError("email is required")
        if amount_kobo <= 0:
            raise ValueError("amount must be greater than 0")
        body: dict[str, Any] = {
            "email": email,
            "amount": amount_kobo,
            "reference": reference,
        }
        if callback_url:
            body["callback_url"] = callback_url
        if subaccount:
            body["subaccount"] = subaccount
        if bearer:
            body["bearer"] = bearer
        if currency:
            body["currency"] = currency
        if channels:
            body["channels"] = channels
        if metadata:
            body["metadata"] = json.dumps(metadata)
        return await self._request("POST", "/transaction/initialize", json_body=body)

    async def verify_transaction(self, reference: str) -> dict[str, Any]:
        if not reference:
            raise ValueError("reference is required")
        return await self._request("GET", f"/transaction/verify/{reference}")

    async def get_transaction(self, transaction_id: int | str) -> dict[str, Any]:
        return await self._request("GET", f"/transaction/{transaction_id}")

    async def get_transaction_timeline(self, id_or_reference: str) -> dict[str, Any]:
        return await self._request("GET", f"/transaction/timeline/{id_or_reference}")

    async def create_refund(
        self,
        *,
        transaction: str,
        amount_kobo: int | None = None,
        currency: str | None = None,
        customer_note: str | None = None,
        merchant_note: str | None = None,
    ) -> dict[str, Any]:
        if not transaction:
            raise ValueError("transaction is required")
        body: dict[str, Any] = {"transaction": transaction}
        if amount_kobo is not None:
            if amount_kobo <= 0:
                raise ValueError("refund amount must be greater than 0")
            body["amount"] = amount_kobo
        if currency:
            body["currency"] = currency
        if customer_note:
            body["customer_note"] = customer_note
        if merchant_note:
            body["merchant_note"] = merchant_note
        return await self._request("POST", "/refund", json_body=body)

    # ── Webhooks ──────────────────────────────────────────────────

    def verify_webhook_signature(self, request_body: str, signature: str | None) -> bool:
        if not signature or not self.webhook_secret:
            return False
        try:
            computed = hmac.new(
                self.webhook_secret.encode(),
                request_body.encode(),
                hashlib.sha512,
            ).hexdigest()
            return hmac.compare_digest(computed.lower(), signature.strip().lower())
        except Exception:
            return False

    def extract_webhook_data(self, webhook_body: dict[str, Any]) -> dict[str, Any]:
        event = webhook_body.get("event")
        data = webhook_body.get("data", {})
        if not event:
            raise ValueError("Webhook event not found")
        customer = data.get("customer", {}) or {}
        result = {
            "event": event,
            "reference": data.get("reference"),
            "status": data.get("status"),
            "amount": data.get("amount"),
            "transaction_id": data.get("id"),
            "customer_email": customer.get("email"),
            "paid_at": data.get("paid_at"),
            "gateway_response": data.get("gateway_response"),
            "authorization": data.get("authorization", {}),
        }
        return result

    # ── Subaccounts ──────────────────────────────────────────────

    async def create_subaccount(
        self,
        *,
        business_name: str,
        settlement_bank: str,
        account_number: str,
        percentage_charge: float,
        description: str | None = None,
        primary_contact_email: str | None = None,
        primary_contact_name: str | None = None,
        primary_contact_phone: str | None = None,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {
            "business_name": business_name,
            "settlement_bank": settlement_bank,
            "account_number": account_number,
            "percentage_charge": percentage_charge,
        }
        if description:
            body["description"] = description
        if primary_contact_email:
            body["primary_contact_email"] = primary_contact_email
        if primary_contact_name:
            body["primary_contact_name"] = primary_contact_name
        if primary_contact_phone:
            body["primary_contact_phone"] = primary_contact_phone
        return await self._request("POST", "/subaccount", json_body=body)

    async def get_subaccount(self, code: str) -> dict[str, Any]:
        return await self._request("GET", f"/subaccount/{code}")

    async def resolve_account_number(self, *, account_number: str, bank_code: str) -> dict[str, Any]:
        """Resolve an account number on Paystack — returns { account_name }."""
        if not account_number or not bank_code:
            raise ValueError("account_number and bank_code are required")
        data = await self._request(
            "GET",
            f"/bank/resolve?account_number={account_number}&bank_code={bank_code}",
        )
        return data

    async def list_banks(self, country: str = "nigeria") -> list[dict[str, Any]]:
        """List all banks supported by Paystack for a country."""
        data = await self._request("GET", f"/bank?country={country}")
        return data if isinstance(data, list) else []

    # ── Customers ─────────────────────────────────────────────────

    async def create_customer(
        self,
        *,
        email: str,
        first_name: str | None = None,
        last_name: str | None = None,
        phone: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {"email": email}
        if first_name:
            body["first_name"] = first_name
        if last_name:
            body["last_name"] = last_name
        if phone:
            body["phone"] = phone
        if metadata:
            body["metadata"] = json.dumps(metadata)
        return await self._request("POST", "/customer", json_body=body)

    # ── Plans / Subscriptions ────────────────────────────────────

    async def create_plan(
        self,
        *,
        name: str,
        amount_kobo: int,
        interval: str,
        currency: str = "NGN",
    ) -> dict[str, Any]:
        body = {
            "name": name,
            "amount": amount_kobo,
            "interval": interval,
            "currency": currency,
        }
        return await self._request("POST", "/plan", json_body=body)

    async def create_subscription(
        self,
        *,
        customer: str,
        plan: str,
        authorization: str | None = None,
        start_date: str | None = None,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {"customer": customer, "plan": plan}
        if authorization:
            body["authorization"] = authorization
        if start_date:
            body["start_date"] = start_date
        return await self._request("POST", "/subscription", json_body=body)