"use client";

import { useAuthStore } from "@/store/useAuthStore";
import { User, Mail, Lock, Building2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const { user, initialize, login } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    initialize();
    setMounted(true);
  }, [initialize]);

  useEffect(() => {
    if (mounted && !user) {
      router.push("/auth/login");
    } else if (user) {
      setName(user.name);
    }
  }, [mounted, user, router]);

  const handleUpdateProfile = async () => {
    if (!name.trim()) return alert("Name is required");
    setIsSaving(true);
    try {
      const token = localStorage.getItem("zonofit_portal_token");
      const res = await fetch("http://localhost:8000/api/users/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const data = await res.json();
        login(data.user, token!);
        alert("Profile updated successfully!");
      } else {
        alert("Failed to update profile.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!mounted || !user) return null;

  return (
    <div className="relative min-h-[calc(100vh-80px)] overflow-hidden flex flex-col pt-24 pb-20">
      <div className="absolute top-0 right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-100/60 blur-[120px] pointer-events-none" />
      
      <div className="max-w-4xl mx-auto w-full px-6 relative z-10">
        <h1 className="text-3xl font-bold text-black mb-8">Account Settings</h1>
        
        <div className="grid md:grid-cols-3 gap-8">
          {/* Navigation Sidebar */}
          <div className="col-span-1">
            <div className="glass rounded-2xl p-4 flex flex-col gap-2">
              <button 
                onClick={() => setActiveTab("profile")}
                className={`text-left px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === "profile" ? "bg-primary text-white" : "hover:bg-white text-gray-600"}`}
              >
                Personal Profile
              </button>
              <button 
                onClick={() => setActiveTab("security")}
                className={`text-left px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === "security" ? "bg-primary text-white" : "hover:bg-white text-gray-600"}`}
              >
                Security
              </button>
              {user.role === "GYM_OWNER" && (
                <button 
                  onClick={() => setActiveTab("gym")}
                  className={`text-left px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === "gym" ? "bg-primary text-white" : "hover:bg-white text-gray-600"}`}
                >
                  Gym Details
                </button>
              )}
            </div>
          </div>

          {/* Form Area */}
          <div className="col-span-2">
            <div className="glass rounded-3xl p-8 border border-black/5">
              {activeTab === "profile" && (
                <>
                  <h2 className="text-xl font-bold text-black mb-6">Profile Information</h2>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                          type="text" 
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-12 pr-4 text-black focus:outline-none focus:border-primary transition-colors"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                          type="email" 
                          defaultValue={user.email}
                          disabled
                          className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 pl-12 pr-4 text-gray-500 cursor-not-allowed"
                        />
                      </div>
                      <p className="text-xs text-gray-400">Email addresses cannot be changed directly. Contact support.</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Account Type</label>
                      <div className="relative">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                          type="text" 
                          defaultValue={user.role.replace("_", " ")}
                          disabled
                          className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 pl-12 pr-4 text-gray-500 cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                      <button 
                        onClick={handleUpdateProfile}
                        disabled={isSaving}
                        className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        <Save size={18} /> {isSaving ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {activeTab === "security" && (
                <>
                  <h2 className="text-xl font-bold text-black mb-6">Security Settings</h2>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Current Password</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                          type="password" 
                          placeholder="••••••••"
                          className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-12 pr-4 text-black focus:outline-none focus:border-primary transition-colors"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">New Password</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                          type="password" 
                          placeholder="New password"
                          className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-12 pr-4 text-black focus:outline-none focus:border-primary transition-colors"
                        />
                      </div>
                    </div>
                    <div className="pt-4 flex justify-end">
                      <button className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2">
                        <Save size={18} /> Update Password
                      </button>
                    </div>
                  </div>
                </>
              )}

              {activeTab === "gym" && (
                <>
                  <h2 className="text-xl font-bold text-black mb-6">Gym Details</h2>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Gym Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Iron Paradise"
                        className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-black focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Location / Address</label>
                      <input 
                        type="text" 
                        placeholder="123 Fitness Street, Downtown"
                        className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-black focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Facilities Offered (comma separated)</label>
                      <input 
                        type="text" 
                        placeholder="Weights, Cardio, Yoga, Pool"
                        className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-black focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>
                    <div className="pt-4 flex justify-end">
                      <button className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2">
                        <Save size={18} /> Save Gym Details
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
