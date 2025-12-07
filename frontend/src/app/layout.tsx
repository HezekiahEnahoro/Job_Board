import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "./components/ThemeProvider";
import { Navbar, Footer } from "./components/LayoutParts";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "JobFlow - Land Your Dream Job 3x Faster with AI",
  description:
    "Track applications, optimize resumes with AI, and never miss a follow-up. Get hired 3x faster with JobFlow's smart job search tools. Free to start!",
  keywords: [
    "job search",
    "resume optimizer",
    "AI resume",
    "application tracker",
    "job tracker",
    "career tools",
  ],
  authors: [{ name: "JobFlow" }],
  openGraph: {
    title: "JobFlow - AI-Powered Job Search Platform",
    description:
      "Track applications, optimize resumes with AI, get hired faster",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col bg-gray-50 text-gray-900 dark:bg-neutral-900 dark:text-neutral-100">
        <ThemeProvider>
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 flex-1">
              {children}
            </main>
            <Footer />
          </div>
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
