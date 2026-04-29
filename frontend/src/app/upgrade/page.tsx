"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Crown,
  Check,
  Zap,
  Sparkles,
  ArrowRight,
  FileText,
  Brain,
  Target,
  ChevronRight,
  Loader2,
} from "lucide-react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export default function UpgradePage() {
  const router = useRouter();
  const [loading, setLoading] = useState<"stripe" | "paystack" | null>(null);

  const proFeatures = [
    {
      icon: <Sparkles className="w-5 h-5" />,
      title: "Unlimited AI Cover Letters",
      description: "Generate personalized cover letters for every application",
    },
    {
      icon: <FileText className="w-5 h-5" />,
      title: "Unlimited Resume Analyses",
      description: "Get AI-powered match scores and improvement suggestions",
    },
    {
      icon: <Brain className="w-5 h-5" />,
      title: "Advanced Interview Prep",
      description: "Company research, practice questions, and STAR method tips",
    },
    {
      icon: <Target className="w-5 h-5" />,
      title: "Priority Support",
      description: "Get help faster with dedicated priority support",
    },
    {
      icon: <Zap className="w-5 h-5" />,
      title: "Early Access",
      description: "Be first to try new features and improvements",
    },
  ];

  // FIX: was window.location.href = "/api/stripe/create-checkout"
  // That hit a Next.js API route that doesn't exist → 404
  // Now: fetch to FastAPI backend with JWT, then redirect to returned URL
  const handleUpgrade = async (provider: "stripe" | "paystack") => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth?mode=login");
      return;
    }

    setLoading(provider);

    try {
      const endpoint =
        provider === "stripe"
          ? `${API}/stripe/create-checkout`
          : `${API}/paystack/create-checkout`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || "Failed to start checkout. Please try again.");
        return;
      }

      const data = await res.json();
      // Stripe → checkout_url | Paystack → authorization_url
      const redirectUrl = data.checkout_url || data.authorization_url;
      if (redirectUrl) {
        window.location.href = redirectUrl;
      }
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                <Crown className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg hidden sm:inline">
                MyJobPhase
              </span>
            </Link>
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="text-gray-400 hover:text-white">
              Back
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-20">
        {/* Hero */}
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6">
            <Crown className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-purple-400 font-medium">
              Upgrade to Pro
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black mb-4 sm:mb-6 leading-tight">
            Supercharge Your
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              Job Search
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto px-4">
            Unlock unlimited AI-powered features and land your dream job faster
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6 sm:gap-8 mb-12 sm:mb-16">
          {/* Free */}
          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 sm:p-8">
            <div className="mb-6">
              <h3 className="text-2xl font-bold mb-2">Free</h3>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-4xl sm:text-5xl font-black">$0</span>
                <span className="text-gray-400">/month</span>
              </div>
              <p className="text-gray-400 text-sm">
                Perfect for getting started
              </p>
            </div>
            <div className="space-y-3 mb-8">
              {[
                "Unlimited job tracking",
                "3 resume analyses/month",
                "Quick Apply (resume only)",
                "Interview Prep AI",
                "Email alerts",
              ].map((f) => (
                <div key={f} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                  <span className="text-gray-300 text-sm">{f}</span>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              className="w-full h-12 border-white/10 bg-white/5 hover:bg-white/10"
              onClick={() => router.push("/dashboard")}>
              Current Plan
            </Button>
          </div>

          {/* Pro */}
          <div className="relative rounded-3xl border-2 border-purple-500/50 bg-gradient-to-b from-purple-500/10 to-pink-500/10 backdrop-blur-xl p-6 sm:p-8">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <div className="px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-bold">
                Most Popular
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-2xl font-bold mb-2 flex items-center gap-2">
                Pro <Crown className="w-5 h-5 text-yellow-400" />
              </h3>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  $15
                </span>
                <span className="text-gray-400">/month</span>
              </div>
              <p className="text-sm text-gray-400 mb-1">
                ≈ ₦25,000/month for Nigerian users
              </p>
              <p className="text-gray-300 text-sm">
                Everything you need to land your dream job
              </p>
            </div>

            <div className="space-y-3 mb-8">
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                <span className="font-medium">Everything in Free, plus:</span>
              </div>
              {[
                ["Unlimited AI cover letters", "Personalized for every job"],
                ["Unlimited resume analyses", "No monthly limits"],
                ["Advanced interview prep", "Company research & tips"],
                ["Priority support", "Get help faster"],
                ["Early access", "Try new features first"],
              ].map(([title, desc]) => (
                <div key={title} className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                  <span className="text-gray-200 text-sm">
                    <strong>{title}</strong> - {desc}
                  </span>
                </div>
              ))}
            </div>

            {/* Payment buttons */}
            <div className="space-y-3">
              {/* Stripe — international cards */}
              <Button
                className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 font-bold shadow-lg shadow-purple-500/25"
                onClick={() => handleUpgrade("stripe")}
                disabled={!!loading}>
                {loading === "stripe" ? (
                  <>
                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                    Redirecting...
                  </>
                ) : (
                  <>
                    <Crown className="mr-2 w-4 h-4" />
                    Pay with Card (Stripe)
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </>
                )}
              </Button>

              {/* Paystack — Nigerian users */}
              <Button
                className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 font-bold"
                onClick={() => handleUpgrade("paystack")}
                disabled={!!loading}>
                {loading === "paystack" ? (
                  <>
                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                    Redirecting...
                  </>
                ) : (
                  <>
                    🇳🇬 Pay with Paystack (₦25,000)
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </>
                )}
              </Button>

              <p className="text-center text-xs text-gray-400">
                Cancel anytime · No questions asked
              </p>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="max-w-4xl mx-auto mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12">
            What You Get with Pro
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {proFeatures.map((feature, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl hover:bg-white/10 transition">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-4">
                  {feature.icon}
                </div>
                <h3 className="font-bold mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {[
              [
                "Can I cancel anytime?",
                "Yes! Cancel anytime from your account settings. No questions asked, no penalties.",
              ],
              [
                "What payment methods do you accept?",
                "International cards via Stripe (Visa, Mastercard, Amex) or Paystack for Nigerian users (cards, bank transfer, USSD).",
              ],
              [
                "Is there a free trial?",
                "You can use the Free tier forever! Upgrade to Pro when you're ready for unlimited features.",
              ],
              [
                "Will my data be safe?",
                "Absolutely. We use enterprise-grade encryption and never share your data with third parties.",
              ],
            ].map(([q, a]) => (
              <div
                key={q}
                className="p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
                <h3 className="font-bold mb-2 flex items-center gap-2">
                  <ChevronRight className="w-5 h-5 text-purple-400" />
                  {q}
                </h3>
                <p className="text-sm text-gray-400 pl-7">{a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-3xl border border-purple-500/20 bg-gradient-to-r from-purple-500/10 to-pink-500/10 backdrop-blur-xl p-8 sm:p-12 text-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-pink-600/10 blur-3xl" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-black mb-4">
                Ready to Land Your Dream Job?
              </h2>
              <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
                Join hundreds of job seekers who are applying to 10x more jobs
                with AI
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  size="lg"
                  className="h-14 px-8 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 font-bold text-lg shadow-xl shadow-purple-500/25"
                  onClick={() => handleUpgrade("stripe")}
                  disabled={!!loading}>
                  {loading === "stripe" ? (
                    <Loader2 className="mr-2 w-5 h-5 animate-spin" />
                  ) : (
                    <Crown className="mr-2 w-5 h-5" />
                  )}
                  Upgrade with Card
                </Button>
                <Button
                  size="lg"
                  className="h-14 px-8 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 font-bold text-lg"
                  onClick={() => handleUpgrade("paystack")}
                  disabled={!!loading}>
                  🇳🇬 Pay via Paystack
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-4">
                30-day money-back guarantee
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
