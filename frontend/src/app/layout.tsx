import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "./components/ThemeProvider";
import { Navbar, Footer } from "./components/LayoutParts";

export const metadata: Metadata = {
  title: "JobBoardX",
  description: "Jobs & trends analytics",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col bg-gray-50 text-gray-900 dark:bg-neutral-900 dark:text-neutral-100">
        <ThemeProvider>
          <Navbar />
          <main className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 flex-1">
            {children}
          </main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
