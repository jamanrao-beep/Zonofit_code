"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ArrowRight } from "lucide-react";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // If in admin/gym dashboard, dashboard layout handles its own header
  if (pathname?.includes("/dashboard")) {
    return null;
  }

  const navLinks = [
    { label: "How it works", href: "#how-it-works" },
    { label: "Credits", href: "#credits" },
    { label: "Membership", href: "#membership" },
    { label: "For gyms", href: "/partners" },
    { label: "FAQ", href: "#faq" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#f3f8f2]/90 backdrop-blur-md border-b border-black/[0.05] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 h-20 flex items-center justify-between gap-4">
        
        {/* Logo */}
        <Link href="/" className="shrink-0 flex items-center gap-2.5 group transition-transform duration-200 hover:scale-[1.01]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/Zonofit_Logo_RemovedBackground.png"
            alt="ZonoFit"
            className="h-9 w-9 sm:h-10 sm:w-10 object-contain transition-transform duration-200 group-hover:scale-105"
          />
          <div className="flex items-center">
            <span className="text-xl sm:text-2xl font-black tracking-tight text-gray-900">
              ZonoFit
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 ml-0.5 mt-2" />
          </div>
        </Link>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2 xl:gap-3 text-[14.5px] font-semibold text-gray-600">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="px-3.5 py-2 rounded-full hover:text-gray-950 hover:bg-black/[0.04] active:bg-black/[0.08] transition-all whitespace-nowrap"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right CTA: Launch Offer */}
        <div className="hidden sm:flex items-center shrink-0">
          <Link
            href="/udaipur/launch-offer"
            className="group relative inline-flex items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-[#27984d] hover:from-emerald-800 hover:via-emerald-700 hover:to-emerald-600 px-4 py-2.5 text-left shadow-[0_4px_14px_rgba(22,163,74,0.28)] hover:shadow-[0_6px_22px_rgba(22,163,74,0.40)] transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 border border-emerald-400/30"
          >
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1.5 leading-tight">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-200" />
                </span>
                <span className="text-[13px] font-black uppercase tracking-wider text-white">
                  Launch Offer
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-black bg-white/20 text-white tracking-wider border border-white/20">
                  FREE
                </span>
              </div>
              <span className="text-[11px] font-medium text-emerald-100/95 leading-tight mt-0.5 group-hover:text-white transition-colors">
                Claim your free membership offer →
              </span>
            </div>
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-xl text-gray-800 hover:text-black hover:bg-black/[0.05] transition-colors"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-xl border-b border-gray-200 px-6 py-5 flex flex-col gap-3 shadow-xl">
          <div className="flex flex-col gap-1 py-1">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-base font-semibold text-gray-800 hover:text-emerald-700 hover:bg-emerald-50/60 px-3 py-2.5 rounded-xl transition-all"
              >
                {link.label}
              </Link>
            ))}
          </div>
          
          <div className="pt-2 border-t border-gray-100">
            <Link
              href="/udaipur/launch-offer"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between rounded-xl bg-gradient-to-r from-emerald-600 to-[#27984d] p-3.5 text-white shadow-md active:scale-[0.99] transition-transform"
            >
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                </span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-extrabold uppercase tracking-wide">
                      Launch Offer
                    </span>
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-white/20 text-white border border-white/20">
                      FREE
                    </span>
                  </div>
                  <span className="text-xs text-emerald-100 font-medium">
                    Claim your free membership offer
                  </span>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-white" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
