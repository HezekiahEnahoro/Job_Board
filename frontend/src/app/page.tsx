"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Target,
  Sparkles,
  TrendingUp,
  Mail,
  CheckCircle2,
  ArrowRight,
  BarChart3,
  Brain,
  Clock,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950 py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Land Your Dream Job 3x Faster
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
              Track applications, optimize your resume with AI, and never miss a
              follow-up. Everything you need to get hired, in one place.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link href="/auth">
                <Button size="lg" className="h-12 px-8 text-lg">
                  Start Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/jobs">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 px-8 text-lg">
                  Browse Jobs
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              ✨ No credit card required • 🚀 Get started in 60 seconds
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 sm:py-32 bg-white dark:bg-gray-950">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to get hired
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
              Stop juggling spreadsheets and scattered notes. JobFlow keeps your
              job search organized.
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-7xl">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {/* Feature 1 */}
              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">
                  Application Tracker
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Organize every application in a beautiful Kanban board. Track
                  from saved to offer.
                </p>
              </Card>

              {/* Feature 2 */}
              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-600">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">
                  AI Resume Analyzer
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Get instant match scores, missing keywords, and AI-generated
                  cover letters.
                </p>
              </Card>

              {/* Feature 3 */}
              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-600">
                  <Mail className="h-6 w-6 text-white" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">Smart Reminders</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Never forget to follow up. Automated emails remind you exactly
                  when to reach out.
                </p>
              </Card>

              {/* Feature 4 */}
              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-600">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">
                  Analytics Dashboard
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Track your progress with beautiful charts. See response rates
                  and optimize your strategy.
                </p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 sm:py-32 bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              How it works
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
              Get started in 3 simple steps
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-4xl">
            <div className="space-y-8">
              <div className="flex gap-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-lg">
                  1
                </div>
                <div>
                  <h3 className="text-xl font-semibold">
                    Track Your Applications
                  </h3>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">
                    Browse jobs and click &ldquo;Track&ldquo; to add them to
                    your pipeline. Update status as you progress.
                  </p>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-purple-600 text-white font-bold text-lg">
                  2
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Optimize with AI</h3>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">
                    Upload your resume to get match scores, missing keywords,
                    and tailored cover letters for each job.
                  </p>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-600 text-white font-bold text-lg">
                  3
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Get Hired Faster</h3>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">
                    Follow up on time with automated reminders. Track analytics
                    to improve your strategy.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 sm:py-32 bg-white dark:bg-gray-950">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
              Start free, upgrade when you need more
            </p>
          </div>

          <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Free Plan */}
            <Card className="p-8 border-2">
              <h3 className="text-2xl font-bold">Free</h3>
              <p className="mt-4 flex items-baseline">
                <span className="text-5xl font-bold">$0</span>
                <span className="ml-2 text-gray-600">/month</span>
              </p>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Perfect for getting started
              </p>
              <ul className="mt-8 space-y-4">
                <li className="flex gap-3">
                  <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
                  <span>Track up to 10 applications</span>
                </li>
                <li className="flex gap-3">
                  <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
                  <span>1 AI resume analysis per month</span>
                </li>
                <li className="flex gap-3">
                  <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
                  <span>Email reminders</span>
                </li>
                <li className="flex gap-3">
                  <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
                  <span>Basic analytics</span>
                </li>
              </ul>
              <Link href="/auth" className="block mt-8">
                <Button variant="outline" className="w-full h-12 text-lg">
                  Get Started Free
                </Button>
              </Link>
            </Card>

            {/* Pro Plan */}
            <Card className="p-8 border-2 border-blue-600 relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                Most Popular
              </div>
              <h3 className="text-2xl font-bold">Pro</h3>
              <p className="mt-4 flex items-baseline">
                <span className="text-5xl font-bold">$15</span>
                <span className="ml-2 text-gray-600">/month</span>
              </p>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                For serious job seekers
              </p>
              <ul className="mt-8 space-y-4">
                <li className="flex gap-3">
                  <CheckCircle2 className="h-6 w-6 text-blue-600 shrink-0" />
                  <span className="font-semibold">Unlimited applications</span>
                </li>
                <li className="flex gap-3">
                  <CheckCircle2 className="h-6 w-6 text-blue-600 shrink-0" />
                  <span className="font-semibold">Unlimited AI analyses</span>
                </li>
                <li className="flex gap-3">
                  <CheckCircle2 className="h-6 w-6 text-blue-600 shrink-0" />
                  <span>AI cover letter generation</span>
                </li>
                <li className="flex gap-3">
                  <CheckCircle2 className="h-6 w-6 text-blue-600 shrink-0" />
                  <span>Priority email support</span>
                </li>
                <li className="flex gap-3">
                  <CheckCircle2 className="h-6 w-6 text-blue-600 shrink-0" />
                  <span>Advanced analytics</span>
                </li>
                <li className="flex gap-3">
                  <CheckCircle2 className="h-6 w-6 text-blue-600 shrink-0" />
                  <span>Export to CSV</span>
                </li>
              </ul>
              <Link href="/auth" className="block mt-8">
                <Button className="w-full h-12 text-lg">Start Pro Trial</Button>
              </Link>
            </Card>
          </div>

          <p className="mt-8 text-center text-sm text-gray-600">
            💰 Save vs competitors: Jobscan charges $49/mo for the same AI
            features
          </p>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 bg-blue-600">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center text-white">
            <div>
              <div className="text-4xl font-bold">3x</div>
              <div className="mt-2 text-blue-100">Faster Job Search</div>
            </div>
            <div>
              <div className="text-4xl font-bold">85%</div>
              <div className="mt-2 text-blue-100">Match Score Average</div>
            </div>
            <div>
              <div className="text-4xl font-bold">$15</div>
              <div className="mt-2 text-blue-100">vs $49 Competitors</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 sm:py-32 bg-white dark:bg-gray-950">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to land your dream job?
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            Join hundreds of job seekers already using JobFlow to get hired
            faster
          </p>
          <div className="mt-10">
            <Link href="/auth">
              <Button size="lg" className="h-14 px-12 text-lg">
                Start Free Today
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 dark:bg-gray-900 border-t">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>
                  <Link href="/jobs" className="hover:text-blue-600">
                    Browse Jobs
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="hover:text-blue-600">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/analyze" className="hover:text-blue-600">
                    AI Analyzer
                  </Link>
                </li>
                <li>
                  <Link href="/analytics" className="hover:text-blue-600">
                    Analytics
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>
                  <a href="#" className="hover:text-blue-600">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-blue-600">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-blue-600">
                    Careers
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>
                  <a href="#" className="hover:text-blue-600">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-blue-600">
                    Contact
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-blue-600">
                    API Docs
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>
                  <a href="#" className="hover:text-blue-600">
                    Privacy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-blue-600">
                    Terms
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t text-center text-sm text-gray-600">
            <p>© 2025 JobFlow. Built with ❤️ by developers, for job seekers.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
