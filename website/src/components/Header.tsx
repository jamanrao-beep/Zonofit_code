"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { LogOut } from "lucide-react";

export default function Header() {
  const { user, initialize, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    initialize();
    setMounted(true);
  }, [initialize]);

  return (
    <header className="fixed top-0 w-full z-50 glass border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <div className="w-3 h-3 bg-black rounded-full" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            Zono<span className="text-primary">Fit</span> Portal
          </span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
          <Link href="/" className="hover:text-white transition-colors">Overview</Link>
          <Link href="#" className="hover:text-white transition-colors">Gym Partners</Link>
          <Link href="#" className="hover:text-white transition-colors">Analytics</Link>
          <Link href="#" className="hover:text-white transition-colors">Settings</Link>
        </nav>
        
        <div className="flex items-center gap-4">
          {mounted && user ? (
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-bold text-white">{user.name}</div>
                <div className="text-xs font-semibold text-primary">{user.role.replace("_", " ")}</div>
              </div>
              <button 
                onClick={logout}
                className="w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-red-500/20 hover:text-red-500 text-gray-400 transition-colors"
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <>
              <Link href="/auth/login" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
                Log in
              </Link>
              <Link href="/auth/signup" className="bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                Admin Access
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
