"use client";

import { useEffect, useState } from "react";
import { AlertOctagon, Save, ShieldAlert } from "lucide-react";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem("zonofit_portal_token");
      const res = await fetch("/api/admin/settings", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setSettings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setSettings((prev: any) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : parseInt(value, 10)
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("zonofit_portal_token");
      await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(settings)
      });
      alert("Settings and Kill Switches updated successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-gray-500">Loading Settings...</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-black mb-2">Settings & Controls</h1>
          <p className="text-gray-600">Global system configuration and emergency kill switches.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-md disabled:opacity-50"
        >
          <Save size={18} /> {saving ? "Saving..." : "Save Config"}
        </button>
      </div>

      <div className="bg-red-50 p-8 rounded-3xl border border-red-200 shadow-sm">
        <h2 className="text-xl font-bold text-red-900 mb-2 flex items-center gap-2">
          <AlertOctagon /> Emergency Kill Switches
        </h2>
        <p className="text-red-700 text-sm mb-6">
          Use these toggles to instantly disable core platform features during an emergency (e.g., ongoing fraud attack, bug in payment gateway). 
          These changes take effect immediately across all API endpoints.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { id: "signupsEnabled", label: "New User Signups", desc: "Allow new users to register" },
            { id: "payoutsEnabled", label: "Gym Payout Releases", desc: "Allow funds to be sent to partner gyms" },
            { id: "referralsEnabled", label: "Referral Rewards", desc: "Grant bonuses for inviting friends" },
            { id: "couponsEnabled", label: "Promo Code Usage", desc: "Allow users to apply discount coupons" },
          ].map((toggle) => (
            <label key={toggle.id} className="flex items-start gap-4 p-4 bg-white rounded-2xl border border-red-100 cursor-pointer hover:border-red-300 transition-colors">
              <div className="pt-1">
                <input 
                  type="checkbox" 
                  name={toggle.id}
                  checked={settings?.[toggle.id] ?? true}
                  onChange={handleChange}
                  className="w-5 h-5 accent-red-600" 
                />
              </div>
              <div>
                <div className="font-bold text-gray-900">{toggle.label}</div>
                <div className="text-xs text-gray-500 mt-1">{toggle.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
        <h2 className="text-xl font-bold text-black mb-6">Economy Parameters</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-black mb-2">Credit Purchase Price (₹)</label>
            <input 
              type="number" 
              name="creditPurchasePrice"
              value={settings?.creditPurchasePrice || 10}
              onChange={handleChange}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-black mb-2">Credit Conversion Value (₹)</label>
            <input 
              type="number" 
              name="creditConversionValue"
              value={settings?.creditConversionValue || 8}
              onChange={handleChange}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-black mb-2">Initial Visit Cut (for Primary Gym)</label>
            <input 
              type="number" 
              name="initialVisitCut"
              value={settings?.initialVisitCut || 10}
              onChange={handleChange}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-black mb-2">Converted Cash Expiry (Days)</label>
            <input 
              type="number" 
              name="cashExpiryDays"
              value={settings?.cashExpiryDays || 15}
              onChange={handleChange}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
