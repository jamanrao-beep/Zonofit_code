"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // If in admin/gym dashboard, dashboard layout handles its own header
  if (pathname?.includes("/dashboard")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 bg-[#f3f8f2]/90 backdrop-blur-md border-b border-black/[0.04]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 h-20 flex items-center justify-between">
        
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/Zonofit_Logo_RemovedBackground.png"
            alt="ZonoFit"
            className="h-10 w-10 object-contain"
          />
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

        {/* Right CTA Button: Launch Offer */}
        <div className="hidden sm:flex items-center shrink-0">
          <Link
            href="/udaipur/launch-offer"
            className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-600 via-[#38a129] to-emerald-500 hover:from-emerald-700 hover:via-[#2f8822] hover:to-emerald-600 px-4 py-2 text-left shadow-[0_4px_14px_rgba(22,163,74,0.32)] hover:shadow-[0_6px_20px_rgba(22,163,74,0.45)] transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 border border-emerald-400/30 flex flex-col justify-center"
          >
            <div className="flex items-center gap-1.5 leading-tight">
              <span className="text-[14px] font-extrabold uppercase tracking-wide text-white drop-shadow-sm">
                Launch Offer
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-black bg-white/25 text-white tracking-wider">
                FREE
              </span>
            </div>
            <span className="text-[11px] font-medium text-emerald-100/95 leading-tight mt-0.5 group-hover:text-white transition-colors">
              Claim your free membership offer →
            </span>
          </Link>
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
          {/* Mobile Launch Offer CTA */}
          <Link
            href="/udaipur/launch-offer"
            onClick={() => setMobileMenuOpen(false)}
            className="rounded-xl bg-gradient-to-r from-emerald-600 via-[#38a129] to-emerald-500 p-3.5 text-left shadow-md border border-emerald-400/30 flex flex-col justify-center text-white"
          >
            <div className="flex items-center justify-between">
              <span className="text-[15px] font-extrabold uppercase tracking-wide">
                Launch Offer
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white/25 text-white tracking-wider">
                FREE
              </span>
            </div>
            <span className="text-xs font-medium text-emerald-100 mt-0.5">
              Claim your free membership offer →
            </span>
          </Link>

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
        </div>
      )}
    </header>
  );
}
