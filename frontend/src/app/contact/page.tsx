import { Mail, MessageSquare, Phone } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="container mx-auto max-w-4xl px-6 py-16">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-black mb-4">Get in Touch</h1>
        <p className="text-gray-400 text-xl">We&apos;d love to hear from you</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <div className="text-center p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
          <Mail className="h-8 w-8 text-blue-400 mx-auto mb-4" />
          <h3 className="font-bold mb-2">Email</h3>
          <a
            href="mailto:hello@myjobphase.com"
            className="text-blue-400 hover:text-blue-300 text-sm">
            hello@myjobphase.com
          </a>
        </div>

        <div className="text-center p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
          <MessageSquare className="h-8 w-8 text-purple-400 mx-auto mb-4" />
          <h3 className="font-bold mb-2">Support</h3>
          <a
            href="mailto:support@myjobphase.com"
            className="text-purple-400 hover:text-purple-300 text-sm">
            support@myjobphase.com
          </a>
        </div>

        <div className="text-center p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
          <Phone className="h-8 w-8 text-green-400 mx-auto mb-4" />
          <h3 className="font-bold mb-2">Business</h3>
          <a
            href="mailto:business@myjobphase.com"
            className="text-green-400 hover:text-green-300 text-sm">
            business@myjobphase.com
          </a>
        </div>
      </div>
    </div>
  );
}
