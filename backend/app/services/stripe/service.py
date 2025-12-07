import os
import stripe
from typing import Optional

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

PRICE_ID = os.getenv("STRIPE_PRICE_ID")
WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

def create_checkout_session(user_email: str, user_id: int, success_url: str, cancel_url: str) -> dict:
    """Create a Stripe Checkout session for Pro subscription"""
    
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[
                {
                    'price': PRICE_ID,
                    'quantity': 1,
                },
            ],
            mode='subscription',
            success_url=success_url,
            cancel_url=cancel_url,
            customer_email=user_email,
            client_reference_id=str(user_id),
            metadata={
                'user_id': user_id,
            },
            allow_promotion_codes=True,
        )
        
        return {
            'checkout_url': session.url,
            'session_id': session.id,
        }
    
    except Exception as e:
        print(f"❌ Stripe checkout error: {e}")
        raise ValueError(f"Failed to create checkout session: {str(e)}")


def create_customer_portal_session(customer_id: str, return_url: str) -> dict:
    """Create a Stripe Customer Portal session for managing subscription"""
    
    try:
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=return_url,
        )
        
        return {
            'portal_url': session.url,
        }
    
    except Exception as e:
        print(f"❌ Stripe portal error: {e}")
        raise ValueError(f"Failed to create portal session: {str(e)}")


def get_subscription_status(customer_id: str) -> dict:
    """Get subscription status for a customer"""
    
    try:
        subscriptions = stripe.Subscription.list(
            customer=customer_id,
            limit=1,
        )
        
        if not subscriptions.data:
            return {'status': 'none', 'active': False}
        
        sub = subscriptions.data[0]
        
        return {
            'status': sub.status,
            'active': sub.status in ['active', 'trialing'],
            'current_period_end': sub.current_period_end,
            'cancel_at_period_end': sub.cancel_at_period_end,
        }
    
    except Exception as e:
        print(f"❌ Stripe subscription check error: {e}")
        return {'status': 'error', 'active': False}


def cancel_subscription(subscription_id: str) -> bool:
    """Cancel a subscription at period end"""
    
    try:
        stripe.Subscription.modify(
            subscription_id,
            cancel_at_period_end=True,
        )
        return True
    
    except Exception as e:
        print(f"❌ Stripe cancel error: {e}")
        return False