"use client";

import { useEffect, useState } from "react";
import { Plus, Tag, Trash2, Edit } from "lucide-react";

export default function AdminMarketplacePage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    pricePaise: "",
    imageUrl: "",
    inStock: true
  });
  const [saving, setSaving] = useState(false);

  const fetchItems = async () => {
    try {
      const token = localStorage.getItem("zonofit_portal_token");
      const res = await fetch("http://localhost:8000/api/admin/marketplace", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setItems(data.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem("zonofit_portal_token");
      await fetch("http://localhost:8000/api/admin/marketplace", {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });
      alert("Marketplace item added successfully!");
      setShowForm(false);
      setFormData({ title: "", description: "", pricePaise: "", imageUrl: "", inStock: true });
      fetchItems();
    } catch (err) {
      console.error(err);
      alert("Failed to create item.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-gray-500 font-medium">Loading Marketplace...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-black">Marketplace Management</h1>
          <p className="text-gray-500 mt-1 text-sm">Add and manage items sold in the ZonoFit Marketplace.</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-black hover:bg-gray-800 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors"
        >
          <Plus size={18} /> Add Item
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h2 className="text-xl font-bold text-black mb-4">Add New Item</h2>
          <form onSubmit={handleCreateItem} className="space-y-4 max-w-2xl">
            <div>
              <label className="block text-sm font-bold text-black mb-2">Title</label>
              <input 
                type="text" 
                name="title"
                required
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g. Premium Protein Shaker"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-black mb-2">Description</label>
              <textarea 
                name="description"
                required
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Item details..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black min-h-[100px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-black mb-2">Price (in Paise)</label>
                <input 
                  type="number" 
                  name="pricePaise"
                  required
                  value={formData.pricePaise}
                  onChange={handleInputChange}
                  placeholder="e.g. 29900 (for ₹299)"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-black mb-2">Image URL (S3 URL)</label>
                <input 
                  type="text" 
                  name="imageUrl"
                  required
                  value={formData.imageUrl}
                  onChange={handleInputChange}
                  placeholder="https://s3.amazonaws.com/your-bucket/image.jpg"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
                <p className="text-xs text-gray-400 mt-1">Paste the full public AWS S3 link here.</p>
              </div>
            </div>
            <button 
              type="submit"
              disabled={saving}
              className="mt-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <Tag size={18} /> {saving ? "Saving..." : "Save Item"}
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map(item => (
          <div key={item.id} className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm flex flex-col">
            <img src={item.imageUrl} alt={item.title} className="h-48 w-full object-cover bg-gray-100" />
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg text-black">{item.title}</h3>
                <span className="bg-emerald-50 text-emerald-700 font-bold text-sm px-2 py-1 rounded-lg">
                  ₹{(item.pricePaise / 100).toFixed(2)}
                </span>
              </div>
              <p className="text-sm text-gray-500 flex-1">{item.description}</p>
              
              <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                <span className={`text-xs font-bold px-2 py-1 rounded-md ${item.inStock ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {item.inStock ? 'In Stock' : 'Out of Stock'}
                </span>
                {/* Future: Add Edit/Delete Actions */}
                <div className="flex gap-2">
                  <button className="text-gray-400 hover:text-black p-1"><Edit size={16}/></button>
                  <button className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={16}/></button>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {items.length === 0 && (
          <div className="col-span-full p-12 text-center text-gray-400 font-medium bg-white rounded-3xl border border-dashed border-gray-200">
            No marketplace items found. Click "Add Item" to create one.
          </div>
        )}
      </div>
    </div>
  );
}
