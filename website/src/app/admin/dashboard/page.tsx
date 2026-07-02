"use client";

import AdminGuard from "@/components/AdminGuard";
import { useEffect, useState, FormEvent } from "react";
import dynamic from "next/dynamic";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Settings, PlusCircle, LayoutDashboard, Save } from "lucide-react";

const MapPicker = dynamic(() => import("@/components/MapPicker"), { ssr: false });

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // System Rules State
  const [settings, setSettings] = useState<any>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  
  // Gym Form State
  const [addingGym, setAddingGym] = useState(false);
  const [gymForm, setGymForm] = useState({
    name: "", description: "", address: "", city: "", state: "Maharashtra",
    lat: "", lng: "", creditCost: "10", category: "STANDARD", facilities: "Strength, Cardio", totalSlots: "20"
  });

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://localhost:8000/api/admin/dashboard", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const result = await res.json();
        setData(result);
      } catch (err) {
        console.error("Failed to fetch admin dashboard", err);
      } finally {
        setLoading(false);
      }
    };
    
    const fetchSettings = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://localhost:8000/api/admin/settings", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const result = await res.json();
        setSettings(result);
      } catch (err) {
        console.error("Failed to fetch settings", err);
      }
    };

    fetchDashboard();
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:8000/api/admin/settings", {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          creditPurchasePrice: Number(settings.creditPurchasePrice),
          creditConversionValue: Number(settings.creditConversionValue),
          cashExpiryDays: Number(settings.cashExpiryDays),
          initialVisitCut: Number(settings.initialVisitCut)
        })
      });
      if (res.ok) {
        alert("System Rules updated successfully!");
      } else {
        alert("Failed to update System Rules.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddGym = async (e: FormEvent) => {
    e.preventDefault();
    setAddingGym(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:8000/api/admin/gyms", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(gymForm)
      });
      if (res.ok) {
        alert("Gym Added Successfully!");
        setGymForm({
          name: "", description: "", address: "", city: "", state: "Maharashtra",
          lat: "", lng: "", creditCost: "10", category: "STANDARD", facilities: "Strength, Cardio", totalSlots: "20"
        });
        setActiveTab("overview");
      } else {
        alert("Failed to add Gym. Check required fields.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAddingGym(false);
    }
  };

  return (
    <AdminGuard>
      <div className="relative min-h-[calc(100vh-80px)] overflow-hidden flex flex-col pt-24 pb-20">
        <div className="absolute top-0 right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-100/60 blur-[120px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto w-full px-6 relative z-10">
          <h1 className="text-4xl font-bold text-black mb-2">Platform Administration</h1>
          <p className="text-gray-600 mb-8">
            Manage network activity, update dynamic rules, and add partner gyms.
          </p>
          
          <div className="grid md:grid-cols-4 gap-8">
            {/* Sidebar Navigation */}
            <div className="col-span-1">
              <div className="glass rounded-2xl p-4 flex flex-col gap-2">
                <button 
                  onClick={() => setActiveTab("overview")}
                  className={`flex items-center gap-3 text-left px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === "overview" ? "bg-primary text-white" : "hover:bg-white text-gray-600"}`}
                >
                  <LayoutDashboard size={20} />
                  Overview
                </button>
                <button 
                  onClick={() => setActiveTab("rules")}
                  className={`flex items-center gap-3 text-left px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === "rules" ? "bg-primary text-white" : "hover:bg-white text-gray-600"}`}
                >
                  <Settings size={20} />
                  System Rules
                </button>
                <button 
                  onClick={() => setActiveTab("add-gym")}
                  className={`flex items-center gap-3 text-left px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === "add-gym" ? "bg-primary text-white" : "hover:bg-white text-gray-600"}`}
                >
                  <PlusCircle size={20} />
                  Add Gym
                </button>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="col-span-3">
              {loading && activeTab === "overview" ? (
                <div className="text-center py-20 text-gray-500 font-medium animate-pulse">Loading Live Analytics...</div>
              ) : (
                <>
                  {/* TAB: OVERVIEW */}
                  {activeTab === "overview" && (
                    <div className="space-y-8">
                      {/* Quick Stats Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="glass p-6 rounded-3xl border border-emerald-500/20 shadow-sm relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-bl-full" />
                          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Total Users</h2>
                          <div className="text-4xl font-black text-black">{data?.totalUsers || 0}</div>
                        </div>
                        <div className="glass p-6 rounded-3xl border border-emerald-500/20 shadow-sm relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-bl-full" />
                          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Active Gyms</h2>
                          <div className="text-4xl font-black text-black">{data?.activeGyms || 0}</div>
                        </div>
                        <div className="glass p-6 rounded-3xl border border-emerald-500/20 shadow-sm relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-bl-full" />
                          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Economy</h2>
                          <div className="text-4xl font-black text-black">{data?.creditsCirculated || 0} <span className="text-sm text-gray-500">cr</span></div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 glass p-8 rounded-3xl border border-emerald-500/20 shadow-sm">
                          <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-black">Platform Growth</h2>
                          </div>
                          <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={data?.chartData || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} itemStyle={{ color: '#10b981', fontWeight: 'bold' }} />
                                <Area type="monotone" dataKey="users" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        <div className="glass p-6 rounded-3xl border border-emerald-500/20 shadow-sm">
                          <h2 className="text-lg font-bold text-black mb-4">New Partner Gyms</h2>
                          <div className="space-y-4">
                            {data?.recentGymSignups?.map((gym: any, i: number) => (
                              <div key={i} className="flex items-center justify-between pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                                <div>
                                  <div className="font-bold text-black text-sm">{gym.name}</div>
                                  <div className="text-xs text-gray-500 mt-0.5">{gym.city}</div>
                                </div>
                                <div className={`text-xs font-bold px-2 py-1 rounded-md ${gym.status === 'Verified' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                  {gym.status}
                                </div>
                              </div>
                            ))}
                            {!data?.recentGymSignups?.length && <div className="text-sm text-gray-400">No recent gyms</div>}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB: SYSTEM RULES */}
                  {activeTab === "rules" && (
                    <div className="glass rounded-3xl p-8 border border-black/5">
                      <h2 className="text-2xl font-bold text-black mb-6">Economy & System Rules</h2>
                      <p className="text-gray-500 mb-8">Update the core financial parameters of the ZonoFit platform. These changes apply immediately to all new transactions and expiries.</p>
                      
                      {!settings ? (
                        <div className="animate-pulse flex space-x-4">Loading rules...</div>
                      ) : (
                        <form onSubmit={handleSaveSettings} className="space-y-6">
                          <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <label className="text-sm font-semibold text-gray-700">Credit Purchase Price (₹)</label>
                              <p className="text-xs text-gray-400 mb-2">Cost to the user to buy 1 Credit.</p>
                              <input 
                                type="number" 
                                value={settings.creditPurchasePrice}
                                onChange={(e) => setSettings({...settings, creditPurchasePrice: e.target.value})}
                                className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-black focus:outline-none focus:border-primary transition-colors"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-semibold text-gray-700">Credit Conversion Value (₹)</label>
                              <p className="text-xs text-gray-400 mb-2">Value yielded when converting 1 Credit back to cash.</p>
                              <input 
                                type="number" 
                                value={settings.creditConversionValue}
                                onChange={(e) => setSettings({...settings, creditConversionValue: e.target.value})}
                                className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-black focus:outline-none focus:border-primary transition-colors"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-semibold text-gray-700">Cash Expiry Days</label>
                              <p className="text-xs text-gray-400 mb-2">Days before converted cash expires from user's wallet.</p>
                              <input 
                                type="number" 
                                value={settings.cashExpiryDays}
                                onChange={(e) => setSettings({...settings, cashExpiryDays: e.target.value})}
                                className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-black focus:outline-none focus:border-primary transition-colors"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-semibold text-gray-700">Initial Visit Cut</label>
                              <p className="text-xs text-gray-400 mb-2">Visits locked to Primary Gym upon membership purchase.</p>
                              <input 
                                type="number" 
                                value={settings.initialVisitCut}
                                onChange={(e) => setSettings({...settings, initialVisitCut: e.target.value})}
                                className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-black focus:outline-none focus:border-primary transition-colors"
                              />
                            </div>
                          </div>

                          <div className="pt-6 border-t border-gray-100 flex justify-end">
                            <button 
                              type="submit" 
                              disabled={savingSettings}
                              className="bg-primary hover:bg-primary-dark text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2 transition disabled:opacity-50"
                            >
                              {savingSettings ? "Saving..." : <><Save size={18} /> Apply Changes</>}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}

                  {/* TAB: ADD GYM */}
                  {activeTab === "add-gym" && (
                    <div className="glass rounded-3xl p-8 border border-black/5">
                      <h2 className="text-2xl font-bold text-black mb-6">Add Partner Gym</h2>
                      <form onSubmit={handleAddGym} className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Gym Name</label>
                            <input 
                              required type="text" 
                              value={gymForm.name} onChange={e => setGymForm({...gymForm, name: e.target.value})}
                              className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-black focus:outline-none focus:border-primary transition-colors"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">City</label>
                            <input 
                              required type="text" 
                              value={gymForm.city} onChange={e => setGymForm({...gymForm, city: e.target.value})}
                              className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-black focus:outline-none focus:border-primary transition-colors"
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-semibold text-gray-700">Full Address</label>
                            <input 
                              required type="text" 
                              value={gymForm.address} onChange={e => setGymForm({...gymForm, address: e.target.value})}
                              className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-black focus:outline-none focus:border-primary transition-colors"
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-semibold text-gray-700">Gym Location</label>
                            <p className="text-xs text-gray-400 mb-2">Click on the map to set the gym's coordinates.</p>
                            <MapPicker 
                              lat={Number(gymForm.lat)} 
                              lng={Number(gymForm.lng)} 
                              onChange={(lat, lng) => setGymForm({ ...gymForm, lat: String(lat), lng: String(lng) })} 
                            />
                            <div className="flex gap-4 mt-2">
                              <input 
                                required type="number" step="any" placeholder="Latitude" readOnly
                                value={gymForm.lat} 
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-black text-sm"
                              />
                              <input 
                                required type="number" step="any" placeholder="Longitude" readOnly
                                value={gymForm.lng} 
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-black text-sm"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Cost per Visit (Credits)</label>
                            <input 
                              required type="number"
                              value={gymForm.creditCost} onChange={e => setGymForm({...gymForm, creditCost: e.target.value})}
                              className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-black focus:outline-none focus:border-primary transition-colors"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Facilities (Comma separated)</label>
                            <input 
                              type="text"
                              value={gymForm.facilities} onChange={e => setGymForm({...gymForm, facilities: e.target.value})}
                              className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-black focus:outline-none focus:border-primary transition-colors"
                            />
                          </div>
                        </div>

                        <div className="pt-6 border-t border-gray-100 flex justify-end">
                          <button 
                            type="submit" 
                            disabled={addingGym}
                            className="bg-primary hover:bg-primary-dark text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2 transition disabled:opacity-50"
                          >
                            {addingGym ? "Adding..." : <><PlusCircle size={18} /> Publish Gym to Network</>}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
