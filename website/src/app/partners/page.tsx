"use client";

import { Dumbbell, MapPin, Star, Activity, Plus } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function PartnersPage() {
  const gyms = [
    {
      name: "Iron Paradise Elite",
      type: "Strength & Conditioning",
      location: "Downtown",
      rating: 4.9,
      image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop"
    },
    {
      name: "Zenith Yoga Studio",
      type: "Yoga & Pilates",
      location: "Westside",
      rating: 4.8,
      image: "https://images.unsplash.com/photo-1599901860904-17e08c3d0cb8?q=80&w=2070&auto=format&fit=crop"
    },
    {
      name: "Velocity CrossFit",
      type: "CrossFit",
      location: "North District",
      rating: 4.9,
      image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=2070&auto=format&fit=crop"
    },
    {
      name: "AquaFit Center",
      type: "Swimming & Spa",
      location: "South End",
      rating: 4.7,
      image: "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?q=80&w=2070&auto=format&fit=crop"
    }
  ];

  return (
    <div className="relative min-h-[calc(100vh-80px)] overflow-hidden flex flex-col pt-24 pb-20">
      {/* Background gradients */}
      <div className="absolute top-0 right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-100/60 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-100/40 blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto w-full px-6 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-black mb-6 tracking-tight">
            The best gyms in town, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">
              all in one place.
            </span>
          </h1>
          <p className="text-lg text-gray-600">
            From powerlifting to pilates, ZonoFit gives you access to a curated network of premium fitness partners.
          </p>
        </div>

        {/* Network Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {gyms.map((gym, idx) => (
            <div key={idx} className="glass rounded-3xl overflow-hidden border border-black/5 hover:-translate-y-2 transition-transform duration-300">
              <div className="h-48 relative">
                {/* Fallback to gray background if image fails to load during dev */}
                <div className="absolute inset-0 bg-gray-200" /> 
                <Image 
                  src={gym.image} 
                  alt={gym.name}
                  fill
                  className="object-cover relative z-10"
                />
                <div className="absolute top-3 right-3 z-20 bg-white/90 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1 text-sm font-bold text-black">
                  <Star size={14} className="text-yellow-500 fill-yellow-500" />
                  {gym.rating}
                </div>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-bold text-black mb-1">{gym.name}</h3>
                <p className="text-sm text-emerald-600 font-medium mb-3">{gym.type}</p>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <MapPin size={14} />
                  {gym.location}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Call to Action for Gym Owners */}
        <div className="glass rounded-3xl p-10 border border-emerald-500/20 bg-emerald-50/50 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-white mb-4">
              <Activity size={14} className="text-primary" />
              <span className="text-xs font-bold text-primary uppercase tracking-wider">For Gym Owners</span>
            </div>
            <h2 className="text-3xl font-bold text-black mb-4">Become a ZonoFit Partner</h2>
            <p className="text-gray-600 mb-6 max-w-xl">
              Fill your empty slots, acquire new members, and generate additional revenue. Join the ZonoFit network today and get access to our partner dashboard.
            </p>
            <Link href="/auth/signup" className="inline-flex bg-primary hover:bg-primary-dark text-white px-8 py-4 rounded-full font-semibold transition-all shadow-[0_4px_20px_rgba(16,185,129,0.3)] items-center gap-2">
              Register Your Gym <Plus size={20} />
            </Link>
          </div>
          
          <div className="flex-1 w-full flex justify-center">
             <div className="relative w-full max-w-sm aspect-square bg-white rounded-full p-8 shadow-2xl border border-gray-100 flex items-center justify-center">
                <div className="absolute inset-4 border-2 border-dashed border-emerald-200 rounded-full animate-[spin_20s_linear_infinite]" />
                <Dumbbell size={80} className="text-primary relative z-10" strokeWidth={1} />
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
