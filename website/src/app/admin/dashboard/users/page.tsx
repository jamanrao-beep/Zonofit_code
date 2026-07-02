"use client";

import { useEffect, useState } from "react";
import { Search, Ban, Gift, History, AlertTriangle } from "lucide-react";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [historyModal, setHistoryModal] = useState<{ open: boolean; data: any; user: any }>({ open: false, data: null, user: null });

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:8000/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAction = async (userId: string, action: string, payload: any = {}) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      await fetch(`http://localhost:8000/api/admin/users/${userId}/action`, {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ action, ...payload })
      });
      alert(`Action ${action} successful!`);
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert("Action failed.");
    }
  };

  const handleViewHistory = async (user: any) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:8000/api/admin/users/${user.id}/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setHistoryModal({ open: true, data, user });
    } catch (err) {
      console.error(err);
      alert("Failed to fetch history.");
    }
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(search.toLowerCase()) || 
    u.phone?.includes(search) || 
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-black mb-2">Users Module</h1>
          <p className="text-gray-600">Manage all users, view history, and perform administrative actions.</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by Name, Email, or Phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading Users...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-sm text-gray-500 uppercase tracking-wider">
                  <th className="pb-4 font-bold">User</th>
                  <th className="pb-4 font-bold">Membership</th>
                  <th className="pb-4 font-bold">Wallet</th>
                  <th className="pb-4 font-bold">Total Visits</th>
                  <th className="pb-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4">
                      <div className="font-bold text-black">{user.name}</div>
                      <div className="text-sm text-gray-500">{user.email || user.phone}</div>
                    </td>
                    <td className="py-4">
                      {user.membership?.status === "ACTIVE" ? (
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-100">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold">
                          {user.membership?.status || "NONE"}
                        </span>
                      )}
                    </td>
                    <td className="py-4">
                      <div className="font-bold text-black">{user.wallet?.balance || 0} Credits</div>
                      <div className="text-xs text-gray-500">₹{(user.wallet?.convertibleCashBalanceInPaise || 0) / 100} Cash</div>
                    </td>
                    <td className="py-4">
                      <div className="font-medium text-black">{user._count?.bookings || 0} visits</div>
                    </td>
                    <td className="py-4">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => {
                            const val = prompt("Enter credits to grant:");
                            if (val && !isNaN(parseInt(val))) {
                              handleAction(user.id, "GRANT_CREDITS", { credits: val });
                            }
                          }}
                          className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Grant Credits"
                        >
                          <Gift size={18} />
                        </button>
                        <button 
                          onClick={() => handleViewHistory(user)}
                          className="p-2 text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors" 
                          title="View History"
                        >
                          <History size={18} />
                        </button>
                        <button 
                          onClick={() => {
                            if (confirm(`Are you sure you want to ${user.isSuspended ? 'UNSUSPEND' : 'SUSPEND'} this user?`)) {
                              handleAction(user.id, "SUSPEND");
                            }
                          }}
                          className={`p-2 rounded-lg transition-colors ${
                            user.isSuspended 
                              ? 'text-white bg-red-600 hover:bg-red-700' 
                              : 'text-red-600 bg-red-50 hover:bg-red-100'
                          }`} 
                          title={user.isSuspended ? "Unsuspend User" : "Suspend User"}
                        >
                          <Ban size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredUsers.length === 0 && (
              <div className="text-center py-12 text-gray-500 font-medium">No users found.</div>
            )}
          </div>
        )}
      </div>

      {historyModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">History for {historyModal.user?.name}</h2>
            
            <h3 className="font-bold text-gray-500 uppercase tracking-wider text-sm mb-3">Recent Bookings</h3>
            <div className="space-y-3 mb-8">
              {historyModal.data?.bookings?.length > 0 ? historyModal.data.bookings.map((b: any) => (
                <div key={b.id} className="p-3 bg-gray-50 rounded-xl flex justify-between">
                  <span className="font-bold">{b.gym?.name}</span>
                  <span className="text-gray-500 text-sm">{new Date(b.createdAt).toLocaleDateString()}</span>
                </div>
              )) : <p className="text-gray-500">No recent bookings.</p>}
            </div>

            <h3 className="font-bold text-gray-500 uppercase tracking-wider text-sm mb-3">Recent Transactions</h3>
            <div className="space-y-3 mb-8">
              {historyModal.data?.transactions?.length > 0 ? historyModal.data.transactions.map((t: any) => (
                <div key={t.id} className="p-3 bg-gray-50 rounded-xl flex justify-between">
                  <span className="font-bold">{t.type} <span className="text-gray-500 font-normal">({t.description})</span></span>
                  <span className={t.amount > 0 ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>
                    {t.amount > 0 ? '+' : ''}{t.amount}
                  </span>
                </div>
              )) : <p className="text-gray-500">No recent transactions.</p>}
            </div>

            <div className="flex justify-end">
              <button 
                onClick={() => setHistoryModal({ open: false, data: null, user: null })}
                className="bg-black text-white px-6 py-2 rounded-xl font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
