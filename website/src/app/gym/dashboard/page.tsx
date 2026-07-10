"use client";

import GymGuard from "@/components/GymGuard";
import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { QrCode, X, Activity, Users, Tag, CalendarCheck } from "lucide-react";

export default function GymDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);

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
            <h1 className="text-4xl font-bold text-foreground mb-2">Partner Analytics</h1>
            <p className="text-muted">
              Welcome to the ZonoFit Gym Partner Dashboard. Track your daily attendance and revenue.
            </p>
          </div>
          {data?.gymId && (
            <button 
              onClick={() => setShowQR(true)}
              className="bg-brand-lime hover:bg-[#c9f04c] text-background px-6 py-3 rounded-2xl font-bold transition-transform hover:scale-105 flex items-center gap-2 neon-glow-sm"
            >
              <QrCode size={18} /> Show Check-In QR
            </button>
          )}
        </div>
        
        {/* QR Modal */}
        {showQR && data?.gymId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-surface rounded-[32px] p-8 max-w-sm w-full shadow-2xl relative text-center border border-secondary soft-shadow-lg">
              <button 
                onClick={() => setShowQR(false)}
                className="absolute top-4 right-4 text-muted hover:text-foreground transition-colors w-8 h-8 flex items-center justify-center rounded-full bg-background"
              >
                <X size={20} />
              </button>
              <div className="w-12 h-1.5 rounded-full bg-secondary mx-auto mb-6" />
              
              <h3 className="text-2xl font-bold text-foreground mb-2">Gym Check-In</h3>
              <p className="text-muted text-sm mb-8">Users can scan this QR code with their ZonoFit app to check in to your gym.</p>
              
              <div className="bg-background border border-secondary rounded-3xl p-6 flex justify-center mb-6 shadow-inner">
                {/* Using a free public QR API for simplicity without installing dependencies */}
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=zonofit:checkin:${data.gymId}`} 
                  alt="Check-In QR Code"
                  width={200}
                  height={200}
                  className="rounded-xl mix-blend-multiply"
                />
              </div>
              
              <div className="text-xs font-mono font-medium text-muted bg-background p-4 rounded-xl border border-secondary break-all">
                ID: {data.gymId}
              </div>
            </div>
          </div>
        )}
        
        {loading ? (
          <div className="text-center py-20 text-muted font-medium animate-pulse">Loading Live Analytics...</div>
        ) : (
          <>
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-surface p-6 rounded-3xl border border-secondary soft-shadow relative overflow-hidden transition-transform hover:-translate-y-1">
                <div className="absolute top-0 right-0 w-24 h-24 bg-brand-green/5 rounded-bl-[64px]" />
                <h2 className="text-[10px] font-bold text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Users size={14} className="text-brand-green" /> Users Today
                </h2>
                <div className="text-4xl font-black text-foreground">{data?.usersToday || 0}</div>
                <div className="text-sm font-bold text-brand-green mt-2 px-3 py-1 bg-brand-green/10 rounded-xl inline-block">Active visits</div>
              </div>
              
              <div className="bg-surface p-6 rounded-3xl border border-secondary soft-shadow relative overflow-hidden transition-transform hover:-translate-y-1">
                <div className="absolute top-0 right-0 w-24 h-24 bg-brand-lime/10 rounded-bl-[64px]" />
                <h2 className="text-[10px] font-bold text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Tag size={14} className="text-brand-lime" /> Credits Today
                </h2>
                <div className="text-4xl font-black text-foreground">{data?.creditsToday || 0}</div>
                <div className="text-sm font-bold text-brand-lime mt-2 px-3 py-1 bg-brand-lime/20 text-[#7a991a] rounded-xl inline-block">Earned today</div>
              </div>
              
              <div className="bg-surface p-6 rounded-3xl border border-secondary soft-shadow relative overflow-hidden transition-transform hover:-translate-y-1">
                <div className="absolute top-0 right-0 w-24 h-24 bg-brand-green/5 rounded-bl-[64px]" />
                <h2 className="text-[10px] font-bold text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Activity size={14} className="text-brand-green" /> Sales This Month
                </h2>
                <div className="text-4xl font-black text-foreground">₹{data?.salesThisMonth || 0}</div>
                <div className="text-sm font-bold text-brand-green mt-2 px-3 py-1 bg-brand-green/10 rounded-xl inline-block">Estimated revenue</div>
              </div>
              
              {/* Dark container for Dashboard Status */}
              <div className="bg-brand-green p-6 rounded-3xl border border-brand-green/80 emerald-glow relative overflow-hidden transition-transform hover:-translate-y-1">
                <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/5 rounded-full" />
                <h2 className="text-[10px] font-bold text-white/70 uppercase tracking-wider mb-3">Dashboard Status</h2>
                <div className="text-4xl font-black text-white">Live</div>
                <div className="text-sm font-bold text-brand-lime mt-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-brand-lime animate-pulse" /> Connected to network
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Chart Section */}
              <div className="lg:col-span-2 bg-surface p-8 rounded-3xl border border-secondary soft-shadow">
                <h2 className="text-xl font-bold text-foreground mb-6">Weekly Attendance Trend</h2>
                
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
                <div className="bg-surface p-6 rounded-3xl border border-secondary soft-shadow relative overflow-hidden">
                  <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    <QrCode size={18} className="text-brand-green" /> Just Checked In
                  </h2>
                  <div className="space-y-4">
                    {data?.recentCheckins?.map((user: any, i: number) => (
                      <div key={i} className="flex items-center justify-between pb-4 border-b border-secondary last:border-0 last:pb-0">
                        <div>
                          <div className="font-bold text-foreground text-sm">{user.name}</div>
                          <div className="text-[10px] font-medium text-muted mt-0.5">{user.time}</div>
                        </div>
                        <div className="text-[10px] font-bold px-2.5 py-1 bg-brand-green/10 border border-brand-green/20 text-brand-green rounded-lg">
                          {user.plan}
                        </div>
                      </div>
                    ))}
                    {!data?.recentCheckins?.length && (
                      <div className="text-sm font-medium text-muted py-4 text-center bg-background rounded-2xl border border-secondary border-dashed">
                        No recent check-ins
                      </div>
                    )}
                  </div>
                </div>

                {/* Upcoming Bookings */}
                <div className="bg-surface p-6 rounded-3xl border border-secondary soft-shadow relative overflow-hidden">
                  <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    <CalendarCheck size={18} className="text-brand-amber" /> Upcoming Bookings
                  </h2>
                  <div className="space-y-4">
                    {data?.upcomingBookings?.map((user: any, i: number) => (
                      <div key={i} className="flex items-center justify-between pb-4 border-b border-secondary last:border-0 last:pb-0">
                        <div>
                          <div className="font-bold text-foreground text-sm">{user.name}</div>
                          <div className="text-[10px] font-medium text-muted mt-0.5">{user.slot}</div>
                        </div>
                        <div className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${
                          user.status === 'CONFIRMED' 
                            ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' 
                            : 'bg-brand-amber/10 text-amber-600 border-brand-amber/20'
                        }`}>
                          {user.status}
                        </div>
                      </div>
                    ))}
                    {!data?.upcomingBookings?.length && (
                      <div className="text-sm font-medium text-muted py-4 text-center bg-background rounded-2xl border border-secondary border-dashed">
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
