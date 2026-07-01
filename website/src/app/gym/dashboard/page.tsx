"use client";

import GymGuard from "@/components/GymGuard";

export default function GymDashboardPage() {
  return (
    <GymGuard>
      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-12">
        <h1 className="text-4xl font-bold text-black mb-6">Partner Dashboard</h1>
        <div className="glass p-8 rounded-3xl border border-black/5">
          <p className="text-gray-600">
            Welcome to the ZonoFit Gym Partner Dashboard. 
            Here you can manage your facilities, track active check-ins, and view revenue.
          </p>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-black mb-2">Live Check-ins</h2>
              <p className="text-sm text-gray-500">Verify user passes and monitor active visits in real-time.</p>
              <div className="mt-4 text-3xl font-bold text-primary">12 Active</div>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-black mb-2">Monthly Revenue</h2>
              <p className="text-sm text-gray-500">Your total revenue share from completed visits.</p>
              <div className="mt-4 text-3xl font-bold text-black">₹45,200</div>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-black mb-2">Facility Details</h2>
              <p className="text-sm text-gray-500">Update your gym's photos, amenities, and credit pricing.</p>
            </div>
          </div>
        </div>
      </div>
    </GymGuard>
  );
}
