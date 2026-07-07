"use client";

import GymGuard from "@/components/GymGuard";
import { useEffect, useState } from "react";
import { Download } from "lucide-react";

export default function PayoutsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayouts = async () => {
      try {
        const token = localStorage.getItem("zonofit_portal_token");
        const res = await fetch("/api/gyms/analytics/payouts", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const result = await res.json();
        setData(result);
      } catch (err) {
        console.error("Failed to fetch payouts", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPayouts();
  }, []);

  return (
    <GymGuard>
      <div className="max-w-6xl mx-auto w-full px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">Payouts & Earnings</h1>
          <p className="text-gray-600">
            Track your revenue, commissions, and upcoming payouts.
          </p>
        </div>

        {/* Overview Cards */}
        {loading ? (
          <div className="text-center py-12 text-gray-400 font-medium">Loading Payouts Data...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <h3 className="text-sm font-bold text-gray-500 uppercase mb-2">Pending Payout</h3>
                <div className="text-4xl font-black text-black">â‚¹{data?.pendingPayout || 0}</div>
                <div className="text-sm font-medium text-gray-400 mt-2">Next settlement in 7 days</div>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <h3 className="text-sm font-bold text-gray-500 uppercase mb-2">Total Earnings (This Month)</h3>
                <div className="text-4xl font-black text-black">â‚¹{data?.earningsThisMonth || 0}</div>
                <div className="text-sm font-medium text-emerald-600 mt-2">Based on completed visits</div>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <h3 className="text-sm font-bold text-gray-500 uppercase mb-2">Total Visits (This Month)</h3>
                <div className="text-4xl font-black text-black">{data?.visitsThisMonth || 0}</div>
                <div className="text-sm font-medium text-emerald-600 mt-2">Checked-in users</div>
              </div>
            </div>

            {/* Payout History */}
            <h2 className="text-xl font-bold text-black mb-4">Payout History</h2>
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                      <th className="py-4 px-6">Transaction ID</th>
                      <th className="py-4 px-6">Settlement Period</th>
                      <th className="py-4 px-6">Amount</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6">Payout Date</th>
                      <th className="py-4 px-6 text-right">Invoice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data?.payouts?.map((payout: any) => (
                      <tr key={payout.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 px-6 font-mono text-sm text-gray-600 truncate max-w-[120px]">{payout.id}</td>
                        <td className="py-4 px-6 text-sm font-medium text-black">{payout.period}</td>
                        <td className="py-4 px-6 font-bold text-black">{payout.amount}</td>
                        <td className="py-4 px-6">
                          <span className={`inline-block px-3 py-1 text-xs font-bold rounded-full ${payout.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {payout.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-600">{payout.date}</td>
                        <td className="py-4 px-6 text-right">
                          <button className="text-gray-400 hover:text-black transition-colors p-2">
                            <Download size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!data?.payouts?.length && (
                <div className="text-center py-12 text-gray-500 font-medium">
                  No payout history found.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </GymGuard>
  );
}
