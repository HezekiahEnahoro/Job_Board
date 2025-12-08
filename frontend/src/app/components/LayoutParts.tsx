"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getCurrentUser, logout, type User } from "@/lib/auth";
import { AUTH_EVENTS, onAuthEvent } from "@/lib/authEvents";
import { Sparkles, TrendingUp, X, Menu } from "lucide-react";

export function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const loadUser = async () => {
    try {
      const userData = await getCurrentUser();
      setUser(userData);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    loadUser();

    // Listen for auth events
    const cleanup = onAuthEvent(AUTH_EVENTS.LOGIN, loadUser);
    return cleanup;
  }, []);

  return (
    <nav className="border-b bg-white dark:bg-gray-950">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <Sparkles className="w-6 h-6 text-blue-600" />
            JobFlow
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {user ? (
              <>
                <Link href="/jobs" className="text-sm hover:text-blue-600">
                  Jobs
                </Link>
                <Link href="/dashboard" className="text-sm hover:text-blue-600">
                  Dashboard
                </Link>
                <Link
                  href="/analytics"
                  className="text-sm hover:text-blue-600 flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  Analytics
                </Link>
                <Link
                  href="/analyze"
                  className="text-sm hover:text-blue-600 flex items-center gap-1">
                  <Sparkles className="w-4 h-4" />
                  AI Analyzer
                </Link>
                {/* <ThemeToggle/> */}
                <Button variant="ghost" size="sm" onClick={logout}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link href="/jobs" className="text-sm hover:text-blue-600">
                  Jobs
                </Link>
                <Link href="/auth">
                  <Button size="sm">Sign In</Button>
                </Link>
              </>
            )}
            
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="flex flex-col gap-4">
              {user ? (
                <>
                  <Link href="/jobs" className="text-sm hover:text-blue-600">
                    Jobs
                  </Link>
                  <Link
                    href="/dashboard"
                    className="text-sm hover:text-blue-600">
                    Dashboard
                  </Link>
                  <Link
                    href="/analytics"
                    className="text-sm hover:text-blue-600">
                    Analytics
                  </Link>
                  <Link href="/analyze" className="text-sm hover:text-blue-600">
                    AI Analyzer
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={logout}
                    className="justify-start">
                    Logout
                  </Button>
                  
                </>
              ) : (
                <>
                  <Link href="/jobs" className="text-sm hover:text-blue-600">
                    Jobs
                  </Link>
                  <Link href="/auth">
                    <Button size="sm" className="w-full">
                      Sign In
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

function ThemeToggle() {
  const { setTheme, theme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // 🚫 Don’t render anything until mounted – prevents SSR/CSR mismatch
  if (!mounted) return null;

  const active = theme === "system" ? systemTheme : theme;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="w-28 justify-between">
          {mounted ? (active === "dark" ? "Dark" : "Light") : "Theme"}
          <span className="opacity-60 text-xs">▼</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Footer() {
  const year = new Date().getUTCFullYear();
  return (
    <footer className="border-t bg-white dark:bg-neutral-900">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-4 text-sm text-gray-500 dark:text-neutral-400 flex justify-between">
        <span>© {year} JobBoardX</span>
        <span>Built with Next.js & FastAPI</span>
      </div>
    </footer>
  );
}
