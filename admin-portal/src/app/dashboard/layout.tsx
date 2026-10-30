"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  ShieldAlert,
  CreditCard,
  Layers,
  Tag,
  FileText,
  Settings,
  AlertTriangle,
  ScrollText,
  BellRing,
  UserCheck,
  Menu,
  LogOut,
  LifeBuoy,
  Store,
  MapPin,
  type LucideIcon,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

type NavItem = { label: string; path: string; icon: LucideIcon; badge?: "gyms" | "support" };

const NAV: { group: string; items: NavItem[] }[] = [
  { group: "Overview", items: [{ label: "Dashboard", path: "/dashboard", icon: LayoutDashboard }] },
  {
    group: "People",
    items: [
      { label: "Users", path: "/dashboard/users", icon: Users },
      { label: "Memberships", path: "/dashboard/memberships", icon: UserCheck },
      { label: "Plans", path: "/dashboard/plans", icon: Layers },
    ],
  },
  {
    group: "Network",
    items: [
      { label: "Gyms & Approvals", path: "/dashboard/gyms", icon: Dumbbell, badge: "gyms" },
      { label: "Trial Gyms", path: "/dashboard/trial-gyms", icon: MapPin },
      { label: "Financial Center", path: "/dashboard/finance", icon: CreditCard },
    ],
  },
  {
    group: "Commerce",
    items: [
      { label: "Marketplace", path: "/dashboard/marketplace", icon: Store },
      { label: "Marketing & Offers", path: "/dashboard/marketing", icon: Tag },
    ],
  },
  {
    group: "Platform",
    items: [
      { label: "Content Manager", path: "/dashboard/content", icon: ScrollText },
      { label: "Notifications", path: "/dashboard/notifications", icon: BellRing },
      { label: "Support", path: "/dashboard/support", icon: LifeBuoy, badge: "support" },
      { label: "Audit Logs", path: "/dashboard/audit", icon: FileText },
      { label: "Fraud & Risk", path: "/dashboard/risk", icon: ShieldAlert },
      { label: "Settings", path: "/dashboard/settings", icon: Settings },
    ],
  },
];

function pageTitle(pathname: string) {
  if (pathname.startsWith("/dashboard/gyms/") && pathname !== "/dashboard/gyms") return "Gym";
  const hit = NAV.flatMap((group) => group.items).find(
    (item) => item.path !== "/dashboard" && (pathname === item.path || pathname.startsWith(`${item.path}/`))
  );
  if (hit) return hit.label;
  if (pathname === "/dashboard") return "Dashboard";
  return "Admin";
}

function Mark() {
  return (
    <div
      className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px]"
      style={{ background: "linear-gradient(#92BB2B, #3F8230)" }}
    >
      <svg width="22" height="22" viewBox="0 0 40 40" aria-hidden="true">
        <path
          d="M11 14h17c2 0 2.5 2.4.6 3H17M11 21h8"
          stroke="#fff"
          strokeWidth="3.4"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="14" cy="28" r="2.6" fill="#fff" />
      </svg>
    </div>
  );
}

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [badges, setBadges] = useState({ gyms: 0, support: 0 });
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    const token = localStorage.getItem("zonofit_portal_token");
    if (!token) {
      router.push("/auth/login");
      return;
    }

    fetch("/api/admin/dashboard", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) {
          router.push("/auth/login");
          return;
        }
        setIsAdmin(true);
        try {
          const json = await res.json();
          setBadges({
            gyms: Number(json?.pendingApplications) || 0,
            support: Number(json?.pendingTickets) || 0,
          });
        } catch {
          setBadges({ gyms: 0, support: 0 });
        }
      })
      .catch(() => router.push("/auth/login"))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    logout();
    router.push("/auth/login");
  };

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F6F8F5] font-medium text-[#66756B]">
        Verifying admin access...
      </div>
    );
  }

  if (!isAdmin) return null;

  const active = (path: string) =>
    path === "/dashboard" ? pathname === "/dashboard" : pathname === path || pathname.startsWith(`${path}/`);

  return (
    <div className="zf-admin flex h-dvh min-h-0 w-full overflow-hidden bg-[#F6F8F5] text-[#0F2417]">
      {mobileMenuOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-20 bg-[rgba(8,16,11,0.45)] min-[900px]:hidden"
          aria-label="Close menu"
          onClick={() => setMobileMenuOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-[260px] flex-col overflow-y-auto bg-[#0C1F14] px-3.5 py-4 text-white transition-transform duration-300 min-[900px]:static min-[900px]:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0 shadow-[0_0_0_100vmax_rgba(8,16,11,0.4)]" : "-translate-x-full"
        }`}
        style={{
          paddingTop: "max(16px, env(safe-area-inset-top))",
          paddingBottom: "max(16px, env(safe-area-inset-bottom))",
          paddingLeft: "max(14px, env(safe-area-inset-left))",
        }}
      >
        <div className="mb-2 flex items-center gap-3 px-2">
          <Mark />
          <div>
            <b className="zf-num block text-[19px] leading-none text-white">Zonofit</b>
            <small className="text-[#8fa596]">Admin</small>
          </div>
        </div>

        <nav className="flex-1">
          {NAV.map((group) => (
            <div key={group.group}>
              <div className="mb-1.5 mt-4 px-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6f8777]">
                {group.group}
              </div>
              {group.items.map((item) => {
                const on = active(item.path);
                const Icon = item.icon;
                const count = item.badge ? badges[item.badge] : 0;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`mb-0.5 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold ${
                      on ? "bg-[rgba(79,224,140,0.14)] text-[#4fe08c]" : "text-[#b3c6b8] hover:bg-white/5"
                    }`}
                  >
                    <Icon size={20} strokeWidth={1.8} />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {count > 0 ? (
                      <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#E5484D] px-1.5 text-[11px] font-bold text-white">
                        {count}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="mt-4 space-y-1 pt-2">
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#f0b4ae] hover:bg-white/5"
          >
            <AlertTriangle size={20} strokeWidth={1.8} />
            Emergency controls
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[#b3c6b8] hover:bg-white/5"
          >
            <LogOut size={20} strokeWidth={1.8} />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="sticky top-0 z-10 flex items-center gap-3 border-b border-[#E4EAE1] bg-[rgba(246,248,245,0.9)] px-4 py-3 backdrop-blur-md min-[900px]:px-8"
          style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}
        >
          <button
            type="button"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] border border-[#E4EAE1] bg-white text-[#66756B] min-[900px]:hidden"
            aria-label="Menu"
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            <Menu size={20} strokeWidth={1.8} />
          </button>
          <h2 className="min-w-0 truncate text-[17px]">{pageTitle(pathname)}</h2>
          <span className="flex-1" />
          <span className="hidden rounded-full border border-[#E4EAE1] bg-white px-3.5 py-1.5 text-[13px] text-[#66756B] sm:inline">
            Role: <b className="text-[#1F7A3F]">{user?.name || "Admin"}</b>
          </span>
          <button
            type="button"
            onClick={handleLogout}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] border border-[#E4EAE1] bg-white text-[#66756B] hover:border-[#f0c4c0] hover:text-[#C2362D]"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={18} strokeWidth={1.8} />
          </button>
        </header>

        <div className="zf-admin-view min-h-0 flex-1 overflow-x-hidden overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
