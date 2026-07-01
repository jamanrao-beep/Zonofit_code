"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
    <header className="fixed top-0 w-full z-50 glass border-b border-black/5">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.jpeg" alt="ZonoFit" width={40} height={40} className="rounded-lg object-cover" />
          <span className="text-xl font-bold tracking-tight text-black">
            Zono<span className="text-primary">Fit</span>
          </span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
          <Link href="/" className="hover:text-black transition-colors">Overview</Link>
          <Link href="#" className="hover:text-black transition-colors">Gym Partners</Link>
          <Link href="#" className="hover:text-black transition-colors">Analytics</Link>
          <Link href="#" className="hover:text-black transition-colors">Settings</Link>
        </nav>
        
        <div className="flex items-center gap-4">
          {mounted && user ? (
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-bold text-black">{user.name}</div>
                <div className="text-xs font-semibold text-primary">{user.role.replace("_", " ")}</div>
              </div>
              <button 
                onClick={logout}
                className="w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-red-500/10 hover:text-red-500 text-gray-500 transition-colors"
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <>
              <Link href="/auth/signup" className="text-sm font-medium text-gray-600 hover:text-black transition-colors">
                Sign up
              </Link>
              <Link href="/auth/login" className="bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:scale-105 active:scale-95 shadow-[0_4px_14px_rgba(16,185,129,0.3)]">
                Log in
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
