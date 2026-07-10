"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  IndianRupee,
  Store,
  Tag,
  LineChart,
  LifeBuoy,
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
    { name: "Offers & Campaigns", href: "/gym/dashboard/offers", icon: Tag },
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
                    ? "bg-white/10 text-brand-lime border border-white/10 shadow-sm"
                    : "text-muted hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon size={18} className={isActive ? "text-brand-lime" : "text-muted"} />
                {item.name}
              </Link>
            );
          })}

          <div className="mt-auto pt-6 pb-2">
            <Link
              href="/partners/apply"
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-brand-green hover:bg-primary-dark text-white font-bold text-sm shadow-sm transition-colors border border-brand-green/20 emerald-glow-sm group"
            >
              <Store size={18} className="text-brand-lime group-hover:scale-110 transition-transform" />
              Apply for Partner Gym
            </Link>
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
