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
  Newspaper,
  SettingsIcon,
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
          <Link
            href={isLoggedIn ? "/dashboard" : "/"}
            onClick={(e) => {
              e.preventDefault();
              if (isLoggedIn) {
                router.push("/dashboard");
              } else {
                router.push("/");
              }
            }}
            className="group flex items-center gap-2">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg blur opacity-0 group-hover:opacity-75 transition"></div>
              <div className="relative p-2 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600">
                <Zap className="h-5 w-5 text-white" />
              </div>
            </div>
            <span className="text-xl font-black tracking-tight">
              MyJobPhase
            </span>
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
                  href="/resume"
                  className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                    isActive("/resume")
                      ? "text-white"
                      : "text-gray-400 hover:text-white"
                  }`}>
                  <Newspaper className="h-4 w-4" />
                  Resume
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
                <Link href="/auth?mode=signup">
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
                  <LayoutDashboard className="h-4 w-4 inline mr-2" />
                  Dashboard
                </Link>
                <Link
                  href="/jobs"
                  className="block px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition"
                  onClick={() => setMobileMenuOpen(false)}>
                  <Briefcase className="h-4 w-4 inline mr-2" />
                  Jobs
                </Link>
                <Link
                  href="/resume"
                  className="block px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition"
                  onClick={() => setMobileMenuOpen(false)}>
                  <Newspaper className="h-4 w-4 inline mr-2" />
                  Resume
                </Link>
                <Link
                  href="/analyze"
                  className="block px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition"
                  onClick={() => setMobileMenuOpen(false)}>
                  <Sparkles className="h-4 w-4 inline mr-2" />
                  AI Analyzer
                </Link>
                <Link
                  href="/analytics"
                  className="block px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition"
                  onClick={() => setMobileMenuOpen(false)}>
                  <BarChart3 className="h-4 w-4 inline mr-2" />
                  Analytics
                </Link>
                <Link
                  href="/profile"
                  className="block px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition"
                  onClick={() => setMobileMenuOpen(false)}>
                  <User className="h-4 w-4 inline mr-2" />
                  Profile
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition">
                  <LogOut className="h-4 w-4 inline mr-2" />
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
                  href="/auth?mode=signup"
                  className="block px-4"
                  onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-sm py-6">
                    Get Started Free
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
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative border-t border-white/10 bg-black/40 backdrop-blur-xl mt-20">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {/* Company */}
          <div>
            <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">
              Company
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/about"
                  className="text-gray-400 hover:text-white transition text-sm">
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="text-gray-400 hover:text-white transition text-sm">
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  href="/careers"
                  className="text-gray-400 hover:text-white transition text-sm">
                  Careers
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">
              Resources
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/help"
                  className="text-gray-400 hover:text-white transition text-sm">
                  Help Center
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-gray-400 hover:text-white transition text-sm">
                  Contact
                </Link>
              </li>
              <li>
                <a
                  href="https://docs.myjobphase.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition text-sm">
                  API Docs
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">
              Legal
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/privacy"
                  className="text-gray-400 hover:text-white transition text-sm">
                  Privacy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-gray-400 hover:text-white transition text-sm">
                  Terms
                </Link>
              </li>
            </ul>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">
              Product
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/jobs"
                  className="text-gray-400 hover:text-white transition text-sm">
                  Browse Jobs
                </Link>
              </li>
              <li>
                <Link
                  href="/upgrade"
                  className="text-gray-400 hover:text-white transition text-sm">
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard"
                  className="text-gray-400 hover:text-white transition text-sm">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/10 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            {/* Logo & Copyright */}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <span className="text-lg font-black">MyJobPhase</span>
                <span className="hidden sm:block text-gray-500">•</span>
                <span className="text-gray-500 text-sm">
                  © {currentYear} All rights reserved
                </span>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-6">
              <a
                href="https://twitter.com/myjobphase"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition">
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>

              <a
                href="https://linkedin.com/company/myjobphase"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition">
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>

              <a
                href="https://github.com/myjobphase"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition">
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Made with Love */}
        <div className="text-center mt-6 text-gray-500 text-xs">
          Made with 💙 for job seekers everywhere
        </div>
      </div>
    </footer>
  );
}
