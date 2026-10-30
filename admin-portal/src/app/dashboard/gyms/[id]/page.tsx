"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, Trash2, Plus, Pencil } from "lucide-react";
import GymFormModal from "@/components/admin/GymFormModal";

function profilePhotos(gym: {
  exteriorImageUrl?: string | null;
  imageUrls?: unknown;
  interiorImageUrls?: unknown;
  logoUrl?: string | null;
}): string[] {
  const logo = typeof gym.logoUrl === "string" ? gym.logoUrl.trim() : "";
  const pool = [
    gym.exteriorImageUrl,
    ...(Array.isArray(gym.imageUrls) ? gym.imageUrls : []),
    ...(Array.isArray(gym.interiorImageUrls) ? gym.interiorImageUrls : []),
  ];
  const seen = new Set<string>();
  const photos: string[] = [];
  for (const item of pool) {
    if (typeof item !== "string") continue;
    const url = item.trim();
    if (!/^https?:\/\//i.test(url) || url === logo || seen.has(url)) continue;
    seen.add(url);
    photos.push(url);
  }
  if (photos.length === 0 && /^https?:\/\//i.test(logo)) photos.push(logo);
  return photos;
}

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

  const [newPlan, setNewPlan] = useState({
    name: "",
    description: "",
    priceINR: "",
    billingCycle: "MONTHLY",
    initialPeriodMonths: "",
    initialCutoffDays: "",
    subsequentCutoffDays: ""
  });
  const [savingPlan, setSavingPlan] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);

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
        body: JSON.stringify({
          ...newPlan,
          priceInPaise: (parseFloat(newPlan.priceINR) || 0) * 100
        })
      });
      alert("Gym plan created successfully.");
      setNewPlan({
        name: "",
        description: "",
        priceINR: "",
        billingCycle: "MONTHLY",
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
      <div className="flex items-center gap-4 flex-wrap">
        <button onClick={() => router.back()} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold text-black mb-1">{gym.name}</h1>
          <p className="text-gray-600">{gym.city}, {gym.state}</p>
        </div>
        <button
          type="button"
          onClick={() => setEditingProfile(true)}
          className="ml-auto shrink-0 bg-black hover:bg-gray-800 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2"
        >
          <Pencil size={16} /> Edit profile
        </button>
      </div>

      <AppProfilePreview gym={gym} />

      {editingProfile && (
        <GymFormModal
          key={gym.updatedAt || gym.id}
          isOpen
          initialData={gym}
          onClose={() => setEditingProfile(false)}
          onSuccess={() => {
            setEditingProfile(false);
            fetchGym();
          }}
        />
      )}

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
                  <label className="block text-sm font-bold text-black mb-2">Price (₹)</label>
                  <input 
                    type="number" 
                    name="priceINR"
                    required
                    value={newPlan.priceINR}
                    onChange={handlePlanChange}
                    placeholder="e.g. 1999"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-black mb-2">Billing Cycle</label>
                  <select
                    name="billingCycle"
                    required
                    value={newPlan.billingCycle}
                    onChange={(e) => setNewPlan({ ...newPlan, billingCycle: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-black mb-2">Initial Period (Months)</label>
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
                    <div className="font-bold text-black">{plan.name} - ₹{plan.priceInPaise / 100} / {plan.billingCycle}</div>
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

function AppProfilePreview({ gym }: { gym: any }) {
  const photos = profilePhotos(gym);
  const facilities = Array.isArray(gym.facilities) ? gym.facilities.filter((item: unknown) => typeof item === "string") : [];
  return (
    <section className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 pt-6 pb-2">
        <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">What members see</p>
        <h2 className="text-xl font-bold text-black mt-1">Gym profile</h2>
      </div>
      {photos.length > 0 ? (
        <div className="flex gap-3 overflow-x-auto px-6 py-4">
          {photos.map((url) => (
            <img key={url} src={url} alt="" className="h-36 w-52 shrink-0 rounded-2xl object-cover bg-gray-100" />
          ))}
        </div>
      ) : (
        <div className="mx-6 my-4 rounded-2xl bg-emerald-50 text-emerald-900 px-4 py-8 text-center text-sm">
          No photos yet. Edit the profile and paste an exterior photo link.
        </div>
      )}
      <div className="px-6 pb-6 space-y-4 text-sm">
        <div>
          <p className="text-xs font-bold uppercase text-gray-500">About</p>
          <p className="mt-1 text-gray-800 whitespace-pre-wrap">{gym.description?.trim() || "Hidden in the app until you write this."}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-bold uppercase text-gray-500">Address</p>
            <p className="mt-1 text-gray-800">{[gym.address, gym.landmark, gym.city].filter(Boolean).join(" · ")}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-gray-500">Hours</p>
            <p className="mt-1 text-gray-800">Weekdays: {gym.weekdayHours || "Not set"}</p>
            <p className="text-gray-800">Weekends: {gym.weekendHours || "Not set"}</p>
          </div>
        </div>
        <div>
          <p className="text-xs font-bold uppercase text-gray-500">Facilities</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {facilities.length > 0 ? facilities.map((item: string) => (
              <span key={item} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">{item}</span>
            )) : <span className="text-gray-500">None selected</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-6">
          <div>
            <p className="text-xs font-bold uppercase text-gray-500">Monthly price</p>
            <p className="mt-1 font-bold text-black">₹{Number(gym.monthlyPrice || 0).toLocaleString("en-IN")}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-gray-500">Credits per visit</p>
            <p className="mt-1 font-bold text-black">{gym.creditCost ?? "—"}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
