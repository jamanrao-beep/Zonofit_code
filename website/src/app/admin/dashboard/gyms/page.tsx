"use client";

import { useEffect, useState } from "react";
import { Search, CheckCircle, XCircle, TrendingUp, Ban, Check, X } from "lucide-react";

export default function AdminGymsPage() {
  const [gyms, setGyms] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchGyms = async () => {
    try {
      const token = localStorage.getItem("zonofit_portal_token");
      const res = await fetch("/api/admin/gyms", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setGyms(data.gyms || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchApplications = async () => {
    try {
      const token = localStorage.getItem("zonofit_portal_token");
      const res = await fetch("/api/admin/gym-applications", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setApplications(data.applications || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGyms();
    fetchApplications();
  }, []);

  const handleStatusUpdate = async (gymId: string, isVerified: boolean, isActive: boolean) => {
    const token = localStorage.getItem("zonofit_portal_token");
    try {
      await fetch(`/api/admin/gyms/${gymId}/status`, {
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

  const handleAppUpdate = async (appId: string, status: string) => {
    const token = localStorage.getItem("zonofit_portal_token");
    try {
      await fetch(`/api/admin/gym-applications/${appId}`, {
        method: "PUT",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status })
      });
      fetchApplications();
      fetchGyms();
    } catch (err) {
      console.error(err);
      alert("Failed to update application.");
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

      {applications.length > 0 && (
        <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100 shadow-sm">
          <h2 className="text-xl font-bold text-orange-900 mb-4">Pending Applications</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {applications.map(app => (
              <div key={app.id} className="bg-white p-4 rounded-2xl shadow-sm border border-orange-200">
                <div className="font-bold text-black text-lg">{app.gym?.name}</div>
                <div className="text-sm text-gray-600">{app.gym?.city} &bull; {app.gym?.address}</div>
                <div className="text-sm text-gray-500 mt-2">Owner: {app.gym?.owner?.name} ({app.gym?.owner?.email})</div>
                <div className="flex gap-2 mt-4">
                  <button 
                    onClick={() => handleAppUpdate(app.id, "APPROVED")}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Check size={16} /> Approve
                  </button>
                  <button 
                    onClick={() => handleAppUpdate(app.id, "REJECTED")}
                    className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                  >
                    <X size={16} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
                        {gym.category || 'Standard'}
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
                        <a 
                          href={`/admin/dashboard/gyms/${gym.id}`}
                          className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors inline-block" 
                          title="Manage Gym"
                        >
                          <TrendingUp size={18} />
                        </a>
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
