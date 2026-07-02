"use client";

import GymGuard from "@/components/GymGuard";
import { useEffect, useState } from "react";

export default function MembersPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://localhost:8000/api/gyms/analytics/members", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.members) {
          setMembers(data.members);
        }
      } catch (err) {
        console.error("Failed to fetch members", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, []);

  return (
    <GymGuard>
      <div className="max-w-6xl mx-auto w-full px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">Members</h1>
          <p className="text-gray-600">
            View and manage users acquired through the ZonoFit network.
          </p>
        </div>

        <div className="glass rounded-3xl border border-gray-100 shadow-sm overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-4 px-6">Member Name</th>
                  <th className="py-4 px-6">Active Plan</th>
                  <th className="py-4 px-6">Joined Date</th>
                  <th className="py-4 px-6">Total Visits</th>
                  <th className="py-4 px-6">Last Check-In</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={5} className="text-center py-12 text-gray-400">Loading...</td></tr>
                ) : (
                  members.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-bold text-black">{member.name}</div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                          {member.plan}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-600">{member.joined}</td>
                      <td className="py-4 px-6 text-sm text-gray-600">{member.visits}</td>
                      <td className="py-4 px-6 text-sm text-gray-600">{member.lastVisit}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {!loading && members.length === 0 && (
            <div className="text-center py-12 text-gray-500 font-medium">
              No members found yet.
            </div>
          )}
        </div>
      </div>
    </GymGuard>
  );
}
