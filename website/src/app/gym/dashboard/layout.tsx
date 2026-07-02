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
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-80px)]">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-gray-100 flex-shrink-0">
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium text-sm ${
                  isActive
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-black"
                }`}
              >
                <Icon size={18} className={isActive ? "text-emerald-600" : "text-gray-400"} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 bg-gray-50/50">
        {children}
      </main>
    </div>
  );
}
