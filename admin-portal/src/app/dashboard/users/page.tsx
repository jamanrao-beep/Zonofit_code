"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Search,
  Ban,
  Gift,
  History,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  Shield,
  Eye,
  X,
  Copy,
  Check,
  Flame,
  CreditCard,
  Building2,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  MessageSquare,
} from "lucide-react";

function formatDobDisplay(dob: string | Date | null | undefined): { text: string; ageText: string } {
  if (!dob) return { text: "Not provided", ageText: "" };
  try {
    let d: Date;
    if (typeof dob === "string") {
      const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(dob.trim());
      if (slash) {
        d = new Date(Date.UTC(Number(slash[3]), Number(slash[2]) - 1, Number(slash[1]), 12, 0, 0));
      } else {
        d = new Date(dob);
      }
    } else {
      d = new Date(dob);
    }
    if (isNaN(d.getTime())) return { text: String(dob), ageText: "" };
    const text = d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    const diffMs = Date.now() - d.getTime();
    const age = Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
    return { text, ageText: age > 0 ? `${age}y` : "" };
  } catch {
    return { text: String(dob), ageText: "" };
  }
}

function formatIndianPhone(phone: string | null | undefined): string {
  if (!phone) return "Not provided";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return phone;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"MEMBER" | "GYM_OWNER" | "ADMIN" | "ALL">("MEMBER");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [copiedField, setCopiedField] = useState<string | null>(null);

  // User Profile Drawer / Modal State
  const [profileModal, setProfileModal] = useState<{
    open: boolean;
    user: any;
    data: any;
    loading: boolean;
    activeTab: "profile" | "bookings" | "transactions" | "presence";
  }>({
    open: false,
    user: null,
    data: null,
    loading: false,
    activeTab: "profile",
  });

  const copyToClipboard = (text: string, fieldId: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

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
      const res = await fetch(`/api/admin/users/${userId}/action`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, ...payload }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.message || `Action ${action} failed.`);
        return;
      }
      alert(`Action ${action} successful!`);
      fetchUsers(currentPage, roleFilter, debouncedSearch);
      if (profileModal.open && profileModal.user?.id === userId) {
        handleOpenUserProfile(profileModal.user);
      }
    } catch (err) {
      console.error(err);
      alert("Action failed.");
    }
  };

  const handleOpenUserProfile = async (user: any) => {
    setProfileModal({
      open: true,
      user,
      data: null,
      loading: true,
      activeTab: "profile",
    });

    try {
      const token = localStorage.getItem("zonofit_portal_token");
      const res = await fetch(`/api/admin/users/${user.id}/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setProfileModal((prev) => ({
        ...prev,
        user: data.user || user,
        data,
        loading: false,
      }));
    } catch (err) {
      console.error("Failed to load user details:", err);
      setProfileModal((prev) => ({ ...prev, loading: false }));
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
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 min-w-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-black tracking-tight">
            Users & Member Directory
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Complete profile management, phone & DOB records, access verification, and administrative controls.
          </p>
        </div>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
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
              setRoleFilter("ADMIN");
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              roleFilter === "ADMIN"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Admins
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

        {/* Search Bar */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by Name, Mobile, Email, DOB, City, Gym..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black text-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-500 font-medium">
            <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading Users (Page {currentPage})...
          </div>
        ) : (
          <div className="space-y-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider font-semibold">
                    <th className="pb-3 pl-2">User / Identity</th>
                    <th className="pb-3">Contact Details</th>
                    <th className="pb-3">DOB & Age</th>
                    <th className="pb-3">Location</th>
                    <th className="pb-3">Membership</th>
                    <th className="pb-3">Wallet & Credits</th>
                    <th className="pb-3">Visits & Streak</th>
                    <th className="pb-3 pr-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm">
                  {users.map((user) => {
                    const dobInfo = formatDobDisplay(user.dob);
                    const formattedPhone = formatIndianPhone(user.phone);

                    return (
                      <tr
                        key={user.id}
                        onClick={() => handleOpenUserProfile(user)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      >
                        {/* Member Identity */}
                        <td className="py-4 pl-2">
                          <div className="flex items-center gap-3">
                            {user.avatarUrl ? (
                              <img
                                src={user.avatarUrl}
                                alt={user.name}
                                className="w-10 h-10 rounded-full object-cover border border-gray-200 shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center shrink-0 border border-slate-200 text-sm">
                                {user.name ? user.name.slice(0, 2).toUpperCase() : "U"}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900 truncate">{user.name}</span>
                                {user.isSuspended && (
                                  <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-bold">
                                    SUSPENDED
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {user.systemRole === "GYM_OWNER" ? (
                                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-md text-[11px] font-bold">
                                    PARTNER
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
                                <span className="text-gray-400 text-xs font-mono">
                                  #{user.id.slice(0, 6)}
                                </span>
                              </div>
                              {user.gymsOwned && user.gymsOwned.length > 0 && (
                                <div className="text-xs text-purple-700 font-semibold mt-0.5 flex items-center gap-1">
                                  <Building2 size={12} />
                                  <span>{user.gymsOwned.map((g: any) => g.name).join(", ")}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Contact Details */}
                        <td className="py-4" onClick={(e) => e.stopPropagation()}>
                          <div className="space-y-1">
                            {user.phone ? (
                              <div className="flex items-center gap-1.5 text-xs text-gray-900 font-medium">
                                <Phone size={13} className="text-emerald-600 shrink-0" />
                                <a
                                  href={`tel:${user.phone}`}
                                  className="hover:underline hover:text-emerald-700"
                                >
                                  {formattedPhone}
                                </a>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(user.phone, `phone-${user.id}`)}
                                  className="p-1 text-gray-400 hover:text-gray-700 transition-colors"
                                  title="Copy Mobile Number"
                                >
                                  {copiedField === `phone-${user.id}` ? (
                                    <Check size={12} className="text-emerald-600" />
                                  ) : (
                                    <Copy size={12} />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <div className="text-xs text-gray-400 flex items-center gap-1">
                                <Phone size={13} />
                                <span>No phone</span>
                              </div>
                            )}

                            {user.email ? (
                              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                <Mail size={13} className="text-blue-500 shrink-0" />
                                <span className="truncate max-w-[160px]">{user.email}</span>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(user.email, `email-${user.id}`)}
                                  className="p-1 text-gray-400 hover:text-gray-700 transition-colors"
                                  title="Copy Email"
                                >
                                  {copiedField === `email-${user.id}` ? (
                                    <Check size={12} className="text-emerald-600" />
                                  ) : (
                                    <Copy size={12} />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <div className="text-xs text-gray-400 flex items-center gap-1">
                                <Mail size={13} />
                                <span>No email</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* DOB & Age */}
                        <td className="py-4">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={13} className="text-gray-400 shrink-0" />
                            <span className="font-medium text-gray-900 text-xs">
                              {dobInfo.text}
                            </span>
                          </div>
                          {dobInfo.ageText && (
                            <div className="text-[11px] text-gray-500 font-semibold mt-0.5 ml-4">
                              {dobInfo.ageText} {user.gender ? `• ${user.gender}` : ""}
                            </div>
                          )}
                        </td>

                        {/* Location */}
                        <td className="py-4">
                          <div className="flex items-center gap-1.5 text-xs text-gray-800">
                            <MapPin size={13} className="text-rose-500 shrink-0" />
                            <span className="font-medium">
                              {user.city || user.state
                                ? `${user.city || ""}${user.city && user.state ? ", " : ""}${user.state || ""}`
                                : "Not provided"}
                            </span>
                          </div>
                        </td>

                        {/* Membership & Plan */}
                        <td className="py-4">
                          {user.systemRole === "GYM_OWNER" ? (
                            <span className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-bold border border-purple-100">
                              PARTNER
                            </span>
                          ) : user.membership?.status === "ACTIVE" ? (
                            <div>
                              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-xs font-bold border border-emerald-100">
                                ACTIVE
                              </span>
                              <div className="text-xs font-semibold text-gray-900 mt-1">
                                {user.membership?.plan?.name || "Pass Active"}
                              </div>
                              {user.membership?.primaryGym && (
                                <div className="text-[11px] text-gray-500">
                                  {user.membership.primaryGym.name}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold">
                              {user.membership?.status || "NONE"}
                            </span>
                          )}
                        </td>

                        {/* Wallet & Credits */}
                        <td className="py-4">
                          <div className="font-bold text-gray-900 text-sm">
                            {user.wallet?.balance || 0} Credits
                          </div>
                          <div className="text-xs text-gray-500">
                            ₹{((user.wallet?.convertibleCashBalanceInPaise || 0) / 100).toFixed(2)} Cash
                          </div>
                        </td>

                        {/* Visits & Streak */}
                        <td className="py-4">
                          <div className="font-semibold text-gray-900 text-xs">
                            {user._count?.bookings || 0} visits
                          </div>
                          {(user.streak || 0) > 0 && (
                            <div className="text-xs font-bold text-amber-600 flex items-center gap-1 mt-0.5">
                              <Flame size={12} className="text-amber-500" />
                              <span>{user.streak}d streak</span>
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-4 pr-2 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end items-center gap-1.5">
                            <button
                              onClick={() => handleOpenUserProfile(user)}
                              className="p-2 text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
                              title="View Full Profile Details"
                            >
                              <Eye size={17} />
                            </button>
                            <button
                              onClick={() => {
                                const val = prompt(`Enter credits to grant to ${user.name}:`);
                                if (val && !isNaN(parseInt(val))) {
                                  handleAction(user.id, "GRANT_CREDITS", { credits: val });
                                }
                              }}
                              className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
                              title="Grant Credits"
                            >
                              <Gift size={17} />
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
                              className={`p-2 rounded-xl transition-colors ${
                                user.isSuspended
                                  ? "text-white bg-red-600 hover:bg-red-700"
                                  : "text-red-600 bg-red-50 hover:bg-red-100"
                              }`}
                              title={user.isSuspended ? "Unsuspend User" : "Suspend User"}
                            >
                              <Ban size={17} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {users.length === 0 && (
                <div className="text-center py-16 text-gray-500 font-medium">No users found.</div>
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

      {/* ───────────────────────────────────────────────────────────── */}
      {/* COMPREHENSIVE USER PROFILE MODAL / DRAWER */}
      {/* ───────────────────────────────────────────────────────────── */}
      {profileModal.open && profileModal.user && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col my-auto">
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white relative">
              <button
                onClick={() => setProfileModal({ open: false, user: null, data: null, loading: false, activeTab: "profile" })}
                className="absolute top-5 right-5 w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-gray-300 hover:text-white flex items-center justify-center transition-all"
              >
                <X size={18} />
              </button>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {profileModal.user.avatarUrl ? (
                  <img
                    src={profileModal.user.avatarUrl}
                    alt={profileModal.user.name}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-700 shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-slate-800 text-emerald-400 font-black text-2xl flex items-center justify-center shrink-0 border border-slate-700">
                    {profileModal.user.name ? profileModal.user.name.slice(0, 2).toUpperCase() : "U"}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-bold text-white tracking-tight">
                      {profileModal.user.name}
                    </h2>
                    {profileModal.user.systemRole === "GYM_OWNER" ? (
                      <span className="px-2.5 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-bold">
                        GYM PARTNER
                      </span>
                    ) : profileModal.user.systemRole === "ADMIN" ? (
                      <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-bold">
                        ADMIN
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold">
                        APP MEMBER
                      </span>
                    )}
                    {profileModal.user.isSuspended ? (
                      <span className="px-2.5 py-0.5 bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg text-xs font-bold">
                        SUSPENDED
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold">
                        ACTIVE ACCOUNT
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2">
                    <span className="font-mono">User ID: {profileModal.user.id}</span>
                    <span>•</span>
                    <span>
                      Joined:{" "}
                      {profileModal.user.createdAt
                        ? new Date(profileModal.user.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "N/A"}
                    </span>
                  </div>
                </div>

                {/* Quick Toolbar */}
                <div className="flex items-center gap-2 mt-2 sm:mt-0">
                  {profileModal.user.phone && (
                    <a
                      href={`tel:${profileModal.user.phone}`}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <Phone size={14} />
                      <span>Call</span>
                    </a>
                  )}
                  {profileModal.user.phone && (
                    <a
                      href={`https://wa.me/91${profileModal.user.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                    >
                      <MessageSquare size={14} />
                      <span>WhatsApp</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex gap-2 mt-6 border-t border-slate-800 pt-4 overflow-x-auto">
                <button
                  onClick={() => setProfileModal((prev) => ({ ...prev, activeTab: "profile" }))}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    profileModal.activeTab === "profile"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  Personal & Contact Details
                </button>
                <button
                  onClick={() => setProfileModal((prev) => ({ ...prev, activeTab: "bookings" }))}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    profileModal.activeTab === "bookings"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  Recent Bookings ({profileModal.data?.bookings?.length ?? "..."})
                </button>
                <button
                  onClick={() => setProfileModal((prev) => ({ ...prev, activeTab: "transactions" }))}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    profileModal.activeTab === "transactions"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  Credit Transactions
                </button>
                <button
                  onClick={() => setProfileModal((prev) => ({ ...prev, activeTab: "presence" }))}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    profileModal.activeTab === "presence"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  Location Alerts (Geofence)
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {profileModal.loading && (
                <div className="py-12 text-center text-gray-500 font-medium">
                  <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  Loading user records and history...
                </div>
              )}

              {!profileModal.loading && profileModal.activeTab === "profile" && (
                <div className="space-y-6">
                  {/* Grid: Personal Info + Membership + Wallet */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Card 1: Contact & Personal Info */}
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
                      <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
                        <UserIcon size={18} className="text-black" />
                        <h3 className="font-bold text-gray-900 text-sm">Personal & Contact Info</h3>
                      </div>

                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Mobile Number:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">
                              {formatIndianPhone(profileModal.user.phone)}
                            </span>
                            {profileModal.user.phone && (
                              <button
                                onClick={() => copyToClipboard(profileModal.user.phone, "modal-phone")}
                                className="p-1 text-gray-400 hover:text-gray-700"
                              >
                                {copiedField === "modal-phone" ? (
                                  <Check size={14} className="text-emerald-600" />
                                ) : (
                                  <Copy size={14} />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Email Address:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">
                              {profileModal.user.email || "Not provided"}
                            </span>
                            {profileModal.user.email && (
                              <button
                                onClick={() => copyToClipboard(profileModal.user.email, "modal-email")}
                                className="p-1 text-gray-400 hover:text-gray-700"
                              >
                                {copiedField === "modal-email" ? (
                                  <Check size={14} className="text-emerald-600" />
                                ) : (
                                  <Copy size={14} />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Date of Birth (DOB):</span>
                          <span className="font-bold text-gray-900">
                            {formatDobDisplay(profileModal.user.dob).text}{" "}
                            {formatDobDisplay(profileModal.user.dob).ageText && (
                              <span className="text-emerald-700 font-semibold text-xs ml-1">
                                ({formatDobDisplay(profileModal.user.dob).ageText})
                              </span>
                            )}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Gender:</span>
                          <span className="font-semibold text-gray-900">
                            {profileModal.user.gender || "Not provided"}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Emergency Contact:</span>
                          <span className="font-semibold text-gray-900">
                            {profileModal.user.emergencyContact
                              ? formatIndianPhone(profileModal.user.emergencyContact)
                              : "Not provided"}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">City & State:</span>
                          <span className="font-semibold text-gray-900">
                            {profileModal.user.city || profileModal.user.state
                              ? `${profileModal.user.city || ""}${profileModal.user.city && profileModal.user.state ? ", " : ""}${profileModal.user.state || ""}`
                              : "Not provided"}
                          </span>
                        </div>

                        {profileModal.user.address && (
                          <div className="pt-2 border-t border-slate-200">
                            <span className="text-gray-500 text-xs block mb-1">Full Address:</span>
                            <p className="text-xs text-gray-800 font-medium">
                              {profileModal.user.address}
                              {profileModal.user.pincode ? ` - ${profileModal.user.pincode}` : ""}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card 2: Membership & Primary Gym */}
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
                      <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
                        <Shield size={18} className="text-black" />
                        <h3 className="font-bold text-gray-900 text-sm">Membership & Access</h3>
                      </div>

                      {profileModal.user.membership ? (
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">Plan Name:</span>
                            <span className="font-bold text-gray-900">
                              {profileModal.user.membership.plan?.name || "Active Membership"}
                            </span>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">Status:</span>
                            <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${
                              profileModal.user.membership.status === "ACTIVE"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-gray-100 text-gray-700"
                            }`}>
                              {profileModal.user.membership.status}
                            </span>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">Primary Partner Gym:</span>
                            <span className="font-bold text-gray-900">
                              {profileModal.user.membership.primaryGym?.name || "None Assigned"}
                            </span>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">Cycle Progress:</span>
                            <span className="font-semibold text-gray-900">
                              Cycle {profileModal.user.membership.cycleNumber || 1} •{" "}
                              <span className="text-emerald-700 font-bold">
                                {profileModal.user.membership.completedVisits || 0} /{" "}
                                {profileModal.user.membership.mandatoryVisits || 10} Visits
                              </span>
                            </span>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">Valid Until:</span>
                            <span className="font-semibold text-gray-900">
                              {profileModal.user.membership.endDate
                                ? new Date(profileModal.user.membership.endDate).toLocaleDateString(
                                    "en-IN",
                                    { day: "numeric", month: "short", year: "numeric" }
                                  )
                                : "N/A"}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="py-8 text-center text-gray-500 text-sm">
                          No active membership plan on record.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card 3: Wallet & Economy */}
                  <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-emerald-100">
                      <div className="flex items-center gap-2">
                        <CreditCard size={18} className="text-emerald-700" />
                        <h3 className="font-bold text-gray-900 text-sm">Credit Wallet & Financial Power</h3>
                      </div>
                      <span className="text-xs text-emerald-800 font-bold">Fixed Peg: 1 Credit = ₹10</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm">
                        <span className="text-xs text-gray-500 font-semibold uppercase">Available Credits</span>
                        <div className="text-2xl font-black text-emerald-700 mt-1">
                          {profileModal.user.wallet?.balance || 0}
                        </div>
                        <span className="text-[11px] text-gray-500 mt-0.5 block">
                          ≈ ₹{((profileModal.user.wallet?.balance || 0) * 10).toLocaleString("en-IN")} Fitness Value
                        </span>
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm">
                        <span className="text-xs text-gray-500 font-semibold uppercase">Convertible Cash Balance</span>
                        <div className="text-2xl font-black text-gray-900 mt-1">
                          ₹{((profileModal.user.wallet?.convertibleCashBalanceInPaise || 0) / 100).toFixed(2)}
                        </div>
                        <span className="text-[11px] text-gray-500 mt-0.5 block">
                          Ready for non-gym partner usage
                        </span>
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm flex flex-col justify-center">
                        <span className="text-xs text-gray-500 font-semibold uppercase mb-2">Grant Fitness Credits</span>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            id="quickGrantInput"
                            placeholder="Amount"
                            className="w-24 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold focus:outline-none"
                          />
                          <button
                            onClick={() => {
                              const input = document.getElementById("quickGrantInput") as HTMLInputElement;
                              if (input && input.value) {
                                handleAction(profileModal.user.id, "GRANT_CREDITS", { credits: input.value });
                                input.value = "";
                              }
                            }}
                            className="px-3 py-1.5 bg-black hover:bg-gray-800 text-white rounded-lg text-xs font-bold transition-colors"
                          >
                            Grant
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 4: Habit Engine Progress */}
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-200 mb-4">
                      <Flame size={18} className="text-amber-500" />
                      <h3 className="font-bold text-gray-900 text-sm">Momentum & Habit Progress</h3>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                      <div className="p-3 bg-white rounded-xl border border-slate-200">
                        <span className="text-xs text-gray-500 font-medium">Current Streak</span>
                        <div className="text-xl font-black text-amber-600 mt-0.5">
                          🔥 {profileModal.user.streak || 0} Days
                        </div>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-slate-200">
                        <span className="text-xs text-gray-500 font-medium">Total Workouts</span>
                        <div className="text-xl font-black text-gray-900 mt-0.5">
                          {profileModal.user.totalWorkouts || 0}
                        </div>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-slate-200">
                        <span className="text-xs text-gray-500 font-medium">Training Hours</span>
                        <div className="text-xl font-black text-gray-900 mt-0.5">
                          {profileModal.user.trainingHours || 0} hrs
                        </div>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-slate-200">
                        <span className="text-xs text-gray-500 font-medium">Identity Stage</span>
                        <div className="text-sm font-bold text-emerald-700 mt-1">
                          {profileModal.user.identityStage || "Beginner"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Recent Bookings */}
              {!profileModal.loading && profileModal.activeTab === "bookings" && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                    Recent Bookings & Passes
                  </h3>
                  {profileModal.data?.bookings?.length > 0 ? (
                    <div className="space-y-2.5">
                      {profileModal.data.bookings.map((b: any) => (
                        <div
                          key={b.id}
                          className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900 text-sm">
                                {b.gym?.name || "Partner Gym"}
                              </span>
                              {b.tokenNumber && (
                                <span className="px-2 py-0.5 bg-black text-white rounded text-xs font-mono font-bold">
                                  Token #{b.tokenNumber}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                              <span>
                                {new Date(b.visitDate || b.createdAt).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>
                              <span>•</span>
                              <span>{b.timeSlot || "Standard Slot"}</span>
                              {b.gym?.city && <span>• {b.gym.city}</span>}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span
                              className={`px-3 py-1 rounded-lg text-xs font-bold ${
                                b.status === "CANCELLED"
                                  ? "bg-red-50 text-red-700 border border-red-200"
                                  : b.status === "COMPLETED"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : b.status === "CHECKED_IN"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-blue-50 text-blue-700 border border-blue-200"
                              }`}
                            >
                              {b.status}
                            </span>
                            <span className="text-xs text-gray-400 font-mono">
                              Pass: {b.passCode ? b.passCode.slice(0, 8) : "N/A"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-gray-500 text-sm">No bookings recorded yet.</div>
                  )}
                </div>
              )}

              {/* Tab 3: Transactions */}
              {!profileModal.loading && profileModal.activeTab === "transactions" && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                    Recent Wallet Credit Transactions
                  </h3>
                  {profileModal.data?.transactions?.length > 0 ? (
                    <div className="space-y-2.5">
                      {profileModal.data.transactions.map((t: any) => (
                        <div
                          key={t.id}
                          className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center"
                        >
                          <div>
                            <div className="font-bold text-gray-900 text-xs">
                              {t.type}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">{t.description}</div>
                            <div className="text-[11px] text-gray-400 mt-0.5">
                              {new Date(t.createdAt).toLocaleString("en-IN")}
                            </div>
                          </div>

                          <div className="text-right">
                            <div
                              className={`text-sm font-bold ${
                                t.amount > 0 ? "text-emerald-600" : "text-red-600"
                              }`}
                            >
                              {t.amount > 0 ? "+" : ""}
                              {t.amount} Credits
                            </div>
                            {t.balanceAfter !== undefined && (
                              <div className="text-[11px] text-gray-400">
                                Bal: {t.balanceAfter}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-gray-500 text-sm">
                      No wallet transactions recorded.
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4: Location Alerts (Geofence) */}
              {!profileModal.loading && profileModal.activeTab === "presence" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                      Location Presence & Geofence Checks
                    </h3>
                    <span className="text-xs text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      Unbooked Physical Presence Detection
                    </span>
                  </div>

                  {profileModal.data?.locationAlerts?.length > 0 ? (
                    <div className="space-y-2.5">
                      {profileModal.data.locationAlerts.map((a: any) => (
                        <div
                          key={a.id}
                          className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200/80 flex flex-col sm:flex-row justify-between sm:items-center gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                              <span className="font-bold text-gray-900 text-sm">
                                {a.gym?.name || "Partner Gym"}
                              </span>
                              <span className="text-xs text-amber-800 font-semibold">
                                ({a.distanceMeters}m away)
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Detected: {new Date(a.detectedAt).toLocaleString("en-IN")}
                              {a.gym?.city ? ` • ${a.gym.city}` : ""}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                                a.status === "RESOLVED"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : a.status === "CONTACTED"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {a.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-gray-500 text-sm">
                      <CheckCircle size={28} className="text-emerald-500 mx-auto mb-2" />
                      No unbooked presence anomalies detected for this member.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex flex-wrap justify-between items-center gap-3">
              <div className="text-xs text-gray-500">
                Clicking outside or tapping Close returns to the user directory.
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (
                      confirm(
                        `Are you sure you want to ${
                          profileModal.user.isSuspended ? "UNSUSPEND" : "SUSPEND"
                        } this user account?`
                      )
                    ) {
                      handleAction(profileModal.user.id, "SUSPEND");
                    }
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                    profileModal.user.isSuspended
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-red-600 hover:bg-red-700 text-white"
                  }`}
                >
                  {profileModal.user.isSuspended ? "Unsuspend Account" : "Suspend Account"}
                </button>
                <button
                  onClick={() =>
                    setProfileModal({ open: false, user: null, data: null, loading: false, activeTab: "profile" })
                  }
                  className="px-6 py-2 bg-black hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
