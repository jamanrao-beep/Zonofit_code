"use client";

import { CreditCard, MapPin, ScanLine, Trophy, ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function HowItWorksPage() {
  const steps = [
    {
      icon: CreditCard,
      title: "1. Buy a Membership",
      description: "Choose a plan that fits your lifestyle. Instead of being locked into one gym, you receive ZonoFit credits that you can spend anywhere.",
      color: "bg-emerald-100 text-emerald-600"
    },
    {
      icon: MapPin,
      title: "2. Discover Gyms",
      description: "Open the ZonoFit app to explore premium gyms, yoga studios, and crossfit boxes near you. Compare facilities and credit costs instantly.",
      color: "bg-blue-100 text-blue-600"
    },
    {
      icon: ScanLine,
      title: "3. Book & Scan",
      description: "Found the perfect spot? Book your visit with a tap. When you arrive, just scan the QR code at the front desk to check in.",
      color: "bg-purple-100 text-purple-600"
    },
    {
      icon: Trophy,
      title: "4. Build Consistency",
      description: "Track your progress, earn streaks, and unlock achievements. The more consistent you are, the more rewards you unlock.",
      color: "bg-orange-100 text-orange-600"
    }
  ];

  return (
    <div className="relative min-h-[calc(100vh-80px)] overflow-hidden flex flex-col pt-24 pb-20">
      {/* Background gradients */}
      <div className="absolute top-0 left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-100/60 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-100/40 blur-[120px] pointer-events-none" />

      <div className="max-w-5xl mx-auto w-full px-6 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-black mb-6 tracking-tight">
            One membership.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">
              Infinite possibilities.
            </span>
          </h1>
          <p className="text-lg text-gray-600">
            ZonoFit replaces your rigid gym contract with a flexible credit wallet. 
            Here is how you can start working out anywhere, anytime.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          {steps.map((step, idx) => (
            <div key={idx} className="glass p-8 rounded-3xl border border-black/5 hover:-translate-y-1 transition-transform duration-300">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${step.color}`}>
                <step.icon size={28} />
              </div>
              <h3 className="text-2xl font-bold text-black mb-3">{step.title}</h3>
              <p className="text-gray-600 leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="glass rounded-3xl p-10 text-center border border-emerald-500/20 bg-emerald-50/50">
          <h2 className="text-3xl font-bold text-black mb-4">Ready to start your fitness journey?</h2>
          <p className="text-gray-600 mb-8 max-w-xl mx-auto">
            Download the app today, grab your first credit pack, and walk into any partner gym within minutes.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/plans" className="bg-primary hover:bg-primary-dark text-white px-8 py-4 rounded-full font-semibold transition-all shadow-[0_4px_20px_rgba(16,185,129,0.3)]">
              View Pricing Plans
            </Link>
            <Link href="/partners" className="glass px-8 py-4 rounded-full font-semibold text-black hover:bg-white/50 transition-all border border-gray-200">
              Explore Gym Partners
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
