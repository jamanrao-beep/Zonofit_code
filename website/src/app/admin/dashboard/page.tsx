"use client";

import AdminGuard from "@/components/AdminGuard";
import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://localhost:8000/api/admin/dashboard", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        const result = await res.json();
        setData(result);
      } catch (err) {
        console.error("Failed to fetch admin dashboard", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  return (
    <AdminGuard>
      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-12">
        <h1 className="text-4xl font-bold text-black mb-2">Platform Administration</h1>
        <p className="text-gray-600 mb-8">
          Welcome to the ZonoFit Admin Dashboard. Monitor platform growth and manage network activity.
        </p>
        
        {loading ? (
          <div className="text-center py-20 text-gray-500 font-medium animate-pulse">Loading Live Analytics...</div>
        ) : (
          <>
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="glass p-6 rounded-3xl border border-emerald-500/20 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-bl-full" />
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Total Users</h2>
                <div className="text-4xl font-black text-black">{data?.totalUsers || 0}</div>
                <div className="text-sm font-semibold text-emerald-600 mt-2">Active network</div>
              </div>
              <div className="glass p-6 rounded-3xl border border-emerald-500/20 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-bl-full" />
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Active Gyms</h2>
                <div className="text-4xl font-black text-black">{data?.activeGyms || 0}</div>
                <div className="text-sm font-semibold text-emerald-600 mt-2">Verified partners</div>
              </div>
              <div className="glass p-6 rounded-3xl border border-emerald-500/20 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-bl-full" />
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Credits Circulated</h2>
                <div className="text-4xl font-black text-black">{data?.creditsCirculated || 0}</div>
                <div className="text-sm font-semibold text-emerald-600 mt-2">Active economy</div>
              </div>
              <div className="glass p-6 rounded-3xl border border-emerald-500/20 shadow-sm relative overflow-hidden bg-gray-900">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">System Status</h2>
                <div className="text-4xl font-black text-white">Online</div>
                <div className="text-sm font-semibold text-emerald-400 mt-2">All services operational</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Chart Section */}
              <div className="lg:col-span-2 glass p-8 rounded-3xl border border-emerald-500/20 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-black">Platform Growth (Users)</h2>
                  <div className="flex gap-4">
                    <span className="text-xs font-bold px-3 py-1 bg-gray-100 rounded-full">Monthly</span>
                  </div>
                </div>
                
                {/* Recharts Area Chart */}
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={data?.chartData || []}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                        itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                      />
                      <Area type="monotone" dataKey="users" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Side Tables */}
              <div className="space-y-8">
                {/* Recent Gym Signups */}
                <div className="glass p-6 rounded-3xl border border-emerald-500/20 shadow-sm">
                  <h2 className="text-lg font-bold text-black mb-4">New Partner Gyms</h2>
                  <div className="space-y-4">
                    {data?.recentGymSignups?.map((gym: any, i: number) => (
                      <div key={i} className="flex items-center justify-between pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                        <div>
                          <div className="font-bold text-black text-sm">{gym.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{gym.city}</div>
                        </div>
                        <div className={`text-xs font-bold px-2 py-1 rounded-md ${
                          gym.status === 'Verified' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {gym.status}
                        </div>
                      </div>
                    ))}
                    {!data?.recentGymSignups?.length && (
                      <div className="text-sm text-gray-400">No recent gyms</div>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="glass p-6 rounded-3xl border border-emerald-500/20 shadow-sm">
                  <h2 className="text-lg font-bold text-black mb-4">Quick Actions</h2>
                  <div className="space-y-3">
                    <button className="w-full bg-emerald-50 text-emerald-700 font-bold text-sm py-3 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition">
                      Review Pending Gyms
                    </button>
                    <button className="w-full bg-gray-50 text-gray-700 font-bold text-sm py-3 rounded-xl border border-gray-200 hover:bg-gray-100 transition">
                      Manage Credit Pricing
                    </button>
                    <button className="w-full bg-gray-50 text-gray-700 font-bold text-sm py-3 rounded-xl border border-gray-200 hover:bg-gray-100 transition">
                      System Settings
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminGuard>
  );
}
