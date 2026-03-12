"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Target,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Zap,
  Brain,
  Clock,
  Star,
  Users,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

export default function LandingPage() {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      {/* Mesh Gradient Background */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(17,24,39,1),rgba(0,0,0,1))]">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMyMTIxMjEiIGZpbGwtb3BhY2l0eT0iMC40Ij48cGF0aCBkPSJNMzYgMzRjMC0yLjIxIDEuNzktNCAzLjk5LTRTNDQgMzEuNzkgNDQgMzRzLTEuNzkgNC0zLjk5IDRTMzYgMzYuMjEgMzYgMzR6bTAtMjBjMC0yLjIxIDEuNzktNCAzLjk5LTRTNDQgMTEuNzkgNDQgMTRzLTEuNzkgNC0zLjk5IDRTMzYgMTYuMjEgMzYgMTR6TTIwIDM0YzAtMi4yMSAxLjc5LTQgMy45OS00UzI4IDMxLjc5IDI4IDM0cy0xLjc5IDQtMy45OSA0UzIwIDM2LjIxIDIwIDM0em0wLTIwYzAtMi4yMSAxLjc5LTQgMy45OS00UzI4IDExLjc5IDI4IDE0cy0xLjc5IDQtMy45OSA0UzIwIDE2LjIxIDIwIDE0eiIvPjwvZz48L2c+PC9zdmc+')] opacity-20"></div>
      </div>

      {/* Animated Gradient Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full mix-blend-screen filter blur-[128px] animate-float"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full mix-blend-screen filter blur-[128px] animate-float-delayed"></div>
        <div className="absolute bottom-1/4 left-1/2 w-96 h-96 bg-cyan-500/20 rounded-full mix-blend-screen filter blur-[128px] animate-float-slow"></div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Hero Section */}
        <section className="relative min-h-[90vh] flex items-center px-6 lg:px-8 py-20">
          <div className="mx-auto max-w-7xl w-full">
            <div className="text-center space-y-12">
              {/* Badge */}
              <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-white/10 backdrop-blur-xl hover:border-white/20 transition-all group cursor-pointer">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                    <div className="absolute inset-0 blur-sm bg-yellow-400/50"></div>
                  </div>
                  <span className="text-sm font-medium">
                    Trusted by 10,000+ job seekers
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 text-white/50 group-hover:translate-x-1 transition-transform" />
              </div>

              {/* Main Headline */}
              <div className="space-y-6">
                <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tight">
                  <span className="block mb-4">Land Your</span>
                  <span className="block bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent animate-gradient-x">
                    Dream Job
                  </span>
                  <span className="block mt-4 text-5xl sm:text-6xl lg:text-7xl">
                    3× Faster
                  </span>
                </h1>

                <p className="max-w-3xl mx-auto text-xl sm:text-2xl text-gray-400 leading-relaxed font-light">
                  The intelligent platform that transforms your job search with{" "}
                  <span className="text-white font-medium">
                    AI-powered insights
                  </span>
                  ,{" "}
                  <span className="text-white font-medium">
                    automated workflows
                  </span>
                  , and{" "}
                  <span className="text-white font-medium">
                    data-driven strategy
                  </span>
                </p>
              </div>

              {/* CTA Section */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
                <Link href="/auth">
                  <Button
                    size="lg"
                    className="group relative h-16 px-12 text-lg font-bold overflow-hidden bg-white text-black hover:bg-white/90 shadow-2xl shadow-blue-500/25 hover:shadow-blue-500/50 transition-all duration-300">
                    <span className="relative z-10 flex items-center gap-3">
                      Start Free Trial
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </Button>
                </Link>

                <Link href="/jobs">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-16 px-12 text-lg font-semibold border-2 border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30 backdrop-blur-xl transition-all duration-300">
                    Explore 2,700+ Jobs
                  </Button>
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap justify-center gap-8 pt-12 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <span>Free forever plan</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-400" />
                  <span>Setup in 30 seconds</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-400" />
                  <span>10,000+ active users</span>
                </div>
              </div>
            </div>

            {/* Dashboard Preview */}
            <div className="mt-20 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-cyan-500/20 rounded-3xl blur-3xl"></div>
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 rounded-3xl opacity-50 group-hover:opacity-75 blur-2xl transition-all duration-500"></div>
                <div className="relative aspect-video rounded-2xl border border-white/10 bg-gradient-to-br from-gray-900 to-black overflow-hidden shadow-2xl">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <Sparkles className="h-16 w-16 mx-auto text-blue-400 opacity-50" />
                      <p className="text-gray-600 text-sm">Dashboard Preview</p>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
              <div className="space-y-2">
                <div className="text-5xl font-black bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  3×
                </div>
                <div className="text-sm text-gray-400 font-medium">
                  Faster Job Search
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-5xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  85%
                </div>
                <div className="text-sm text-gray-400 font-medium">
                  Average Match Score
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-5xl font-black bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                  $15
                </div>
                <div className="text-sm text-gray-400 font-medium">
                  vs $49 Competitors
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
                  icon: Target,
                  title: "Smart Tracker",
                  description:
                    "Kanban-style pipeline with drag-and-drop. Track every application from discovery to offer.",
                  gradient: "from-blue-500 to-cyan-500",
                  delay: "0",
                },
                {
                  icon: Brain,
                  title: "AI Resume Analyzer",
                  description:
                    "Instant ATS scores, keyword gaps, and AI-generated cover letters tailored to each job.",
                  gradient: "from-purple-500 to-pink-500",
                  delay: "100",
                },
                {
                  icon: Clock,
                  title: "Smart Reminders",
                  description:
                    "Never miss a follow-up. Automated emails sent at the perfect time to maximize response.",
                  gradient: "from-green-500 to-emerald-500",
                  delay: "200",
                },
                {
                  icon: TrendingUp,
                  title: "Analytics Engine",
                  description:
                    "Real-time insights on response rates, interview conversions, and strategy optimization.",
                  gradient: "from-orange-500 to-red-500",
                  delay: "300",
                },
              ].map((feature, i) => (
                <div
                  key={i}
                  className="group relative"
                  onMouseEnter={() => setHoveredFeature(i)}
                  onMouseLeave={() => setHoveredFeature(null)}
                  style={{ animationDelay: `${feature.delay}ms` }}>
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
                        "Track up to 10 applications",
                        "1 AI analysis per month",
                        "Email reminders",
                        "Basic analytics",
                      ].map((item, i) => (
                        <li key={i} className="flex items-center gap-3">
                          <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
                          <span className="text-gray-300">{item}</span>
                        </li>
                      ))}
                    </ul>

                    <Link href="/auth">
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
                        { text: "Unlimited applications", featured: true },
                        { text: "Unlimited AI analyses", featured: true },
                        { text: "AI cover letters", featured: false },
                        { text: "Priority support", featured: false },
                        { text: "Advanced analytics", featured: false },
                        { text: "Export to CSV", featured: false },
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

                    <Link href="/auth">
                      <Button className="w-full h-14 text-base font-bold bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-xl shadow-blue-500/50 hover:shadow-blue-500/70 transition-all">
                        Start Pro Trial
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-12 text-center text-gray-500">
              💎 70% cheaper than competitors — JobScan charges $49/mo
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
                    <span className="block mb-2">Ready to Transform</span>
                    <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                      Your Career Journey?
                    </span>
                  </h2>

                  <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                    Join 10,000+ professionals who landed their dream jobs using
                    JobFlow
                  </p>

                  <Link href="/auth">
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
