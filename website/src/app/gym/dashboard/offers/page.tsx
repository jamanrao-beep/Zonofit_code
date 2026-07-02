"use client";

import GymGuard from "@/components/GymGuard";
import { Plus } from "lucide-react";

export default function OffersPage() {
  const offers = [
    { id: 1, title: "New Year Special", discount: "20% Off", status: "Active", expiry: "15 Jan 2027" },
    { id: 2, title: "Weekend Warrior", discount: "Flat ₹500 Off", status: "Draft", expiry: "No Expiry" },
  ];

  return (
    <GymGuard>
      <div className="max-w-5xl mx-auto w-full px-6 py-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">Offers & Campaigns</h1>
            <p className="text-gray-600">
              Create and manage special promotions for ZonoFit members.
            </p>
          </div>
          <button className="bg-black hover:bg-gray-800 text-white px-5 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 shadow-md w-fit">
            <Plus size={18} /> New Campaign
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {offers.map((offer) => (
            <div key={offer.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-50 rounded-bl-full" />
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-black">{offer.title}</h3>
                <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                  offer.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {offer.status}
                </span>
              </div>
              <div className="text-3xl font-black text-black mb-4">{offer.discount}</div>
              <div className="text-sm font-medium text-gray-500">
                Expires: {offer.expiry}
              </div>
              <div className="mt-6 flex gap-3">
                <button className="flex-1 bg-gray-50 hover:bg-gray-100 text-black px-4 py-2 rounded-xl font-bold transition-colors text-sm border border-gray-200">
                  Edit
                </button>
                <button className="flex-1 bg-gray-50 hover:bg-red-50 text-red-600 hover:border-red-200 px-4 py-2 rounded-xl font-bold transition-colors text-sm border border-gray-200">
                  Deactivate
                </button>
              </div>
            </div>
          ))}
          
          <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-100 hover:border-black transition-colors min-h-[240px]">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
              <Plus size={24} className="text-black" />
            </div>
            <h3 className="font-bold text-black mb-1">Create New Offer</h3>
            <p className="text-sm text-gray-500">Attract more members with a promotion.</p>
          </div>
        </div>
      </div>
    </GymGuard>
  );
}
