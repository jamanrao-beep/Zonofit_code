"use client";

import GymGuard from "@/components/GymGuard";
import { Send, Phone, Mail, Clock } from "lucide-react";
import { useState, useEffect } from "react";

export default function SupportPage() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);

  const fetchTickets = async () => {
    try {
      const token = localStorage.getItem("zonofit_portal_token");
      const res = await fetch("/api/gyms/support", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch (err) {
      console.error("Failed to fetch tickets", err);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !message) return alert("Please fill out both fields.");
    
    setLoading(true);
    try {
      const token = localStorage.getItem("zonofit_portal_token");
      await fetch("/api/gyms/support", {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ subject, message })
      });
      setSubject("");
      setMessage("");
      alert("Ticket submitted successfully!");
      fetchTickets();
    } catch (err) {
      console.error(err);
      alert("Failed to submit ticket.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <GymGuard>
      <div className="max-w-4xl mx-auto w-full px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">Support & Account Manager</h1>
          <p className="text-gray-600">
            Get help with your gym dashboard and bookings.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4">
              <Phone size={24} />
            </div>
            <h3 className="font-bold text-black mb-1">Call Support</h3>
            <p className="text-sm text-gray-500 mb-2">Mon-Sat, 9am - 8pm</p>
            <a href="tel:+919876543210" className="text-emerald-600 font-bold hover:underline">+91 98765 43210</a>
          </div>
          
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4">
              <Mail size={24} />
            </div>
            <h3 className="font-bold text-black mb-1">Email Us</h3>
            <p className="text-sm text-gray-500 mb-2">24/7 Support</p>
            <a href="mailto:partners@zonofit.com" className="text-emerald-600 font-bold hover:underline">partners@zonofit.com</a>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 mb-8">
          <h2 className="text-xl font-bold text-black mb-6">Send a Message</h2>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-bold text-black mb-2">Subject</label>
              <input 
                type="text" 
                placeholder="e.g. Issue with payout"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-black mb-2">Message</label>
              <textarea 
                rows={5}
                placeholder="Describe your issue in detail..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none"
                required
              ></textarea>
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-md w-full justify-center disabled:opacity-50"
            >
              {loading ? <Clock size={18} className="animate-spin" /> : <Send size={18} />} 
              {loading ? "Submitting..." : "Submit Request"}
            </button>
          </form>
        </div>

        {/* Tickets Table */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-black">Your Support Tickets</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-4 px-6">Ticket ID</th>
                  <th className="py-4 px-6">Subject</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tickets.map((ticket: any) => (
                  <tr key={ticket.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6 font-mono text-sm text-gray-600 truncate max-w-[120px]">
                      #{ticket.id.slice(0, 8)}
                    </td>
                    <td className="py-4 px-6 text-sm font-medium text-black">{ticket.subject}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-block px-3 py-1 text-xs font-bold rounded-full ${
                        ticket.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-700' : 
                        ticket.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-600">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {tickets.length === 0 && (
            <div className="text-center py-12 text-gray-500 font-medium">
              You haven't opened any support tickets yet.
            </div>
          )}
        </div>
      </div>
    </GymGuard>
  );
}
