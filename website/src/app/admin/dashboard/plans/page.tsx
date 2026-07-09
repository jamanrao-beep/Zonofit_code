"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

export default function AdminGlobalPlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [newPlan, setNewPlan] = useState({
    name: "",
    tier: "STANDARD",
    priceINR: "",
    monthlyCredits: "",
    durationDays: "30",
    features: ""
  });
  const [saving, setSaving] = useState(false);

  const fetchPlans = async () => {
    try {
      const token = localStorage.getItem("zonofit_portal_token");
      const res = await fetch("/api/admin/plans", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setPlans(data.plans || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem("zonofit_portal_token");
      await fetch("/api/admin/plans", {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...newPlan,
          priceInPaise: (parseFloat(newPlan.priceINR) || 0) * 100,
          monthlyCredits: parseInt(newPlan.monthlyCredits, 10),
          durationDays: parseInt(newPlan.durationDays, 10),
          features: newPlan.features.split(",").map(f => f.trim()).filter(Boolean)
        })
      });
      alert("Plan created successfully.");
      setNewPlan({
        name: "",
        tier: "STANDARD",
        priceINR: "",
        monthlyCredits: "",
        durationDays: "30",
        features: ""
      });
      fetchPlans();
    } catch (err) {
      console.error(err);
      alert("Failed to create plan.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this global plan?")) return;
    try {
      const token = localStorage.getItem("zonofit_portal_token");
      await fetch(`/api/admin/plans/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPlans();
    } catch (err) {
      console.error(err);
      alert("Failed to delete plan.");
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-black mb-2">Global Membership Plans</h1>
        <p className="text-gray-600">Create and manage network-wide Zonofit subscription plans.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm sticky top-8">
            <h2 className="text-xl font-bold text-black mb-6">Create New Plan</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-black mb-2">Plan Name</label>
                <input 
                  type="text" 
                  required
                  value={newPlan.name}
                  onChange={e => setNewPlan({...newPlan, name: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-black mb-2">Tier</label>
                  <select
                    value={newPlan.tier}
                    onChange={e => setNewPlan({...newPlan, tier: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    <option value="STANDARD">Standard</option>
                    <option value="PREMIUM">Premium</option>
                    <option value="VIP">VIP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-black mb-2">Price (₹)</label>
                  <input 
                    type="number" 
                    required
                    value={newPlan.priceINR}
                    onChange={e => setNewPlan({...newPlan, priceINR: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-black mb-2">Monthly Credits</label>
                  <input 
                    type="number" 
                    required
                    value={newPlan.monthlyCredits}
                    onChange={e => setNewPlan({...newPlan, monthlyCredits: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-black mb-2">Duration (Days)</label>
                  <input 
                    type="number" 
                    required
                    value={newPlan.durationDays}
                    onChange={e => setNewPlan({...newPlan, durationDays: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-black mb-2">Features (Comma Separated)</label>
                <input 
                  type="text" 
                  value={newPlan.features}
                  onChange={e => setNewPlan({...newPlan, features: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <button 
                type="submit"
                disabled={saving}
                className="w-full bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 mt-4"
              >
                <Plus size={18} /> {saving ? "Creating..." : "Create Global Plan"}
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading Plans...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {plans.map((plan) => (
                <div key={plan.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-black">{plan.name}</h3>
                        <span className="inline-block mt-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg uppercase tracking-wider">
                          {plan.tier}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-black">₹{plan.priceInPaise / 100}</div>
                        <div className="text-xs text-gray-500">for {plan.durationDays} days</div>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <div className="text-sm font-bold text-black mb-1">Provides:</div>
                      <div className="text-3xl font-black text-emerald-500">{plan.monthlyCredits} <span className="text-sm font-bold text-gray-500">Credits / mo</span></div>
                    </div>
                    
                    <div className="space-y-2">
                      {plan.features?.map((f: string, i: number) => (
                        <div key={i} className="text-sm text-gray-600 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-black rounded-full" />
                          {f}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => handleDelete(plan.id)}
                    className="mt-6 w-full py-3 border-2 border-red-100 text-red-600 hover:bg-red-50 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 size={18} /> Delete Plan
                  </button>
                </div>
              ))}
              {plans.length === 0 && (
                <div className="col-span-2 text-center py-12 text-gray-500 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                  No global plans found. Create one to get started!
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
