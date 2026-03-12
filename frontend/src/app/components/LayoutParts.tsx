"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "next/navigation";
import { getToken, logout } from "@/lib/auth"; // ✅ Changed: import logout
import { useState, useEffect } from "react";
import {
  Sparkles,
  LogOut,
  Menu,
  X,
  BarChart3,
  Briefcase,
  LayoutDashboard,
  User,
  Zap,
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!getToken());
  }, [pathname]);

  const handleLogout = () => {
    logout(); // ✅ Changed: use logout() which handles redirect
  };

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="group flex items-center gap-2">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg blur opacity-0 group-hover:opacity-75 transition"></div>
              <div className="relative p-2 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600">
                <Zap className="h-5 w-5 text-white" />
              </div>
            </div>
            <span className="text-xl font-black tracking-tight">JobFlow</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {isLoggedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                    isActive("/dashboard")
                      ? "text-white"
                      : "text-gray-400 hover:text-white"
                  }`}>
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
                <Link
                  href="/jobs"
                  className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                    isActive("/jobs")
                      ? "text-white"
                      : "text-gray-400 hover:text-white"
                  }`}>
                  <Briefcase className="h-4 w-4" />
                  Jobs
                </Link>
                <Link
                  href="/analyze"
                  className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                    isActive("/analyze")
                      ? "text-white"
                      : "text-gray-400 hover:text-white"
                  }`}>
                  <Sparkles className="h-4 w-4" />
                  AI Analyzer
                </Link>
                <Link
                  href="/analytics"
                  className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                    isActive("/analytics")
                      ? "text-white"
                      : "text-gray-400 hover:text-white"
                  }`}>
                  <BarChart3 className="h-4 w-4" />
                  Analytics
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/jobs"
                  className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
                  Browse Jobs
                </Link>
              </>
            )}
          </div>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center gap-3">
            {isLoggedIn ? (
              <>
                <Link href="/profile">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-white hover:bg-white/5">
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-gray-400 hover:text-white hover:bg-white/5">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link href="/auth">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-white hover:bg-white/5">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth">
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-500/25">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-400 hover:text-white">
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 py-4 space-y-3">
            {isLoggedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className="block px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition"
                  onClick={() => setMobileMenuOpen(false)}>
                  Dashboard
                </Link>
                <Link
                  href="/jobs"
                  className="block px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition"
                  onClick={() => setMobileMenuOpen(false)}>
                  Jobs
                </Link>
                <Link
                  href="/analyze"
                  className="block px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition"
                  onClick={() => setMobileMenuOpen(false)}>
                  AI Analyzer
                </Link>
                <Link
                  href="/analytics"
                  className="block px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition"
                  onClick={() => setMobileMenuOpen(false)}>
                  Analytics
                </Link>
                <Link
                  href="/profile"
                  className="block px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition"
                  onClick={() => setMobileMenuOpen(false)}>
                  Profile
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition">
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/jobs"
                  className="block px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition"
                  onClick={() => setMobileMenuOpen(false)}>
                  Browse Jobs
                </Link>
                <Link
                  href="/auth"
                  className="block px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition"
                  onClick={() => setMobileMenuOpen(false)}>
                  Sign In
                </Link>
                <Link
                  href="/auth"
                  className="block"
                  onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="relative border-t border-white/5 bg-black/50 backdrop-blur-xl mt-20">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {[
            {
              title: "Product",
              links: [
                { label: "Browse Jobs", href: "/jobs" },
                { label: "Dashboard", href: "/dashboard" },
                { label: "AI Analyzer", href: "/analyze" },
                { label: "Analytics", href: "/analytics" },
              ],
            },
            {
              title: "Company",
              links: [
                { label: "About", href: "#" },
                { label: "Blog", href: "#" },
                { label: "Careers", href: "#" },
              ],
            },
            {
              title: "Resources",
              links: [
                { label: "Help Center", href: "#" },
                { label: "Contact", href: "#" },
                { label: "API Docs", href: "#" },
              ],
            },
            {
              title: "Legal",
              links: [
                { label: "Privacy", href: "#" },
                { label: "Terms", href: "#" },
              ],
            },
          ].map((section, i) => (
            <div key={i}>
              <h3 className="font-bold text-white mb-4 text-sm">
                {section.title}
              </h3>
              <ul className="space-y-3">
                {section.links.map((link, j) => (
                  <li key={j}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-400 hover:text-white transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-500">
            © 2026 JobFlow. Built with precision for ambitious professionals.
          </p>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold text-white">JobFlow</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
