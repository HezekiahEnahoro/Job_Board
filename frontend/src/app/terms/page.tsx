export default function TermsPage() {
  return (
    <div className="container mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-5xl font-black mb-8">Terms of Service</h1>

      <div className="prose prose-invert max-w-none space-y-8">
        <p className="text-gray-400 text-lg">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <section>
          <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
          <p className="text-gray-300 leading-relaxed">
            By accessing and using MyJobPhase, you accept and agree to be bound
            by these Terms of Service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">2. Use of Service</h2>
          <p className="text-gray-300 leading-relaxed">
            You may use our service only in compliance with these Terms and all
            applicable laws and regulations.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">3. Subscription & Billing</h2>
          <p className="text-gray-300 leading-relaxed">
            Pro subscriptions are billed monthly at $15/month. You may cancel at
            any time through your account settings.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">4. Contact</h2>
          <p className="text-gray-300 leading-relaxed">
            Questions about the Terms of Service? Contact us at{" "}
            <a
              href="mailto:legal@myjobphase.com"
              className="text-blue-400 hover:text-blue-300">
              legal@myjobphase.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
