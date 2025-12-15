from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.services.auth.dependencies import get_current_user
from app.services.auth.models import User
from app.services.stripe.service import (
    create_checkout_session,
    create_customer_portal_session,
    get_subscription_status,
    WEBHOOK_SECRET,
)
from pydantic import BaseModel
import stripe
import os

router = APIRouter(prefix="/stripe", tags=["stripe"])

class CheckoutResponse(BaseModel):
    checkout_url: str

class PortalResponse(BaseModel):
    portal_url: str

@router.post("/create-checkout", response_model=CheckoutResponse)
def create_checkout(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create Stripe Checkout session for Pro upgrade"""
    
    # Check if already Pro
    if current_user.is_pro:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You're already a Pro user"
        )
    
    # Get base URL from environment or use default
    base_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    
    success_url = f"{base_url}/upgrade/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{base_url}/upgrade"
    
    result = create_checkout_session(
        user_email=current_user.email,
        user_id=current_user.id,
        success_url=success_url,
        cancel_url=cancel_url,
    )
    
    return CheckoutResponse(checkout_url=result['checkout_url'])


@router.post("/create-portal", response_model=PortalResponse)
def create_portal(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create Stripe Customer Portal session for managing subscription"""
    
    if not current_user.stripe_customer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No subscription found"
        )
    
    base_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    return_url = f"{base_url}/dashboard"
    
    result = create_customer_portal_session(
        customer_id=current_user.stripe_customer_id,
        return_url=return_url,
    )
    
    return PortalResponse(portal_url=result['portal_url'])


@router.get("/subscription-status")
def subscription_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get current subscription status"""
    
    if not current_user.stripe_customer_id:
        return {
            "is_pro": False,
            "status": "none",
        }
    
    status_info = get_subscription_status(current_user.stripe_customer_id)
    
    return {
        "is_pro": current_user.is_pro,
        "status": status_info.get('status'),
        "active": status_info.get('active'),
        "subscription_end_date": current_user.subscription_end_date,
    }


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle Stripe webhooks"""
    
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    print(f"📨 Received Stripe event: {event['type']}")  # Debug log
    
    # Handle different event types
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        
        # Get user_id from client_reference_id
        user_id = session.get('client_reference_id')
        if not user_id:
            print(f"❌ No client_reference_id in session: {session}")
            return {"status": "error", "message": "No user_id"}
        
        user_id = int(user_id)
        
        # Update user to Pro
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.is_pro = True
            user.stripe_customer_id = session['customer']
            user.stripe_subscription_id = session.get('subscription')
            user.subscription_status = 'active'
            db.commit()
            db.refresh(user)
            print(f"✅ User {user.email} upgraded to Pro! is_pro={user.is_pro}")
        else:
            print(f"❌ User with ID {user_id} not found")
    
    elif event['type'] == 'customer.subscription.updated':
        subscription = event['data']['object']
        customer_id = subscription['customer']
        
        user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
        if user:
            user.subscription_status = subscription['status']
            user.is_pro = subscription['status'] in ['active', 'trialing']
            db.commit()
            print(f"✅ Subscription updated for {user.email}: {subscription['status']}")
    
    elif event['type'] == 'customer.subscription.deleted':
        subscription = event['data']['object']
        customer_id = subscription['customer']
        
        user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
        if user:
            user.is_pro = False
            user.subscription_status = 'canceled'
            db.commit()
            print(f"✅ Subscription canceled for {user.email}")
    
    return {"status": "success"}