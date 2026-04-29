"use client";

import Link from "next/link";
import { ArrowRight, Zap, Target, Users, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero */}
      <section className="relative pt-24 pb-16 px-6 border-b border-white/10">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-8">
            <Zap className="h-4 w-4 text-blue-400" />
            <span className="text-sm text-blue-400 font-medium">Our Story</span>
          </div>

          <h1 className="text-5xl sm:text-6xl font-black mb-6 leading-tight">
            Built by a developer
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              who was job hunting.
            </span>
          </h1>

          <p className="text-xl text-gray-400 leading-relaxed max-w-2xl">
            I built MyJobPhase because I was spending 30+ minutes on every job
            application — rewriting the same cover letter, tweaking the same
            resume, losing track of where I applied. There had to be a better
            way.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto space-y-16">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-black mb-4">The Problem</h2>
              <p className="text-gray-400 leading-relaxed mb-4">
                Job hunting in 2024 is broken. You&apos;re expected to apply to
                dozens of jobs per week, but every application demands 30-60
                minutes of manual work — customizing your resume, writing a
                tailored cover letter, filling out the same form fields over and
                over.
              </p>
              <p className="text-gray-400 leading-relaxed">
                Most job seekers give up after a few applications, not because
                they lack skills, but because the process is exhausting.
                That&apos;s especially true for international applicants
                competing for remote roles globally.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
              <div className="text-5xl font-black text-red-400 mb-2">
                30 min
              </div>
              <div className="text-gray-400 text-sm mb-6">
                average time per manual application
              </div>
              <div className="text-5xl font-black text-green-400 mb-2">
                8 sec
              </div>
              <div className="text-gray-400 text-sm">
                with MyJobPhase Quick Apply
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-black mb-4">What We Built</h2>
            <p className="text-gray-400 leading-relaxed mb-4">
              MyJobPhase is an AI-powered application acceleration layer that
              sits on top of job boards. It&apos;s not another job board — we
              aggregate 3,400+ remote positions from 11 sources, match them to
              your profile with AI scoring, and generate tailored resumes and
              cover letters in seconds.
            </p>
            <p className="text-gray-400 leading-relaxed">
              The goal is simple: help you apply to 10x more jobs in the same
              amount of time, without sacrificing quality. Every resume we
              generate is actually tailored to the specific job — not just a
              template with your name swapped in.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                icon: Code2,
                label: "Full-stack developer",
                desc: "Building and shipping end-to-end since 2021",
              },
              {
                icon: Target,
                label: "Physics background",
                desc: "Analytical approach to every problem",
              },
              {
                icon: Users,
                label: "Built for Africa & beyond",
                desc: "Especially focused on Nigerian and African job seekers going global",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <item.icon className="h-6 w-6 text-blue-400 mb-3" />
                <div className="font-bold mb-1">{item.label}</div>
                <div className="text-sm text-gray-400">{item.desc}</div>
              </div>
            ))}
          </div>

          <div>
            <h2 className="text-3xl font-black mb-4">Where We&apos;re Going</h2>
            <p className="text-gray-400 leading-relaxed mb-4">
              MyJobPhase is live and in active development. I&apos;m using it
              myself to find a job right now — which means every bug I find,
              every friction point, gets fixed immediately. This is a live
              experiment documented in public.
            </p>
            <p className="text-gray-400 leading-relaxed">
              The roadmap is focused on one metric: how many users applied to
              10+ jobs. Not signups. Not pageviews. Applications completed by
              real people.
            </p>
          </div>

          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-8">
            <h3 className="text-xl font-bold mb-2">
              Want to follow the build?
            </h3>
            <p className="text-gray-400 mb-4 text-sm">
              I post updates on LinkedIn every Monday, Wednesday, Friday — real
              numbers, real friction, what&apos;s working and what isn&apos;t.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer">
                <Button className="bg-blue-600 hover:bg-blue-700 font-bold">
                  Follow on LinkedIn <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
              <Link href="/auth?mode=signup">
                <Button
                  variant="outline"
                  className="border-white/20 hover:bg-white/10">
                  Try MyJobPhase Free
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
