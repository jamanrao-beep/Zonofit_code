"use client";

import { useEffect, useState } from "react";
import { DollarSign, ArrowUpRight, ArrowDownRight, Activity } from "lucide-react";

export default function AdminFinancePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchFinance = async () => {
    try {
      const token = localStorage.getItem("zonofit_portal_token");
      const res = await fetch("/api/admin/finance", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinance();
  }, []);

  if (loading) {
    return <div className="p-8 text-gray-500">Loading Financial Data...</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-black mb-2">Financial Center</h1>
        <p className="text-gray-600">Track GMV, revenue, and manage gym payouts.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
          <div className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Total GMV</div>
          <div className="text-3xl font-black text-black">â‚¹{data?.gmv?.toLocaleString() || 0}</div>
          <div className="text-emerald-500 text-sm font-bold flex items-center gap-1 mt-auto pt-4">
            <ArrowUpRight size={16} /> +12% this month
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
          <div className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Net Revenue</div>
          <div className="text-3xl font-black text-black">â‚¹{data?.netRevenue?.toLocaleString() || 0}</div>
          <div className="text-emerald-500 text-sm font-bold flex items-center gap-1 mt-auto pt-4">
            <ArrowUpRight size={16} /> +8% this month
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
          <div className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Total Paid to Gyms</div>
          <div className="text-3xl font-black text-gray-800">â‚¹{data?.totalPaid?.toLocaleString() || 0}</div>
        </div>

        <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100 shadow-sm flex flex-col">
          <div className="text-sm font-bold text-orange-800 uppercase tracking-wider mb-2">Pending Payouts</div>
          <div className="text-3xl font-black text-orange-600">â‚¹{data?.totalPending?.toLocaleString() || 0}</div>
          <button className="mt-4 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors w-fit">
            Process Payouts
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <h2 className="text-xl font-bold text-black mb-6">Recent Payout History</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-sm text-gray-500 uppercase tracking-wider">
                <th className="pb-4 font-bold">Gym</th>
                <th className="pb-4 font-bold">Period</th>
                <th className="pb-4 font-bold">Amount</th>
                <th className="pb-4 font-bold">Status</th>
                <th className="pb-4 font-bold">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data?.recentPayouts?.length > 0 ? data.recentPayouts.map((payout: any) => (
                <tr key={payout.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-4 font-bold text-black">{payout.gym?.name}</td>
                  <td className="py-4 text-sm text-gray-600">
                    {new Date(payout.periodStart).toLocaleDateString()} - {new Date(payout.periodEnd).toLocaleDateString()}
                  </td>
                  <td className="py-4 font-bold text-black">â‚¹{payout.amountPaise / 100}</td>
                  <td className="py-4">
                    {payout.status === "PAID" ? (
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold">PAID</span>
                    ) : (
                      <span className="px-3 py-1 bg-orange-50 text-orange-700 rounded-lg text-xs font-bold">PENDING</span>
                    )}
                  </td>
                  <td className="py-4 text-sm text-gray-500">
                    {payout.payoutDate ? new Date(payout.payoutDate).toLocaleDateString() : '-'}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">No recent payouts found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
