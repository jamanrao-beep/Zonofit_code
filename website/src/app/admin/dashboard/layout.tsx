"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { 
  LayoutDashboard, Users, Dumbbell, ShieldAlert, 
  CreditCard, Tag, FileText, BadgeAlert, Settings, AlertTriangle, ScrollText, BellRing, UserCheck
} from "lucide-react";

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("zonofit_portal_token");
    if (!token) {
      router.push("/");
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
        router.push("/");
      }
    })
    .catch(() => router.push("/"))
    .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-medium">Verifying Admin Access...</div>;
  }

  if (!isAdmin) return null;

  const navItems = [
    { label: "Dashboard", path: "/admin/dashboard", icon: <LayoutDashboard size={18} /> },
    { label: "Users", path: "/admin/dashboard/users", icon: <Users size={18} /> },
    { label: "Memberships", path: "/admin/dashboard/memberships", icon: <UserCheck size={18} /> },
    { label: "Gyms & Approvals", path: "/admin/dashboard/gyms", icon: <Dumbbell size={18} /> },
    { label: "Financial Center", path: "/admin/dashboard/finance", icon: <CreditCard size={18} /> },
    { label: "Marketplace", path: "/admin/dashboard/marketplace", icon: <Tag size={18} /> },
    { label: "Trial Gyms", path: "/admin/dashboard/trial-gyms", icon: <Dumbbell size={18} /> },
    { label: "Marketing & Offers", path: "/admin/dashboard/marketing", icon: <Tag size={18} /> },
    { label: "Content Manager", path: "/admin/dashboard/content", icon: <ScrollText size={18} /> },
    { label: "Notifications", path: "/admin/dashboard/notifications", icon: <BellRing size={18} /> },
    { label: "Audit Logs", path: "/admin/dashboard/audit", icon: <FileText size={18} /> },
    { label: "Fraud & Risk", path: "/admin/dashboard/risk", icon: <ShieldAlert size={18} /> },
    { label: "Settings & Kill Switch", path: "/admin/dashboard/settings", icon: <Settings size={18} /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-100 flex items-center gap-2">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">Z</span>
          </div>
          <span className="font-bold text-lg text-black">Admin Panel</span>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link 
                key={item.path} 
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                  isActive 
                    ? "bg-black text-white shadow-md" 
                    : "text-gray-600 hover:bg-gray-100 hover:text-black"
                }`}
              >
                {item.icon}
                <span className="text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <Link href="/admin/dashboard/settings" className="flex items-center gap-2 p-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-colors font-bold text-sm">
            <AlertTriangle size={18} />
            Emergency Controls
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Navbar */}
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between z-10 shadow-sm">
          <h2 className="text-xl font-bold text-black hidden sm:block">ZonoFit Headquarters</h2>
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-black">
              Role: <span className="text-emerald-600 font-bold">Founder</span>
            </div>
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
