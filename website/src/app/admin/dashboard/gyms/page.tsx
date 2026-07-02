"use client";

import { useEffect, useState } from "react";
import { Search, CheckCircle, XCircle, TrendingUp, Ban } from "lucide-react";

export default function AdminGymsPage() {
  const [gyms, setGyms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchGyms = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:8000/api/admin/gyms", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setGyms(data.gyms || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGyms();
  }, []);

  const handleStatusUpdate = async (gymId: string, isVerified: boolean, isActive: boolean) => {
    const token = localStorage.getItem("token");
    try {
      await fetch(`http://localhost:8000/api/admin/gyms/${gymId}/status`, {
        method: "PUT",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ isVerified, isActive })
      });
      fetchGyms();
    } catch (err) {
      console.error(err);
      alert("Failed to update status.");
    }
  };

  const filteredGyms = gyms.filter(g => 
    g.name?.toLowerCase().includes(search.toLowerCase()) || 
    g.city?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-black mb-2">Gym Management</h1>
          <p className="text-gray-600">Review applications, approve partners, and monitor gym performance.</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by Gym Name or City..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading Gyms...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-sm text-gray-500 uppercase tracking-wider">
                  <th className="pb-4 font-bold">Gym Info</th>
                  <th className="pb-4 font-bold">Category</th>
                  <th className="pb-4 font-bold">Visits</th>
                  <th className="pb-4 font-bold">Credit Cost</th>
                  <th className="pb-4 font-bold">Status</th>
                  <th className="pb-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredGyms.map((gym) => (
                  <tr key={gym.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4">
                      <div className="font-bold text-black">{gym.name}</div>
                      <div className="text-sm text-gray-500">{gym.city}, {gym.state}</div>
                    </td>
                    <td className="py-4">
                      <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold">
                        {gym.category}
                      </span>
                    </td>
                    <td className="py-4 font-medium text-black">
                      {gym._count?.bookings || 0}
                    </td>
                    <td className="py-4 font-bold text-black">
                      {gym.creditCost}
                    </td>
                    <td className="py-4">
                      {gym.isVerified ? (
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold flex items-center gap-1 w-fit">
                          <CheckCircle size={14} /> Verified
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-orange-50 text-orange-700 rounded-lg text-xs font-bold flex items-center gap-1 w-fit">
                          Pending Approval
                        </span>
                      )}
                    </td>
                    <td className="py-4">
                      <div className="flex justify-end gap-2">
                        {!gym.isVerified ? (
                          <button 
                            onClick={() => handleStatusUpdate(gym.id, true, true)}
                            className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                            title="Approve Gym"
                          >
                            <CheckCircle size={18} />
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleStatusUpdate(gym.id, false, false)}
                            className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                            title="Revoke Verification"
                          >
                            <XCircle size={18} />
                          </button>
                        )}
                        <button className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors" title="View Performance">
                          <TrendingUp size={18} />
                        </button>
                        {gym.isActive ? (
                          <button 
                            onClick={() => handleStatusUpdate(gym.id, gym.isVerified, false)}
                            className="p-2 text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
                            title="Suspend Gym"
                          >
                            <Ban size={18} />
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleStatusUpdate(gym.id, gym.isVerified, true)}
                            className="p-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            title="Unsuspend Gym"
                          >
                            <Ban size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
