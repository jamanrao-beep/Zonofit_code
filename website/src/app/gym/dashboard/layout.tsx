"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  IndianRupee,
  CheckCircle2,
  LineChart,
} from "lucide-react";

export default function GymDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { name: "Home", href: "/gym/dashboard", icon: LayoutDashboard },
    { name: "Members", href: "/gym/dashboard/members", icon: Users },
    { name: "Payouts & Earnings", href: "/gym/dashboard/payouts", icon: IndianRupee },
    { name: "Performance Analytics", href: "/gym/dashboard/analytics", icon: LineChart },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-80px)] bg-background">
      {/* Sidebar - High Contrast Dark */}
      <aside className="w-full md:w-64 bg-surface-dark border-r border-secondary-dark flex-shrink-0 z-20">
        <nav className="p-4 space-y-1.5 h-full flex flex-col pt-8">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-sm ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm"
                    : "text-muted hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon size={18} className={isActive ? "text-emerald-400" : "text-muted"} />
                {item.name}
              </Link>
            );
          })}

          <div className="mt-auto pt-6 pb-2">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700/60 text-white shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <CheckCircle2 size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  Verified Partner
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className="text-[11px] text-gray-400 truncate">Active in ZonoFit Network</div>
              </div>
            </div>
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 bg-background relative">
        <div className="absolute top-0 left-0 w-full h-64 bg-surface border-b border-secondary hidden md:block" />
        <div className="relative z-10 p-6 md:p-8 h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
