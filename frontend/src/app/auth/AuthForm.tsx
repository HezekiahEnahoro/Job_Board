"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login, signup } from "@/lib/auth";
import { toast } from "sonner";
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  CheckCircle2,
  Zap,
} from "lucide-react";
import Link from "next/link";

export default function AuthForm() {
  const searchParams = useSearchParams();
  
  // Check URL parameter for mode
  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "login";
  
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Update mode when URL changes
  useEffect(() => {
    const urlMode = searchParams.get("mode");
    if (urlMode === "signup") {
      setMode("signup");
    } else if (urlMode === "login") {
      setMode("login");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        await signup(email, password, fullName);
        toast.success("Account created!");
      }
      await login(email, password);
      router.push("/dashboard");
      toast.success("Welcome back!");
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-7xl px-6 lg:px-8 py-8">
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 mb-4">
              <Zap className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-black mb-2">
              {mode === "login" ? "Welcome Back" : "Get Started"}
            </h1>
            <p className="text-gray-400">
              {mode === "login"
                ? "Sign in to continue your job search"
                : "Create your account in seconds"}
            </p>
          </div>

          {/* Auth Card */}
          <div className="group relative">
            <div className="absolute -inset-px bg-gradient-to-r from-blue-500/50 to-purple-500/50 rounded-3xl blur opacity-75 group-hover:opacity-100 transition"></div>
            <div className="relative rounded-3xl border border-white/10 bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-2xl p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {mode === "signup" && (
                  <div className="space-y-2">
                    <Label
                      htmlFor="fullName"
                      className="text-sm text-gray-400 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Full Name
                    </Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="John Doe"
                      required={mode === "signup"}
                      className="h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500/50"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="text-sm text-gray-400 flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="text-sm text-gray-400 flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500/50"
                  />
                  {mode === "signup" && (
                    <p className="text-xs text-gray-500 mt-1">
                      Minimum 6 characters
                    </p>
                  )}
                </div>

                {error && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-14 text-base font-bold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-xl shadow-blue-500/25 hover:shadow-blue-500/50 transition-all disabled:opacity-50"
                  disabled={loading}>
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Processing...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {mode === "login" ? "Sign In" : "Create Account"}
                      <ArrowRight className="h-5 w-5" />
                    </div>
                  )}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-gradient-to-br from-gray-900/90 to-black/90 text-gray-400">
                      {mode === "login"
                        ? "New to MyJobPhase?"
                        : "Already have an account?"}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const newMode = mode === "login" ? "signup" : "login";
                    setMode(newMode);
                    setError("");
                    // Update URL without page reload
                    router.push(`/auth?mode=${newMode}`, { scroll: false });
                  }}
                  className="w-full text-center text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors">
                  {mode === "login"
                    ? "Create a free account →"
                    : "Sign in to existing account →"}
                </button>
              </form>

              {/* Features (only show on signup) */}
              {mode === "signup" && (
                <div className="mt-8 pt-8 border-t border-white/10 space-y-3">
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-4">
                    What you get:
                  </p>
                  {[
                    "Track unlimited applications",
                    "AI-powered resume analysis",
                    "Automated follow-up reminders",
                    "Real-time analytics dashboard",
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                      <span className="text-sm text-gray-400">{feature}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Back to home */}
          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-sm text-gray-500 hover:text-white transition-colors">
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}