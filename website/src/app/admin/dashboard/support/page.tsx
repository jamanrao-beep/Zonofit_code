"use client";

import { useEffect, useState } from "react";
import { MessageSquare, AlertCircle, CheckCircle2 } from "lucide-react";

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const token = localStorage.getItem("zonofit_portal_token");
        const res = await fetch("http://localhost:8000/api/admin/support", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setTickets(data.tickets || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-black mb-2">Support Center</h1>
        <p className="text-gray-600">Manage user issues, gym complaints, and resolve escalations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-red-50 p-6 rounded-3xl border border-red-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-red-600">
            <AlertCircle size={24} />
          </div>
          <div>
            <div className="text-sm font-bold text-red-900 uppercase">Open Tickets</div>
            <div className="text-2xl font-black text-red-700">{tickets.filter(t => t.status === "OPEN").length || 0}</div>
          </div>
        </div>
        <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600">
            <MessageSquare size={24} />
          </div>
          <div>
            <div className="text-sm font-bold text-blue-900 uppercase">In Progress</div>
            <div className="text-2xl font-black text-blue-700">{tickets.filter(t => t.status === "IN_PROGRESS").length || 0}</div>
          </div>
        </div>
        <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="text-sm font-bold text-emerald-900 uppercase">Resolved (Today)</div>
            <div className="text-2xl font-black text-emerald-700">0</div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading Tickets...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-sm text-gray-500 uppercase tracking-wider">
                  <th className="pb-4 font-bold">Ticket ID / Subject</th>
                  <th className="pb-4 font-bold">Reporter</th>
                  <th className="pb-4 font-bold">Priority</th>
                  <th className="pb-4 font-bold">Status</th>
                  <th className="pb-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4">
                      <div className="font-bold text-black">{ticket.subject}</div>
                      <div className="text-xs text-gray-500">#{ticket.id.slice(0, 8).toUpperCase()}</div>
                    </td>
                    <td className="py-4">
                      {ticket.user ? (
                        <div>
                          <div className="text-sm font-bold text-black">{ticket.user.name}</div>
                          <div className="text-xs text-gray-500">User</div>
                        </div>
                      ) : ticket.gym ? (
                        <div>
                          <div className="text-sm font-bold text-black">{ticket.gym.name}</div>
                          <div className="text-xs text-gray-500">Gym Partner</div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Unknown</span>
                      )}
                    </td>
                    <td className="py-4">
                      <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                        ticket.priority === 'URGENT' ? 'bg-red-50 text-red-700 border border-red-100' :
                        ticket.priority === 'HIGH' ? 'bg-orange-50 text-orange-700 border border-orange-100' :
                        'bg-blue-50 text-blue-700 border border-blue-100'
                      }`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="py-4">
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold">
                        {ticket.status}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <button className="px-4 py-2 bg-black text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-colors">
                        View & Reply
                      </button>
                    </td>
                  </tr>
                ))}
                {tickets.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-500 font-medium">No open support tickets.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
