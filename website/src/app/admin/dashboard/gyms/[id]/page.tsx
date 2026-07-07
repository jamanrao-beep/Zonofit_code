"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, Trash2, Plus } from "lucide-react";

export default function AdminGymDetailPage() {
  const params = useParams();
  const router = useRouter();
  const gymId = params.id as string;

  const [gym, setGym] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Economy Override State
  const [economy, setEconomy] = useState({
    creditPurchasePrice: "",
    creditConversionValue: "",
    initialVisitCut: "",
    cashExpiryDays: ""
  });
  const [savingEconomy, setSavingEconomy] = useState(false);

  // New Plan State
  const [newPlan, setNewPlan] = useState({
    name: "",
    description: "",
    initialPeriodMonths: "",
    initialCutoffDays: "",
    subsequentCutoffDays: ""
  });
  const [savingPlan, setSavingPlan] = useState(false);

  const fetchGym = async () => {
    try {
      const token = localStorage.getItem("zonofit_portal_token");
      const res = await fetch(`/api/admin/gyms/${gymId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setGym(data.gym);
      if (data.gym) {
        setEconomy({
          creditPurchasePrice: data.gym.creditPurchasePrice ?? "",
          creditConversionValue: data.gym.creditConversionValue ?? "",
          initialVisitCut: data.gym.initialVisitCut ?? "",
          cashExpiryDays: data.gym.cashExpiryDays ?? ""
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGym();
  }, [gymId]);

  const handleEconomyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEconomy({ ...economy, [e.target.name]: e.target.value });
  };

  const handleSaveEconomy = async () => {
    setSavingEconomy(true);
    try {
      const token = localStorage.getItem("zonofit_portal_token");
      await fetch(`/api/admin/gyms/${gymId}/economy`, {
        method: "PUT",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(economy)
      });
      alert("Economy overrides updated successfully.");
      fetchGym();
    } catch (err) {
      console.error(err);
      alert("Failed to save economy overrides.");
    } finally {
      setSavingEconomy(false);
    }
  };

  const handlePlanChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setNewPlan({ ...newPlan, [e.target.name]: e.target.value });
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPlan(true);
    try {
      const token = localStorage.getItem("zonofit_portal_token");
      await fetch(`/api/admin/gyms/${gymId}/plans`, {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(newPlan)
      });
      alert("Gym plan created successfully.");
      setNewPlan({
        name: "",
        description: "",
        initialPeriodMonths: "",
        initialCutoffDays: "",
        subsequentCutoffDays: ""
      });
      fetchGym();
    } catch (err) {
      console.error(err);
      alert("Failed to create gym plan.");
    } finally {
      setSavingPlan(false);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm("Are you sure you want to delete this plan?")) return;
    try {
      const token = localStorage.getItem("zonofit_portal_token");
      await fetch(`/api/admin/gyms/${gymId}/plans/${planId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchGym();
    } catch (err) {
      console.error(err);
      alert("Failed to delete plan.");
    }
  };

  if (loading) return <div className="p-8 text-gray-500">Loading Gym Details...</div>;
  if (!gym) return <div className="p-8 text-red-500">Gym not found</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-black mb-1">{gym.name}</h1>
          <p className="text-gray-600">{gym.city}, {gym.state}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Economy Overrides Section */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-black">Economy Overrides</h2>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Leave a field empty to use the global fallback value defined in Settings & Controls.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-black mb-2">Credit Purchase Price (₹)</label>
              <input 
                type="number" 
                name="creditPurchasePrice"
                value={economy.creditPurchasePrice}
                onChange={handleEconomyChange}
                placeholder="Global Default"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-black mb-2">Credit Conversion Value (₹)</label>
              <input 
                type="number" 
                name="creditConversionValue"
                value={economy.creditConversionValue}
                onChange={handleEconomyChange}
                placeholder="Global Default"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-black mb-2">Initial Visit Cut (Days for Primary Gym)</label>
              <input 
                type="number" 
                name="initialVisitCut"
                value={economy.initialVisitCut}
                onChange={handleEconomyChange}
                placeholder="Global Default"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-black mb-2">Converted Cash Expiry (Days)</label>
              <input 
                type="number" 
                name="cashExpiryDays"
                value={economy.cashExpiryDays}
                onChange={handleEconomyChange}
                placeholder="Global Default"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <button 
              onClick={handleSaveEconomy}
              disabled={savingEconomy}
              className="mt-4 w-full bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <Save size={18} /> {savingEconomy ? "Saving..." : "Save Overrides"}
            </button>
          </div>
        </div>

        {/* Custom Plans Section */}
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <h2 className="text-xl font-bold text-black mb-6">Create Gym Plan</h2>
            <form onSubmit={handleCreatePlan} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-black mb-2">Plan Name</label>
                <input 
                  type="text" 
                  name="name"
                  required
                  value={newPlan.name}
                  onChange={handlePlanChange}
                  placeholder="e.g. Long-Term Retention"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-black mb-2">Initial Months</label>
                  <input 
                    type="number" 
                    name="initialPeriodMonths"
                    required
                    value={newPlan.initialPeriodMonths}
                    onChange={handlePlanChange}
                    placeholder="e.g. 4"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-black mb-2">Initial Cutoff Days</label>
                  <input 
                    type="number" 
                    name="initialCutoffDays"
                    required
                    value={newPlan.initialCutoffDays}
                    onChange={handlePlanChange}
                    placeholder="e.g. 10"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-black mb-2">Subsequent Cutoff Days</label>
                <input 
                  type="number" 
                  name="subsequentCutoffDays"
                  required
                  value={newPlan.subsequentCutoffDays}
                  onChange={handlePlanChange}
                  placeholder="e.g. 15"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <button 
                type="submit"
                disabled={savingPlan}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 mt-4"
              >
                <Plus size={18} /> {savingPlan ? "Creating..." : "Create Plan"}
              </button>
            </form>
          </div>
          
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <h2 className="text-xl font-bold text-black mb-6">Existing Gym Plans</h2>
            <div className="space-y-4">
              {gym.plans && gym.plans.length > 0 ? gym.plans.map((plan: any) => (
                <div key={plan.id} className="p-4 border border-gray-100 bg-gray-50 rounded-2xl flex justify-between items-center">
                  <div>
                    <div className="font-bold text-black">{plan.name}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      First {plan.initialPeriodMonths} months: {plan.initialCutoffDays} days cutoff<br/>
                      After {plan.initialPeriodMonths} months: {plan.subsequentCutoffDays} days cutoff
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDeletePlan(plan.id)}
                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              )) : (
                <p className="text-sm text-gray-500">No custom plans configured for this gym.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
