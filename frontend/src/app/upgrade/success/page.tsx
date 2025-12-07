"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Sparkles } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function UpgradeSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (sessionId) {
      toast.success("Welcome to Pro! 🎉", {
        description: "Your account has been upgraded successfully!",
      });
    }
  }, [sessionId]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="max-w-lg p-8 text-center">
        <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>

        <h1 className="text-3xl font-bold mb-4 flex items-center justify-center gap-2">
          Welcome to Pro!
          <Sparkles className="w-8 h-8 text-yellow-500" />
        </h1>

        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
          Your account has been upgraded successfully. You now have unlimited
          access to all Pro features!
        </p>

        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-8">
          <h3 className="font-semibold mb-3">What's unlocked:</h3>
          <ul className="text-sm text-left space-y-2">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
              Unlimited job applications tracking
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
              Unlimited AI resume analyses
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
              AI cover letter generation
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
              Priority email support
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
              Advanced analytics
            </li>
          </ul>
        </div>

        <div className="flex gap-4">
          <Link href="/analyze" className="flex-1">
            <Button className="w-full">
              <Sparkles className="w-4 h-4 mr-2" />
              Try AI Analyzer
            </Button>
          </Link>
          <Link href="/dashboard" className="flex-1">
            <Button variant="outline" className="w-full">
              Go to Dashboard
            </Button>
          </Link>
        </div>

        <p className="text-xs text-gray-500 mt-6">
          You can manage your subscription anytime from your dashboard
        </p>
      </Card>
    </div>
  );
}
