"use client";

import GymGuard from "@/components/GymGuard";
import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function GymDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://localhost:8000/api/gyms/analytics/dashboard", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        const result = await res.json();
        setData(result);
      } catch (err) {
        console.error("Failed to fetch gym dashboard", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  return (
    <GymGuard>
      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-12">
        <h1 className="text-4xl font-bold text-black mb-2">Partner Analytics</h1>
        <p className="text-gray-600 mb-8">
          Welcome to the ZonoFit Gym Partner Dashboard. Track your daily attendance and revenue.
        </p>
        
        {loading ? (
          <div className="text-center py-20 text-gray-500 font-medium animate-pulse">Loading Live Analytics...</div>
        ) : (
          <>
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="glass p-6 rounded-3xl border border-emerald-500/20 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-bl-full" />
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Users Today</h2>
                <div className="text-4xl font-black text-black">{data?.usersToday || 0}</div>
                <div className="text-sm font-semibold text-emerald-600 mt-2">Active visits</div>
              </div>
              <div className="glass p-6 rounded-3xl border border-emerald-500/20 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-bl-full" />
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Credits Today</h2>
                <div className="text-4xl font-black text-black">{data?.creditsToday || 0}</div>
                <div className="text-sm font-semibold text-emerald-600 mt-2">Earned today</div>
              </div>
              <div className="glass p-6 rounded-3xl border border-emerald-500/20 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-bl-full" />
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Sales This Month</h2>
                <div className="text-4xl font-black text-black">₹{data?.salesThisMonth || 0}</div>
                <div className="text-sm font-semibold text-emerald-600 mt-2">Estimated revenue</div>
              </div>
              <div className="glass p-6 rounded-3xl border border-emerald-500/20 shadow-sm relative overflow-hidden bg-primary">
                <h2 className="text-sm font-bold text-emerald-100 uppercase tracking-wider mb-2">Dashboard Status</h2>
                <div className="text-4xl font-black text-white">Live</div>
                <div className="text-sm font-semibold text-emerald-50 mt-2">Connected to network</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Chart Section */}
              <div className="lg:col-span-2 glass p-8 rounded-3xl border border-emerald-500/20 shadow-sm">
                <h2 className="text-xl font-bold text-black mb-6">Weekly Attendance Trend</h2>
                
                {/* Recharts Bar Chart */}
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data?.chartData || []}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      barSize={40}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                      <Tooltip 
                        cursor={{fill: '#f4f9f5'}}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                        itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                      />
                      <Bar dataKey="visits" fill="#10b981" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Side Tables */}
              <div className="space-y-8">
                {/* Recent Check-ins */}
                <div className="glass p-6 rounded-3xl border border-emerald-500/20 shadow-sm">
                  <h2 className="text-lg font-bold text-black mb-4">Just Checked In</h2>
                  <div className="space-y-4">
                    {data?.recentCheckins?.map((user: any, i: number) => (
                      <div key={i} className="flex items-center justify-between pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                        <div>
                          <div className="font-bold text-black text-sm">{user.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{user.time}</div>
                        </div>
                        <div className="text-xs font-bold px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md">
                          {user.plan}
                        </div>
                      </div>
                    ))}
                    {!data?.recentCheckins?.length && (
                      <div className="text-sm text-gray-400">No recent check-ins</div>
                    )}
                  </div>
                </div>

                {/* Upcoming Bookings */}
                <div className="glass p-6 rounded-3xl border border-emerald-500/20 shadow-sm">
                  <h2 className="text-lg font-bold text-black mb-4">Upcoming Bookings</h2>
                  <div className="space-y-4">
                    {data?.upcomingBookings?.map((user: any, i: number) => (
                      <div key={i} className="flex items-center justify-between pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                        <div>
                          <div className="font-bold text-black text-sm">{user.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{user.slot}</div>
                        </div>
                        <div className={`text-xs font-bold px-2 py-1 rounded-md ${
                          user.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {user.status}
                        </div>
                      </div>
                    ))}
                    {!data?.upcomingBookings?.length && (
                      <div className="text-sm text-gray-400">No upcoming bookings</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </GymGuard>
  );
}
