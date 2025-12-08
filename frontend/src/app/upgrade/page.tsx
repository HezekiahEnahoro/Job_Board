"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken, getCurrentUser, type User } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Sparkles, Zap, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export default function UpgradePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/auth");
      return;
    }

    getCurrentUser().then((userData) => {
      setUser(userData);
      setLoading(false);

      // If already Pro, redirect to dashboard
      if (userData?.is_pro) {
        toast.info("You're already a Pro user!");
        router.push("/dashboard");
      }
    });
  }, [router]);

  const handleUpgrade = async () => {
    const token = getToken();
    if (!token) {
      router.push("/auth");
      return;
    }

    setUpgrading(true);
    toast.loading("Creating checkout session...", { id: "checkout" });

    try {
      const res = await fetch(`${API}/stripe/create-checkout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Failed to create checkout");
      }

      const data = await res.json();

      toast.success("Redirecting to checkout...", { id: "checkout" });

      // Redirect to Stripe Checkout
      window.location.href = data.checkout_url;
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message, { id: "checkout" });
      setUpgrading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Upgrade to JobFlow Pro</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400">
          Unlimited applications, unlimited AI analyses, and priority support
        </p>
      </div>

      {/* Comparison */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Free Plan */}
        <Card className="p-8">
          <h3 className="text-2xl font-bold mb-2">Free</h3>
          <p className="text-4xl font-bold mb-6">
            $0<span className="text-lg font-normal text-gray-600">/month</span>
          </p>

          <ul className="space-y-3 mb-8">
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <span>Track up to 10 applications</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <span>1 AI resume analysis per month</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <span>Email reminders</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <span>Basic analytics</span>
            </li>
          </ul>

          <Button variant="outline" className="w-full" disabled>
            Current Plan
          </Button>
        </Card>

        {/* Pro Plan */}
        <Card className="p-8 border-2 border-blue-600 relative">
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
            Most Popular
          </div>

          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-2xl font-bold">Pro</h3>
            <Sparkles className="w-6 h-6 text-blue-600" />
          </div>

          <p className="text-4xl font-bold mb-1">
            $15<span className="text-lg font-normal text-gray-600">/month</span>
          </p>
          <p className="text-sm text-gray-600 mb-6">vs $49/mo competitors</p>

          <ul className="space-y-3 mb-8">
            <li className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <span className="font-semibold">Unlimited applications</span>
            </li>
            <li className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <span className="font-semibold">Unlimited AI analyses</span>
            </li>
            <li className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <span className="font-semibold">AI cover letter generation</span>
            </li>
            <li className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <span>Priority email support</span>
            </li>
            <li className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <span>Advanced analytics</span>
            </li>
            <li className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <span>Export to CSV</span>
            </li>
          </ul>

          <Button
            onClick={handleUpgrade}
            disabled={upgrading}
            className="w-full h-12 text-lg">
            {upgrading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Upgrade to Pro
              </>
            )}
          </Button>

          <p className="text-xs text-center text-gray-500 mt-4">
            💳 Secure payment via Stripe • Cancel anytime
          </p>
        </Card>
      </div>

      {/* FAQ */}
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-center">
          Frequently Asked Questions
        </h2>

        <div className="space-y-4">
          <Card className="p-6">
            <h3 className="font-semibold mb-2">Can I cancel anytime?</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Yes! Cancel anytime from your dashboard. You&lsquo;ll keep Pro
              until the end of your billing period.
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-2">
              How does this compare to Jobscan?
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Jobscan charges $49.95/month for JUST AI resume analysis. We give
              you that PLUS application tracking, reminders, and analytics for
              $15/month.
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-2">
              What payment methods do you accept?
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              We accept all major credit cards via Stripe (Visa, Mastercard,
              Amex, Discover).
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-2">
              Is my payment information secure?
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Yes! All payments are processed by Stripe, a PCI-compliant payment
              processor used by millions of businesses worldwide. We never see
              or store your card details.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
