"use client";

import GymGuard from "@/components/GymGuard";
import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AnalyticsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const token = localStorage.getItem("zonofit_portal_token");
        const res = await fetch("/api/gyms/analytics/performance", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const result = await res.json();
        if (result.chartData) setData(result.chartData);
      } catch (err) {
        console.error("Failed to fetch analytics", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  return (
    <GymGuard>
      <div className="max-w-6xl mx-auto w-full px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">Performance Analytics</h1>
          <p className="text-gray-600">
            Deep dive into your conversion rates and member growth.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400 font-medium">Loading Analytics...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
              <h2 className="text-lg font-bold text-black mb-1">New Member Growth</h2>
              <p className="text-sm text-gray-500 mb-6">Users who visited for the first time</p>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                    />
                    <Area type="monotone" dataKey="newMembers" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorNew)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
              <h2 className="text-lg font-bold text-black mb-1">Retention Rate</h2>
              <p className="text-sm text-gray-500 mb-6">Percentage of returning users</p>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRet" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} domain={[60, 100]} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                    />
                    <Area type="monotone" dataKey="retention" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRet)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <h2 className="text-lg font-bold text-black mb-4">Key Insights</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-2xl">
              <div className="text-sm font-bold text-gray-500 uppercase mb-1">Peak Hours</div>
              <div className="text-xl font-bold text-black">06:00 PM - 08:00 PM</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-2xl">
              <div className="text-sm font-bold text-gray-500 uppercase mb-1">Busiest Day</div>
              <div className="text-xl font-bold text-black">Saturday</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-2xl">
              <div className="text-sm font-bold text-gray-500 uppercase mb-1">Avg. Visit Duration</div>
              <div className="text-xl font-bold text-black">1h 15m</div>
            </div>
          </div>
        </div>
      </div>
    </GymGuard>
  );
}
