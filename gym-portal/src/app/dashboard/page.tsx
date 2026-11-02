"use client";

import GymGuard from "@/components/GymGuard";
import { FormEvent, useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Users, Tag, CalendarCheck, CheckCircle2, AlertCircle, RotateCcw } from "lucide-react";

type CheckInFeedback = {
  type: "success" | "error" | "info";
  text: string;
  bookingId?: string;
  deskCode?: string;
  memberName?: string;
};

export default function GymDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [passCode, setPassCode] = useState("");
  const [feedback, setFeedback] = useState<CheckInFeedback | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [undoingId, setUndoingId] = useState<string | null>(null);

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

  const confirmVisit = async (event: FormEvent) => {
    event.preventDefault();
    const code = passCode.trim();
    if (!code) return;
    setCheckingIn(true);
    setFeedback(null);
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
      if (!res.ok) {
        setFeedback({
          type: "error",
          text: result.message || "Could not confirm that visit.",
        });
      } else {
        setFeedback({
          type: "success",
          text: result.message || "Visit confirmed.",
          bookingId: result.bookingId,
          deskCode: result.deskCode,
          memberName: result.memberName,
        });
        setPassCode("");
        fetchDashboard();
      }
    } catch {
      setFeedback({ type: "error", text: "Could not reach the server." });
    } finally {
      setCheckingIn(false);
    }
  };

  const undoVisit = async (bookingId: string) => {
    if (!bookingId || undoingId) return;
    setUndoingId(bookingId);
    try {
      const token = localStorage.getItem("zonofit_portal_token");
      const res = await fetch("/api/checkin/undo", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bookingId }),
      });
      const result = await res.json();
      if (!res.ok) {
        setFeedback({
          type: "error",
          text: result.message || "Could not undo that check-in.",
        });
      } else {
        setFeedback({
          type: "info",
          text: result.message || "Check-in undone successfully.",
        });
        fetchDashboard();
      }
    } catch {
      setFeedback({ type: "error", text: "Could not reach the server to undo check-in." });
    } finally {
      setUndoingId(null);
    }
  };

  useEffect(() => {
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
          <p className="text-sm text-gray-500 mb-4">Enter the desk code from the member&apos;s pass, such as ZF-4F2A9C.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={passCode}
              onChange={(event) => setPassCode(event.target.value)}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 uppercase"
              placeholder="ZF-4F2A9C"
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
          {feedback ? (
            <div
              className={`mt-4 p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                feedback.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                  : feedback.type === "error"
                  ? "bg-red-50 border-red-200 text-red-900"
                  : "bg-slate-50 border-slate-200 text-slate-800"
              }`}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                {feedback.type === "success" ? (
                  <CheckCircle2 size={18} className="text-emerald-700 shrink-0 mt-0.5" />
                ) : feedback.type === "error" ? (
                  <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
                ) : (
                  <RotateCcw size={18} className="text-slate-600 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-bold break-words">{feedback.text}</p>
                  {feedback.deskCode ? (
                    <p className="text-xs font-semibold text-emerald-700 mt-0.5">Desk code: {feedback.deskCode}</p>
                  ) : null}
                </div>
              </div>
              {feedback.type === "success" && feedback.bookingId ? (
                <button
                  type="button"
                  onClick={() => undoVisit(feedback.bookingId!)}
                  disabled={undoingId === feedback.bookingId}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 bg-white text-xs font-bold text-red-700 hover:bg-red-50 hover:border-red-300 transition-colors shrink-0 disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  <RotateCcw size={13} />
                  {undoingId === feedback.bookingId ? "Undoing…" : "Undo Check-In"}
                </button>
              ) : null}
            </div>
          ) : null}
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
                      <div key={user.bookingId || i} className="flex items-center justify-between pb-4 border-b border-gray-100 last:border-0 last:pb-0 gap-3">
                        <div className="min-w-0">
                          <div className="font-bold text-gray-900 text-sm truncate">{user.name}</div>
                          <div className="text-[10px] font-medium text-gray-400 mt-0.5 flex items-center gap-1.5">
                            <span>{user.time}</span>
                            {user.deskCode ? <span className="font-semibold text-gray-500">· {user.deskCode}</span> : null}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-[10px] font-bold px-2.5 py-1 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-lg">
                            {user.plan}
                          </div>
                          {user.bookingId ? (
                            <button
                              type="button"
                              onClick={() => undoVisit(user.bookingId)}
                              disabled={undoingId === user.bookingId}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg border border-gray-200 hover:border-red-200 transition-colors disabled:opacity-50 cursor-pointer"
                              title="Undo this check-in"
                            >
                              <RotateCcw size={11} />
                              {undoingId === user.bookingId ? "Undoing…" : "Undo"}
                            </button>
                          ) : null}
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
