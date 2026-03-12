"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Sparkles } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (sessionId) {
      toast.success("Welcome to Pro! 🎉", {
        description: "Your account has been upgraded successfully!",
      });

      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        router.push("/dashboard?upgraded=true");
      }, 3000);
    }
  }, [sessionId, router]);

  return (
    <div className="container mx-auto max-w-7xl px-6 lg:px-8 py-8">
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="group relative max-w-lg w-full">
          <div className="absolute -inset-px bg-gradient-to-r from-green-500 to-emerald-500 rounded-3xl opacity-75 blur-xl"></div>
          <div className="relative rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-12 text-center">
            {/* Success Icon */}
            <div className="inline-flex p-6 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 mb-6">
              <CheckCircle2 className="w-12 h-12 text-white" />
            </div>

            {/* Title */}
            <h1 className="text-4xl font-black mb-4 flex items-center justify-center gap-3">
              Welcome to Pro!
              <Sparkles className="w-8 h-8 text-yellow-400" />
            </h1>

            <p className="text-lg text-gray-400 mb-8">
              Your account has been upgraded successfully. You now have
              unlimited access to all Pro features!
            </p>

            {/* Features List */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-8">
              <h3 className="font-bold mb-4 text-left">What's unlocked:</h3>
              <ul className="text-sm text-left space-y-3">
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                  <span className="text-gray-300">
                    Unlimited job applications tracking
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                  <span className="text-gray-300">
                    Unlimited AI resume analyses
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                  <span className="text-gray-300">
                    AI cover letter generation
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                  <span className="text-gray-300">Priority email support</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                  <span className="text-gray-300">
                    Advanced analytics & exports
                  </span>
                </li>
              </ul>
            </div>

            {/* CTA Buttons */}
            <div className="flex gap-4">
              <Link href="/analyze" className="flex-1">
                <Button className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Try AI Analyzer
                </Button>
              </Link>
              <Link href="/dashboard?upgraded=true" className="flex-1">
                <Button
                  variant="outline"
                  className="w-full h-12 border-white/10 bg-white/5 hover:bg-white/10">
                  Go to Dashboard
                </Button>
              </Link>
            </div>

            <p className="text-xs text-gray-500 mt-6">
              Redirecting to dashboard in 3 seconds...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UpgradeSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-7xl px-6 lg:px-8 py-8">
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-600 border-t-transparent"></div>
          </div>
        </div>
      }>
      <SuccessContent />
    </Suspense>
  );
}
