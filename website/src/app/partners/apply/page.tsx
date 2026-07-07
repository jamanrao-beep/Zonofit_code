"use client";

import { useState } from "react";
import { Dumbbell, MapPin, Building, Activity, Send, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ApplyPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    city: "",
    address: "",
    description: "",
    totalSlots: "20"
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("zonofit_portal_token");
      if (!token) {
        alert("Please login first to submit an application.");
        router.push("/auth/login");
        return;
      }

      const res = await fetch("/api/gyms/applications", {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        setSuccess(true);
      } else {
        const err = await res.json();
        alert(err.message || "Failed to submit application");
      }
    } catch (err) {
      console.error(err);
      alert("Network error.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[calc(100vh-80px)] pt-24 pb-20 flex items-center justify-center bg-gray-50">
        <div className="bg-white p-10 rounded-3xl shadow-xl max-w-md w-full text-center">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} />
          </div>
          <h1 className="text-2xl font-bold text-black mb-4">Application Submitted!</h1>
          <p className="text-gray-600 mb-8">
            Your gym application has been sent to the ZonoFit team. We will review your details and get back to you shortly.
          </p>
          <Link href="/" className="bg-black hover:bg-gray-800 text-white px-8 py-3 rounded-full font-bold transition-all w-full block">
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] pt-24 pb-20 bg-gray-50">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-emerald-50 mb-4">
            <Activity size={14} className="text-primary" />
            <span className="text-xs font-bold text-primary uppercase tracking-wider">Partner Network</span>
          </div>
          <h1 className="text-4xl font-bold text-black mb-4">Register Your Gym</h1>
          <p className="text-gray-600">
            Join the ZonoFit network and start receiving members today. Fill out your gym details below.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-gray-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-black border-b pb-2 flex items-center gap-2">
                <Dumbbell size={20} className="text-primary" /> Basic Information
              </h2>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Gym Name</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. Iron Paradise"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">City</label>
                  <input 
                    type="text" 
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    placeholder="e.g. Mumbai"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Full Address</label>
                <div className="relative">
                  <MapPin size={18} className="absolute left-4 top-3.5 text-gray-400" />
                  <input 
                    type="text" 
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    placeholder="Street address, Locality..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
                <textarea 
                  required
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Tell us about your gym, equipment, and vibe..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Capacity (Slots per day)</label>
                <div className="relative">
                  <Building size={18} className="absolute left-4 top-3.5 text-gray-400" />
                  <input 
                    type="number" 
                    required
                    min="1"
                    value={formData.totalSlots}
                    onChange={(e) => setFormData({...formData, totalSlots: e.target.value})}
                    placeholder="e.g. 50"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t">
              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-dark text-white px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-[0_4px_20px_rgba(16,185,129,0.3)] disabled:opacity-50"
              >
                {loading ? "Submitting..." : (
                  <>Submit Application <Send size={18} /></>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
