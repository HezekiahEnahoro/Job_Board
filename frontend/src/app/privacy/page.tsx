export default function PrivacyPage() {
  return (
    <div className="container mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-5xl font-black mb-8">Privacy Policy</h1>

      <div className="prose prose-invert max-w-none space-y-8">
        <p className="text-gray-400 text-lg">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <section>
          <h2 className="text-2xl font-bold mb-4">1. Information We Collect</h2>
          <p className="text-gray-300 leading-relaxed">
            We collect information you provide directly to us, including your
            name, email address, resume, and job preferences when you create an
            account or use our services.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">
            2. How We Use Your Information
          </h2>
          <p className="text-gray-300 leading-relaxed">
            We use your information to provide, maintain, and improve our
            services, including AI-powered job matching, resume analysis, and
            application tracking.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">3. Data Security</h2>
          <p className="text-gray-300 leading-relaxed">
            We implement appropriate security measures to protect your personal
            information against unauthorized access, alteration, or destruction.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">4. Contact Us</h2>
          <p className="text-gray-300 leading-relaxed">
            If you have any questions about this Privacy Policy, please contact
            us at{" "}
            <a
              href="mailto:privacy@myjobphase.com"
              className="text-blue-400 hover:text-blue-300">
              privacy@myjobphase.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
