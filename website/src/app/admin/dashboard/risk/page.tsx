"use client";

import { ShieldAlert, AlertTriangle, ShieldCheck } from "lucide-react";

export default function AdminRiskPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-black mb-2">Fraud & Risk Control</h1>
        <p className="text-gray-600">Monitor suspicious activities, referral abuse, and multiple accounts.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-red-50 p-6 rounded-3xl border border-red-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center">
              <AlertTriangle size={20} />
            </div>
            <h3 className="font-bold text-red-900">Suspicious Logins</h3>
          </div>
          <div className="text-3xl font-black text-red-700 mb-2">0</div>
          <p className="text-sm text-red-800">Multiple accounts from same device (24h)</p>
        </div>

        <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
              <ShieldAlert size={20} />
            </div>
            <h3 className="font-bold text-orange-900">Coupon Abuse</h3>
          </div>
          <div className="text-3xl font-black text-orange-700 mb-2">0</div>
          <p className="text-sm text-orange-800">Failed coupon farming attempts</p>
        </div>

        <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
              <ShieldCheck size={20} />
            </div>
            <h3 className="font-bold text-emerald-900">System Secure</h3>
          </div>
          <div className="text-3xl font-black text-emerald-700 mb-2">Safe</div>
          <p className="text-sm text-emerald-800">No active threats detected</p>
        </div>
      </div>

      <div className="bg-white p-12 rounded-3xl border border-gray-100 shadow-sm text-center">
        <div className="w-16 h-16 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-xl font-bold text-black mb-2">No Alerts</h2>
        <p className="text-gray-500 max-w-md mx-auto">
          The risk monitoring system has not flagged any suspicious behavior in the past 7 days.
        </p>
      </div>
    </div>
  );
}
