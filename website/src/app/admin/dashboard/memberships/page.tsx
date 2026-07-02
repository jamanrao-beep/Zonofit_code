"use client";

import { useEffect, useState } from "react";
import { Search, Snowflake, XCircle, ArrowRightLeft, UserCheck } from "lucide-react";

export default function AdminMembershipsPage() {
  const [memberships, setMemberships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchMemberships = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:8000/api/admin/memberships", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setMemberships(data.memberships || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemberships();
  }, []);

  const handleStatusUpdate = async (id: string, status: string) => {
    const token = localStorage.getItem("token");
    try {
      await fetch(`http://localhost:8000/api/admin/memberships/${id}/status`, {
        method: "PUT",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status })
      });
      fetchMemberships();
    } catch (err) {
      console.error(err);
      alert("Failed to update status.");
    }
  };

  const filtered = memberships.filter(m => 
    m.user?.name?.toLowerCase().includes(search.toLowerCase()) || 
    m.user?.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-black mb-2">Membership Management</h1>
          <p className="text-gray-600">Freeze, cancel, or modify user subscriptions directly.</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by User Name or Email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading Memberships...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-sm text-gray-500 uppercase tracking-wider">
                  <th className="pb-4 font-bold">User</th>
                  <th className="pb-4 font-bold">Plan</th>
                  <th className="pb-4 font-bold">Start / End</th>
                  <th className="pb-4 font-bold">Status</th>
                  <th className="pb-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4">
                      <div className="font-bold text-black">{m.user?.name}</div>
                      <div className="text-sm text-gray-500">{m.user?.email || m.user?.phone}</div>
                    </td>
                    <td className="py-4">
                      <div className="font-bold text-black">{m.plan?.name}</div>
                      <div className="text-sm text-gray-500">{m.plan?.monthlyCredits} Credits / mo</div>
                    </td>
                    <td className="py-4">
                      <div className="text-sm font-medium text-black">
                        {new Date(m.startDate).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        to {new Date(m.endDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-4">
                      <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                        m.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' :
                        m.status === 'FROZEN' ? 'bg-blue-50 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex justify-end gap-2">
                        {m.status !== 'FROZEN' && m.status !== 'CANCELLED' && (
                          <button 
                            onClick={() => handleStatusUpdate(m.id, "FROZEN")}
                            className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                            title="Freeze Membership"
                          >
                            <Snowflake size={18} />
                          </button>
                        )}
                        {m.status === 'FROZEN' && (
                          <button 
                            onClick={() => handleStatusUpdate(m.id, "ACTIVE")}
                            className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                            title="Unfreeze Membership"
                          >
                            <UserCheck size={18} />
                          </button>
                        )}
                        {m.status !== 'CANCELLED' && (
                          <button 
                            onClick={() => {
                                if (confirm("Are you sure you want to cancel this membership?")) {
                                    handleStatusUpdate(m.id, "CANCELLED");
                                }
                            }}
                            className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                            title="Cancel Membership"
                          >
                            <XCircle size={18} />
                          </button>
                        )}
                        <button 
                          onClick={() => alert("Transfer UI mocked for MVP.")}
                          className="p-2 text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors" 
                          title="Transfer Membership"
                        >
                          <ArrowRightLeft size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filtered.length === 0 && (
              <div className="text-center py-12 text-gray-500 font-medium">No memberships found.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
