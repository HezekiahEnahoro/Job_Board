export default function TermsPage() {
  const lastUpdated = "April 29, 2026";

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-6 py-20">
        <h1 className="text-4xl font-black mb-2">Terms of Service</h1>
        <p className="text-gray-400 mb-12">Last updated: {lastUpdated}</p>

        <div className="space-y-10 text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              1. Acceptance of Terms
            </h2>
            <p>
              By creating an account or using MyJobPhase (&quot;Service&quot;),
              you agree to these Terms of Service. If you don&apos;t agree,
              don&apos;t use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              2. What MyJobPhase Does
            </h2>
            <p>
              MyJobPhase helps you find remote jobs and apply faster using AI.
              We aggregate job listings from public sources, match them against
              your profile, and generate tailored application materials. We are
              a tool to accelerate your job search — we do not guarantee
              employment or interview callbacks.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              3. Your Account
            </h2>
            <ul className="space-y-2 ml-4">
              <li>• You must be 18 or older to use MyJobPhase</li>
              <li>• You are responsible for keeping your password secure</li>
              <li>• You are responsible for all activity under your account</li>
              <li>• One account per person — no sharing accounts</li>
              <li>• Provide accurate information when creating your profile</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              4. Acceptable Use
            </h2>
            <p className="mb-3">You agree not to:</p>
            <ul className="space-y-2 ml-4">
              <li>
                • Use the Service to spam employers or submit fraudulent
                applications
              </li>
              <li>• Attempt to scrape, reverse engineer, or abuse our API</li>
              <li>
                • Upload malicious files or attempt to compromise our systems
              </li>
              <li>
                • Use AI-generated content to misrepresent your qualifications
              </li>
              <li>• Create multiple accounts to bypass free tier limits</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              5. AI-Generated Content
            </h2>
            <p>
              MyJobPhase uses AI to tailor your resume and generate cover
              letters. You are responsible for reviewing all AI-generated
              content before submitting it to employers. We do not guarantee
              accuracy. Do not submit AI content that misrepresents your actual
              qualifications, experience, or skills.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              6. Subscription & Billing
            </h2>
            <ul className="space-y-2 ml-4">
              <li>• Free tier: available indefinitely with usage limits</li>
              <li>
                • Pro plan: $15/month (USD) or ₦25,000/month (NGN), billed
                monthly
              </li>
              <li>• Subscriptions auto-renew unless cancelled</li>
              <li>
                • Cancel anytime from your account settings — no penalties
              </li>
              <li>
                • Refunds: we offer a 30-day money-back guarantee for first-time
                Pro subscribers. Email support@myjobphase.com
              </li>
              <li>• Prices may change with 30 days notice</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              7. Intellectual Property
            </h2>
            <p>
              The MyJobPhase platform, branding, and code are our intellectual
              property. Your resume data and personal information remain yours.
              You grant us a limited license to process your data to provide the
              Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              8. Disclaimer of Warranties
            </h2>
            <p>
              MyJobPhase is provided &quot;as is&quot; without warranties of any
              kind. We don&apos;t guarantee the Service will be error-free,
              uninterrupted, or that job listings will be accurate or current.
              Job listings are aggregated from third-party sources — we are not
              responsible for their accuracy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              9. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by law, MyJobPhase is not liable
              for any indirect, incidental, or consequential damages arising
              from your use of the Service, including missed job opportunities,
              employer decisions, or data loss.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              10. Termination
            </h2>
            <p>
              We may terminate or suspend your account if you violate these
              Terms. You may delete your account at any time from your profile
              settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">11. Contact</h2>
            <p>
              Questions about these Terms? Email{" "}
              <a
                href="mailto:support@myjobphase.com"
                className="text-blue-400 hover:underline">
                support@myjobphase.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
