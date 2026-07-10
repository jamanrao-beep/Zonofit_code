"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { LogOut, ChevronDown, Lock } from "lucide-react";

export default function Header() {
  const { user, initialize, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    initialize();
    setMounted(true);
  }, [initialize]);

  // If we are in the dashboard, don't show the public transparent header
  if (pathname?.includes('/dashboard')) {
    return null; // The dashboard layout handles its own header
  }

  return (
    <header className="fixed top-0 w-full z-50 bg-transparent">
      <div className="max-w-7xl mx-auto px-8 h-24 flex items-center justify-between">
        
        {/* Logo - similar to "fitness O" from reference */}
        <Link href="/" className="flex items-center gap-1.5 group">
          <span className="text-2xl font-black tracking-tight text-foreground">
            ZonoFit
          </span>
          <div className="w-6 h-3.5 rounded-full border-[3px] border-brand-coral group-hover:bg-brand-coral transition-colors" />
        </Link>
        
        {/* Center Nav - minimal text, black font, Chevron */}
        <nav className="hidden md:flex items-center gap-12 text-sm font-bold text-foreground tracking-wide">
          <Link href="/how-it-works" className="flex items-center gap-1 hover:text-brand-green transition-colors">
            How it Works <ChevronDown size={14} className="mt-0.5" />
          </Link>
          <Link href="/plans" className="hover:text-brand-green transition-colors">
            Plans
          </Link>
          {(!mounted || !user || user.role !== "GYM_OWNER") && (
            <Link href="/partners" className="hover:text-brand-green transition-colors">
              Gym Partners
            </Link>
          )}
        </nav>
        
        {/* Right Actions - Discover / Lock icon */}
        <div className="flex items-center gap-3">
          {mounted && user ? (
            <div className="flex items-center gap-3">
              <Link 
                href={user.role === "ADMIN" ? "/admin/dashboard" : "/gym/dashboard"} 
                className="px-6 py-2.5 rounded-full border-2 border-foreground/10 text-sm font-bold text-foreground hover:border-foreground/30 transition-all bg-surface/50 backdrop-blur-md"
              >
                Dashboard
              </Link>
              <button 
                onClick={logout}
                className="w-10 h-10 rounded-full border-2 border-foreground/10 flex items-center justify-center hover:bg-foreground/5 transition-colors bg-surface/50 backdrop-blur-md"
                title="Logout"
              >
                <LogOut size={16} className="text-foreground" />
              </button>
            </div>
          ) : (
            <>
              <Link 
                href="/auth/signup" 
                className="px-6 py-2.5 rounded-full border-2 border-foreground/10 text-sm font-bold text-foreground hover:border-foreground/30 transition-all bg-surface/50 backdrop-blur-md"
              >
                Discover
              </Link>
              <Link 
                href="/auth/login" 
                className="w-10 h-10 rounded-full border-2 border-foreground/10 flex items-center justify-center hover:bg-foreground/5 transition-colors bg-surface/50 backdrop-blur-md"
                title="Log in"
              >
                <Lock size={16} className="text-foreground" />
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
