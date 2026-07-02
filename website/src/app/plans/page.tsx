"use client";

import { Check, ShieldCheck, Zap, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function PlansPage() {
  const plans = [
    {
      name: "Starter",
      credits: 50,
      price: "₹500",
      description: "Perfect for testing the waters and visiting basic gyms.",
      features: ["Access to Standard Gyms", "Credits valid for 30 days", "Basic Analytics"],
      popular: false,
      color: "bg-gray-100 text-gray-800"
    },
    {
      name: "Pro",
      credits: 150,
      price: "₹1,500",
      description: "Our most popular tier for consistent fitness enthusiasts.",
      features: ["Access to Premium Gyms", "Credits valid for 45 days", "Advanced Analytics", "Priority Support"],
      popular: true,
      color: "bg-emerald-100 text-emerald-800"
    },
    {
      name: "Elite",
      credits: 300,
      price: "₹2,800",
      description: "For the dedicated athlete who wants access to everything.",
      features: ["Access to Elite/Luxury Gyms", "Credits valid for 60 days", "All Pro features", "Free guest pass monthly"],
      popular: false,
      color: "bg-purple-100 text-purple-800"
    }
  ];

  return (
    <div className="relative min-h-[calc(100vh-80px)] overflow-hidden flex flex-col pt-24 pb-20">
      {/* Background gradients */}
      <div className="absolute top-0 right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-100/60 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-100/40 blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto w-full px-6 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-black/5 glass mb-6">
            <ShieldCheck size={16} className="text-primary" />
            <span className="text-sm font-medium text-gray-600">No lock-in contracts</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-black mb-6 tracking-tight">
            Pay for what you use. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">
              Save on what you don't.
            </span>
          </h1>
          <p className="text-lg text-gray-600">
            ZonoFit Credits are your universal currency for fitness. 
            1 Credit = ₹10 Fitness Value.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan, idx) => (
            <div key={idx} className={`glass relative rounded-3xl p-8 border ${plan.popular ? 'border-primary shadow-xl scale-105 z-10' : 'border-black/5'}`}>
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white px-4 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-md">
                  <Zap size={14} /> MOST POPULAR
                </div>
              )}
              
              <div className={`w-fit px-3 py-1 rounded-full text-xs font-bold mb-6 ${plan.color}`}>
                {plan.name}
              </div>
              
              <div className="flex items-end gap-1 mb-2">
                <span className="text-4xl font-bold text-black">{plan.price}</span>
                <span className="text-gray-500 font-medium mb-1">/ {plan.credits} Credits</span>
              </div>
              
              <p className="text-gray-500 text-sm mb-8 h-10">
                {plan.description}
              </p>
              
              <div className="space-y-4 mb-8">
                {plan.features.map((feat, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="bg-emerald-100 text-emerald-600 rounded-full p-1 mt-0.5">
                      <Check size={12} strokeWidth={3} />
                    </div>
                    <span className="text-gray-600 text-sm">{feat}</span>
                  </div>
                ))}
              </div>
              
              <button className={`w-full py-3.5 rounded-xl font-semibold transition-all ${plan.popular ? 'bg-primary hover:bg-primary-dark text-white' : 'glass border border-gray-200 hover:bg-white text-black'}`}>
                Get {plan.name}
              </button>
            </div>
          ))}
        </div>

        {/* FAQ Preview or Value Prop */}
        <div className="max-w-3xl mx-auto glass rounded-3xl p-8 border border-black/5 text-center">
          <h3 className="text-xl font-bold text-black mb-2">Need a custom plan?</h3>
          <p className="text-gray-600 mb-6">
            Are you a corporate wellness manager looking to provide ZonoFit for your entire team? We offer bulk credit purchasing.
          </p>
          <Link href="/auth/signup" className="text-primary hover:text-primary-dark font-semibold flex items-center justify-center gap-1">
            Contact Sales <ArrowRight size={16} />
          </Link>
        </div>

      </div>
    </div>
  );
}
