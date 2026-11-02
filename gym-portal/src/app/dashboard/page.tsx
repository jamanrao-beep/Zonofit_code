"use client";

import GymGuard from "@/components/GymGuard";
import { FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Users, Tag, CalendarCheck, CheckCircle2, AlertCircle, RotateCcw, X } from "lucide-react";

type RecentCheckin = {
  bookingId: string;
  deskCode: string;
  name: string;
  slot: string;
  visitDay: string;
  checkedInAt: string;
  status: string;
  plan: string;
};

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
  const [openCheckin, setOpenCheckin] = useState<RecentCheckin | null>(null);
  const [cardFrom, setCardFrom] = useState("translate(0px, 12px) scale(0.86)");
  const [cardOpen, setCardOpen] = useState(false);
  const [overlayReady, setOverlayReady] = useState(false);
  const cardPhase = useRef<"closed" | "opening" | "open" | "closing">("closed");
  const closeTimer = useRef<number | null>(null);

  const growFromRow = (row: RecentCheckin, el: HTMLElement) => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    const rect = el.getBoundingClientRect();
    const cardWidth = Math.min(448, window.innerWidth - 32);
    const dx = rect.left + rect.width / 2 - window.innerWidth / 2;
    const dy = rect.top + rect.height / 2 - window.innerHeight / 2;
    const scale = Math.max(0.42, Math.min(0.92, rect.width / cardWidth));
    cardPhase.current = "opening";
    setCardFrom(`translate(${Math.round(dx)}px, ${Math.round(dy)}px) scale(${scale})`);
    setCardOpen(false);
    setOpenCheckin(row);
  };

  const closeCheckin = () => {
    if (!openCheckin || cardPhase.current === "closing" || cardPhase.current === "closed") return;
    cardPhase.current = "closing";
    setCardOpen(false);
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      cardPhase.current = "closed";
      setOpenCheckin(null);
      closeTimer.current = null;
    }, 280);
  };

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
        if (closeTimer.current) {
          window.clearTimeout(closeTimer.current);
          closeTimer.current = null;
        }
        cardPhase.current = "closed";
        setCardOpen(false);
        setOpenCheckin((current) => (current?.bookingId === bookingId ? null : current));
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
    setOverlayReady(true);
  }, []);

  useEffect(() => {
    if (!openCheckin || cardPhase.current !== "opening") return;
    let inner = 0;
    const outer = window.requestAnimationFrame(() => {
      inner = window.requestAnimationFrame(() => {
        if (cardPhase.current !== "opening") return;
        cardPhase.current = "open";
        setCardOpen(true);
      });
    });
    return () => {
      window.cancelAnimationFrame(outer);
      if (inner) window.cancelAnimationFrame(inner);
    };
  }, [openCheckin]);

  useEffect(() => {
    if (!openCheckin) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeCheckin();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
    // closeCheckin reads the latest card phase through a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openCheckin]);

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
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                  <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-700" /> Just Checked In
                  </h2>
                  <div className="space-y-3">
                    {(data?.recentCheckins as RecentCheckin[] | undefined)?.map((user) => (
                      <button
                        key={user.bookingId}
                        type="button"
                        onClick={(event) => growFromRow(user, event.currentTarget)}
                        className="w-full text-left rounded-2xl border border-gray-100 bg-[#F8FBF9] px-3.5 py-3 hover:border-emerald-200 hover:bg-white active:scale-[0.98] transition-all cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-bold text-gray-900 text-sm truncate">{user.name}</div>
                            <div className="text-xs font-semibold text-gray-700 mt-1">{user.slot}</div>
                            <div className="text-[11px] text-gray-500 mt-0.5">
                              {user.visitDay}
                              {user.checkedInAt ? ` · Checked in ${user.checkedInAt}` : user.status === "COMPLETED" ? " · Hour ended" : ""}
                            </div>
                          </div>
                          <div className="shrink-0 rounded-xl bg-white border border-[#D7EADF] px-2.5 py-1.5 text-right">
                            <div className="text-[9px] font-bold tracking-wider text-[#1F7A3E]">DESK</div>
                            <div className="text-xs font-black tracking-wide text-gray-950 font-mono">{user.deskCode}</div>
                          </div>
                        </div>
                      </button>
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
                    {data?.upcomingBookings?.map((user: { name: string; slot: string; when?: string; status: string }, i: number) => (
                      <div key={`${user.name}-${user.slot}-${i}`} className="flex items-center justify-between pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                        <div>
                          <div className="font-bold text-gray-900 text-sm">{user.name}</div>
                          <div className="text-xs font-semibold text-gray-700 mt-1">{user.slot}</div>
                          {user.when ? <div className="text-[11px] text-gray-400 mt-0.5">{user.when}</div> : null}
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
      {overlayReady && openCheckin
        ? createPortal(
            <div
              className="fixed inset-0 z-[80] flex items-center justify-center p-4"
              onClick={closeCheckin}
              role="presentation"
            >
              <div
                className="absolute inset-0 bg-slate-950/50"
                style={{
                  opacity: cardOpen ? 1 : 0,
                  transition: "opacity 220ms ease",
                }}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-label={`${openCheckin.name} check-in`}
                className="relative z-10 w-full max-w-md rounded-[28px] bg-white shadow-2xl border border-white p-6"
                style={{
                  transform: cardOpen ? "translate(0px, 0px) scale(1)" : cardFrom,
                  opacity: cardOpen ? 1 : 0.92,
                  transition: "transform 340ms cubic-bezier(0.16, 1, 0.3, 1), opacity 220ms ease",
                }}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold tracking-[0.14em] text-[#1F7A3E]">JUST CHECKED IN</p>
                    <h3 className="text-2xl font-black text-gray-950 mt-1 truncate">{openCheckin.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{openCheckin.plan}</p>
                  </div>
                  <button
                    type="button"
                    onClick={closeCheckin}
                    className="w-9 h-9 shrink-0 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 flex items-center justify-center cursor-pointer"
                    aria-label="Close"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="mt-5 rounded-2xl bg-[#F4FBF6] border border-[#D7EADF] px-4 py-6 text-center">
                  <p className="text-[11px] font-bold tracking-[0.18em] text-[#1F7A3E]">DESK CODE</p>
                  <p className="mt-3 text-4xl font-black tracking-[0.22em] text-gray-950 font-mono">
                    {openCheckin.deskCode || "—"}
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 px-3.5 py-3.5">
                    <p className="text-[10px] font-bold tracking-wider text-gray-400">VISIT HOUR</p>
                    <p className="text-sm font-bold text-gray-900 mt-1">{openCheckin.slot}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{openCheckin.visitDay}</p>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 px-3.5 py-3.5">
                    <p className="text-[10px] font-bold tracking-wider text-gray-400">CHECKED IN</p>
                    <p className="text-sm font-bold text-gray-900 mt-1">{openCheckin.checkedInAt || "Not stamped"}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{openCheckin.status === "COMPLETED" ? "Hour ended" : "At the gym"}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => undoVisit(openCheckin.bookingId)}
                  disabled={undoingId === openCheckin.bookingId}
                  className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white py-3 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-50 cursor-pointer"
                >
                  <RotateCcw size={15} />
                  {undoingId === openCheckin.bookingId ? "Undoing…" : "Undo this check-in"}
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </GymGuard>
  );
}
