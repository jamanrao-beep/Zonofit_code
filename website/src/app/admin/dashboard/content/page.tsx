"use client";

import { useEffect, useState } from "react";
import { Save, FileText } from "lucide-react";

export default function AdminContentPage() {
  const [content, setContent] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchContent = async () => {
    try {
      const token = localStorage.getItem("zonofit_portal_token");
      const res = await fetch("http://localhost:8000/api/admin/content", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      const contentMap: Record<string, string> = {};
      data.content.forEach((item: any) => {
        contentMap[item.key] = item.value;
      });
      setContent(contentMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContent();
  }, []);

  const handleSave = async (key: string, value: string) => {
    setSaving(true);
    try {
      const token = localStorage.getItem("zonofit_portal_token");
      await fetch("http://localhost:8000/api/admin/content", {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ key, value })
      });
      alert(`Content for ${key} saved successfully!`);
    } catch (err) {
      console.error(err);
      alert("Failed to save content.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-gray-500">Loading Content Manager...</div>;
  }

  const sections = [
    { key: "faq_general", title: "General FAQ" },
    { key: "terms_and_conditions", title: "Terms & Conditions" },
    { key: "app_announcement", title: "App Top Banner Announcement" }
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-black mb-2">Content Manager</h1>
        <p className="text-gray-600">Manage dynamic text across the application directly from the server.</p>
      </div>

      <div className="space-y-6">
        {sections.map((section) => (
          <div key={section.key} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h2 className="text-lg font-bold text-black mb-4 flex items-center gap-2">
              <FileText size={18} className="text-blue-600" />
              {section.title}
            </h2>
            <textarea
              value={content[section.key] || ""}
              onChange={(e) => setContent({ ...content, [section.key]: e.target.value })}
              rows={4}
              placeholder={`Enter content for ${section.title}...`}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-black mb-4 font-mono"
            />
            <div className="flex justify-end">
              <button 
                onClick={() => handleSave(section.key, content[section.key] || "")}
                disabled={saving}
                className="bg-black text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-800 transition-colors shadow-md disabled:opacity-50"
              >
                <Save size={16} /> Save Changes
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
