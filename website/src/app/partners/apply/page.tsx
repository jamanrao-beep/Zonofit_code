"use client";

import { useState } from "react";
import { Dumbbell, MapPin, Building, Activity, Send, CheckCircle, Clock, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ApplyPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    city: "",
    address: "",
    description: "",
    tagline: "",
    logoUrl: "",
    coverImageUrl: "",
    landmark: "",
    area: "",
    establishedYear: "",
    gymSizeSqFt: "",
    trainerCount: "",
    branchesCount: "",
    facilities: "",
    services: "",
    rules: ""
  });
  
  const [operatingHours, setOperatingHours] = useState([
    { dayOfWeek: 1, startTime: "06:00", endTime: "22:00", capacity: 50 }
  ]);
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const addTimeSlot = () => {
    setOperatingHours([...operatingHours, { dayOfWeek: 1, startTime: "06:00", endTime: "22:00", capacity: 50 }]);
  };

  const removeTimeSlot = (index: number) => {
    setOperatingHours(operatingHours.filter((_, i) => i !== index));
  };

  const updateTimeSlot = (index: number, field: string, value: any) => {
    const newHours = [...operatingHours];
    newHours[index] = { ...newHours[index], [field]: value };
    setOperatingHours(newHours);
  };

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

      // Convert comma separated strings to arrays
      const payload = {
        ...formData,
        facilities: formData.facilities.split(",").map(i => i.trim()).filter(Boolean),
        services: formData.services.split(",").map(i => i.trim()).filter(Boolean),
        rules: formData.rules.split(",").map(i => i.trim()).filter(Boolean),
        operatingHours
      };

      const res = await fetch("/api/gyms/applications", {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
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

  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return (
    <div className="min-h-[calc(100vh-80px)] pt-24 pb-20 bg-gray-50">
      <div className="max-w-4xl mx-auto px-6">
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
          <form className="space-y-10" onSubmit={handleSubmit}>
            {/* Basic Information */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-black border-b pb-2 flex items-center gap-2">
                <Dumbbell size={20} className="text-primary" /> Basic Information
              </h2>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Gym Name</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="e.g. Iron Paradise" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Tagline</label>
                  <input type="text" value={formData.tagline} onChange={(e) => setFormData({...formData, tagline: e.target.value})} placeholder="e.g. Premium Strength & Fitness" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
                <textarea required rows={3} value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Tell us about your gym, equipment, and vibe..." className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"></textarea>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Logo URL (Optional)</label>
                  <input type="url" value={formData.logoUrl} onChange={(e) => setFormData({...formData, logoUrl: e.target.value})} placeholder="https://..." className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Cover Image URL (Optional)</label>
                  <input type="url" value={formData.coverImageUrl} onChange={(e) => setFormData({...formData, coverImageUrl: e.target.value})} placeholder="https://..." className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-black border-b pb-2 flex items-center gap-2">
                <MapPin size={20} className="text-primary" /> Location Details
              </h2>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Full Address</label>
                  <input type="text" required value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} placeholder="Street address..." className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">City</label>
                  <input type="text" required value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} placeholder="e.g. Mumbai" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Area / Locality</label>
                  <input type="text" required value={formData.area} onChange={(e) => setFormData({...formData, area: e.target.value})} placeholder="e.g. Andheri West" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Landmark</label>
                  <input type="text" value={formData.landmark} onChange={(e) => setFormData({...formData, landmark: e.target.value})} placeholder="Near..." className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
            </div>

            {/* Operating Hours & Capacity */}
            <div className="space-y-6">
              <div className="border-b pb-2 flex items-center justify-between">
                <h2 className="text-xl font-bold text-black flex items-center gap-2">
                  <Clock size={20} className="text-primary" /> Operating Hours & Capacity
                </h2>
                <button type="button" onClick={addTimeSlot} className="text-sm font-bold text-primary flex items-center gap-1 hover:text-primary-dark">
                  <Plus size={16} /> Add Slot
                </button>
              </div>
              
              <div className="space-y-4">
                {operatingHours.map((slot, idx) => (
                  <div key={idx} className="flex flex-wrap md:flex-nowrap items-end gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <div className="w-full md:w-1/4">
                      <label className="block text-xs font-bold text-gray-500 mb-1">Day</label>
                      <select value={slot.dayOfWeek} onChange={(e) => updateTimeSlot(idx, "dayOfWeek", Number(e.target.value))} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                        {daysOfWeek.map((day, i) => <option key={i} value={i}>{day}</option>)}
                      </select>
                    </div>
                    <div className="w-1/2 md:w-1/5">
                      <label className="block text-xs font-bold text-gray-500 mb-1">Start Time</label>
                      <input type="time" required value={slot.startTime} onChange={(e) => updateTimeSlot(idx, "startTime", e.target.value)} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                    <div className="w-1/2 md:w-1/5">
                      <label className="block text-xs font-bold text-gray-500 mb-1">End Time</label>
                      <input type="time" required value={slot.endTime} onChange={(e) => updateTimeSlot(idx, "endTime", e.target.value)} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                    <div className="w-full md:w-1/4">
                      <label className="block text-xs font-bold text-gray-500 mb-1">Capacity</label>
                      <input type="number" required min="1" value={slot.capacity} onChange={(e) => updateTimeSlot(idx, "capacity", Number(e.target.value))} placeholder="Slots" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                    {operatingHours.length > 1 && (
                      <button type="button" onClick={() => removeTimeSlot(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg mb-0.5">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Gym Details */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-black border-b pb-2 flex items-center gap-2">
                <Building size={20} className="text-primary" /> Gym Details
              </h2>
              
              <div className="grid md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Est. Year</label>
                  <input type="number" value={formData.establishedYear} onChange={(e) => setFormData({...formData, establishedYear: e.target.value})} placeholder="e.g. 2015" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Size (SqFt)</label>
                  <input type="number" value={formData.gymSizeSqFt} onChange={(e) => setFormData({...formData, gymSizeSqFt: e.target.value})} placeholder="e.g. 5000" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Trainers</label>
                  <input type="number" value={formData.trainerCount} onChange={(e) => setFormData({...formData, trainerCount: e.target.value})} placeholder="Count" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Branches</label>
                  <input type="number" value={formData.branchesCount} onChange={(e) => setFormData({...formData, branchesCount: e.target.value})} placeholder="Count" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Facilities (comma separated)</label>
                <input type="text" value={formData.facilities} onChange={(e) => setFormData({...formData, facilities: e.target.value})} placeholder="e.g. AC, Parking, Lockers" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Services (comma separated)</label>
                <input type="text" value={formData.services} onChange={(e) => setFormData({...formData, services: e.target.value})} placeholder="e.g. Personal Training, Diet Consultation" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Rules (comma separated)</label>
                <input type="text" value={formData.rules} onChange={(e) => setFormData({...formData, rules: e.target.value})} placeholder="e.g. Shoes Mandatory, No Smoking" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
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
