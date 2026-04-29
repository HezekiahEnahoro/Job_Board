"""
app/services/paystack/service.py

Paystack payment integration for Nigerian users.
Free to use, supports NGN, popular in Nigeria/Africa.
Docs: https://paystack.com/docs/api/
"""

import os
import httpx
import hashlib
import hmac
from typing import Optional

PAYSTACK_SECRET_KEY = os.getenv("PAYSTACK_SECRET_KEY", "")
PAYSTACK_BASE = "https://api.paystack.co"

# $15 USD → NGN (approximate, update as needed)
# Paystack uses kobo (100 kobo = 1 NGN)
PRO_PRICE_NGN = int(os.getenv("PAYSTACK_PRICE_NGN", "25000"))  # ₦25,000 (~$15)
PRO_PRICE_KOBO = PRO_PRICE_NGN * 100


def create_checkout_session(
    user_email: str,
    user_id: int,
    success_url: str,
    cancel_url: str,
) -> dict:
    """
    Initialize a Paystack transaction.
    Returns authorization_url to redirect user to.
    """
    headers = {
        "Authorization": f"Bearer {PAYSTACK_SECRET_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "email": user_email,
        "amount": PRO_PRICE_KOBO,
        "currency": "NGN",
        "callback_url": success_url,
        "metadata": {
            "user_id": user_id,
            "plan": "pro",
            "cancel_url": cancel_url,
        },
        "plan": os.getenv("PAYSTACK_PLAN_CODE", ""),  # Optional: recurring plan code
    }

    # Remove plan if not set — use one-time charge instead
    if not payload["plan"]:
        del payload["plan"]

    with httpx.Client(timeout=30) as client:
        r = client.post(f"{PAYSTACK_BASE}/transaction/initialize", headers=headers, json=payload)
        r.raise_for_status()
        data = r.json()

    if not data.get("status"):
        raise ValueError(f"Paystack error: {data.get('message', 'Unknown error')}")

    return {
        "authorization_url": data["data"]["authorization_url"],
        "reference": data["data"]["reference"],
    }


def verify_transaction(reference: str) -> dict:
    """
    Verify a completed Paystack transaction.
    Call this from webhook or success callback.
    """
    headers = {"Authorization": f"Bearer {PAYSTACK_SECRET_KEY}"}

    with httpx.Client(timeout=30) as client:
        r = client.get(
            f"{PAYSTACK_BASE}/transaction/verify/{reference}",
            headers=headers,
        )
        r.raise_for_status()
        data = r.json()

    if not data.get("status"):
        raise ValueError(f"Paystack verify error: {data.get('message')}")

    transaction = data["data"]
    return {
        "status": transaction["status"],  # "success" | "failed" | "abandoned"
        "amount": transaction["amount"],  # kobo
        "email": transaction["customer"]["email"],
        "user_id": transaction.get("metadata", {}).get("user_id"),
        "reference": transaction["reference"],
        "paid_at": transaction.get("paid_at"),
    }


def verify_webhook_signature(payload: bytes, signature: str) -> bool:
    """
    Verify Paystack webhook signature.
    Paystack signs with HMAC-SHA512 using your secret key.
    """
    expected = hmac.new(
        PAYSTACK_SECRET_KEY.encode("utf-8"),
        payload,
        hashlib.sha512,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)