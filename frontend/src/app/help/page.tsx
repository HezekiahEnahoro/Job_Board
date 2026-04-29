"use client";

import { useState } from "react";
import {
  MessageSquare,
  FileText,
  Zap,
  CreditCard,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type FAQItem = { q: string; a: string };

const faqs: Record<
  string,
  { icon: React.ReactNode; color: string; items: FAQItem[] }
> = {
  "Getting Started": {
    icon: <FileText className="h-6 w-6" />,
    color: "text-blue-400",
    items: [
      {
        q: "How do I create an account?",
        a: "Go to myjobphase.com and click 'Try Quick Apply Free'. Enter your email and a password — takes under 60 seconds. No credit card required.",
      },
      {
        q: "How do I upload my resume?",
        a: "After signing up, you'll be taken through onboarding where you can upload your CV (PDF or Word doc). Our AI parses it automatically and extracts your skills, experience, and education. You can also upload or update your resume anytime from the Resume page in the nav.",
      },
      {
        q: "How does AI matching work?",
        a: "Once your resume is uploaded, our AI compares your extracted skills and experience against each job's requirements. You'll see a match percentage on every job card — 90%+ means you're a strong fit. The matching considers skills overlap, experience level, and your stated job preferences.",
      },
      {
        q: "How do I track applications?",
        a: "Every time you click 'Apply Now' through Quick Apply, the application is automatically logged to your Dashboard. You can also manually add jobs to track by clicking 'Track' on any job card. From the Dashboard you can update status (Applied → Interview → Offer), add notes, and set follow-up reminders.",
      },
    ],
  },
  "Quick Apply": {
    icon: <Zap className="h-6 w-6" />,
    color: "text-purple-400",
    items: [
      {
        q: "What is Quick Apply?",
        a: "Quick Apply is the core feature of MyJobPhase. Click it on any job and within 5-8 seconds you get: (1) a resume tailored specifically for that job, (2) an AI-written cover letter for that role. Both are generated based on your uploaded CV and the specific job description — not generic templates.",
      },
      {
        q: "How are resumes tailored?",
        a: "Our AI reads the full job description, identifies the key skills and requirements, then rewrites your resume summary to match and highlights the most relevant skills from your profile. The structure stays the same — it surfaces what matters most for that specific role.",
      },
      {
        q: "How are cover letters generated?",
        a: "Cover letter generation is a Pro feature. The AI reads the job description and your profile, then writes a personalised letter that references the specific role, company, and why your background is relevant. You can edit it in the modal before copying and submitting.",
      },
      {
        q: "Can I edit before applying?",
        a: "Yes. The Quick Apply modal shows your tailored resume (preview + download) and the cover letter (editable text area). Edit the cover letter directly in the modal. For the resume, download it and make changes in a text editor before submitting.",
      },
    ],
  },
  "Billing & Subscription": {
    icon: <CreditCard className="h-6 w-6" />,
    color: "text-green-400",
    items: [
      {
        q: "What's included in the Free plan?",
        a: "Free gives you: unlimited job tracking, 3 AI resume analyses per month, Quick Apply with resume tailoring (no cover letters), Interview Prep AI, and email alerts. It's enough to use the platform meaningfully — upgrade when you want unlimited cover letters.",
      },
      {
        q: "What's included in Pro ($15/month)?",
        a: "Pro gives you everything in Free plus: unlimited AI resume analyses (no monthly cap), AI cover letter generation for every job, priority support, and early access to new features. ₦25,000/month for Nigerian users via Paystack.",
      },
      {
        q: "How do I upgrade to Pro?",
        a: "Go to the Upgrade page (link in the nav or when you hit the free limit). Choose Stripe for international card payments or Paystack if you're in Nigeria. Payment is processed securely — we never store card details.",
      },
      {
        q: "How do I cancel?",
        a: "Go to Profile → click 'Manage Subscription'. This opens the Stripe/Paystack billing portal where you can cancel. Cancellation takes effect at the end of your current billing period — you keep Pro access until then.",
      },
      {
        q: "Do you offer refunds?",
        a: "Yes — 30-day money-back guarantee for first-time Pro subscribers. Email support@myjobphase.com and we'll process it, no questions asked.",
      },
    ],
  },
  "Still Need Help?": {
    icon: <MessageSquare className="h-6 w-6" />,
    color: "text-yellow-400",
    items: [
      {
        q: "How do I contact support?",
        a: "Email support@myjobphase.com. We respond within 24 hours on weekdays. Pro users get priority responses.",
      },
      {
        q: "I found a bug — how do I report it?",
        a: "Email support@myjobphase.com with a description of what happened and what you expected to happen. Screenshots are helpful. We fix bugs fast — this is an actively developed product.",
      },
      {
        q: "Can I suggest a feature?",
        a: "Yes! Email support@myjobphase.com or connect on LinkedIn. We're building in public and user feedback directly shapes the roadmap.",
      },
    ],
  },
};

function FAQSection({
  title,
  data,
}: {
  title: string;
  data: (typeof faqs)[string];
}) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 sm:p-8">
      <div className={`flex items-center gap-3 mb-6 ${data.color}`}>
        {data.icon}
        <h2 className="text-xl font-bold text-white">{title}</h2>
      </div>

      <div className="space-y-2">
        {data.items.map((item, i) => (
          <div
            key={i}
            className="rounded-xl border border-white/5 overflow-hidden">
            <button
              className="w-full flex items-center justify-between gap-4 p-4 text-left hover:bg-white/5 transition"
              onClick={() => setOpen(open === i ? null : i)}>
              <span className="font-medium text-sm">{item.q}</span>
              {open === i ? (
                <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
              )}
            </button>
            {open === i && (
              <div className="px-4 pb-4 text-sm text-gray-400 leading-relaxed border-t border-white/5 pt-3">
                {item.a}
              </div>
            )}
          </div>
        ))}
      </div>

      {title === "Still Need Help?" && (
        <a
          href="mailto:support@myjobphase.com"
          className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold text-sm transition">
          Email Support
        </a>
      )}
    </div>
  );
}

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto max-w-5xl px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black mb-4">Help Center</h1>
          <p className="text-gray-400 text-lg">
            Everything you need to get the most out of MyJobPhase
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {Object.entries(faqs).map(([title, data]) => (
            <FAQSection key={title} title={title} data={data} />
          ))}
        </div>
      </div>
    </div>
  );
}
