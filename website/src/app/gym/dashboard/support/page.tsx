"use client";

import GymGuard from "@/components/GymGuard";
import { Send, Phone, Mail } from "lucide-react";

export default function SupportPage() {
  return (
    <GymGuard>
      <div className="max-w-4xl mx-auto w-full px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">Support & Account Manager</h1>
          <p className="text-gray-600">
            Get help with your gym dashboard and bookings.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4">
              <Phone size={24} />
            </div>
            <h3 className="font-bold text-black mb-1">Call Support</h3>
            <p className="text-sm text-gray-500 mb-2">Mon-Sat, 9am - 8pm</p>
            <a href="tel:+919876543210" className="text-emerald-600 font-bold hover:underline">+91 98765 43210</a>
          </div>
          
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4">
              <Mail size={24} />
            </div>
            <h3 className="font-bold text-black mb-1">Email Us</h3>
            <p className="text-sm text-gray-500 mb-2">24/7 Support</p>
            <a href="mailto:partners@zonofit.com" className="text-emerald-600 font-bold hover:underline">partners@zonofit.com</a>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
          <h2 className="text-xl font-bold text-black mb-6">Send a Message</h2>
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-black mb-2">Subject</label>
              <input 
                type="text" 
                placeholder="e.g. Issue with payout"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-black mb-2">Message</label>
              <textarea 
                rows={5}
                placeholder="Describe your issue in detail..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none"
              ></textarea>
            </div>
            <button 
              type="button"
              className="bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-md w-full justify-center"
            >
              <Send size={18} /> Submit Request
            </button>
          </form>
        </div>
      </div>
    </GymGuard>
  );
}
