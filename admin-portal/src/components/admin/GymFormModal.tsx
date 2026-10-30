"use client";

import { useState } from "react";
import { X, Plus, Trash2, Shield, Eye, Building2, MapPin, Clock, DollarSign, Layers, Image as ImageIcon } from "lucide-react";

interface GymFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any; // For edit mode
}

const AVAILABLE_FACILITIES = [
  "Strength Training",
  "Cardio",
  "CrossFit",
  "Steam Room",
  "Sauna",
  "Shower",
  "Locker Room",
  "Air Conditioning",
  "Personal Trainer",
  "Yoga",
  "Boxing",
  "Free Parking",
  "Nutrition Cafe"
];

const DEFAULT_SLOTS = [
  { slotId: "1", startTime: "06:00 AM", endTime: "07:00 AM", capacity: 8, isEnabled: true },
  { slotId: "2", startTime: "07:00 AM", endTime: "08:00 AM", capacity: 10, isEnabled: true },
  { slotId: "3", startTime: "08:00 AM", endTime: "09:00 AM", capacity: 10, isEnabled: true },
  { slotId: "4", startTime: "05:00 PM", endTime: "06:00 PM", capacity: 8, isEnabled: true },
  { slotId: "5", startTime: "06:00 PM", endTime: "07:00 PM", capacity: 10, isEnabled: true },
  { slotId: "6", startTime: "07:00 PM", endTime: "08:00 PM", capacity: 8, isEnabled: true },
];

export default function GymFormModal({ isOpen, onClose, onSuccess, initialData }: GymFormModalProps) {
  const isEdit = !!initialData?.id;

  // Internal Admin Fields (* star marked)
  const [customGymId, setCustomGymId] = useState(initialData?.customGymId || "");
  const [ownerName, setOwnerName] = useState(initialData?.ownerName || "");
  const [ownerEmail, setOwnerEmail] = useState(initialData?.owner?.email || initialData?.contactEmail || "");
  const [ownerPassword, setOwnerPassword] = useState("");
  const storedBank = (() => {
    const raw = initialData?.bankDetails || initialData?.bankDetailsJson;
    if (!raw) return {};
    if (typeof raw === "string") {
      try { return JSON.parse(raw); } catch { return {}; }
    }
    return raw;
  })();
  const [bankDetails, setBankDetails] = useState({
    accountHolder: storedBank.accountHolder || "",
    bankName: storedBank.bankName || "",
    accountNumber: storedBank.accountNumber || "",
    ifsc: storedBank.ifsc || "",
    upiId: storedBank.upiId || "",
  });

  // Exclusive Visit Capping Model: "DAILY_TOTAL" or "PER_SLOT" (Never overlap)
  const [cappingMode, setCappingMode] = useState<"DAILY_TOTAL" | "PER_SLOT">(
    initialData?.cappingMode === "PER_SLOT" ? "PER_SLOT" : "DAILY_TOTAL"
  );
  const [maxDailyVisits, setMaxDailyVisits] = useState(initialData?.maxDailyVisits || 25);
  const [maxSlotVisits, setMaxSlotVisits] = useState(initialData?.maxSlotVisits || 5);

  // Exclusive Payout Model: "COMMISSION_PERCENTAGE" or "FIXED_PER_VISIT" (Never overlap)
  const [payoutModel, setPayoutModel] = useState<"COMMISSION_PERCENTAGE" | "FIXED_PER_VISIT">(
    initialData?.payoutModel === "FIXED_PER_VISIT" ? "FIXED_PER_VISIT" : "COMMISSION_PERCENTAGE"
  );
  const [payoutCommissionRate, setPayoutCommissionRate] = useState(initialData?.payoutCommissionRate || 20);
  const [payoutFixedPerVisit, setPayoutFixedPerVisit] = useState(initialData?.payoutFixedPerVisit || 80);
  const [paymentCycle, setPaymentCycle] = useState(initialData?.paymentCycle || "WEEKLY");

  // GST & Invoice (* internal)
  const [isGstRegistered, setIsGstRegistered] = useState(initialData?.isGstRegistered || false);
  const [gstNumber, setGstNumber] = useState(initialData?.gstNumber || "");
  const [invoicePrefix, setInvoicePrefix] = useState(initialData?.invoicePrefix || "INV-ZF-");

  // Public Gym Fields (Displayed to User)
  const [name, setName] = useState(initialData?.name || "");
  const [address, setAddress] = useState(initialData?.address || "");
  const [city, setCity] = useState(initialData?.city || "Mumbai");
  const [state, setState] = useState(initialData?.state || "Maharashtra");
  const [landmark, setLandmark] = useState(initialData?.landmark || "");
  const [googleMapsUrl, setGoogleMapsUrl] = useState(initialData?.googleMapsUrl || "");
  const [lat, setLat] = useState(initialData?.lat || 18.5204);
  const [lng, setLng] = useState(initialData?.lng || 73.8567);
  const [contactPhone, setContactPhone] = useState(initialData?.contactPhone || "");
  const [monthlyPrice, setMonthlyPrice] = useState(initialData?.monthlyPrice || 3000);
  const [weekdayHours, setWeekdayHours] = useState(initialData?.weekdayHours || "06:00 AM - 10:00 PM");
  const [weekendHours, setWeekendHours] = useState(initialData?.weekendHours || "07:00 AM - 08:00 PM");

  // Facilities
  const [facilities, setFacilities] = useState<string[]>(
    initialData?.facilities || ["Strength Training", "Cardio", "Locker Room", "Air Conditioning"]
  );

  // Slots
  const [slots, setSlots] = useState<any[]>(() => {
    const raw = initialData?.slotsJson;
    if (!raw) return DEFAULT_SLOTS;
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_SLOTS;
    } catch {
      return DEFAULT_SLOTS;
    }
  });

  // Images
  const [logoUrl, setLogoUrl] = useState(initialData?.logoUrl || "");
  const [exteriorImageUrl, setExteriorImageUrl] = useState(initialData?.exteriorImageUrl || "");
  const [interiorImageUrls, setInteriorImageUrls] = useState<string[]>(
    initialData?.interiorImageUrls?.length ? initialData.interiorImageUrls : ["", ""]
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const toggleFacility = (facility: string) => {
    if (facilities.includes(facility)) {
      setFacilities(facilities.filter(f => f !== facility));
    } else {
      setFacilities([...facilities, facility]);
    }
  };

  const addSlot = () => {
    setSlots([
      ...slots,
      {
        slotId: String(Date.now()),
        startTime: "09:00 AM",
        endTime: "10:00 AM",
        capacity: cappingMode === "PER_SLOT" ? Number(maxSlotVisits) : 8,
        isEnabled: true
      }
    ]);
  };

  const removeSlot = (index: number) => {
    setSlots(slots.filter((_, i) => i !== index));
  };

  const updateSlot = (index: number, field: string, value: any) => {
    const updated = [...slots];
    updated[index] = { ...updated[index], [field]: value };
    setSlots(updated);
  };

  const addInteriorUrl = () => {
    if (interiorImageUrls.length < 6) {
      setInteriorImageUrls([...interiorImageUrls, ""]);
    }
  };

  const removeInteriorUrl = (index: number) => {
    setInteriorImageUrls(interiorImageUrls.filter((_, i) => i !== index));
  };

  const updateInteriorUrl = (index: number, val: string) => {
    const updated = [...interiorImageUrls];
    updated[index] = val;
    setInteriorImageUrls(updated);
  };

  // PRD v2.0 Formula Calculations
  const numericPrice = Number(monthlyPrice) || 3000;
  const derivedVisitRateU = Math.round((numericPrice / 25) * 100) / 100;
  const derivedGymPayoutG = Math.round(((numericPrice / 30) * 0.8) * 100) / 100;
  const derivedCredits = Math.round(derivedVisitRateU / 10);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Gym Name is required");
      return;
    }
    if (!address.trim()) {
      setError("Full Address is required");
      return;
    }
    if (!ownerEmail.trim() || !/^\S+@\S+\.\S+$/.test(ownerEmail.trim())) {
      setError("Owner email is required. This is the login you give the gym.");
      return;
    }
    const needsNewPassword = !isEdit || !initialData?.owner?.id;
    if (needsNewPassword && ownerPassword.length < 8) {
      setError("Set an owner password of at least 8 characters. You will give it to the gym.");
      return;
    }
    if (ownerPassword && (ownerPassword.length < 8 || ownerPassword.length > 72)) {
      setError("Owner password must be 8 to 72 characters.");
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("zonofit_portal_token");
      const url = isEdit ? `/api/admin/gyms/${initialData.id}` : "/api/admin/gyms";
      const method = isEdit ? "PUT" : "POST";

      const payload = {
        // Internal Admin (* star)
        customGymId: customGymId.trim() || undefined,
        ownerName: ownerName.trim() || undefined,
        ownerEmail: ownerEmail.trim().toLowerCase(),
        ownerPassword: ownerPassword || undefined,
        bankDetails,
        cappingMode,
        maxDailyVisits: cappingMode === "DAILY_TOTAL" ? Number(maxDailyVisits) : null,
        maxSlotVisits: cappingMode === "PER_SLOT" ? Number(maxSlotVisits) : null,
        payoutModel,
        payoutCommissionRate: payoutModel === "COMMISSION_PERCENTAGE" ? Number(payoutCommissionRate) : null,
        payoutFixedPerVisit: payoutModel === "FIXED_PER_VISIT" ? Number(payoutFixedPerVisit) : null,
        paymentCycle,
        isGstRegistered,
        gstNumber: isGstRegistered ? gstNumber.trim() : null,
        invoicePrefix: invoicePrefix.trim() || null,

        // Public Facing (Displayed to user)
        name: name.trim(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        landmark: landmark.trim() || null,
        googleMapsUrl: googleMapsUrl.trim() || null,
        lat: Number(lat) || 18.5204,
        lng: Number(lng) || 73.8567,
        contactPhone: contactPhone.trim() || null,
        monthlyPrice: numericPrice,
        weekdayHours: weekdayHours.trim(),
        weekendHours: weekendHours.trim(),
        facilities,
        slots,
        logoUrl: logoUrl.trim() || null,
        exteriorImageUrl: exteriorImageUrl.trim() || null,
        interiorImageUrls: interiorImageUrls.map(u => u.trim()).filter(Boolean),
        isVerified: true,
        isActive: true,
      };

      const res = await fetch(url, {
        method,
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const resJson = await res.json();
      if (!res.ok) {
        throw new Error(resJson.message || "Failed to save gym profile");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-gray-100 my-8 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-slate-50/80 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold">
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {isEdit ? "Edit Partner Gym" : "Add New Partner Gym"}
              </h2>
              <p className="text-xs text-gray-500">
                Fields marked with <span className="text-amber-700 font-semibold">* (Internal)</span> are strictly visible to Admin only.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-8 overflow-y-auto flex-1">
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
              {error}
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* SECTION 1: INTERNAL ADMIN CONTROLS (* Starred Fields) */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-6 border border-slate-800 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-amber-400" />
                <h3 className="font-bold text-base text-white">
                  Internal Admin Configuration (* Strictly Admin Only)
                </h3>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg">
                Hidden from Public App
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* * Gym ID */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  * Gym ID (Unique Partner Identifier)
                </label>
                <input
                  type="text"
                  placeholder="e.g. ZONO-001 (Leave empty to auto-generate)"
                  value={customGymId}
                  onChange={(e) => setCustomGymId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              {/* * Owner Name */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  * Owner / Authorized Person Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Vikramaditya Sharma"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  * Owner login email
                </label>
                <input
                  type="email"
                  required
                  placeholder="owner@gym.com"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  * Owner login password
                </label>
                <input
                  type="text"
                  autoComplete="new-password"
                  placeholder={isEdit ? "Leave blank to keep the current password" : "At least 8 characters"}
                  value={ownerPassword}
                  onChange={(e) => setOwnerPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-400 -mt-2">
              Give this email and password to the gym owner. They sign in on the gym portal, then enter the code sent to that inbox.
            </p>

            {/* * Visit Capping Model: Mutually Exclusive (NO overlap) */}
            <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-bold text-slate-200 uppercase flex items-center gap-1.5">
                  * ZonoFit Visit Capping Model (Non-Overlapping)
                </label>
                {/* Mode Selector Tabs */}
                <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setCappingMode("DAILY_TOTAL")}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                      cappingMode === "DAILY_TOTAL"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Daily Total Capped
                  </button>
                  <button
                    type="button"
                    onClick={() => setCappingMode("PER_SLOT")}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                      cappingMode === "PER_SLOT"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Per Slot Capped
                  </button>
                </div>
              </div>

              {cappingMode === "DAILY_TOTAL" ? (
                <div>
                  <div className="text-[11px] text-slate-400 mb-2">
                    Active Mode: <strong>Max Daily ZonoFit Visits</strong>. Per-slot capping is disabled.
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="1"
                      max="500"
                      value={maxDailyVisits}
                      onChange={(e) => setMaxDailyVisits(Number(e.target.value))}
                      className="w-40 px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-xs text-slate-300 font-medium">Max visits allowed per day across all slots</span>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-[11px] text-slate-400 mb-2">
                    Active Mode: <strong>Capped Per Slot</strong>. Daily total limit is disabled.
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={maxSlotVisits}
                      onChange={(e) => setMaxSlotVisits(Number(e.target.value))}
                      className="w-40 px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-xs text-slate-300 font-medium">Max visits allowed in each individual time slot</span>
                  </div>
                </div>
              )}
            </div>

            {/* * Payout Model: Mutually Exclusive (NO overlap) */}
            <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-bold text-slate-200 uppercase flex items-center gap-1.5">
                  * Partner Payout Settlement Model (Non-Overlapping)
                </label>
                <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setPayoutModel("COMMISSION_PERCENTAGE")}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                      payoutModel === "COMMISSION_PERCENTAGE"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Commission %
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayoutModel("FIXED_PER_VISIT")}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                      payoutModel === "FIXED_PER_VISIT"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Fixed ₹ Per Visit
                  </button>
                </div>
              </div>

              {payoutModel === "COMMISSION_PERCENTAGE" ? (
                <div>
                  <div className="text-[11px] text-slate-400 mb-2">
                    Active Mode: <strong>ZonoFit Commission %</strong> (Gym receives remaining share). Fixed payout is disabled.
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      value={payoutCommissionRate}
                      onChange={(e) => setPayoutCommissionRate(Number(e.target.value))}
                      className="w-32 px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-xs text-slate-300 font-medium">
                      % Commission (Gym receives {(100 - (Number(payoutCommissionRate) || 0)).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-[11px] text-slate-400 mb-2">
                    Active Mode: <strong>Fixed ₹ Payout Per Visit</strong>. Commission % is disabled.
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="1"
                      value={payoutFixedPerVisit}
                      onChange={(e) => setPayoutFixedPerVisit(Number(e.target.value))}
                      className="w-32 px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-xs text-slate-300 font-medium">
                      ₹ flat payout to gym per verified visit (PRD v2.0 Formula G default: ₹{derivedGymPayoutG})
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* * Payment Cycle & Bank/UPI */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  * Payment Cycle
                </label>
                <select
                  value={paymentCycle}
                  onChange={(e) => setPaymentCycle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="WEEKLY">Weekly (Every Monday)</option>
                  <option value="BI_WEEKLY">Bi-Weekly (1st & 16th)</option>
                  <option value="MONTHLY">Monthly (1st of Month)</option>
                  <option value="48_HOURS">Rolling 48 Hours Settlement</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  * Bank UPI ID (Fast Payouts)
                </label>
                <input
                  type="text"
                  placeholder="e.g. gymname@okaxis"
                  value={bankDetails.upiId}
                  onChange={(e) => setBankDetails({ ...bankDetails, upiId: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Bank Account Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  * Account Holder Name
                </label>
                <input
                  type="text"
                  placeholder="As per bank passbook"
                  value={bankDetails.accountHolder}
                  onChange={(e) => setBankDetails({ ...bankDetails, accountHolder: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  * Account Number
                </label>
                <input
                  type="text"
                  placeholder="Bank A/C number"
                  value={bankDetails.accountNumber}
                  onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  * IFSC Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. HDFC0001234"
                  value={bankDetails.ifsc}
                  onChange={(e) => setBankDetails({ ...bankDetails, ifsc: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase font-mono"
                />
              </div>
            </div>

            {/* * GST & Invoicing */}
            <div className="pt-2 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isGstRegistered}
                  onChange={(e) => setIsGstRegistered(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 bg-slate-800 border-slate-700"
                />
                <span className="text-xs font-bold text-slate-200 uppercase">
                  * GST Registered Gym
                </span>
              </label>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  * GSTIN Number
                </label>
                <input
                  type="text"
                  disabled={!isGstRegistered}
                  placeholder="e.g. 27AAAAA0000A1Z5"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase disabled:opacity-40 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  * Invoice Prefix
                </label>
                <input
                  type="text"
                  placeholder="e.g. INV-ZF-"
                  value={invoicePrefix}
                  onChange={(e) => setInvoicePrefix(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* SECTION 2: PUBLIC PROFILE (Displayed to App Users) */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <Eye size={18} className="text-emerald-700" />
              <h3 className="font-bold text-base text-gray-900">
                Public Gym Profile (Displayed to App Users)
              </h3>
            </div>

            {/* Gym Name & Monthly Cost */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                  Gym Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PowerHouse Elite Fitness"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-black font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                  Monthly Membership Cost (M) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-gray-500 text-sm">₹</span>
                  <input
                    type="number"
                    min="500"
                    step="50"
                    value={monthlyPrice}
                    onChange={(e) => setMonthlyPrice(Number(e.target.value))}
                    className="w-full pl-8 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm font-black focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                {/* Real-time PRD v2.0 Indicator */}
                <div className="text-[11px] text-emerald-800 mt-1 font-medium bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                  U = M/25: <strong>₹{derivedVisitRateU}</strong> ({derivedCredits} Cr) &bull; G = 80%: <strong>₹{derivedGymPayoutG}</strong>
                </div>
              </div>
            </div>

            {/* Address, Landmark & City */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                  Full Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Shop 101, 1st Floor, Fitness Avenue"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                  Landmark
                </label>
                <input
                  type="text"
                  placeholder="Near Metro Station"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                  City
                </label>
                <input
                  type="text"
                  placeholder="Mumbai / Pune"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-black font-medium"
                />
              </div>
            </div>

            {/* Google Maps Link & Contact Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                  Google Maps Link
                </label>
                <input
                  type="url"
                  placeholder="https://maps.google.com/?q=..."
                  value={googleMapsUrl}
                  onChange={(e) => setGoogleMapsUrl(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-black font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                  Contact Number
                </label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>

            {/* Weekday & Weekend Hours */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                  Weekday Hours (Mon - Fri)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 06:00 AM - 10:00 PM"
                  value={weekdayHours}
                  onChange={(e) => setWeekdayHours(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                  Weekend Hours (Sat - Sun)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 07:00 AM - 08:00 PM (or Closed on Sundays)"
                  value={weekendHours}
                  onChange={(e) => setWeekendHours(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>

            {/* Facilities Selection */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
                Available Facilities ({facilities.length} selected)
              </label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_FACILITIES.map((facility) => {
                  const isSelected = facilities.includes(facility);
                  return (
                    <button
                      key={facility}
                      type="button"
                      onClick={() => toggleFacility(facility)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                        isSelected
                          ? "bg-emerald-700 text-white border-emerald-700 shadow-sm"
                          : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      {isSelected ? "✓ " : "+ "}
                      {facility}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Slots / Booking Management */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gray-900 uppercase">
                    Slots / Booking Schedule ({slots.length} Slots)
                  </h4>
                  <p className="text-[11px] text-gray-500">
                    Define active time blocks and user booking capacity.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addSlot}
                  className="px-3 py-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
                >
                  <Plus size={14} /> Add Slot
                </button>
              </div>

              <div className="space-y-2">
                {slots.map((slot, index) => (
                  <div key={slot.slotId || index} className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-xl border border-gray-200">
                    <input
                      type="text"
                      value={slot.startTime}
                      onChange={(e) => updateSlot(index, "startTime", e.target.value)}
                      placeholder="Start Time"
                      className="w-28 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-medium"
                    />
                    <span className="text-xs text-gray-400">to</span>
                    <input
                      type="text"
                      value={slot.endTime}
                      onChange={(e) => updateSlot(index, "endTime", e.target.value)}
                      placeholder="End Time"
                      className="w-28 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-medium"
                    />
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-gray-500 font-bold uppercase">Cap:</span>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={slot.capacity}
                        onChange={(e) => updateSlot(index, "capacity", Number(e.target.value))}
                        className="w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-xs font-bold"
                      />
                    </div>
                    <label className="flex items-center gap-1.5 cursor-pointer ml-auto text-xs text-gray-600 font-medium">
                      <input
                        type="checkbox"
                        checked={slot.isEnabled}
                        onChange={(e) => updateSlot(index, "isEnabled", e.target.checked)}
                        className="rounded text-emerald-600"
                      />
                      Active
                    </label>
                    <button
                      type="button"
                      onClick={() => removeSlot(index)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Image Links (Logo, Exterior, Interior) */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-gray-900 uppercase pb-1 border-b border-gray-100 flex items-center gap-1.5">
                <ImageIcon size={14} className="text-emerald-700" /> Image Links (Logo, Exterior, Interior)
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                    Gym Logo URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/... (Logo)"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                    Exterior Photo URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/... (Exterior front)"
                    value={exteriorImageUrl}
                    onChange={(e) => setExteriorImageUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Interior Image URLs (2-4 links) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-gray-600 uppercase">
                    Interior Photos ({interiorImageUrls.length} photos)
                  </label>
                  {interiorImageUrls.length < 6 && (
                    <button
                      type="button"
                      onClick={addInteriorUrl}
                      className="text-xs text-emerald-700 font-bold hover:underline flex items-center gap-1"
                    >
                      <Plus size={12} /> Add Photo Link
                    </button>
                  )}
                </div>

                {interiorImageUrls.map((url, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="url"
                      placeholder={`Interior photo ${i + 1} URL`}
                      value={url}
                      onChange={(e) => updateInteriorUrl(i, e.target.value)}
                      className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-xs font-mono"
                    />
                    {interiorImageUrls.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeInteriorUrl(i)}
                        className="text-gray-400 hover:text-red-500 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3 sticky bottom-0 bg-white py-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl border border-gray-200 font-bold text-sm text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-black text-white font-bold text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 shadow-md flex items-center gap-2"
            >
              {saving ? "Saving Partner Gym..." : isEdit ? "Update Gym Profile" : "Create Partner Gym"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
