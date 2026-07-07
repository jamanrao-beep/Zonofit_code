"use client";

import { Send, Users } from "lucide-react";
import { useState } from "react";

export default function AdminNotificationsPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [userId, setUserId] = useState("");
  const [sending, setSending] = useState(false);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const token = localStorage.getItem("zonofit_portal_token");
      await fetch("/api/admin/notifications/broadcast", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ title, body, userId: userId || undefined })
      });
      alert("Broadcast sent successfully!");
      setTitle("");
      setBody("");
      setUserId("");
    } catch (err) {
      console.error(err);
      alert("Failed to send broadcast.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-black mb-2">Global Notifications</h1>
        <p className="text-gray-600">Send alerts, promos, and system updates to all users or a specific individual.</p>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
        <h2 className="text-xl font-bold text-black mb-6 flex items-center gap-2">
          <Send className="text-emerald-500" /> New Broadcast
        </h2>

        <form onSubmit={handleBroadcast} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Notification Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Free Credits Weekend!"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Message Body</label>
            <textarea
              required
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={4}
              placeholder="Your message goes here..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-4">
            <Users className="text-blue-600 mt-1" />
            <div className="flex-1">
              <label className="block text-sm font-bold text-blue-900 mb-1">Target Specific User (Optional)</label>
              <p className="text-xs text-blue-700 mb-3">Leave this empty to blast this notification to EVERY active user.</p>
              <input
                type="text"
                value={userId}
                onChange={e => setUserId(e.target.value)}
                placeholder="User UUID"
                className="w-full bg-white border border-blue-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={sending}
              className="bg-black hover:bg-gray-800 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-md disabled:opacity-50"
            >
              <Send size={18} /> {sending ? "Sending..." : "Send Broadcast Now"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
