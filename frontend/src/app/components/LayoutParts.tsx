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
  return (
    <footer className="border-t border-white/10 bg-black/50 backdrop-blur-xl">
      <div className="container mx-auto max-w-7xl px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-black text-lg">MyJobPhase</span>
            </Link>
            <p className="text-gray-500 text-sm leading-relaxed">
              Apply to 50 jobs in the time it takes to apply to one.
            </p>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
              Company
            </h4>
            <ul className="space-y-3 text-sm text-gray-500">
              <li>
                <Link href="/about" className="hover:text-white transition">
                  About
                </Link>
              </li>
              {/* Blog removed — no content yet */}
              {/* Careers removed — solo founder, misleading */}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
              Resources
            </h4>
            <ul className="space-y-3 text-sm text-gray-500">
              <li>
                <Link href="/help" className="hover:text-white transition">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition">
                  Contact
                </Link>
              </li>
              {/* API Docs removed — docs.myjobphase.com doesn't exist */}
            </ul>
          </div>

          {/* Legal + Product */}
          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
              Legal
            </h4>
            <ul className="space-y-3 text-sm text-gray-500 mb-6">
              <li>
                <Link href="/privacy" className="hover:text-white transition">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition">
                  Terms of Service
                </Link>
              </li>
            </ul>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
              Product
            </h4>
            <ul className="space-y-3 text-sm text-gray-500">
              <li>
                <Link href="/jobs" className="hover:text-white transition">
                  Browse Jobs
                </Link>
              </li>
              <li>
                <Link href="/upgrade" className="hover:text-white transition">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-white transition">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-600 text-sm">
            © {new Date().getFullYear()} MyJobPhase. All rights reserved.
          </p>
          <p className="text-gray-600 text-sm">
            Built by a developer who was job hunting. 🇳🇬
          </p>
        </div>
      </div>
    </footer>
  );
}

