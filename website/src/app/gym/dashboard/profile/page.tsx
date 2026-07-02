"use client";

import GymGuard from "@/components/GymGuard";
import { useEffect, useState } from "react";
import { Save, Edit2 } from "lucide-react";

export default function GymProfilePage() {
  const [gym, setGym] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:8000/api/gyms/analytics/dashboard", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.gym) setGym(data.gym);
    } catch (err) {
      console.error("Failed to fetch profile", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setGym({ ...gym, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      await fetch("http://localhost:8000/api/gyms/profile", {
        method: "PUT",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(gym)
      });
      alert("Profile updated successfully!");
    } catch (err) {
      console.error("Failed to save profile", err);
      alert("Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <GymGuard>
      <div className="max-w-4xl mx-auto w-full px-6 py-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">Gym Profile</h1>
            <p className="text-gray-600">
              Manage your public appearance on the ZonoFit app.
            </p>
          </div>
          <button 
            onClick={handleSave}
            disabled={loading || saving}
            className="bg-black hover:bg-gray-800 text-white px-5 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 shadow-md w-fit disabled:opacity-50"
          >
            <Save size={18} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400 font-medium">Loading Profile...</div>
        ) : (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 space-y-6">
            <div className="flex items-center gap-6 pb-6 border-b border-gray-100">
              <div className="w-24 h-24 bg-gray-100 rounded-2xl flex items-center justify-center relative overflow-hidden group cursor-pointer">
                {/* Simulated Image */}
                <span className="text-4xl">🏋️</span>
                <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center transition-all">
                  <Edit2 size={24} className="text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold text-black mb-1">Profile Photo</h2>
                <p className="text-sm text-gray-500 mb-3">Recommended size: 800x800px. Max 2MB.</p>
                <button className="bg-gray-50 hover:bg-gray-100 text-black px-4 py-2 rounded-xl text-sm font-bold transition-colors border border-gray-200">
                  Change Photo
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-black mb-2">Gym Name</label>
                <input 
                  type="text" 
                  name="name"
                  value={gym?.name || ""}
                  onChange={handleChange}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-black mb-2">Contact Phone</label>
                <input 
                  type="text" 
                  name="contactPhone"
                  value={gym?.contactPhone || ""}
                  onChange={handleChange}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-black mb-2">Description</label>
                <textarea 
                  rows={4}
                  name="description"
                  value={gym?.description || ""}
                  onChange={handleChange}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none"
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-bold text-black mb-2">Opening Time</label>
                <input 
                  type="text" 
                  name="openingTime"
                  value={gym?.openingTime || ""}
                  onChange={handleChange}
                  placeholder="e.g. 06:00 AM"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-black mb-2">Closing Time</label>
                <input 
                  type="text" 
                  name="closingTime"
                  value={gym?.closingTime || ""}
                  onChange={handleChange}
                  placeholder="e.g. 10:00 PM"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100">
              <h2 className="text-lg font-bold text-black mb-4">Facilities</h2>
              <div className="flex flex-wrap gap-2">
                {gym?.facilities?.map((facility: string, index: number) => (
                  <span key={index} className="px-4 py-2 bg-emerald-50 text-emerald-700 font-medium text-sm rounded-xl border border-emerald-100">
                    {facility}
                  </span>
                ))}
                <button className="px-4 py-2 bg-gray-50 text-gray-600 hover:text-black font-medium text-sm rounded-xl border border-dashed border-gray-300 hover:border-gray-400 transition-colors">
                  + Add Facility
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </GymGuard>
  );
}
