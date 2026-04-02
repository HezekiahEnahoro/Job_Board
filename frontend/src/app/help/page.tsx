import { MessageSquare, FileText, Zap, CreditCard } from "lucide-react";

export default function HelpPage() {
  return (
    <div className="container mx-auto max-w-6xl px-6 py-16">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-black mb-4">Help Center</h1>
        <p className="text-gray-400 text-xl">
          Find answers to common questions
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8">
          <FileText className="h-8 w-8 text-blue-400 mb-4" />
          <h2 className="text-2xl font-bold mb-4">Getting Started</h2>
          <ul className="space-y-3 text-gray-300">
            <li>• How do I create an account?</li>
            <li>• How do I upload my resume?</li>
            <li>• How does AI matching work?</li>
            <li>• How do I track applications?</li>
          </ul>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8">
          <Zap className="h-8 w-8 text-purple-400 mb-4" />
          <h2 className="text-2xl font-bold mb-4">Quick Apply</h2>
          <ul className="space-y-3 text-gray-300">
            <li>• What is Quick Apply?</li>
            <li>• How are resumes tailored?</li>
            <li>• How are cover letters generated?</li>
            <li>• Can I edit before applying?</li>
          </ul>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8">
          <CreditCard className="h-8 w-8 text-green-400 mb-4" />
          <h2 className="text-2xl font-bold mb-4">Billing & Subscription</h2>
          <ul className="space-y-3 text-gray-300">
            <li>• What&apos;s included in Pro?</li>
            <li>• How do I upgrade?</li>
            <li>• How do I cancel?</li>
            <li>• Do you offer refunds?</li>
          </ul>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8">
          <MessageSquare className="h-8 w-8 text-yellow-400 mb-4" />
          <h2 className="text-2xl font-bold mb-4">Still Need Help?</h2>
          <p className="text-gray-300 mb-4">
            Can&apos;t find what you&apos;re looking for? Our support team is
            here to help.
          </p>

          <a
            href="mailto:support@myjobphase.com"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition">
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}