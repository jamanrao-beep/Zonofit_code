"use client";

import { useEffect, useState, useMemo } from "react";
import {
  CheckSquare,
  Search,
  ShieldCheck,
  ShieldAlert,
  Building2,
  MapPin,
  Check,
  X,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Phone,
  MessageSquare,
  AlertTriangle,
  User as UserIcon,
  Clock,
  CheckCircle,
  Copy,
  Calendar,
} from "lucide-react";

interface Gym {
  id: string;
  name: string;
  city: string;
  address: string;
  category: string;
  contactPhone?: string;
  isVerified: boolean;
  isActive: boolean;
  requiresVerification?: boolean;
  _count?: {
    bookings: number;
  };
}

interface LocationAlertItem {
  id: string;
  userId: string;
  gymId: string;
  distanceMeters: number;
  status: "FLAGGED" | "CONTACTED" | "RESOLVED";
  detectedAt: string;
  adminNotes?: string | null;
  user: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
    dob?: string | null;
    membership?: {
      status: string;
      plan?: { name: string } | null;
    } | null;
  };
  gym: {
    id: string;
    name: string;
    city: string;
    address: string;
    contactPhone?: string | null;
  };
}

function formatIndianPhone(phone: string | null | undefined): string {
  if (!phone) return "Not provided";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return phone;
}

export default function VerificationCheckPage() {
  const [activeTab, setActiveTab] = useState<"location_presence" | "gym_qr">("location_presence");

  // ─── Location & Presence Verification State ───
  const [alerts, setAlerts] = useState<LocationAlertItem[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [alertStatusFilter, setAlertStatusFilter] = useState<"ALL" | "FLAGGED" | "CONTACTED" | "RESOLVED">("ALL");
  const [alertSearch, setAlertSearch] = useState("");
  const [alertPagination, setAlertPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [alertCounts, setAlertCounts] = useState({ ALL: 0, FLAGGED: 0, CONTACTED: 0, RESOLVED: 0 });
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);

  // ─── Gym QR Settings State ───
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [gymsLoading, setGymsLoading] = useState(true);
  const [gymSearch, setGymSearch] = useState("");
  const [selectedGymId, setSelectedGymId] = useState<string>("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const copyPhone = (phone: string, id: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhoneId(id);
    setTimeout(() => setCopiedPhoneId(null), 2000);
  };

  // Fetch Location Alerts
  const fetchLocationAlerts = async (page = 1, status = alertStatusFilter, search = alertSearch) => {
    setAlertsLoading(true);
    try {
      const token = localStorage.getItem("zonofit_portal_token");
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
        ...(status !== "ALL" ? { status } : {}),
        ...(search.trim() ? { search: search.trim() } : {}),
      });

      const res = await fetch(`/api/admin/location-alerts?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setAlerts(data.alerts || []);
      if (data.pagination) setAlertPagination(data.pagination);
      if (data.counts) setAlertCounts(data.counts);
    } catch (err) {
      console.error("Failed to fetch location alerts:", err);
    } finally {
      setAlertsLoading(false);
    }
  };

  const handleUpdateAlertStatus = async (alertId: string, status: "FLAGGED" | "CONTACTED" | "RESOLVED") => {
    const token = localStorage.getItem("zonofit_portal_token");
    try {
      const res = await fetch(`/api/admin/location-alerts/${alertId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      showToast(`Alert marked as ${status}`);
      fetchLocationAlerts(alertPagination.page, alertStatusFilter, alertSearch);
    } catch (err) {
      console.error(err);
      alert("Failed to update alert status.");
    }
  };

  // Fetch Gyms
  const fetchGyms = async () => {
    setGymsLoading(true);
    try {
      const token = localStorage.getItem("zonofit_portal_token");
      const res = await fetch("/api/admin/gyms", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const list: Gym[] = data.gyms || [];
      setGyms(list);
      if (list.length > 0 && !selectedGymId) {
        setSelectedGymId(list[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch gyms:", err);
    } finally {
      setGymsLoading(false);
    }
  };

  useEffect(() => {
    fetchLocationAlerts(1, alertStatusFilter, alertSearch);
  }, [alertStatusFilter]);

  useEffect(() => {
    fetchGyms();
  }, []);

  const selectedGym = useMemo(
    () => gyms.find((g) => g.id === selectedGymId) || gyms[0],
    [gyms, selectedGymId]
  );

  const filteredGyms = useMemo(() => {
    const q = gymSearch.trim().toLowerCase();
    if (!q) return gyms;
    return gyms.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.city.toLowerCase().includes(q) ||
        g.address.toLowerCase().includes(q)
    );
  }, [gyms, gymSearch]);

  const handleToggleVerification = async (gymId: string, currentVal: boolean) => {
    const newVal = !currentVal;
    setUpdatingId(gymId);
    const token = localStorage.getItem("zonofit_portal_token");
    try {
      const res = await fetch(`/api/admin/gyms/${gymId}/verification`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requiresVerification: newVal }),
      });
      if (!res.ok) throw new Error("Failed to update");

      setGyms((prev) =>
        prev.map((g) =>
          g.id === gymId ? { ...g, requiresVerification: newVal } : g
        )
      );
      showToast(
        newVal
          ? "Verification check turned ON (QR required)"
          : "Verification check turned OFF (Auto check-in)"
      );
    } catch (err) {
      console.error(err);
      alert("Failed to update verification setting.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-8 pb-16 max-w-7xl mx-auto">
      {/* ─── Top Header ─── */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-gray-900">
                Verification & Geofence Control
              </h1>
              <p className="text-xs text-gray-500">
                Verify physical presence at partner gyms, detect unbooked visits, and configure QR pass requirements.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-gray-100 p-1 rounded-2xl border border-gray-200 self-start md:self-auto">
          <button
            onClick={() => setActiveTab("location_presence")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "location_presence"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-black"
            }`}
          >
            <MapPin size={14} className={activeTab === "location_presence" ? "text-red-500" : "text-gray-400"} />
            <span>Location & Presence Alerts</span>
            {alertCounts.FLAGGED > 0 && (
              <span className="px-1.5 py-0.2 bg-red-600 text-white rounded-full text-[10px] font-black ml-1">
                {alertCounts.FLAGGED}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("gym_qr")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "gym_qr"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-black"
            }`}
          >
            <CheckSquare size={14} className={activeTab === "gym_qr" ? "text-emerald-600" : "text-gray-400"} />
            <span>Gym Check-In QR Policies</span>
          </button>
        </div>
      </div>

      {/* ─── Toast Notification ─── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white shadow-xl animate-fade-in">
          <Check className="h-4 w-4 text-emerald-400" />
          {toastMessage}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 1: LOCATION & UNBOOKED PRESENCE VERIFICATION */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "location_presence" && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 font-semibold uppercase">Total Alerts</span>
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                  {alertCounts.ALL}
                </div>
              </div>
              <div className="text-2xl font-black text-gray-900 mt-2">{alertCounts.ALL}</div>
              <span className="text-[11px] text-gray-400 mt-0.5 block">Geofence pings logged</span>
            </div>

            <div className="p-5 rounded-2xl bg-red-50/60 border border-red-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-red-700 font-bold uppercase">Unbooked Flagged</span>
                <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold">
                  <AlertTriangle size={16} />
                </div>
              </div>
              <div className="text-2xl font-black text-red-700 mt-2">{alertCounts.FLAGGED}</div>
              <span className="text-[11px] text-red-600 font-medium mt-0.5 block">
                At gym location without active booking
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-blue-50/60 border border-blue-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-blue-700 font-bold uppercase">Contacted / Auditing</span>
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                  <Phone size={16} />
                </div>
              </div>
              <div className="text-2xl font-black text-blue-700 mt-2">{alertCounts.CONTACTED}</div>
              <span className="text-[11px] text-blue-600 font-medium mt-0.5 block">
                Member phone reached for verification
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-emerald-700 font-bold uppercase">Resolved Audits</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <CheckCircle size={16} />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-700 mt-2">{alertCounts.RESOLVED}</div>
              <span className="text-[11px] text-emerald-600 font-medium mt-0.5 block">
                Investigated and cleared
              </span>
            </div>
          </div>

          {/* Explanation Banner */}
          <div className="p-5 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <MapPin size={18} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">How Location Verification Works</h3>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  When a member's mobile device enters within <strong>150 meters</strong> of any ZonoFit partner gym, the system automatically checks if they have a confirmed booking for today. If no active booking exists, a <strong>Flagged Presence Alert</strong> is logged with their phone number, so admins can immediately call the member to ensure compliance with gym credit usage.
                </p>
              </div>
            </div>

            <button
              onClick={() => fetchLocationAlerts(1, alertStatusFilter, alertSearch)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 border border-slate-700"
            >
              <RefreshCw size={14} />
              <span>Refresh Pings</span>
            </button>
          </div>

          {/* Filters & Search */}
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex flex-wrap gap-2">
                {(["ALL", "FLAGGED", "CONTACTED", "RESOLVED"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setAlertStatusFilter(st);
                      setAlertPagination((p) => ({ ...p, page: 1 }));
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      alertStatusFilter === st
                        ? "bg-black text-white shadow-sm"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {st === "ALL" ? "All Alerts" : st}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                <input
                  type="text"
                  placeholder="Search member, phone, gym..."
                  value={alertSearch}
                  onChange={(e) => {
                    setAlertSearch(e.target.value);
                    fetchLocationAlerts(1, alertStatusFilter, e.target.value);
                  }}
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>

            {/* Alerts Table */}
            {alertsLoading ? (
              <div className="py-16 text-center text-gray-500 font-medium">
                <div className="w-7 h-7 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Loading geofence presence alerts...
              </div>
            ) : alerts.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                <CheckCircle size={32} className="text-emerald-500 mx-auto mb-2" />
                <p className="font-bold text-gray-900 text-sm">No Location Alerts Detected</p>
                <p className="text-xs text-gray-500 mt-1">All members at gyms have active confirmed bookings.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse min-w-[850px]">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wider font-semibold">
                      <th className="pb-3 pl-2">Flagged Member</th>
                      <th className="pb-3">Contact Number</th>
                      <th className="pb-3">Partner Gym</th>
                      <th className="pb-3">Detected Distance</th>
                      <th className="pb-3">Detection Time</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 pr-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {alerts.map((al) => {
                      const formattedPhone = formatIndianPhone(al.user.phone);

                      return (
                        <tr key={al.id} className="hover:bg-slate-50/70 transition-colors">
                          {/* Member */}
                          <td className="py-4 pl-2">
                            <div className="flex items-center gap-3">
                              {al.user.avatarUrl ? (
                                <img
                                  src={al.user.avatarUrl}
                                  alt={al.user.name}
                                  className="w-9 h-9 rounded-full object-cover border border-gray-200"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs">
                                  {al.user.name.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <span className="font-bold text-gray-900 block">{al.user.name}</span>
                                <span className="text-[11px] text-gray-500 font-mono">
                                  {al.user.membership?.plan?.name || "No Plan"} • {al.user.membership?.status || "INACTIVE"}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Contact Number */}
                          <td className="py-4">
                            {al.user.phone ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
                                  <Phone size={13} className="text-emerald-600 shrink-0" />
                                  <a href={`tel:${al.user.phone}`} className="hover:underline">
                                    {formattedPhone}
                                  </a>
                                  <button
                                    onClick={() => copyPhone(al.user.phone!, al.id)}
                                    className="p-1 text-gray-400 hover:text-gray-700"
                                    title="Copy Phone"
                                  >
                                    {copiedPhoneId === al.id ? (
                                      <Check size={12} className="text-emerald-600" />
                                    ) : (
                                      <Copy size={12} />
                                    )}
                                  </button>
                                </div>
                                <div className="flex items-center gap-2">
                                  <a
                                    href={`tel:${al.user.phone}`}
                                    className="text-[11px] text-emerald-700 font-semibold hover:underline"
                                  >
                                    Direct Call
                                  </a>
                                  <span className="text-gray-300">•</span>
                                  <a
                                    href={`https://wa.me/91${al.user.phone.replace(/\D/g, "")}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[11px] text-emerald-600 font-semibold hover:underline flex items-center gap-0.5"
                                  >
                                    WhatsApp
                                  </a>
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">No phone</span>
                            )}
                          </td>

                          {/* Partner Gym */}
                          <td className="py-4">
                            <div className="font-bold text-gray-900 text-xs">{al.gym.name}</div>
                            <div className="text-[11px] text-gray-500">{al.gym.city}</div>
                          </td>

                          {/* Detected Distance */}
                          <td className="py-4">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
                              <MapPin size={12} className="text-amber-600" />
                              <span>{al.distanceMeters}m away</span>
                            </div>
                            <span className="block text-[10px] text-red-600 font-bold mt-1">
                              NO ACTIVE BOOKING
                            </span>
                          </td>

                          {/* Time */}
                          <td className="py-4">
                            <span className="text-xs text-gray-700 font-medium block">
                              {new Date(al.detectedAt).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                              })}
                            </span>
                            <span className="text-[11px] text-gray-400">
                              {new Date(al.detectedAt).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-4">
                            <span
                              className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                                al.status === "RESOLVED"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : al.status === "CONTACTED"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {al.status}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-4 pr-2 text-right">
                            <div className="flex justify-end items-center gap-1.5">
                              {al.status !== "CONTACTED" && (
                                <button
                                  onClick={() => handleUpdateAlertStatus(al.id, "CONTACTED")}
                                  className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-colors"
                                >
                                  Mark Contacted
                                </button>
                              )}
                              {al.status !== "RESOLVED" && (
                                <button
                                  onClick={() => handleUpdateAlertStatus(al.id, "RESOLVED")}
                                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition-colors"
                                >
                                  Resolve
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 2: GYM CHECK-IN QR POLICIES (EXISTING) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "gym_qr" && (
        <div className="space-y-6">
          {/* Policy Explainer Banner */}
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="space-y-3">
                <h3 className="text-base font-bold text-emerald-950">
                  How Partner Verification Check-In Works
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-emerald-200/60 bg-white/90 p-4">
                    <div className="flex items-center gap-2 font-bold text-gray-900">
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-gray-400"></span>
                      Verification OFF (Default)
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-gray-600">
                      No staff scanning required. When a member books and their
                      slot time arrives, they are <strong>directly checked in</strong>.
                      Sales and settlement values increase automatically. The visit
                      will <strong>never</strong> be marked as Missed.
                    </p>
                  </div>

                  <div className="rounded-xl border border-emerald-200/60 bg-white/90 p-4">
                    <div className="flex items-center gap-2 font-bold text-emerald-800">
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-600"></span>
                      Verification ON (Strict QR Pass)
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-gray-600">
                      Member must present their QR pass at the front desk. Staff
                      must verify it via the portal. If the slot passes without staff
                      verification, the booking is recorded as <strong>Missed (No-Show)</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* All Partner Gyms Overview Table */}
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  All Partner Gyms
                </h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  Quickly toggle verification on or off across any partner gym.
                </p>
              </div>

              <div className="relative w-full md:w-72">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={gymSearch}
                  onChange={(e) => setGymSearch(e.target.value)}
                  placeholder="Search by gym name or city..."
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50/60 py-2.5 pl-10 pr-4 text-xs font-medium text-gray-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-gray-100">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-gray-100 bg-gray-50/80 text-xs font-bold uppercase tracking-wider text-gray-500">
                    <tr>
                      <th className="py-3.5 pl-6 pr-4">Gym Name & City</th>
                      <th className="py-3.5 px-4">Address</th>
                      <th className="py-3.5 px-4">Category</th>
                      <th className="py-3.5 px-4 text-center">Verification Mode</th>
                      <th className="py-3.5 pl-4 pr-6 text-right">Toggle Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredGyms.map((gym) => {
                      const isReq = Boolean(gym.requiresVerification);
                      return (
                        <tr
                          key={gym.id}
                          className="transition hover:bg-gray-50/50"
                        >
                          <td className="py-4 pl-6 pr-4">
                            <div className="font-bold text-gray-900">{gym.name}</div>
                            <div className="mt-0.5 text-xs text-emerald-700 font-semibold">
                              {gym.city}
                            </div>
                          </td>

                          <td className="py-4 px-4 text-xs text-gray-500 max-w-xs truncate">
                            {gym.address}
                          </td>

                          <td className="py-4 px-4">
                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-700">
                              {gym.category}
                            </span>
                          </td>

                          <td className="py-4 px-4 text-center">
                            {isReq ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                QR Required (ON)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                                Auto Check-In (OFF)
                              </span>
                            )}
                          </td>

                          <td className="py-4 pl-4 pr-6 text-right">
                            <button
                              type="button"
                              disabled={updatingId === gym.id}
                              onClick={() => handleToggleVerification(gym.id, isReq)}
                              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition shadow-sm ${
                                isReq
                                  ? "border-emerald-600 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                              } ${updatingId === gym.id ? "opacity-50" : ""}`}
                            >
                              {isReq ? "Turn OFF" : "Turn ON"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredGyms.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-xs text-gray-400">
                          No gyms match your search query.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
