import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { Navbar, Footer } from "./components/LayoutParts";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "MyJobPhase - Track Every Phase of Your Job Search",
  description:
    "AI-powered job search platform. Track applications, analyze resumes with AI, and land remote jobs with intelligent insights through every phase.",
  keywords:
    "job search, application tracker, resume analyzer, remote jobs, career, AI, ATS, job hunting, cover letter generator",
  openGraph: {
    title: "MyJobPhase - Track Every Phase of Your Job Search",
    description:
      "AI-powered job search platform with application tracking and resume analysis",
    url: "https://myjobphase.com",
    siteName: "MyJobPhase",
  },
  twitter: {
    card: "summary_large_image",
    title: "MyJobPhase - Track Every Phase of Your Job Search",
    description:
      "AI-powered job search platform with application tracking and resume analysis",
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-black text-white antialiased">
        {/* Plausible Analytics */}
        <Script
          defer
          data-domain="myjobphase.com"
          src="https://plausible.io/js/pa-0JS9YBRCNbbgAm5cI2sOK.js"
          // strategy="afterInteractive"
        />
        {/* Background mesh gradient */}
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-black to-black"></div>

        {/* Animated gradient orbs */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[128px] animate-float"></div>
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[128px] animate-float-delayed"></div>
        </div>

        <div className="relative z-10 flex min-h-screen flex-col">
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>

        <Toaster
          position="top-right"
          richColors
          theme="dark"
          toastOptions={{
            style: {
              background: "rgba(17, 24, 39, 0.8)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "white",
            },
          }}
        />
      </body>
    </html>
  );
}
