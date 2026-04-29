export default function PrivacyPage() {
  const lastUpdated = "April 29, 2026";

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-6 py-20">
        <h1 className="text-4xl font-black mb-2">Privacy Policy</h1>
        <p className="text-gray-400 mb-12">Last updated: {lastUpdated}</p>

        <div className="space-y-10 text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Who We Are</h2>
            <p>
              MyJobPhase (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is an
              AI-powered job application platform accessible at myjobphase.com.
              We help job seekers apply to remote jobs faster using artificial
              intelligence.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              2. What We Collect
            </h2>
            <p className="mb-3">
              We collect the following information when you use our service:
            </p>
            <ul className="space-y-2 ml-4">
              <li>
                • <strong className="text-white">Account information:</strong>{" "}
                Email address and password (hashed, never stored in plain text)
              </li>
              <li>
                • <strong className="text-white">Resume data:</strong> Your
                uploaded CV, extracted skills, work experience, and education
              </li>
              <li>
                • <strong className="text-white">Application data:</strong> Jobs
                you apply to, application status, and notes you add
              </li>
              <li>
                • <strong className="text-white">Usage data:</strong> Pages
                visited, features used, and error logs to improve the service
              </li>
              <li>
                • <strong className="text-white">Payment data:</strong>{" "}
                Processed by Stripe or Paystack — we never store card numbers
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              3. How We Use Your Data
            </h2>
            <ul className="space-y-2 ml-4">
              <li>
                • To match your profile against job listings and compute match
                scores
              </li>
              <li>
                • To generate tailored resumes and cover letters for specific
                jobs
              </li>
              <li>• To send job alert emails (only if you opt in)</li>
              <li>• To process payments and manage your subscription</li>
              <li>• To improve our AI models and product features</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              4. Who We Share Data With
            </h2>
            <p className="mb-3">
              We do not sell your personal data. We share data only with:
            </p>
            <ul className="space-y-2 ml-4">
              <li>
                • <strong className="text-white">Groq:</strong> AI processing
                for resume parsing and content generation
              </li>
              <li>
                • <strong className="text-white">Supabase/PostgreSQL:</strong>{" "}
                Secure database hosting
              </li>
              <li>
                • <strong className="text-white">Stripe / Paystack:</strong>{" "}
                Payment processing
              </li>
              <li>
                • <strong className="text-white">Resend:</strong> Transactional
                email delivery
              </li>
              <li>
                • <strong className="text-white">Vercel / Render:</strong>{" "}
                Application hosting
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              5. Data Retention
            </h2>
            <p>
              We retain your account data for as long as your account is active.
              If you delete your account, we delete your personal data within 30
              days. Application tracking data and generated documents are
              deleted with your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              6. Your Rights
            </h2>
            <p className="mb-3">You have the right to:</p>
            <ul className="space-y-2 ml-4">
              <li>• Access the personal data we hold about you</li>
              <li>• Request correction of inaccurate data</li>
              <li>• Request deletion of your account and data</li>
              <li>• Export your data (applications, resume data)</li>
              <li>• Opt out of email alerts at any time</li>
            </ul>
            <p className="mt-3">
              To exercise these rights, email us at{" "}
              <a
                href="mailto:privacy@myjobphase.com"
                className="text-blue-400 hover:underline">
                privacy@myjobphase.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">7. Security</h2>
            <p>
              Passwords are hashed using bcrypt and never stored in plain text.
              All data is transmitted over HTTPS. We use Supabase&apos;s
              enterprise-grade security for database storage. Payment data is
              handled entirely by Stripe and Paystack — we never see or store
              your card details.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">8. Cookies</h2>
            <p>
              We use essential cookies for authentication (JWT tokens) and
              session management. We do not use advertising cookies or
              third-party tracking cookies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              9. Changes to This Policy
            </h2>
            <p>
              We may update this policy as we add features. We&apos;ll notify
              you of material changes via email or an in-app notice. Continued
              use of the service after changes means you accept the updated
              policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">10. Contact</h2>
            <p>
              Questions about privacy? Email{" "}
              <a
                href="mailto:privacy@myjobphase.com"
                className="text-blue-400 hover:underline">
                privacy@myjobphase.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
