"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { LogOut, Menu, X } from "lucide-react";

export default function Header() {
  const { user, initialize, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    initialize();
    setMounted(true);
  }, [initialize]);

  // If in admin/gym dashboard, dashboard layout handles its own header
  if (pathname?.includes("/dashboard")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 bg-[#f3f8f2]/90 backdrop-blur-md border-b border-black/[0.04]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 h-20 flex items-center justify-between">
        
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl overflow-hidden shadow-sm flex items-center justify-center bg-[#4ea02b]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/Zonofit_final_logo.jpeg"
              alt="ZonoFit Logo"
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback SVG if image not found
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <span className="text-2xl font-black tracking-tight text-gray-900">
            ZonoFit
          </span>
        </Link>

        {/* Center Nav Links - Matching Screenshot 1 */}
        <nav className="hidden md:flex items-center gap-8 text-[15px] font-semibold text-gray-700">
          <Link
            href="#how-it-works"
            className="hover:text-gray-950 transition-colors"
          >
            How it works
          </Link>
          <Link
            href="#credits"
            className="hover:text-gray-950 transition-colors"
          >
            Credits
          </Link>
          <Link
            href="#membership"
            className="hover:text-gray-950 transition-colors"
          >
            Membership
          </Link>
          <Link
            href="/partners"
            className="hover:text-gray-950 transition-colors"
          >
            For gyms
          </Link>
          <Link
            href="#faq"
            className="hover:text-gray-950 transition-colors"
          >
            FAQ
          </Link>
        </nav>

        {/* Right Actions */}
        <div className="hidden md:flex items-center gap-4">
          {mounted && user ? (
            <div className="flex items-center gap-3">
              <Link
                href={user.role === "ADMIN" ? "/admin/dashboard" : "/gym/dashboard"}
                className="px-5 py-2.5 rounded-full border border-gray-300 text-sm font-bold text-gray-900 hover:border-gray-900 transition-all bg-white"
              >
                Dashboard
              </Link>
              <button
                onClick={logout}
                className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors bg-white"
                title="Logout"
              >
                <LogOut size={16} className="text-gray-800" />
              </button>
            </div>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="text-sm font-bold text-gray-800 hover:text-black px-2 py-2 transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/auth/signup"
                className="bg-[#111827] text-white text-sm font-bold px-5 py-2.5 rounded-full hover:bg-black transition-all shadow-sm hover:shadow"
              >
                Join ZonoFit
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-gray-800 hover:text-black"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-lg border-b border-gray-200 px-6 py-5 flex flex-col gap-4 shadow-xl">
          <Link
            href="#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="text-base font-semibold text-gray-800 py-1"
          >
            How it works
          </Link>
          <Link
            href="#credits"
            onClick={() => setMobileMenuOpen(false)}
            className="text-base font-semibold text-gray-800 py-1"
          >
            Credits
          </Link>
          <Link
            href="#membership"
            onClick={() => setMobileMenuOpen(false)}
            className="text-base font-semibold text-gray-800 py-1"
          >
            Membership
          </Link>
          <Link
            href="/partners"
            onClick={() => setMobileMenuOpen(false)}
            className="text-base font-semibold text-gray-800 py-1"
          >
            For gyms
          </Link>
          <Link
            href="#faq"
            onClick={() => setMobileMenuOpen(false)}
            className="text-base font-semibold text-gray-800 py-1"
          >
            FAQ
          </Link>
          <div className="pt-3 border-t border-gray-100 flex flex-col gap-2.5">
            <Link
              href="/auth/login"
              onClick={() => setMobileMenuOpen(false)}
              className="text-center py-2.5 font-bold text-gray-800"
            >
              Log in
            </Link>
            <Link
              href="/auth/signup"
              onClick={() => setMobileMenuOpen(false)}
              className="text-center py-3 bg-[#111827] text-white font-bold rounded-full shadow-sm"
            >
              Join ZonoFit
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
