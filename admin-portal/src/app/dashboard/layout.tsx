"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { 
  LayoutDashboard, Users, Dumbbell, ShieldAlert, 
  CreditCard, Tag, FileText, Settings, AlertTriangle, 
  ScrollText, BellRing, UserCheck, Menu, X, LogOut, ShieldCheck
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    const token = localStorage.getItem("zonofit_portal_token");
    if (!token) {
      router.push("/auth/login");
      return;
    }

    // Basic verify
    fetch("/api/admin/dashboard", {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      if (res.ok) {
        setIsAdmin(true);
      } else {
        router.push("/auth/login");
      }
    })
    .catch(() => router.push("/auth/login"))
    .finally(() => setLoading(false));
  }, [router]);

  // Close mobile drawer on route navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    logout();
    router.push("/auth/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted font-medium">
        Verifying Admin Access...
      </div>
    );
  }

  if (!isAdmin) return null;

  const navItems = [
    { label: "Dashboard", path: "/dashboard", icon: <LayoutDashboard size={18} /> },
    { label: "Users", path: "/dashboard/users", icon: <Users size={18} /> },
    { label: "Memberships", path: "/dashboard/memberships", icon: <UserCheck size={18} /> },
    { label: "Gyms & Approvals", path: "/dashboard/gyms", icon: <Dumbbell size={18} /> },
    { label: "Financial Center", path: "/dashboard/finance", icon: <CreditCard size={18} /> },
    { label: "Marketplace", path: "/dashboard/marketplace", icon: <Tag size={18} /> },
    { label: "Trial Gyms", path: "/dashboard/trial-gyms", icon: <Dumbbell size={18} /> },
    { label: "Marketing & Offers", path: "/dashboard/marketing", icon: <Tag size={18} /> },
    { label: "Content Manager", path: "/dashboard/content", icon: <ScrollText size={18} /> },
    { label: "Notifications", path: "/dashboard/notifications", icon: <BellRing size={18} /> },
    { label: "Audit Logs", path: "/dashboard/audit", icon: <FileText size={18} /> },
    { label: "Fraud & Risk", path: "/dashboard/risk", icon: <ShieldAlert size={18} /> },
    { label: "Settings", path: "/dashboard/settings", icon: <Settings size={18} /> },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* ─── Desktop Sidebar ────────────────────────────────────────── */}
      <aside className="hidden md:flex md:w-64 bg-surface-dark border-r border-secondary-dark flex-col z-20 shrink-0 h-screen sticky top-0">
        <div className="p-6 border-b border-secondary-dark flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-brand-green emerald-glow-sm">
            <span className="text-white font-black text-base">Z</span>
          </div>
          <div>
            <span className="font-bold text-lg text-text-light tracking-wide block leading-none">ZonoFit Admin</span>
            <span className="text-[10px] text-brand-lime font-semibold uppercase tracking-wider">Console</span>
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-5 px-4 space-y-1.5 custom-scrollbar">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link 
                key={item.path} 
                href={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                  isActive 
                    ? "bg-white/10 text-brand-lime border border-white/10 shadow-sm" 
                    : "text-muted hover:bg-white/5 hover:text-white"
                }`}
              >
                <div className={isActive ? "text-brand-lime" : "text-muted"}>
                  {item.icon}
                </div>
                <span className="text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-secondary-dark space-y-2">
          <Link 
            href="/dashboard/settings" 
            className="flex items-center justify-center gap-2 p-2.5 bg-red-500/10 text-brand-coral border border-red-500/20 hover:bg-red-500/20 rounded-xl transition-colors font-bold text-xs"
          >
            <AlertTriangle size={15} />
            Emergency Controls
          </Link>
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
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-brand-green emerald-glow-sm">
            <span className="text-white font-bold text-sm">Z</span>
          </div>
          <span className="font-bold text-base text-white tracking-wide">ZonoFit Admin</span>
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
            className="p-2 text-white bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-brand-lime"
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
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-brand-green">
                  <span className="text-white font-bold text-sm">Z</span>
                </div>
                <div>
                  <span className="font-bold text-sm text-white block">ZonoFit Admin</span>
                  <span className="text-[10px] text-brand-lime font-bold uppercase">Role: Founder</span>
                </div>
              </div>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-muted hover:text-white rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Navigation Links */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all text-sm ${
                      isActive
                        ? "bg-white/15 text-brand-lime border border-white/15 font-bold"
                        : "text-muted hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <div className={isActive ? "text-brand-lime" : "text-muted"}>
                      {item.icon}
                    </div>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Drawer Footer with Emergency Controls & Sign Out */}
            <div className="p-4 border-t border-secondary-dark space-y-2.5 bg-black/30">
              <Link
                href="/dashboard/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 p-3 bg-red-500/10 text-brand-coral border border-red-500/20 hover:bg-red-500/20 rounded-xl transition-colors font-bold text-xs"
              >
                <AlertTriangle size={15} />
                Emergency Controls
              </Link>
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
          <h2 className="text-xl font-bold text-foreground">ZonoFit Headquarters</h2>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-background border border-secondary rounded-xl text-sm font-medium text-foreground flex items-center gap-2">
              <ShieldCheck size={16} className="text-brand-green" />
              Role: <span className="text-brand-green font-bold">Founder</span>
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
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
