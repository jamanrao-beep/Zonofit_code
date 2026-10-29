"use client";

import GymGuard from "@/components/GymGuard";
import { FormEvent, useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Users, Tag, CalendarCheck, CheckCircle2 } from "lucide-react";

export default function GymDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [passCode, setPassCode] = useState("");
  const [checkInMessage, setCheckInMessage] = useState("");
  const [checkingIn, setCheckingIn] = useState(false);

  const confirmVisit = async (event: FormEvent) => {
    event.preventDefault();
    const code = passCode.trim();
    if (!code) return;
    setCheckingIn(true);
    setCheckInMessage("");
    try {
      const token = localStorage.getItem("zonofit_portal_token");
      const res = await fetch("/api/checkin/staff", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ passCode: code }),
      });
      const result = await res.json();
      setCheckInMessage(result.message || "Could not confirm that visit.");
      if (res.ok) setPassCode("");
    } catch {
      setCheckInMessage("Could not reach the server.");
    } finally {
      setCheckingIn(false);
    }
  };

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem("zonofit_portal_token");
        const res = await fetch("/api/gyms/analytics/dashboard", {
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
      <div className="flex-1 w-full relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Partner Analytics</h1>
            <p className="text-gray-500 text-sm">
              Welcome to the ZonoFit Gym Partner Dashboard. Track your daily attendance, members, and revenue.
            </p>
          </div>
        </div>

        <form onSubmit={confirmVisit} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Confirm a visit</h2>
          <p className="text-sm text-gray-500 mb-4">Enter the pass code from the member&apos;s booking.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={passCode}
              onChange={(event) => setPassCode(event.target.value)}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
              placeholder="Pass code"
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={checkingIn || !passCode.trim()}
              className="bg-emerald-700 text-white rounded-xl px-5 py-3 font-semibold disabled:opacity-50"
            >
              {checkingIn ? "Checking..." : "Confirm"}
            </button>
          </div>
          {checkInMessage ? <p className="text-sm mt-3 text-gray-700">{checkInMessage}</p> : null}
        </form>
        
        {loading ? (
          <div className="text-center py-20 text-gray-400 font-medium animate-pulse">Loading Live Analytics...</div>
        ) : (
          <>
            {/* Quick Stats Grid - Clean, Premium & Subtle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Users size={14} className="text-emerald-700" /> Users Today
                </h2>
                <div className="text-3xl md:text-4xl font-black text-gray-900">{data?.usersToday || 0}</div>
                <div className="text-xs font-bold text-emerald-800 mt-3 px-2.5 py-1 bg-emerald-50 border border-emerald-100 rounded-lg inline-block">
                  Active visits
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Tag size={14} className="text-emerald-700" /> Credits Today
                </h2>
                <div className="text-3xl md:text-4xl font-black text-gray-900">{data?.creditsToday || 0}</div>
                <div className="text-xs font-bold text-emerald-800 mt-3 px-2.5 py-1 bg-emerald-50 border border-emerald-100 rounded-lg inline-block">
                  Earned today
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Activity size={14} className="text-emerald-700" /> Sales This Month
                </h2>
                <div className="text-3xl md:text-4xl font-black text-gray-900">₹{data?.salesThisMonth || 0}</div>
                <div className="text-xs font-bold text-emerald-800 mt-3 px-2.5 py-1 bg-emerald-50 border border-emerald-100 rounded-lg inline-block">
                  Estimated revenue
                </div>
              </div>
              
              {/* Refined Dashboard Status Card - Slate Dark with Subtle Emerald Indicator */}
              <div className="bg-[#0F172A] p-6 rounded-3xl border border-slate-800 shadow-sm relative overflow-hidden text-white transition-all hover:shadow-md">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Dashboard Status</h2>
                <div className="text-3xl md:text-4xl font-black text-white">Live</div>
                <div className="text-xs font-bold text-emerald-400 mt-3 flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/15 border border-emerald-500/30 rounded-lg w-fit">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Connected to network
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Chart Section */}
              <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Weekly Attendance Trend</h2>
                
                {/* Recharts Bar Chart */}
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data?.chartData || []}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      barSize={40}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5EA" />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#8E8E93', fontSize: 12, fontWeight: 600}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#8E8E93', fontSize: 12, fontWeight: 600}} />
                      <Tooltip 
                        cursor={{fill: '#F2F2F7'}}
                        contentStyle={{ borderRadius: '16px', border: '1px solid #E5E5EA', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontWeight: 'bold' }}
                        itemStyle={{ color: '#0B6E4F' }}
                      />
                      <Bar dataKey="visits" fill="#0B6E4F" radius={[12, 12, 4, 4]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Side Tables */}
              <div className="space-y-8">
                {/* Recent Check-ins */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                  <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-700" /> Just Checked In
                  </h2>
                  <div className="space-y-4">
                    {data?.recentCheckins?.map((user: any, i: number) => (
                      <div key={i} className="flex items-center justify-between pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                        <div>
                          <div className="font-bold text-gray-900 text-sm">{user.name}</div>
                          <div className="text-[10px] font-medium text-gray-400 mt-0.5">{user.time}</div>
                        </div>
                        <div className="text-[10px] font-bold px-2.5 py-1 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-lg">
                          {user.plan}
                        </div>
                      </div>
                    ))}
                    {!data?.recentCheckins?.length && (
                      <div className="text-sm font-medium text-gray-400 py-6 text-center bg-gray-50/50 rounded-2xl border border-gray-100 border-dashed">
                        No recent check-ins
                      </div>
                    )}
                  </div>
                </div>

                {/* Upcoming Bookings */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                  <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <CalendarCheck size={18} className="text-amber-600" /> Upcoming Bookings
                  </h2>
                  <div className="space-y-4">
                    {data?.upcomingBookings?.map((user: any, i: number) => (
                      <div key={i} className="flex items-center justify-between pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                        <div>
                          <div className="font-bold text-gray-900 text-sm">{user.name}</div>
                          <div className="text-[10px] font-medium text-gray-400 mt-0.5">{user.slot}</div>
                        </div>
                        <div className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${
                          user.status === 'CONFIRMED' 
                            ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' 
                            : 'bg-amber-500/10 text-amber-700 border-amber-500/20'
                        }`}>
                          {user.status}
                        </div>
                      </div>
                    ))}
                    {!data?.upcomingBookings?.length && (
                      <div className="text-sm font-medium text-gray-400 py-6 text-center bg-gray-50/50 rounded-2xl border border-gray-100 border-dashed">
                        No upcoming bookings
                      </div>
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
