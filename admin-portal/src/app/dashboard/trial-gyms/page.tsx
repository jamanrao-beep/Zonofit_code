"use client";

import { useEffect, useState } from "react";
import { Plus, Dumbbell, MapPin, Users, Pencil, Trash } from "lucide-react";

export default function AdminTrialGymsPage() {
  const [trialGyms, setTrialGyms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    city: "",
    area: "",
    description: "",
    imageUrl: ""
  });
  const [saving, setSaving] = useState(false);

  const fetchTrialGyms = async () => {
    try {
      const token = localStorage.getItem("zonofit_portal_token");
      const res = await fetch("/api/admin/trial-gyms", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setTrialGyms(data.trialGyms || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrialGyms();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSaveTrialGym = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem("zonofit_portal_token");
      const url = editingId ? `/api/admin/trial-gyms/${editingId}` : "/api/admin/trial-gyms";
      const method = editingId ? "PUT" : "POST";

      await fetch(url, {
        method,
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });
      alert(editingId ? "Trial Gym updated successfully!" : "Trial Gym added successfully!");
      setShowForm(false);
      setEditingId(null);
      setFormData({ name: "", city: "", area: "", description: "", imageUrl: "" });
      fetchTrialGyms();
    } catch (err) {
      console.error(err);
      alert("Failed to save trial gym.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (gym: any) => {
    setFormData({
      name: gym.name,
      city: gym.city,
      area: gym.area,
      description: gym.description || "",
      imageUrl: gym.imageUrl || ""
    });
    setEditingId(gym.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this trial gym? This will also delete any votes associated with it.")) return;
    
    try {
      const token = localStorage.getItem("zonofit_portal_token");
      await fetch(`/api/admin/trial-gyms/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchTrialGyms();
    } catch (err) {
      console.error(err);
      alert("Failed to delete trial gym.");
    }
  };

  if (loading) return <div className="p-8 text-gray-500 font-medium">Loading Trial Gyms...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-black">Trial Gyms Manager</h1>
          <p className="text-gray-500 mt-1 text-sm">Propose new gym locations and gauge user interest via voting.</p>
        </div>
        <button 
          onClick={() => {
            setFormData({ name: "", city: "", area: "", description: "", imageUrl: "" });
            setEditingId(null);
            setShowForm(!showForm);
          }}
          className="bg-black hover:bg-gray-800 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors"
        >
          <Plus size={18} /> Add Trial Gym
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h2 className="text-xl font-bold text-black mb-4">{editingId ? "Edit Trial Gym" : "Propose a New Trial Gym"}</h2>
          <form onSubmit={handleSaveTrialGym} className="space-y-4 max-w-2xl">
            <div>
              <label className="block text-sm font-bold text-black mb-2">Gym Name</label>
              <input 
                type="text" 
                name="name"
                required
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g. FitPro Studio"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-black mb-2">City</label>
                <input 
                  type="text" 
                  name="city"
                  required
                  value={formData.city}
                  onChange={handleInputChange}
                  placeholder="e.g. Bangalore"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-black mb-2">Area</label>
                <input 
                  type="text" 
                  name="area"
                  required
                  value={formData.area}
                  onChange={handleInputChange}
                  placeholder="e.g. Koramangala"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-black mb-2">Image URL (Optional)</label>
              <input 
                type="text" 
                name="imageUrl"
                value={formData.imageUrl}
                onChange={handleInputChange}
                placeholder="https://s3.amazonaws.com/your-bucket/image.jpg"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-black mb-2">Description</label>
              <textarea 
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Why should users vote for this gym?"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black min-h-[100px]"
              />
            </div>
              <button 
                type="submit"
                disabled={saving}
                className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <Dumbbell size={18} /> {saving ? "Saving..." : (editingId ? "Update Trial Gym" : "Create Trial Gym")}
              </button>
              {editingId && (
                <button 
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setFormData({ name: "", city: "", area: "", description: "", imageUrl: "" });
                  }}
                  className="mt-2 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-bold transition-colors"
                >
                  Cancel Edit
                </button>
              )}
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {trialGyms.map(gym => (
          <div key={gym.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-start gap-4">
            {gym.imageUrl ? (
              <img src={gym.imageUrl} alt={gym.name} className="w-24 h-24 object-cover rounded-2xl bg-gray-100" />
            ) : (
              <div className="w-24 h-24 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400">
                <Dumbbell size={32} />
              </div>
            )}
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-xl text-black">{gym.name}</h3>
                <div className="flex gap-2">
                  <div className="bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-xl flex items-center gap-1.5 shadow-sm">
                    <Users size={14} className="text-emerald-700" />
                    <span className="text-emerald-800 font-bold text-sm">{gym._count?.votes || 0} Votes</span>
                  </div>
                  <button 
                    onClick={() => handleEdit(gym)}
                    className="p-1.5 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    title="Edit"
                  >
                    <Pencil size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(gym.id)}
                    className="p-1.5 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                    title="Delete"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              </div>
              <div className="flex items-center text-gray-500 text-sm mt-1">
                <MapPin size={14} className="mr-1" />
                {gym.area}, {gym.city}
              </div>
              <p className="text-sm text-gray-600 mt-3 line-clamp-2">{gym.description}</p>
            </div>
          </div>
        ))}
        
        {trialGyms.length === 0 && (
          <div className="col-span-full p-12 text-center text-gray-400 font-medium bg-white rounded-3xl border border-dashed border-gray-200">
            No trial gyms proposed yet. Click "Add Trial Gym" to create one.
          </div>
        )}
      </div>
    </div>
  );
}
