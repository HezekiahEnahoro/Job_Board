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

export function Navbar() {
  return (
    <header className="border-b bg-white/80 dark:bg-neutral-900/80 backdrop-blur">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        <Link href="/" className="font-semibold text-lg">
          JobBoardX
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link className="hover:text-blue-600" href="/jobs">
            Jobs
          </Link>
          <Link className="hover:text-blue-600" href="/trends">
            Trends
          </Link>
          {/* <Link className="hover:text-blue-600" href="/admin">
            Admin
          </Link> */}
        
          <ThemeToggle />
        </nav>
      </div>
    </header>
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
