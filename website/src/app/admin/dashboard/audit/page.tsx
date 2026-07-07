"use client";

import { useEffect, useState } from "react";
import { FileText, Shield } from "lucide-react";

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const token = localStorage.getItem("zonofit_portal_token");
        const res = await fetch("/api/admin/audit-logs", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setLogs(data.logs || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-black mb-2">Audit Logs</h1>
        <p className="text-gray-600">Track all administrative actions performed across the platform.</p>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading Audit Logs...</div>
        ) : (
          <div className="space-y-4">
            {logs.length > 0 ? logs.map((log) => (
              <div key={log.id} className="flex gap-4 p-4 hover:bg-gray-50 rounded-2xl transition-colors border border-transparent hover:border-gray-100">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Shield size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-black">{log.admin?.name || "Unknown Admin"}</span>
                    <span className="text-gray-500 text-sm">performed</span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-bold rounded-md">
                      {log.actionType}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">{log.details}</div>
                  <div className="text-xs text-gray-400 font-medium">
                    {new Date(log.createdAt).toLocaleString()} â€¢ Target ID: {log.targetId || "System"}
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-12 text-gray-500 font-medium">No audit logs recorded yet.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
