"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  IndianRupee,
  CheckCircle2,
  LineChart,
  Tag,
  Building2,
  LifeBuoy,
  Menu,
  X,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

export default function GymDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const logout = useAuthStore((state) => state.logout);

  // Close mobile drawer when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    logout();
    router.push("/auth/login");
  };

  const navItems = [
    { name: "Home", href: "/dashboard", icon: LayoutDashboard },
    { name: "Members", href: "/dashboard/members", icon: Users },
    { name: "Payouts & Earnings", href: "/dashboard/payouts", icon: IndianRupee },
    { name: "Performance Analytics", href: "/dashboard/analytics", icon: LineChart },
    { name: "Special Offers", href: "/dashboard/offers", icon: Tag },
    { name: "Gym Profile", href: "/dashboard/profile", icon: Building2 },
    { name: "Partner Support", href: "/dashboard/support", icon: LifeBuoy },
  ];

  return (
    <div className="flex-1 w-full min-h-screen bg-background flex flex-col md:flex-row">
      {/* ─── Desktop Sidebar ────────────────────────────────────────── */}
      <aside className="hidden md:flex md:w-64 bg-[#1C1C1E] border-r border-[#2C2C2E] flex-col z-20 shrink-0 min-h-screen md:h-screen md:sticky md:top-0">
        <div className="p-6 border-b border-secondary-dark flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-600 shadow-sm">
            <span className="text-white font-black text-base">Z</span>
          </div>
          <div>
            <span className="font-bold text-lg text-white tracking-wide block leading-none">ZonoFit Partner</span>
            <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">Gym Console</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-5 px-4 space-y-1.5 custom-scrollbar">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 font-medium text-sm ${
                  isActive
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shadow-sm font-semibold"
                    : "text-muted hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon size={18} className={isActive ? "text-emerald-400" : "text-muted"} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-secondary-dark space-y-3">
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-white shadow-sm">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle2 size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                Verified Partner
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="text-[10px] text-gray-400 truncate">ZonoFit Network</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 p-2.5 bg-white/5 hover:bg-red-500/15 text-gray-300 hover:text-red-400 border border-white/10 hover:border-red-500/30 rounded-xl transition-all font-semibold text-xs"
          >
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ─── Mobile Sticky Header with Hamburger ──────────────────────── */}
      <header className="md:hidden bg-surface-dark border-b border-secondary-dark px-4 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-600 shadow-sm">
            <span className="text-white font-bold text-sm">Z</span>
          </div>
          <div>
            <span className="font-bold text-sm text-white tracking-wide block leading-none">ZonoFit Partner</span>
            <span className="text-[10px] text-emerald-400 font-semibold">Console</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleLogout}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-white/5 rounded-xl transition-colors"
            title="Sign Out"
            aria-label="Sign Out"
          >
            <LogOut size={18} />
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-white bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* ─── Mobile Slide-out Drawer ─────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity" 
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative ml-auto w-[85%] max-w-xs bg-surface-dark border-l border-secondary-dark flex flex-col h-full shadow-2xl z-50">
            {/* Drawer Header */}
            <div className="p-5 border-b border-secondary-dark flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-600">
                  <span className="text-white font-bold text-sm">Z</span>
                </div>
                <div>
                  <span className="font-bold text-sm text-white block">ZonoFit Partner</span>
                  <span className="text-[10px] text-emerald-400 font-bold uppercase">Active Partner</span>
                </div>
              </div>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-muted hover:text-white rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Partner Status Pill inside Drawer */}
            <div className="px-4 pt-4">
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700/60 text-white">
                <CheckCircle2 size={16} className="text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-300">Verified Network Partner</span>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all text-sm ${
                      isActive
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-bold"
                        : "text-muted hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <Icon size={18} className={isActive ? "text-emerald-400" : "text-muted"} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Drawer Footer with Sign Out */}
            <div className="p-4 border-t border-secondary-dark bg-black/30">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 p-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all font-bold text-sm shadow-md"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Main Content Area ───────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden bg-background">
        {/* Desktop Top Navbar */}
        <header className="hidden md:flex bg-surface border-b border-secondary px-8 py-4 items-center justify-between z-10 soft-shadow">
          <h2 className="text-xl font-bold text-foreground">Gym Partner Console</h2>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-background border border-secondary rounded-xl text-sm font-medium text-foreground flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-600" />
              Status: <span className="text-emerald-600 font-bold">Verified Partner</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-red-500/10 text-red-600 hover:bg-red-500/20 border border-red-500/20 transition-all cursor-pointer"
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
