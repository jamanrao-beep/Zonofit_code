"use client";

import GymGuard from "@/components/GymGuard";
import { Upload, Save } from "lucide-react";

export default function GymProfilePage() {
  return (
    <GymGuard>
      <div className="max-w-4xl mx-auto w-full px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">Gym Profile</h1>
          <p className="text-gray-600">
            Manage how your gym appears to users on the ZonoFit app.
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
          <form className="space-y-6">
            
            {/* Header Images */}
            <div>
              <label className="block text-sm font-bold text-black mb-3">Cover Image</label>
              <div className="w-full h-48 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400 hover:bg-gray-100 hover:border-emerald-500 transition-colors cursor-pointer">
                <Upload size={32} className="mb-2" />
                <span className="text-sm font-medium">Click to upload image (1920x1080)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-black mb-2">Gym Name</label>
                <input 
                  type="text" 
                  defaultValue="PowerHouse Fitness"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-black mb-2">Phone Number</label>
                <input 
                  type="text" 
                  defaultValue="+91 98765 43210"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-black mb-2">Description</label>
              <textarea 
                rows={4}
                defaultValue="Premium fitness center offering strength training, cardio, and CrossFit."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none"
              ></textarea>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-black mb-2">Opening Time</label>
                <input 
                  type="time" 
                  defaultValue="06:00"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-black mb-2">Closing Time</label>
                <input 
                  type="time" 
                  defaultValue="22:00"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-black mb-3">Facilities</label>
              <div className="flex flex-wrap gap-3">
                {['Strength', 'Cardio', 'CrossFit', 'Steam Room', 'Locker Room'].map((facility, i) => (
                  <label key={i} className="flex items-center gap-2 cursor-pointer bg-gray-50 px-4 py-2 rounded-xl border border-gray-200 hover:border-black transition-colors">
                    <input type="checkbox" defaultChecked={i < 3} className="accent-black w-4 h-4" />
                    <span className="text-sm font-medium text-black">{facility}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100 flex justify-end">
              <button 
                type="button"
                className="bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-md"
              >
                <Save size={18} /> Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </GymGuard>
  );
}
