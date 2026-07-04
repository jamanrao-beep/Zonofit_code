"use client";

import { useEffect, useState } from "react";
import { Tag, Plus, Settings2 } from "lucide-react";

export default function AdminMarketingPage() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Coupon Form State
  const [showForm, setShowForm] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    code: "",
    discountType: "PERCENTAGE",
    discountValue: 10,
    usageLimit: ""
  });

  const fetchCoupons = async () => {
    try {
      const token = localStorage.getItem("zonofit_portal_token");
      const res = await fetch("http://localhost:8000/api/admin/marketing/coupons", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setCoupons(data.coupons || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("zonofit_portal_token");
      await fetch("http://localhost:8000/api/admin/marketing/coupons", {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(newCoupon)
      });
      alert("Coupon created!");
      setShowForm(false);
      fetchCoupons();
    } catch (err) {
      console.error(err);
      alert("Failed to create coupon.");
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-black mb-2">Marketing & Coupons</h1>
          <p className="text-gray-600">Create promotional codes and manage platform-wide discounts.</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-black hover:bg-gray-800 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-md"
        >
          <Plus size={18} /> New Coupon
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-lg mb-8">
          <h2 className="text-lg font-bold text-black mb-4">Create New Promo Code</h2>
          <form onSubmit={handleCreateCoupon} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Coupon Code</label>
              <input 
                type="text" 
                required
                placeholder="e.g. SUMMER50"
                value={newCoupon.code}
                onChange={e => setNewCoupon({...newCoupon, code: e.target.value.toUpperCase()})}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black uppercase"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Discount Type</label>
              <select 
                value={newCoupon.discountType}
                onChange={e => setNewCoupon({...newCoupon, discountType: e.target.value})}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED_AMOUNT">Fixed Amount (Credits)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Discount Value</label>
              <input 
                type="number" 
                required
                min={1}
                value={newCoupon.discountValue}
                onChange={e => setNewCoupon({...newCoupon, discountValue: parseInt(e.target.value)})}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Usage Limit (Optional)</label>
              <input 
                type="number" 
                placeholder="e.g. 100"
                value={newCoupon.usageLimit}
                onChange={e => setNewCoupon({...newCoupon, usageLimit: e.target.value})}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div className="md:col-span-2 flex justify-end gap-2 mt-4">
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors">
                Cancel
              </button>
              <button type="submit" className="px-6 py-3 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-md">
                Publish Coupon
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading Coupons...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-sm text-gray-500 uppercase tracking-wider">
                  <th className="pb-4 font-bold">Code</th>
                  <th className="pb-4 font-bold">Discount</th>
                  <th className="pb-4 font-bold">Usage</th>
                  <th className="pb-4 font-bold">Status</th>
                  <th className="pb-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {coupons.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <Tag size={16} className="text-emerald-600" />
                        <span className="font-black text-black">{c.code}</span>
                      </div>
                    </td>
                    <td className="py-4 font-bold text-gray-700">
                      {c.discountType === "PERCENTAGE" ? `${c.discountValue}% OFF` : `â‚¹${c.discountValue} OFF`}
                    </td>
                    <td className="py-4">
                      <span className="text-sm font-medium text-black">
                        {c.usageCount} {c.usageLimit ? `/ ${c.usageLimit}` : 'uses'}
                      </span>
                    </td>
                    <td className="py-4">
                      {c.isActive ? (
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold">ACTIVE</span>
                      ) : (
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold">DISABLED</span>
                      )}
                    </td>
                    <td className="py-4 text-right">
                      <button className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-colors">
                        <Settings2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {coupons.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-500 font-medium">No coupons active.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
