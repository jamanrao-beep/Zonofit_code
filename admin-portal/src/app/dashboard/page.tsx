"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Dumbbell, LifeBuoy, BadgeDollarSign, ShieldCheck } from "lucide-react";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function inr(n: number) {
  return Number(n || 0).toLocaleString("en-IN");
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("zonofit_portal_token");
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch("/api/admin/dashboard", { headers }).then((res) => res.json()).catch(() => null),
      fetch("/api/admin/audit-logs", { headers }).then((res) => res.json()).catch(() => null),
    ])
      .then(([dash, audit]) => {
        setData(dash);
        setLogs(Array.isArray(audit?.logs) ? audit.logs.slice(0, 4) : []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-4 text-[#66756B] sm:p-8">Loading dashboard...</div>;
  }

  const credits = Number(data?.creditsCirculated) || 0;
  const attention = [
    {
      href: "/dashboard/gyms",
      label: "Gym applications",
      count: Number(data?.pendingApplications) || 0,
      icon: Dumbbell,
    },
    {
      href: "/dashboard/support",
      label: "Open support tickets",
      count: Number(data?.pendingTickets) || 0,
      icon: LifeBuoy,
    },
    {
      href: "/dashboard/finance",
      label: "Payouts waiting",
      count: Number(data?.pendingPayouts) || 0,
      icon: BadgeDollarSign,
    },
  ];

  const stats: [string, string | number, string][] = [
    ["Total users", data?.totalUsers || 0, ""],
    ["Active (30d)", data?.activeUsers || 0, ""],
    ["Partner gyms", data?.totalPartnerGyms || 0, `${data?.activeGyms || 0} active`],
    ["Active gyms", data?.activeGyms || 0, ""],
    ["Signups today", data?.newSignupsToday || 0, ""],
    ["Memberships today", data?.membershipsSoldToday || 0, ""],
  ];

  return (
    <div className="mx-auto w-full max-w-[1280px] min-w-0 p-4 sm:p-8">
      <div className="mb-6">
        <h1 className="text-[26px] leading-tight text-[#0F2417] min-[900px]:text-[32px]">{greeting()}</h1>
        <p className="mt-1.5 text-[#66756B]">Here is what needs you today.</p>
      </div>

      <div
        className="relative mb-4 overflow-hidden rounded-3xl p-5 text-white min-[900px]:p-6"
        style={{ background: "linear-gradient(160deg, #2B8A4B, #1F7A3F 65%)" }}
      >
        <div className="pointer-events-none absolute -right-14 -top-14 h-48 w-48 rounded-full bg-white/10" />
        <h2 className="relative mb-3 text-[22px]">Needs your attention</h2>
        {attention.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative mt-2 flex w-full items-center gap-3 rounded-2xl bg-white/15 px-3.5 py-3 text-left text-white hover:bg-white/25"
            >
              <Icon size={20} strokeWidth={1.8} />
              <span className="min-w-0 flex-1 font-semibold">{item.label}</span>
              <b className="zf-num text-xl">{item.count}</b>
            </Link>
          );
        })}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3.5 min-[700px]:grid-cols-3 xl:grid-cols-6">
        {stats.map(([label, value, hint]) => (
          <div key={label} className="rounded-[20px] border border-[#E4EAE1] bg-white p-4">
            <span className="text-[11.5px] font-bold uppercase tracking-[0.1em] text-[#66756B]">{label}</span>
            <b className="zf-num mt-2 block text-[28px] leading-none text-[#0F2417] min-[900px]:text-[30px]">{value}</b>
            <small className="mt-1 block min-h-4 text-[12.5px] text-[#66756B]">{hint || "\u00A0"}</small>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-[22px] border border-[#E4EAE1] bg-white p-5">
          <h3 className="mb-3.5 text-lg">Economy</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <span className="text-[11.5px] font-bold uppercase tracking-[0.1em] text-[#66756B]">Credits in circulation</span>
              <b className="zf-num mt-1 block text-4xl leading-none">{inr(credits)}</b>
              <small className="text-[#66756B]">₹{inr(credits * 10)} fitness value</small>
            </div>
            <div>
              <span className="text-[11.5px] font-bold uppercase tracking-[0.1em] text-[#66756B]">Est. CAC</span>
              <b className="zf-num mt-1 block text-4xl leading-none">340</b>
              <small className="text-[#66756B]">Manual estimate</small>
            </div>
            <div>
              <span className="text-[11.5px] font-bold uppercase tracking-[0.1em] text-[#66756B]">Est. LTV</span>
              <b className="zf-num mt-1 block text-4xl leading-none">4,250</b>
              <small className="text-[#66756B]">LTV : CAC = {(4250 / 340).toFixed(1)}x</small>
            </div>
          </div>
          <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-[#FFF4D9] px-4 py-3 text-sm font-medium text-[#8A5A00]">
            <ShieldCheck size={18} className="mt-0.5 shrink-0" />
            <span>
              Credits are liabilities. {inr(credits)} credits in circulation equals up to ₹{inr(credits * 10)} in fitness value.
            </span>
          </div>
        </div>

        <div className="rounded-[22px] border border-[#E4EAE1] bg-white p-5">
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <h3 className="text-lg">Recent activity</h3>
            <Link href="/dashboard/audit" className="text-sm font-bold text-[#1F7A3F]">
              View audit log
            </Link>
          </div>
          {logs.length === 0 ? (
            <p className="py-8 text-center text-[#66756B]">No admin actions recorded yet.</p>
          ) : (
            logs.map((log, index) => (
              <div key={log.id} className={`flex gap-3 py-3.5 ${index ? "border-t border-[#E4EAE1]" : ""}`}>
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#E9F0FB] text-[#2B5FB3]">
                  <ShieldCheck size={18} />
                </div>
                <div className="min-w-0">
                  <b className="block font-semibold">{log.details || log.actionType || "Admin action"}</b>
                  <small className="text-[#66756B]">
                    {log.actionType || "Admin"} · {log.createdAt ? new Date(log.createdAt).toLocaleString("en-IN") : ""}
                  </small>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
