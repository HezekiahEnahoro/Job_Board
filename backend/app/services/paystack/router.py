"""
app/services/paystack/router.py
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.services.auth.dependencies import get_current_user
from app.services.auth.models import User
from app.services.paystack.service import (
    create_checkout_session,
    verify_transaction,
    verify_webhook_signature,
)
from pydantic import BaseModel
import os

router = APIRouter(prefix="/paystack", tags=["paystack"])


class CheckoutResponse(BaseModel):
    authorization_url: str
    reference: str


@router.post("/create-checkout", response_model=CheckoutResponse)
def create_checkout(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.is_pro:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You're already a Pro user",
        )

    base_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    success_url = f"{base_url}/upgrade/success?provider=paystack&reference={{PAYSTACK_REFERENCE}}"
    cancel_url = f"{base_url}/upgrade"

    result = create_checkout_session(
        user_email=current_user.email,
        user_id=current_user.id,
        success_url=success_url,
        cancel_url=cancel_url,
    )

    return CheckoutResponse(
        authorization_url=result["authorization_url"],
        reference=result["reference"],
    )


@router.get("/verify/{reference}")
def verify_payment(
    reference: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Verify a Paystack payment after redirect.
    Frontend calls this after Paystack redirects back to success_url.
    """
    try:
        result = verify_transaction(reference)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    if result["status"] != "success":
        raise HTTPException(
            status_code=400,
            detail=f"Payment not successful: {result['status']}",
        )

    # Upgrade user
    current_user.is_pro = True
    current_user.subscription_status = "active"
    db.commit()

    return {"success": True, "message": "Upgraded to Pro!"}


@router.post("/webhook")
async def paystack_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Paystack webhook — fires on payment events.
    Add this URL in Paystack dashboard → Settings → Webhooks
    """
    payload = await request.body()
    signature = request.headers.get("x-paystack-signature", "")

    if not verify_webhook_signature(payload, signature):
        raise HTTPException(status_code=400, detail="Invalid signature")

    import json
    event = json.loads(payload)
    event_type = event.get("event")

    print(f"📨 Paystack webhook: {event_type}")

    if event_type == "charge.success":
        data = event["data"]
        user_id = data.get("metadata", {}).get("user_id")

        if user_id:
            user = db.query(User).filter(User.id == int(user_id)).first()
            if user:
                user.is_pro = True
                user.subscription_status = "active"
                db.commit()
                print(f"✅ {user.email} upgraded to Pro via Paystack")

    return {"status": "success"}