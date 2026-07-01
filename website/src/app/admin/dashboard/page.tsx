"use client";

import AdminGuard from "@/components/AdminGuard";

export default function AdminDashboardPage() {
  return (
    <AdminGuard>
      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-12">
        <h1 className="text-4xl font-bold text-white mb-6">System Administration</h1>
        <div className="glass p-8 rounded-3xl">
          <p className="text-gray-300">
            Welcome to the ZonoFit Admin Dashboard. 
            Only the verified official ZonoFit admin can view this page.
          </p>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-black/40 border border-white/5 rounded-2xl p-6">
              <h2 className="text-xl font-semibold text-white mb-2">Gym Management</h2>
              <p className="text-sm text-gray-400">Approve, reject, and manage partner gyms.</p>
            </div>
            <div className="bg-black/40 border border-white/5 rounded-2xl p-6">
              <h2 className="text-xl font-semibold text-white mb-2">User Management</h2>
              <p className="text-sm text-gray-400">View active users and membership analytics.</p>
            </div>
            <div className="bg-black/40 border border-white/5 rounded-2xl p-6">
              <h2 className="text-xl font-semibold text-white mb-2">Platform Settings</h2>
              <p className="text-sm text-gray-400">Configure global credit pricing and limits.</p>
            </div>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
