"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Target,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Zap,
  Brain,
  Crown,
  Shield,
  Users,
  ChevronRight,
  Briefcase,
  BarChart3,
  Upload,
} from "lucide-react";
import { useState } from "react";

export default function LandingPage() {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      {/* Enhanced Mesh Gradient Background */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.15),transparent_50%),radial-gradient(ellipse_at_bottom,rgba(168,85,247,0.15),transparent_50%)]">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMyMTIxMjEiIGZpbGwtb3BhY2l0eT0iMC40Ij48cGF0aCBkPSJNMzYgMzRjMC0yLjIxIDEuNzktNCAzLjk5LTRTNDQgMzEuNzkgNDQgMzRzLTEuNzkgNC0zLjk5IDRTMzYgMzYuMjEgMzYgMzR6bTAtMjBjMC0yLjIxIDEuNzktNCAzLjk5LTRTNDQgMTEuNzkgNDQgMTRzLTEuNzkgNC0zLjk5IDRTMzYgMTYuMjEgMzYgMTR6TTIwIDM0YzAtMi4yMSAxLjc5LTQgMy45OS00UzI4IDMxLjc5IDI4IDM0cy0xLjc5IDQtMy45OSA0UzIwIDM2LjIxIDIwIDM0em0wLTIwYzAtMi4yMSAxLjc5LTQgMy45OS00UzI4IDExLjc5IDI4IDE0cy0xLjc5IDQtMy45OSA0UzIwIDE2LjIxIDIwIDE0eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
      </div>

      {/* Larger, More Visible Animated Gradient Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-48 -left-48 w-[600px] h-[600px] bg-blue-500/30 rounded-full mix-blend-screen filter blur-[120px] animate-float"></div>
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-purple-500/30 rounded-full mix-blend-screen filter blur-[100px] animate-float-delayed"></div>
        <div className="absolute -bottom-48 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-cyan-500/25 rounded-full mix-blend-screen filter blur-[140px] animate-float-slow"></div>
        <div className="absolute top-1/2 right-1/4 w-[400px] h-[400px] bg-pink-500/20 rounded-full mix-blend-screen filter blur-[90px] animate-float"></div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Hero Section */}
        <section className="relative min-h-[90vh] flex items-center px-6 lg:px-8 py-20">
          <div className="mx-auto max-w-7xl w-full">
            <div className="text-center space-y-12">
              {/* Badge */}
              <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl hover:border-white/20 transition-all group cursor-pointer">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-medium">
                    AI tailors your resume in 3 seconds
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 text-white/50 group-hover:translate-x-1 transition-transform" />
              </div>

              {/* Main Headline */}
              <div className="space-y-6">
                <h1 className="text-4xl sm:text-6xl lg:text-7xl xl:text-8xl font-black tracking-tight">
                  <span className="block mb-4">Stop Spending 30 Minutes</span>
                  <span className="block bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent animate-gradient-x">
                    Per Job Application
                  </span>
                </h1>

                <p className="max-w-3xl mx-auto text-base sm:text-xl lg:text-2xl text-gray-400 leading-relaxed font-light px-4 sm:px-0">
                  <span className="text-white font-bold">
                    Quick Apply with AI:
                  </span>{" "}
                  Tailored resume in 3 seconds. Auto-generated cover letter in 5
                  seconds. One-click application tracking.
                </p>

                {/* Value Props */}
                <div className="flex flex-wrap justify-center gap-4 sm:gap-6 pt-6 px-4">
                  {[
                    {
                      icon: Zap,
                      text: "3-sec AI resume tailoring",
                      color: "text-yellow-400",
                    },
                    {
                      icon: Brain,
                      text: "Auto cover letter generation",
                      color: "text-purple-400",
                    },
                    {
                      icon: CheckCircle2,
                      text: "One-click tracking",
                      color: "text-green-400",
                    },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <item.icon
                        className={`h-4 w-4 sm:h-5 sm:w-5 ${item.color}`}
                      />
                      <span className="text-white font-medium text-xs sm:text-sm">
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA Section */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-stretch sm:items-center pt-8 px-4">
                <Link href="/auth?mode=signup" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto group relative h-14 sm:h-16 px-8 sm:px-12 text-base sm:text-lg font-bold overflow-hidden bg-white text-black hover:bg-white/90 shadow-2xl shadow-blue-500/25 hover:shadow-blue-500/50 transition-all duration-300">
                    <span className="relative z-10 flex items-center justify-center gap-3">
                      Try Quick Apply Free
                      <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </Button>
                </Link>

                <Link href="/jobs" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto h-14 sm:h-16 px-8 sm:px-12 text-base sm:text-lg font-semibold border-2 border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30 backdrop-blur-xl transition-all duration-300">
                    Browse 3,400+ Jobs
                  </Button>
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap justify-center gap-8 pt-12 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-400" />
                  <span>Free forever plan</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-400" />
                  <span>60-second setup</span>
                </div>
              </div>

              {/* Social Proof - Inline */}
              <div className="pt-8">
                <p className="text-gray-500 text-sm mb-4">
                  TRUSTED BY JOB SEEKERS AT
                </p>
                <div className="flex flex-wrap justify-center gap-8 opacity-50">
                  {["Google", "Meta", "Amazon", "Microsoft", "Apple"].map(
                    (company, i) => (
                      <span key={i} className="text-gray-600 font-bold text-lg">
                        {company}
                      </span>
                    ),
                  )}
                </div>
              </div>
            </div>

            {/* Quick Apply Demo Video/GIF Placeholder */}
            <div className="mt-20 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-cyan-500/20 rounded-3xl blur-3xl"></div>
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 rounded-3xl opacity-50 group-hover:opacity-75 blur-2xl transition-all duration-500"></div>
                <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-gray-900 to-black overflow-hidden shadow-2xl">
                  {/* Quick Apply Demo */}
                  <div className="aspect-video relative bg-black flex items-center justify-center">
                    <div className="text-center space-y-6 p-8">
                      <div className="inline-flex p-6 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 mb-4">
                        <Sparkles className="h-12 w-12 text-white" />
                      </div>
                      <h3 className="text-3xl font-bold">Quick Apply Demo</h3>
                      <p className="text-gray-400 max-w-md mx-auto">
                        Watch how AI tailors your resume for each job in 3
                        seconds
                      </p>
                      <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                          <span className="mr-2">▶</span> Watch Demo
                        </Button>
                        <Link href="/jobs">
                          <Button
                            variant="outline"
                            className="border-white/20 hover:bg-white/10">
                            Try It Now
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Social Proof Bar */}
        <section className="relative border-y border-white/5 bg-white/[0.02] backdrop-blur-xl py-8">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 text-center">
              <div className="space-y-2">
                <div className="text-5xl font-black bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  3 sec
                </div>
                <div className="text-sm text-gray-400 font-medium">
                  AI Resume Tailoring
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-5xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  3,400+
                </div>
                <div className="text-sm text-gray-400 font-medium">
                  Live Remote Jobs
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-5xl font-black bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                  97%
                </div>
                <div className="text-sm text-gray-400 font-medium">
                  Time Saved vs Manual
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-5xl font-black bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                  $15
                </div>
                <div className="text-sm text-gray-400 font-medium">
                  vs $49/mo Competitors
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="relative py-32 px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="text-center space-y-4 mb-20">
              <div className="inline-block text-sm font-semibold px-4 py-2 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                FEATURES
              </div>
              <h2 className="text-5xl sm:text-6xl font-black">
                <span className="block mb-2">Everything You Need</span>
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  In One Platform
                </span>
              </h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: Zap,
                  title: "⚡ Quick Apply",
                  description:
                    "AI tailors your resume in 3 seconds. Auto-generates cover letter. One-click tracking. Apply to 10x more jobs.",
                  gradient: "from-yellow-500 to-orange-500",
                },
                {
                  icon: Target,
                  title: "Smart Tracker",
                  description:
                    "Track every application from discovery to offer. Status pipeline, notes, reminders.",
                  gradient: "from-blue-500 to-cyan-500",
                },
                {
                  icon: Brain,
                  title: "AI Match Scoring",
                  description:
                    "See exactly why you're a good fit. Skills match, experience match, preferences match.",
                  gradient: "from-purple-500 to-pink-500",
                },
                {
                  icon: Briefcase,
                  title: "3,400+ Remote Jobs",
                  description:
                    "Curated opportunities updated daily. Filter by skills, location, salary.",
                  gradient: "from-green-500 to-emerald-500",
                },
              ].map((feature, i) => (
                <div
                  key={i}
                  className="group relative"
                  onMouseEnter={() => setHoveredFeature(i)}
                  onMouseLeave={() => setHoveredFeature(null)}>
                  <div
                    className={`absolute -inset-px rounded-2xl bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-100 blur transition-all duration-500`}></div>
                  <div className="relative h-full rounded-2xl border border-white/10 bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-xl p-8 group-hover:border-white/20 transition-all duration-300">
                    <div
                      className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${feature.gradient} mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <feature.icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      {feature.description}
                    </p>

                    {hoveredFeature === i && (
                      <div className="mt-6 pt-6 border-t border-white/10">
                        <div className="flex items-center gap-2 text-sm font-medium text-blue-400 group-hover:gap-3 transition-all">
                          Learn more <ChevronRight className="h-4 w-4" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        {/* How It Works */}
        <section className="relative py-32 px-6 lg:px-8 bg-gradient-to-br from-blue-950/20 to-purple-950/20">
          <div className="mx-auto max-w-7xl">
            <div className="text-center space-y-4 mb-20">
              <div className="inline-block text-sm font-semibold px-4 py-2 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                HOW IT WORKS
              </div>
              <h2 className="text-5xl sm:text-6xl font-black">
                <span className="block mb-2">From Job to Applied</span>
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  In Under 10 Seconds
                </span>
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: "01",
                  title: "Upload Resume Once",
                  description:
                    "We parse your skills, experience, and education with AI.",
                  icon: Upload,
                  color: "from-blue-500 to-cyan-500",
                },
                {
                  step: "02",
                  title: "Click Quick Apply",
                  description:
                    "AI tailors your resume and generates a cover letter in 3-5 seconds.",
                  icon: Sparkles,
                  color: "from-purple-500 to-pink-500",
                },
                {
                  step: "03",
                  title: "Apply Manually",
                  description:
                    "Download tailored resume. We auto-track the application for you.",
                  icon: CheckCircle2,
                  color: "from-green-500 to-emerald-500",
                },
              ].map((item, i) => (
                <div key={i} className="relative group">
                  <div
                    className={`absolute -inset-px rounded-2xl bg-gradient-to-r ${item.color} opacity-0 group-hover:opacity-100 blur transition-all duration-500`}></div>
                  <div className="relative h-full rounded-2xl border border-white/10 bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-xl p-8">
                    <div className="flex items-start gap-4 mb-6">
                      <div
                        className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${item.color}`}>
                        <item.icon className="h-6 w-6 text-white" />
                      </div>
                      <span className="text-6xl font-black text-white/10">
                        {item.step}
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold mb-3">{item.title}</h3>
                    <p className="text-gray-400 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 text-center">
              <p className="text-gray-500 mb-6">
                Traditional application:{" "}
                <span className="line-through">30 minutes</span>
              </p>
              <p className="text-3xl font-black bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                With MyJobPhase: 8 seconds ⚡
              </p>
            </div>
          </div>
        </section>
        {/* Pricing Section */}
        <section className="relative py-32 px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="text-center space-y-4 mb-20">
              <div className="inline-block text-sm font-semibold px-4 py-2 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                PRICING
              </div>
              <h2 className="text-5xl sm:text-6xl font-black">
                Simple, Transparent Pricing
              </h2>
              <p className="text-xl text-gray-400">
                Choose the plan that fits your needs
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {/* Free Plan */}
              <div className="group relative">
                <div className="absolute -inset-px rounded-3xl bg-gradient-to-r from-gray-500 to-gray-700 opacity-50 group-hover:opacity-75 blur transition-all duration-500"></div>
                <div className="relative h-full rounded-3xl border border-white/10 bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-2xl p-10">
                  <div className="space-y-8">
                    <div>
                      <h3 className="text-2xl font-bold mb-2">Free</h3>
                      <div className="flex items-baseline gap-2 mb-4">
                        <span className="text-6xl font-black">$0</span>
                        <span className="text-gray-500">/month</span>
                      </div>
                      <p className="text-gray-400">
                        Perfect for getting started
                      </p>
                    </div>

                    <ul className="space-y-4">
                      {[
                        "Track unlimited applications",
                        "3 AI analyses per month",
                        "Basic analytics",
                        "Job search board",
                      ].map((item, i) => (
                        <li key={i} className="flex items-center gap-3">
                          <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
                          <span className="text-gray-300">{item}</span>
                        </li>
                      ))}
                    </ul>

                    <Link href="/auth?mode=signup">
                      <Button
                        variant="outline"
                        className="w-full h-14 text-base font-semibold border-2 border-white/20 hover:bg-white/10 hover:border-white/30 transition-all">
                        Get Started Free
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Pro Plan */}
              <div className="group relative">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-20">
                  <div className="px-6 py-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-sm font-bold shadow-2xl">
                    MOST POPULAR
                  </div>
                </div>

                <div className="absolute -inset-px rounded-3xl bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 opacity-75 group-hover:opacity-100 blur-xl transition-all duration-500"></div>
                <div className="relative h-full rounded-3xl border-2 border-blue-500/50 bg-gradient-to-br from-blue-950/80 to-purple-950/80 backdrop-blur-2xl p-10">
                  <div className="space-y-8">
                    <div>
                      <h3 className="text-2xl font-bold mb-2">Pro</h3>
                      <div className="flex items-baseline gap-2 mb-4">
                        <span className="text-6xl font-black bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                          $15
                        </span>
                        <span className="text-gray-500">/month</span>
                      </div>
                      <p className="text-gray-400">For serious job seekers</p>
                    </div>

                    <ul className="space-y-4">
                      {[
                        { text: "Unlimited AI analyses", featured: true },
                        { text: "AI cover letter generation", featured: true },
                        { text: "Advanced analytics", featured: false },
                        { text: "Priority support", featured: false },
                        { text: "Export to CSV", featured: false },
                        { text: "Email reminders", featured: false },
                      ].map((item, i) => (
                        <li key={i} className="flex items-center gap-3">
                          <CheckCircle2 className="h-5 w-5 text-blue-400 shrink-0" />
                          <span
                            className={
                              item.featured
                                ? "text-white font-semibold"
                                : "text-gray-300"
                            }>
                            {item.text}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <Link href="/auth?mode=signup">
                      <Button className="w-full h-14 text-base font-bold bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-xl shadow-blue-500/50 hover:shadow-blue-500/70 transition-all">
                        Start Pro Today
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-12 text-center text-gray-500">
              💎 70% cheaper than competitors — Jobscan charges $49/mo
            </p>
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative py-32 px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 rounded-3xl opacity-50 group-hover:opacity-75 blur-2xl transition-all duration-500"></div>
              <div className="relative rounded-3xl border border-white/10 bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-2xl p-16 text-center">
                <div className="space-y-8">
                  <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black">
                    <span className="block mb-2">Ready to Master</span>
                    <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                      Every Phase of Your Search?
                    </span>
                  </h2>

                  <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                    Join 10,000+ professionals tracking their job search with
                    MyJobPhase
                  </p>

                  <Link href="/auth?mode=signup">
                    <Button
                      size="lg"
                      className="h-16 px-12 text-lg font-bold bg-white text-black hover:bg-white/90 shadow-2xl hover:scale-105 transition-all duration-300">
                      Start Free Today
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
