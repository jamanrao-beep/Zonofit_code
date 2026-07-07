"use client";

import { useEffect, useState } from "react";
import { Users, Building2, CreditCard, Activity, TrendingUp, AlertCircle, Dumbbell } from "lucide-react";

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
    return <div className="p-8 text-gray-500 font-medium">Loading Founder Dashboard...</div>;
  }

  const statCards = [
    { label: "Total Users", value: data?.totalUsers || 0, icon: <Users size={24} className="text-blue-500" /> },
    { label: "Active Users (30d)", value: data?.activeUsers || 0, icon: <Activity size={24} className="text-emerald-500" /> },
    { label: "Total Partner Gyms", value: data?.totalPartnerGyms || 0, icon: <Building2 size={24} className="text-indigo-500" /> },
    { label: "Active Gyms", value: data?.activeGyms || 0, icon: <Dumbbell size={24} className="text-purple-500" /> },
    { label: "Signups Today", value: data?.newSignupsToday || 0, icon: <TrendingUp size={24} className="text-orange-500" /> },
    { label: "Memberships Sold (Today)", value: data?.membershipsSoldToday || 0, icon: <CreditCard size={24} className="text-pink-500" /> },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-black mb-2">Founder Dashboard</h1>
        <p className="text-gray-600">The health of the entire marketplace in 15 seconds.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
              {stat.icon}
            </div>
            <div className="text-3xl font-black text-black mb-1">{stat.value}</div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <h2 className="text-xl font-bold text-black mb-6 flex items-center gap-2">
            <Activity className="text-emerald-500" />
            Marketplace Economics
          </h2>
          <div className="space-y-6">
            <div>
              <div className="text-sm font-bold text-gray-500 mb-1">Total Credits in Circulation</div>
              <div className="text-4xl font-black text-black">{data?.creditsCirculated?.toLocaleString() || 0}</div>
              <div className="text-sm text-gray-400 mt-1">≈ ₹{(data?.creditsCirculated * 10 || 0).toLocaleString()} potential fitness value</div>
            </div>
            
            {/* MVP Mocks as requested by user */}
            <div className="grid grid-cols-2 gap-6 pt-6 border-t border-gray-100">
              <div>
                <div className="text-sm font-bold text-gray-500 mb-1">Est. CAC</div>
                <div className="text-2xl font-bold text-black">₹340</div>
              </div>
              <div>
                <div className="text-sm font-bold text-gray-500 mb-1">Est. LTV</div>
                <div className="text-2xl font-bold text-emerald-600">₹4,250</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <h2 className="text-xl font-bold text-black mb-6 flex items-center gap-2">
            <AlertCircle className="text-orange-500" />
            Action Required
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-orange-50 rounded-2xl border border-orange-100">
              <div>
                <div className="font-bold text-orange-900">New Gym Applications</div>
                <div className="text-sm text-orange-700">Review and approve partner gyms</div>
              </div>
              <div className="text-2xl font-black text-orange-600">{data?.recentGymSignups?.length || 0}</div>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-red-50 rounded-2xl border border-red-100">
              <div>
                <div className="font-bold text-red-900">Support Tickets</div>
                <div className="text-sm text-red-700">Unresolved critical issues</div>
              </div>
              <div className="text-2xl font-black text-red-600">3</div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-200">
              <div>
                <div className="font-bold text-gray-900">Pending Payouts</div>
                <div className="text-sm text-gray-600">Gym settlements to release</div>
              </div>
              <div className="text-2xl font-black text-black">12</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
