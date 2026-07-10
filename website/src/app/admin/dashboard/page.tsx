"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Building2, CreditCard, Activity, TrendingUp, AlertCircle, Dumbbell, ShieldAlert, BadgeDollarSign } from "lucide-react";

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem("zonofit_portal_token");
        const res = await fetch("/api/admin/dashboard", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return <div className="p-8 text-muted font-medium">Loading Founder Dashboard...</div>;
  }

  const statCards = [
    { label: "Total Users", value: data?.totalUsers || 0, icon: <Users size={24} className="text-blue-500" /> },
    { label: "Active Users (30d)", value: data?.activeUsers || 0, icon: <Activity size={24} className="text-brand-green" /> },
    { label: "Total Partner Gyms", value: data?.totalPartnerGyms || 0, icon: <Building2 size={24} className="text-indigo-500" /> },
    { label: "Active Gyms", value: data?.activeGyms || 0, icon: <Dumbbell size={24} className="text-purple-500" /> },
    { label: "Signups Today", value: data?.newSignupsToday || 0, icon: <TrendingUp size={24} className="text-brand-lime" /> },
    { label: "Memberships Sold (Today)", value: data?.membershipsSoldToday || 0, icon: <CreditCard size={24} className="text-pink-500" /> },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Founder Dashboard</h1>
        <p className="text-muted">The health of the entire marketplace in 15 seconds.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-surface p-6 rounded-3xl border border-secondary soft-shadow flex flex-col items-center text-center transition-transform hover:-translate-y-1">
            <div className="w-12 h-12 bg-background rounded-2xl flex items-center justify-center mb-4 border border-secondary">
              {stat.icon}
            </div>
            <div className="text-3xl font-black text-foreground mb-1">{stat.value}</div>
            <div className="text-[10px] font-bold text-muted uppercase tracking-wider">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-surface p-8 rounded-3xl border border-secondary soft-shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-green opacity-5 rounded-bl-full" />
          
          <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
            <Activity className="text-brand-green" />
            Marketplace Economics
          </h2>
          <div className="space-y-6">
            <div>
              <div className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Total Credits in Circulation</div>
              <div className="text-5xl font-black text-foreground">{data?.creditsCirculated?.toLocaleString() || 0}</div>
              <div className="text-sm font-medium text-brand-green mt-2 px-3 py-1 bg-brand-green/10 border border-brand-green/20 rounded-xl inline-block">
                ≈ ₹{(data?.creditsCirculated * 10 || 0).toLocaleString()} potential fitness value
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-6 pt-6 border-t border-secondary">
              <div>
                <div className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Est. CAC</div>
                <div className="text-2xl font-black text-foreground">₹340</div>
              </div>
              <div>
                <div className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Est. LTV</div>
                <div className="text-2xl font-black text-brand-green">₹4,250</div>
              </div>
            </div>
          </div>
        </div>

        {/* High Contrast Container for Action Required */}
        <div className="bg-surface-dark p-8 rounded-3xl border border-secondary-dark soft-shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-coral opacity-10 rounded-bl-full" />
          
          <h2 className="text-xl font-bold text-text-light mb-6 flex items-center gap-2">
            <AlertCircle className="text-brand-coral" />
            Action Required
          </h2>
          
          <div className="space-y-4">
            <Link href="/admin/dashboard/gyms" className="flex items-center justify-between p-4 bg-brand-coral/10 rounded-2xl border border-brand-coral/20 hover:bg-brand-coral/20 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-coral/20 flex items-center justify-center border border-brand-coral/30">
                  <ShieldAlert size={18} className="text-brand-coral" />
                </div>
                <div>
                  <div className="font-bold text-text-light">New Gym Applications</div>
                  <div className="text-sm text-brand-coral/80 mt-0.5">Review and approve partner gyms</div>
                </div>
              </div>
              <div className="text-2xl font-black text-brand-coral group-hover:scale-110 transition-transform">{data?.pendingApplications || 0}</div>
            </Link>
            
            <Link href="/admin/dashboard/support" className="flex items-center justify-between p-4 bg-red-500/10 rounded-2xl border border-red-500/20 hover:bg-red-500/20 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center border border-red-500/30">
                  <AlertCircle size={18} className="text-red-400" />
                </div>
                <div>
                  <div className="font-bold text-text-light">Support Tickets</div>
                  <div className="text-sm text-red-400/80 mt-0.5">Unresolved critical issues</div>
                </div>
              </div>
              <div className="text-2xl font-black text-red-400 group-hover:scale-110 transition-transform">{data?.pendingTickets || 0}</div>
            </Link>

            <Link href="/admin/dashboard/finance" className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                  <BadgeDollarSign size={18} className="text-brand-lime" />
                </div>
                <div>
                  <div className="font-bold text-text-light">Pending Payouts</div>
                  <div className="text-sm text-muted mt-0.5">Gym settlements to release</div>
                </div>
              </div>
              <div className="text-2xl font-black text-brand-lime group-hover:scale-110 transition-transform">{data?.pendingPayouts || 0}</div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
