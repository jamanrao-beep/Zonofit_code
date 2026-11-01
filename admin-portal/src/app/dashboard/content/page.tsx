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
      const res = await fetch("/api/admin/content", {
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
      await fetch("/api/admin/content", {
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
    { 
      key: "daily_motivation_quote", 
      title: "Daily Motivation Quotation (Home Screen)",
      description: "Controls the quote shown on the user's Home screen Daily Motivation card in real time.",
      placeholder: "e.g. Consistency beats intensity. You've already outperformed the person who stayed home."
    },
    { 
      key: "app_announcement", 
      title: "App Top Banner Announcement",
      description: "Broadcast an urgent or important notification banner at the top of the mobile app.",
      placeholder: "e.g. Scheduled maintenance tonight from 2 AM to 3 AM."
    },
    { 
      key: "faq_general", 
      title: "General FAQ",
      description: "Frequently asked questions and answers in the user support tab.",
      placeholder: "Enter general FAQ content..."
    },
    { 
      key: "terms_and_conditions", 
      title: "Terms & Conditions",
      description: "Legal membership and credit economy policy text.",
      placeholder: "Enter Terms & Conditions..."
    }
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-black mb-2">Content Manager</h1>
        <p className="text-gray-600">Manage dynamic quotes, announcements, and legal text across the mobile app directly from here.</p>
      </div>

      <div className="space-y-6">
        {sections.map((section) => (
          <div key={section.key} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <div className="mb-3">
              <h2 className="text-lg font-bold text-black flex items-center gap-2">
                <FileText size={18} className="text-emerald-600" />
                {section.title}
              </h2>
              {section.description && (
                <p className="text-xs text-gray-500 mt-1">{section.description}</p>
              )}
            </div>
            <textarea
              value={content[section.key] ?? (section.key === "daily_motivation_quote" ? "Consistency beats intensity. You've already outperformed the person who stayed home." : "")}
              onChange={(e) => setContent({ ...content, [section.key]: e.target.value })}
              rows={section.key === "daily_motivation_quote" ? 3 : 4}
              placeholder={section.placeholder || `Enter content for ${section.title}...`}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 mb-4"
            />
            <div className="flex justify-end">
              <button 
                onClick={() => handleSave(section.key, content[section.key] ?? (section.key === "daily_motivation_quote" ? "Consistency beats intensity. You've already outperformed the person who stayed home." : ""))}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-md disabled:opacity-50 text-sm"
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
