"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, CheckCircle2, Clock } from "lucide-react";

export default function AdminFinancePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

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

  const processAllPayouts = async () => {
    if (!confirm("Are you sure you want to process ALL pending payouts?")) return;
    setProcessing(true);
    try {
      const token = localStorage.getItem("zonofit_portal_token");
      const res = await fetch("/api/admin/payouts/process", {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({})
      });
      const result = await res.json();
      alert(`Processed ${result.count} payout(s) successfully.`);
      fetchFinance();
    } catch (err) {
      console.error(err);
      alert("Failed to process payouts");
    } finally {
      setProcessing(false);
    }
  };

  const processSinglePayout = async (payoutId: string, gymName: string, amountINR: number) => {
    if (!confirm(`Are you sure you want to process payout of ₹${amountINR.toLocaleString()} for ${gymName}?`)) return;
    setProcessingId(payoutId);
    try {
      const token = localStorage.getItem("zonofit_portal_token");
      const res = await fetch("/api/admin/payouts/process", {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ payoutId })
      });
      const result = await res.json();
      alert(`Payout of ₹${amountINR.toLocaleString()} for ${gymName} processed successfully!`);
      fetchFinance();
    } catch (err) {
      console.error(err);
      alert("Failed to process payout");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return <div className="p-8 text-gray-500 font-medium">Loading Financial Data...</div>;
  }

  const pendingCount = data?.recentPayouts?.filter((p: any) => p.status === "PENDING")?.length || 0;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-black mb-2">Financial Center</h1>
        <p className="text-gray-600">Track GMV, revenue, and manage automated gym settlements.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
          <div className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Total GMV</div>
          <div className="text-3xl font-black text-black">₹{data?.gmv?.toLocaleString() || 0}</div>
          <div className="text-emerald-500 text-sm font-bold flex items-center gap-1 mt-auto pt-4">
            <ArrowUpRight size={16} /> +12% this month
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
          <div className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Net Revenue</div>
          <div className={`text-3xl font-black ${(data?.netRevenue || 0) < 0 ? "text-amber-600" : "text-black"}`}>
            ₹{data?.netRevenue?.toLocaleString() || 0}
          </div>
          <div className="text-emerald-500 text-sm font-bold flex items-center gap-1 mt-auto pt-4">
            <ArrowUpRight size={16} /> +8% this month
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
          <div className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Total Paid to Gyms</div>
          <div className="text-3xl font-black text-gray-800">₹{data?.totalPaid?.toLocaleString() || 0}</div>
        </div>

        <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100 shadow-sm flex flex-col">
          <div className="text-sm font-bold text-orange-800 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Pending Payouts</span>
            <span className="text-xs px-2 py-0.5 bg-orange-200 text-orange-900 rounded-full font-bold">
              {pendingCount} pending
            </span>
          </div>
          <div className="text-3xl font-black text-orange-600">₹{data?.totalPending?.toLocaleString() || 0}</div>
          <button 
            onClick={processAllPayouts}
            disabled={processing || (data?.totalPending || 0) === 0}
            className="mt-4 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? "Processing..." : (data?.totalPending || 0) > 0 ? "Process All Payouts" : "No Pending Payouts"}
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-black">Recent Payout History</h2>
            <p className="text-xs text-gray-500 mt-1">Process individual payouts or view completed settlement logs.</p>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-sm text-gray-500 uppercase tracking-wider">
                <th className="pb-4 font-bold">Gym</th>
                <th className="pb-4 font-bold">Period</th>
                <th className="pb-4 font-bold">Amount</th>
                <th className="pb-4 font-bold">Status</th>
                <th className="pb-4 font-bold">Date</th>
                <th className="pb-4 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data?.recentPayouts?.length > 0 ? data.recentPayouts.map((payout: any) => {
                const amountINR = (payout.amountPaise || 0) / 100;
                const isPending = payout.status === "PENDING";
                const isItemProcessing = processingId === payout.id;

                return (
                  <tr key={payout.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 font-bold text-black">{payout.gym?.name || "Partner Gym"}</td>
                    <td className="py-4 text-sm text-gray-600">
                      {new Date(payout.periodStart).toLocaleDateString()} - {new Date(payout.periodEnd).toLocaleDateString()}
                    </td>
                    <td className="py-4 font-bold text-black">₹{amountINR.toLocaleString()}</td>
                    <td className="py-4">
                      {isPending ? (
                        <span className="px-3 py-1 bg-orange-50 text-orange-700 rounded-lg text-xs font-bold flex items-center gap-1 w-fit border border-orange-200">
                          <Clock size={12} /> PENDING
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold flex items-center gap-1 w-fit border border-emerald-200">
                          <CheckCircle2 size={12} /> PAID
                        </span>
                      )}
                    </td>
                    <td className="py-4 text-sm text-gray-500">
                      {payout.payoutDate ? new Date(payout.payoutDate).toLocaleDateString() : 'Awaiting Settlement'}
                    </td>
                    <td className="py-4 text-right">
                      {isPending ? (
                        <button
                          onClick={() => processSinglePayout(payout.id, payout.gym?.name || "Gym", amountINR)}
                          disabled={isItemProcessing || processing}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                        >
                          {isItemProcessing ? "Processing..." : "Process Payout"}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 font-medium">Completed</span>
                      )}
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500 font-medium">No payouts found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
