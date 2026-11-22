"use client";

import { useEffect, useState, useMemo } from "react";
import { Search, Ban, Gift, History, ChevronLeft, ChevronRight } from "lucide-react";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"MEMBER" | "GYM_OWNER" | "ALL">("MEMBER");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [historyModal, setHistoryModal] = useState<{ open: boolean; data: any; user: any }>({
    open: false,
    data: null,
    user: null,
  });

  // Debounce search input by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1); // Reset to page 1 on new search query
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchUsers = async (page = currentPage, role = roleFilter, searchQuery = debouncedSearch) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("zonofit_portal_token");
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
        ...(role !== "ALL" ? { role } : {}),
        ...(searchQuery.trim() ? { search: searchQuery.trim() } : {}),
      });

      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setUsers(data.users || []);

      if (data.pagination) {
        setPagination(data.pagination);
      } else {
        // Fallback calculation if backend does not return pagination object
        const total = (data.users || []).length;
        setPagination({
          page,
          limit: 10,
          total,
          totalPages: Math.ceil(total / 10) || 1,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(currentPage, roleFilter, debouncedSearch);
  }, [currentPage, roleFilter, debouncedSearch]);

  const handleAction = async (userId: string, action: string, payload: any = {}) => {
    const token = localStorage.getItem("zonofit_portal_token");
    if (!token) return;

    try {
      await fetch(`/api/admin/users/${userId}/action`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, ...payload }),
      });
      alert(`Action ${action} successful!`);
      fetchUsers(currentPage, roleFilter, debouncedSearch);
    } catch (err) {
      console.error(err);
      alert("Action failed.");
    }
  };

  const handleViewHistory = async (user: any) => {
    try {
      const token = localStorage.getItem("zonofit_portal_token");
      const res = await fetch(`/api/admin/users/${user.id}/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setHistoryModal({ open: true, data, user });
    } catch (err) {
      console.error(err);
      alert("Failed to fetch history.");
    }
  };

  // Helper to generate page number buttons (smart ellipsis for large numbers of pages)
  const pageNumbers = useMemo(() => {
    const total = pagination.totalPages;
    const current = currentPage;

    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    if (current <= 4) {
      return [1, 2, 3, 4, 5, "...", total];
    }

    if (current >= total - 3) {
      return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
    }

    return [1, "...", current - 1, current, current + 1, "...", total];
  }, [pagination.totalPages, currentPage]);

  const startRecord = pagination.total === 0 ? 0 : (currentPage - 1) * pagination.limit + 1;
  const endRecord = Math.min(currentPage * pagination.limit, pagination.total);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-black mb-2">Users Module</h1>
          <p className="text-gray-600">
            Manage all members, gym partners, view history, and perform administrative actions.
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
        {/* Role Filter Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-gray-100 pb-4">
          <button
            onClick={() => {
              setRoleFilter("MEMBER");
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              roleFilter === "MEMBER"
                ? "bg-black text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            App Members
          </button>
          <button
            onClick={() => {
              setRoleFilter("GYM_OWNER");
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              roleFilter === "GYM_OWNER"
                ? "bg-purple-600 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Gym Partners / Owners
          </button>
          <button
            onClick={() => {
              setRoleFilter("ALL");
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              roleFilter === "ALL"
                ? "bg-gray-800 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All Accounts
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by Name, Email, Phone, or Gym..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black text-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-500 font-medium">Loading Users (Page {currentPage})...</div>
        ) : (
          <div className="space-y-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-sm text-gray-500 uppercase tracking-wider">
                    <th className="pb-4 font-bold">User / Role</th>
                    <th className="pb-4 font-bold">Membership</th>
                    <th className="pb-4 font-bold">Wallet</th>
                    <th className="pb-4 font-bold">Total Visits</th>
                    <th className="pb-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-black">{user.name}</span>
                          {user.systemRole === "GYM_OWNER" ? (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-md text-[11px] font-bold">
                              GYM PARTNER
                            </span>
                          ) : user.systemRole === "ADMIN" ? (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md text-[11px] font-bold">
                              ADMIN
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[11px] font-bold">
                              MEMBER
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">{user.email || user.phone}</div>
                        {user.gymsOwned && user.gymsOwned.length > 0 && (
                          <div className="text-xs text-purple-700 font-semibold mt-0.5">
                            Gym: {user.gymsOwned.map((g: any) => g.name).join(", ")}
                          </div>
                        )}
                      </td>
                      <td className="py-4">
                        {user.systemRole === "GYM_OWNER" ? (
                          <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-bold border border-purple-100">
                            PARTNER ACCOUNT
                          </span>
                        ) : user.membership?.status === "ACTIVE" ? (
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
                        <div className="text-xs text-gray-500">
                          ₹{(user.wallet?.convertibleCashBalanceInPaise || 0) / 100} Cash
                        </div>
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
                              if (
                                confirm(
                                  `Are you sure you want to ${
                                    user.isSuspended ? "UNSUSPEND" : "SUSPEND"
                                  } this user?`
                                )
                              ) {
                                handleAction(user.id, "SUSPEND");
                              }
                            }}
                            className={`p-2 rounded-lg transition-colors ${
                              user.isSuspended
                                ? "text-white bg-red-600 hover:bg-red-700"
                                : "text-red-600 bg-red-50 hover:bg-red-100"
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

              {users.length === 0 && (
                <div className="text-center py-12 text-gray-500 font-medium">No users found.</div>
              )}
            </div>

            {/* Pagination Controls */}
            {pagination.total > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100">
                <div className="text-sm text-gray-500">
                  Showing <span className="font-semibold text-black">{startRecord}</span> to{" "}
                  <span className="font-semibold text-black">{endRecord}</span> of{" "}
                  <span className="font-semibold text-black">{pagination.total}</span> users
                </div>

                {pagination.totalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    {/* Previous Button */}
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1 || loading}
                      className="flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronLeft size={16} />
                      <span className="hidden sm:inline">Prev</span>
                    </button>

                    {/* Page Numbers */}
                    {pageNumbers.map((p, idx) =>
                      typeof p === "number" ? (
                        <button
                          key={p}
                          onClick={() => setCurrentPage(p)}
                          disabled={loading}
                          className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${
                            currentPage === p
                              ? "bg-black text-white shadow-sm"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          {p}
                        </button>
                      ) : (
                        <span key={`ellipsis-${idx}`} className="px-1 text-gray-400 font-bold">
                          ...
                        </span>
                      )
                    )}

                    {/* Next Button */}
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                      disabled={currentPage === pagination.totalPages || loading}
                      className="flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
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
              {historyModal.data?.bookings?.length > 0 ? (
                historyModal.data.bookings.map((b: any) => (
                  <div key={b.id} className="p-3 bg-gray-50 rounded-xl flex justify-between">
                    <span className="font-bold">{b.gym?.name}</span>
                    <span className="text-gray-500 text-sm">{new Date(b.createdAt).toLocaleDateString()}</span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No recent bookings.</p>
              )}
            </div>

            <h3 className="font-bold text-gray-500 uppercase tracking-wider text-sm mb-3">Recent Transactions</h3>
            <div className="space-y-3 mb-8">
              {historyModal.data?.transactions?.length > 0 ? (
                historyModal.data.transactions.map((t: any) => (
                  <div key={t.id} className="p-3 bg-gray-50 rounded-xl flex justify-between">
                    <span className="font-bold">
                      {t.type} <span className="text-gray-500 font-normal">({t.description})</span>
                    </span>
                    <span className={t.amount > 0 ? "text-emerald-600 font-bold" : "text-red-600 font-bold"}>
                      {t.amount > 0 ? "+" : ""}
                      {t.amount}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No recent transactions.</p>
              )}
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
