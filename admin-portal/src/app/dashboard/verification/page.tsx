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

export default function VerificationCheckPage() {
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedGymId, setSelectedGymId] = useState<string>("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchGyms = async () => {
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
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGyms();
  }, []);

  const selectedGym = useMemo(
    () => gyms.find((g) => g.id === selectedGymId) || gyms[0],
    [gyms, selectedGymId]
  );

  const filteredGyms = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return gyms;
    return gyms.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.city.toLowerCase().includes(q) ||
        g.address.toLowerCase().includes(q)
    );
  }, [gyms, search]);

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
    <div className="space-y-8 pb-16">
      {/* ─── Top Header ─── */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckSquare className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Verification Check
            </h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Control whether partner gyms require physical QR verification or
            automatically check in members upon slot arrival.
          </p>
        </div>

        <button
          onClick={fetchGyms}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh Gyms
        </button>
      </div>

      {/* ─── Toast Notification ─── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white shadow-xl">
          <Check className="h-4 w-4 text-emerald-400" />
          {toastMessage}
        </div>
      )}

      {/* ─── Policy Explainer Banner ─── */}
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="space-y-3">
            <h3 className="text-base font-bold text-emerald-950">
              How the Verification System Works
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

      {/* ─── Active Gym Selector Card ─── */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">
          Gym Verification Control
        </h2>
        <p className="mt-0.5 text-xs text-gray-500">
          Select any partner gym to view or switch its verification system.
        </p>

        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">
            Loading gyms...
          </div>
        ) : gyms.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">
            No partner gyms found.
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {/* Gym Selector Dropdown */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">
                Select Partner Gym
              </label>
              <select
                value={selectedGymId}
                onChange={(e) => setSelectedGymId(e.target.value)}
                className="mt-2 block w-full rounded-2xl border border-gray-200 bg-gray-50/60 px-4 py-3 text-sm font-semibold text-gray-900 shadow-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
              >
                {gyms.map((gym) => (
                  <option key={gym.id} value={gym.id}>
                    {gym.name} — {gym.city} (
                    {gym.requiresVerification ? "Verification ON" : "Verification OFF (Auto)"}
                    )
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Gym Card */}
            {selectedGym && (
              <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-6">
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                  {/* Gym Details */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-gray-900">
                        {selectedGym.name}
                      </h3>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                        {selectedGym.city}
                      </span>
                      <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                        {selectedGym.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      <span>{selectedGym.address}</span>
                    </div>
                    {selectedGym.contactPhone && (
                      <p className="text-xs text-gray-500">
                        Phone: {selectedGym.contactPhone}
                      </p>
                    )}
                  </div>

                  {/* Toggle Control Area */}
                  <div className="flex flex-col items-start gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:items-end">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                        Verification System
                      </span>

                      {/* Switch Button */}
                      <button
                        type="button"
                        disabled={updatingId === selectedGym.id}
                        onClick={() =>
                          handleToggleVerification(
                            selectedGym.id,
                            Boolean(selectedGym.requiresVerification)
                          )
                        }
                        className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          selectedGym.requiresVerification
                            ? "bg-emerald-600"
                            : "bg-gray-300"
                        } ${updatingId === selectedGym.id ? "opacity-50" : ""}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            selectedGym.requiresVerification
                              ? "translate-x-7"
                              : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {selectedGym.requiresVerification ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                          <ShieldCheck className="h-4 w-4" />
                          ON — QR Verification Required
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-600">
                          <Check className="h-4 w-4 text-emerald-600" />
                          OFF — Auto Check-In on Slot Time
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* State explanation banner */}
                <div className="mt-5 rounded-xl border border-gray-200 bg-white p-4 text-xs text-gray-600">
                  {selectedGym.requiresVerification ? (
                    <p>
                      🔒 <strong>Strict Verification is ON for {selectedGym.name}:</strong>{" "}
                      Members visiting this gym must have their QR pass code
                      verified at the front desk. If not verified by slot end,
                      the visit is logged as Missed.
                    </p>
                  ) : (
                    <p>
                      ⚡ <strong>Auto Check-In is ACTIVE for {selectedGym.name}:</strong>{" "}
                      Members booking here are automatically counted as checked in
                      once the slot time arrives. Settlement / sales values are
                      credited directly without needing staff verification.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── All Partner Gyms Overview Table ─── */}
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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
  );
}
