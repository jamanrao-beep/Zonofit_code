"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import {
  ArrowRight,
  Dumbbell,
  Trophy,
  HeartPulse,
  Package,
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export default function LandingPage() {
  // FAQ accordion state: initialize with all open as displayed in the screenshots
  const [openFaqs, setOpenFaqs] = useState<Record<number, boolean>>({
    0: true,
    1: true,
    2: true,
    3: true,
  });

  const toggleFaq = (index: number) => {
    setOpenFaqs((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const FAQS = [
    {
      question: "What happens if I miss a day?",
      answer:
        "One missed day does not end the journey. Your monthly commitment keeps the focus on returning and building consistency.",
    },
    {
      question: "Where can I use ZonoFit credits?",
      answer:
        "Credits can be used with eligible participating gyms, sports, wellness, and product partners, subject to plan terms.",
    },
    {
      question: "Do I have to choose one gym?",
      answer:
        "Yes. Your chosen primary gym is your regular fitness base and its monthly price sets your ZonoFit membership price.",
    },
    {
      question: "Can my gym join ZonoFit?",
      answer:
        "Yes. Gym owners can register interest to reach new members and improve capacity through the ZonoFit partner system.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f3f8f2] text-gray-900 selection:bg-[#9ecc3b]/30">
      {/* 1. Header / Navbar */}
      <Header />

      <main>
        {/* ========================================================= */}
        {/* SECTION 1: HERO SECTION (Screenshots 1 & 2)              */}
        {/* ========================================================= */}
        <section className="relative pt-8 sm:pt-12 lg:pt-16 pb-16 lg:pb-24 overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
              
              {/* Left Column: Hero Copy */}
              <div className="lg:col-span-6 flex flex-col items-start">
                {/* Tag Pill */}
                <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-[#cde8af] text-[#204712] text-xs sm:text-sm font-bold tracking-tight mb-6">
                  Fitness that fits real life
                </div>

                {/* Main Heading */}
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-950 tracking-tight leading-[1.05] mb-6">
                  One plan.<br />
                  More ways to<br />
                  keep moving.
                </h1>

                {/* Subtitle Description */}
                <p className="text-lg sm:text-xl text-gray-600 leading-relaxed max-w-lg mb-8 font-normal">
                  Choose your primary gym at its monthly price. Build consistency, then use eligible unused value across the growing ZonoFit ecosystem.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-wrap items-center gap-4">
                  <Link
                    href="/auth/signup"
                    className="inline-flex items-center gap-2 bg-[#94ca3d] hover:bg-[#86ba33] text-[#112406] font-extrabold text-base px-7 py-4 rounded-full shadow-sm hover:shadow-md transition-all group"
                  >
                    <span>Start your membership</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </Link>

                  <Link
                    href="#how-it-works"
                    className="inline-flex items-center bg-white/90 hover:bg-white text-gray-900 font-bold text-base px-7 py-4 rounded-full border border-gray-200/90 shadow-sm hover:shadow transition-all"
                  >
                    See how it works
                  </Link>
                </div>

                {/* Subtext below buttons */}
                <p className="text-xs text-gray-500 font-medium mt-4">
                  One monthly membership, priced by your chosen gym.
                </p>
              </div>

              {/* Right Column: Hero Card */}
              <div className="lg:col-span-6">
                <div className="bg-white rounded-[32px] p-6 sm:p-7 shadow-[0_12px_40px_rgba(0,0,0,0.06)] border border-gray-100/90 relative">
                  
                  {/* Top Bar of the Card */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-black tracking-wider text-[#2e6d1a] uppercase">
                      ZONOFIT CREDITS
                    </span>
                    <span className="bg-[#d2edb6] text-[#245014] text-[11px] font-bold px-3 py-1 rounded-full">
                      Example
                    </span>
                  </div>

                  {/* Card Title */}
                  <h3 className="text-2xl font-black text-gray-900 mb-5 tracking-tight">
                    Your value keeps moving
                  </h3>

                  {/* Dual Cards Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-3.5">
                    {/* Dark Card: Monthly Membership */}
                    <div className="bg-[#162319] text-white rounded-2xl p-5 flex flex-col justify-between shadow-sm">
                      <span className="text-xs text-gray-400 font-medium">
                        Monthly membership
                      </span>
                      
                      <div className="text-4xl font-extrabold text-white my-3 tracking-tight">
                        ₹3,000
                      </div>

                      {/* Dual Progress Bar */}
                      <div>
                        <div className="h-2 rounded-full overflow-hidden bg-gray-700/60 flex w-full">
                          <div className="w-1/2 bg-[#96cf38] rounded-full" />
                          <div className="w-1/2 bg-[#2d3a2e]" />
                        </div>
                        <div className="flex justify-between items-center mt-2 text-[11px] text-gray-400 font-medium">
                          <span>15 days used</span>
                          <span>15 unused</span>
                        </div>
                      </div>
                    </div>

                    {/* Lime Green Card: Potential Unused Value */}
                    <div className="bg-[#9ecc3b] text-gray-950 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
                      {/* Top Inbox Icon matching screenshot */}
                      <div className="w-8 h-8 flex items-center justify-start text-gray-950">
                        <svg
                          className="w-6 h-6"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect x="2" y="4" width="20" height="16" rx="3" />
                          <path d="M2 10h20" />
                          <path d="M9 14h6" />
                        </svg>
                      </div>

                      <div>
                        <div className="text-[10px] font-black tracking-wider text-gray-900/80 uppercase">
                          POTENTIAL UNUSED VALUE
                        </div>
                        <div className="text-4xl font-black text-gray-950 tracking-tight mt-1">
                          ₹1,500
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4 Ecosystem Mini Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
                    <div className="bg-[#edf5eb] hover:bg-[#e4efe2] transition-colors rounded-xl p-3 flex flex-col gap-2.5">
                      <Dumbbell className="w-4 h-4 text-[#2e6d1a]" />
                      <span className="text-xs font-bold text-gray-800">
                        Partner gyms
                      </span>
                    </div>

                    <div className="bg-[#edf5eb] hover:bg-[#e4efe2] transition-colors rounded-xl p-3 flex flex-col gap-2.5">
                      <Trophy className="w-4 h-4 text-[#2e6d1a]" />
                      <span className="text-xs font-bold text-gray-800">
                        Sports
                      </span>
                    </div>

                    <div className="bg-[#edf5eb] hover:bg-[#e4efe2] transition-colors rounded-xl p-3 flex flex-col gap-2.5">
                      <HeartPulse className="w-4 h-4 text-[#2e6d1a]" />
                      <span className="text-xs font-bold text-gray-800">
                        Wellness
                      </span>
                    </div>

                    <div className="bg-[#edf5eb] hover:bg-[#e4efe2] transition-colors rounded-xl p-3 flex flex-col gap-2.5">
                      <Package className="w-4 h-4 text-[#2e6d1a]" />
                      <span className="text-xs font-bold text-gray-800">
                        Products
                      </span>
                    </div>
                  </div>

                  {/* Footnote */}
                  <p className="text-[11px] text-gray-500 leading-snug">
                    Illustrative calculation. Credits are available through participating partners and subject to ZonoFit plan terms.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 2: HOW ZONOFIT WORKS (Screenshots 2 & 3)         */}
        {/* ========================================================= */}
        <section id="how-it-works" className="py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            
            {/* Header Row */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-[#2e6d1a] mb-2 block">
                  SIMPLE BY DESIGN
                </span>
                <h2 className="text-4xl lg:text-5xl font-extrabold text-gray-950 tracking-tight">
                  How ZonoFit works
                </h2>
              </div>
              <p className="text-sm lg:text-base font-medium text-gray-600 md:pb-1">
                Three steps. One membership.
              </p>
            </div>

            {/* 3 Step Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Card 01 */}
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col justify-start">
                <span className="text-sm font-black text-[#2e6d1a] mb-5">
                  01
                </span>
                <h3 className="text-xl font-bold text-gray-950 mb-3">
                  Choose your primary gym
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed font-normal">
                  Your gym&apos;s monthly price becomes your ZonoFit price. Nothing is added on top.
                </p>
              </div>

              {/* Card 02 */}
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col justify-start">
                <span className="text-sm font-black text-[#2e6d1a] mb-5">
                  02
                </span>
                <h3 className="text-xl font-bold text-gray-950 mb-3">
                  Commit to your visits
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed font-normal">
                  A clear monthly target helps you build the habit and keep your momentum.
                </p>
              </div>

              {/* Card 03 */}
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col justify-start">
                <span className="text-sm font-black text-[#2e6d1a] mb-5">
                  03
                </span>
                <h3 className="text-xl font-bold text-gray-950 mb-3">
                  Keep unused value moving
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed font-normal">
                  Eligible unused value can become credits for participating fitness experiences.
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 3: A BROADER FITNESS ECOSYSTEM (Screenshots 3 & 4)*/}
        {/* ========================================================= */}
        <section id="credits" className="pb-16 lg:pb-24">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            
            {/* Dark Forest Green Card */}
            <div className="bg-[#142217] rounded-[36px] p-8 md:p-12 lg:p-16 text-white shadow-xl relative overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
                
                {/* Left Column */}
                <div className="lg:col-span-6 flex flex-col items-start">
                  <span className="text-xs font-black tracking-widest text-[#a3dc43] uppercase mb-4 block">
                    A BROADER FITNESS ECOSYSTEM
                  </span>

                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.12] mb-5">
                    Unused value, ready<br className="hidden sm:inline" /> for your next move.
                  </h2>

                  <p className="text-sm sm:text-base text-gray-300 leading-relaxed mb-8 max-w-md">
                    Eligible credits can help you explore participating fitness experiences beyond your primary gym—from a different workout to recovery and products.
                  </p>

                  <Link
                    href="#credits"
                    className="inline-flex items-center gap-2 bg-[#94ca3d] hover:bg-[#86ba33] text-gray-950 font-extrabold text-sm px-6 py-3.5 rounded-full transition-all shadow-sm group"
                  >
                    <span>Understand credits</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>

                {/* Right Column: 2x2 Grid */}
                <div className="lg:col-span-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* 1. Sports */}
                    <div className="bg-[#1e2d21] rounded-2xl p-6 border border-white/5 flex flex-col justify-start">
                      <Trophy className="w-6 h-6 text-[#a3dc43] mb-4" />
                      <h4 className="text-lg font-bold text-white mb-1">
                        Sports
                      </h4>
                      <p className="text-xs text-gray-400 font-medium">
                        Eligible sports experiences
                      </p>
                    </div>

                    {/* 2. Wellness */}
                    <div className="bg-[#1e2d21] rounded-2xl p-6 border border-white/5 flex flex-col justify-start">
                      <HeartPulse className="w-6 h-6 text-[#a3dc43] mb-4" />
                      <h4 className="text-lg font-bold text-white mb-1">
                        Wellness
                      </h4>
                      <p className="text-xs text-gray-400 font-medium">
                        Movement and recovery
                      </p>
                    </div>

                    {/* 3. Other gyms */}
                    <div className="bg-[#1e2d21] rounded-2xl p-6 border border-white/5 flex flex-col justify-start">
                      <Building2 className="w-6 h-6 text-[#a3dc43] mb-4" />
                      <h4 className="text-lg font-bold text-white mb-1">
                        Other gyms
                      </h4>
                      <p className="text-xs text-gray-400 font-medium">
                        Participating locations
                      </p>
                    </div>

                    {/* 4. Products */}
                    <div className="bg-[#1e2d21] rounded-2xl p-6 border border-white/5 flex flex-col justify-start">
                      <Package className="w-6 h-6 text-[#a3dc43] mb-4" />
                      <h4 className="text-lg font-bold text-white mb-1">
                        Products
                      </h4>
                      <p className="text-xs text-gray-400 font-medium">
                        Eligible fitness products
                      </p>
                    </div>

                  </div>
                </div>

              </div>
            </div>

          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 4: CONSISTENCY, NOT PERFECTION (Screenshots 4 & 5)*/}
        {/* ========================================================= */}
        <section id="membership" className="py-12 lg:py-20">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            
            {/* Section Header */}
            <div className="mb-12">
              <span className="text-xs font-black uppercase tracking-wider text-[#2e6d1a] mb-3 block">
                CONSISTENCY, NOT PERFECTION
              </span>
              <h2 className="text-4xl lg:text-5xl font-extrabold text-gray-950 tracking-tight mb-4">
                A commitment that grows with you.
              </h2>
              <p className="text-base text-gray-600 leading-relaxed max-w-2xl font-normal">
                ZonoFit is designed to reward the journey—not punish a missed day. First build the habit. Then build the momentum.
              </p>
            </div>

            {/* 2-Column Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Months 1-4 and Months 5-12 Cards */}
              <div className="lg:col-span-5 flex flex-col sm:flex-row gap-4">
                
                {/* Card 1 */}
                <div className="bg-white rounded-3xl p-7 shadow-sm border border-gray-100 flex-1">
                  <span className="text-xs font-medium text-gray-500 mb-2 block">
                    Months 1–4
                  </span>
                  <div className="text-3xl lg:text-4xl font-extrabold text-gray-950 mb-2 tracking-tight">
                    10 visits
                  </div>
                  <span className="text-xs font-bold text-[#2e6d1a]">
                    Build the habit
                  </span>
                </div>

                {/* Card 2 */}
                <div className="bg-white rounded-3xl p-7 shadow-sm border border-gray-100 flex-1">
                  <span className="text-xs font-medium text-gray-500 mb-2 block">
                    Months 5–12
                  </span>
                  <div className="text-3xl lg:text-4xl font-extrabold text-gray-950 mb-2 tracking-tight">
                    15 visits
                  </div>
                  <span className="text-xs font-bold text-[#2e6d1a]">
                    Build momentum
                  </span>
                </div>

              </div>

              {/* Right Column: Your Membership Includes Card */}
              <div className="lg:col-span-7">
                <div className="bg-white rounded-3xl p-7 sm:p-9 shadow-sm border border-gray-100">
                  <span className="text-xs font-black tracking-wider text-[#2e6d1a] uppercase mb-8 block">
                    YOUR MEMBERSHIP INCLUDES
                  </span>

                  {/* Checklist Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                    
                    {/* Item 1 */}
                    <div className="flex items-center gap-3.5">
                      <div className="w-6 h-6 rounded-full bg-[#a1d942] flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 text-[#122409] stroke-[3]" />
                      </div>
                      <span className="text-sm font-bold text-gray-900">
                        Primary gym access
                      </span>
                    </div>

                    {/* Item 2 */}
                    <div className="flex items-center gap-3.5">
                      <div className="w-6 h-6 rounded-full bg-[#a1d942] flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 text-[#122409] stroke-[3]" />
                      </div>
                      <span className="text-sm font-bold text-gray-900">
                        Structured commitment
                      </span>
                    </div>

                    {/* Item 3 */}
                    <div className="flex items-center gap-3.5">
                      <div className="w-6 h-6 rounded-full bg-[#a1d942] flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 text-[#122409] stroke-[3]" />
                      </div>
                      <span className="text-sm font-bold text-gray-900">
                        Eligible ZonoFit credits
                      </span>
                    </div>

                    {/* Item 4 */}
                    <div className="flex items-center gap-3.5">
                      <div className="w-6 h-6 rounded-full bg-[#a1d942] flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 text-[#122409] stroke-[3]" />
                      </div>
                      <span className="text-sm font-bold text-gray-900">
                        Fitness ecosystem
                      </span>
                    </div>

                    {/* Item 5 */}
                    <div className="flex items-center gap-3.5">
                      <div className="w-6 h-6 rounded-full bg-[#a1d942] flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 text-[#122409] stroke-[3]" />
                      </div>
                      <span className="text-sm font-bold text-gray-900">
                        Digital check-in
                      </span>
                    </div>

                    {/* Item 6 */}
                    <div className="flex items-center gap-3.5">
                      <div className="w-6 h-6 rounded-full bg-[#a1d942] flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 text-[#122409] stroke-[3]" />
                      </div>
                      <span className="text-sm font-bold text-gray-900">
                        One connected membership
                      </span>
                    </div>

                  </div>
                </div>
              </div>

            </div>

          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 5: "WHAT IF..." CONTINUATION SERIES (Images 1 & 2)*/}
        {/* ========================================================= */}
        <section className="pt-16 pb-20 overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            
            {/* Question 1: Centered / Top */}
            <div className="text-center mb-24 sm:mb-32">
              <span className="text-xs font-black uppercase tracking-wider text-[#2e6d1a] mb-5 block">
                IMAGINE A MORE FLEXIBLE MEMBERSHIP
              </span>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.12]">
                <span className="text-gray-950">What if your membership</span><br />
                <span className="text-[#1b6c23]">could move with you?</span>
              </h2>
            </div>

            {/* Question 2: Right-aligned (Image 1) */}
            <div className="flex justify-end mb-24 sm:mb-32">
              <div className="text-right max-w-3xl">
                <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.12]">
                  <span className="text-gray-950">What if fitness</span><br />
                  <span className="text-gray-950">wasn&apos;t </span>
                  <span className="text-[#1b6c23]">just one gym?</span>
                </h2>
              </div>
            </div>

            {/* Question 3: Left / Centered (Image 1) */}
            <div className="mb-24 sm:mb-28 max-w-4xl">
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.12]">
                <span className="text-gray-950">What if unused value could</span><br />
                <span className="text-gray-950">still help you </span>
                <span className="text-[#1b6c23]">stay active?</span>
              </h2>
            </div>

            {/* That's ZonoFit. Divider (Image 2) */}
            <div className="py-16 sm:py-24 flex items-center justify-center gap-6 sm:gap-10">
              <div className="h-[1.5px] bg-[#d2e4ce] flex-1 max-w-xs" />
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-950 tracking-tight text-center whitespace-nowrap">
                That&apos;s ZonoFit.
              </h3>
              <div className="h-[1.5px] bg-[#d2e4ce] flex-1 max-w-xs" />
            </div>

            {/* Subtle Divider Line */}
            <div className="border-t border-[#d2e4ce]/60 my-6" />

            {/* FOR GYM OWNERS Section (Image 2) */}
            <div id="for-gyms" className="py-14 sm:py-18">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-start">
                
                {/* Left Column */}
                <div className="lg:col-span-6">
                  <span className="text-xs font-black uppercase tracking-wider text-[#2e6d1a] mb-3 block">
                    FOR GYM OWNERS
                  </span>
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-950 tracking-tight leading-tight">
                    Make quiet capacity work harder.
                  </h2>
                </div>

                {/* Right Column */}
                <div className="lg:col-span-6 lg:pt-6">
                  <p className="text-base sm:text-lg text-gray-600 leading-relaxed mb-6 font-normal">
                    Reach people looking for flexible fitness, create another member-acquisition channel, and manage ZonoFit visits digitally.
                  </p>
                  <Link
                    href="/partners"
                    className="inline-flex items-center gap-2 text-[#2e6d1a] font-bold text-base hover:text-[#235314] transition-colors group"
                  >
                    <span>Become a ZonoFit partner</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>

              </div>
            </div>

          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 6: FAQ SECTION (Images 3 & 4)                     */}
        {/* ========================================================= */}
        <section id="faq" className="py-16 lg:py-24 border-t border-[#d2e4ce]/50">
          <div className="max-w-4xl mx-auto px-6 lg:px-12">
            
            {/* Header */}
            <div className="text-center mb-14">
              <span className="text-xs font-black uppercase tracking-wider text-[#2e6d1a] mb-3 block">
                CLEAR ANSWERS
              </span>
              <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-950 tracking-tight">
                You probably have questions.
              </h2>
            </div>

            {/* Accordion List */}
            <div className="divide-y divide-[#d2e4ce]/60 border-t border-b border-[#d2e4ce]/60">
              {FAQS.map((faq, index) => {
                const isOpen = !!openFaqs[index];
                return (
                  <div key={index} className="py-6 sm:py-7">
                    <button
                      onClick={() => toggleFaq(index)}
                      className="w-full flex items-center justify-between text-left group"
                      aria-expanded={isOpen}
                    >
                      <span className="text-lg sm:text-xl font-bold text-gray-950 group-hover:text-[#2e6d1a] transition-colors pr-6">
                        {faq.question}
                      </span>
                      <span className="text-gray-900 shrink-0">
                        {isOpen ? (
                          <ChevronUp className="w-5 h-5 text-gray-900" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-900" />
                        )}
                      </span>
                    </button>

                    {isOpen && (
                      <p className="text-sm sm:text-base text-gray-600 leading-relaxed mt-3.5 pr-8 font-normal">
                        {faq.answer}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ======================================================= */}
            {/* SECTION 7: FINAL CTA BANNER (Image 4)                   */}
            {/* ======================================================= */}
            <div className="mt-16 sm:mt-24">
              <div className="bg-gradient-to-r from-[#81bf37] via-[#65a82e] to-[#458f23] rounded-[32px] sm:rounded-[36px] p-8 sm:p-12 lg:p-14 text-gray-950 shadow-xl relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                  
                  {/* Left Column */}
                  <div className="max-w-xl">
                    <span className="text-[11px] sm:text-xs font-black tracking-widest text-[#152e08]/80 uppercase mb-2.5 block">
                      READY WHEN YOU ARE
                    </span>
                    <h3 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#111827] tracking-tight leading-[1.1]">
                      Make your membership part of the journey.
                    </h3>
                  </div>

                  {/* Right CTA Button */}
                  <Link
                    href="/auth/signup"
                    className="inline-flex items-center gap-2 bg-[#111827] hover:bg-black text-white font-extrabold text-sm sm:text-base px-8 py-4 rounded-full shadow-lg transition-all shrink-0 group self-start md:self-auto"
                  >
                    <span>Join ZonoFit</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </Link>

                </div>
              </div>
            </div>

          </div>
        </section>

      </main>

      {/* ========================================================= */}
      {/* SECTION 8: FOOTER (Image 5)                               */}
      {/* ========================================================= */}
      <footer className="border-t border-[#d2e4ce]/60 pt-16 pb-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-14 pb-14">
            
            {/* Brand Column */}
            <div className="md:col-span-4 lg:col-span-5">
              <Link href="/" className="flex items-center gap-3 mb-4 group inline-flex">
                <div className="w-9 h-9 rounded-xl overflow-hidden shadow-sm flex items-center justify-center bg-[#4ea02b]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/Zonofit_final_logo.jpeg"
                    alt="ZonoFit Logo"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
                <span className="text-2xl font-black tracking-tight text-gray-900">
                  ZonoFit
                </span>
              </Link>

              <p className="text-sm text-gray-600 leading-relaxed max-w-sm font-normal">
                One membership connecting your primary gym, active experiences, and eligible unused value.
              </p>
            </div>

            {/* Links Columns */}
            <div className="md:col-span-8 lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
              
              {/* Column 1: Explore */}
              <div>
                <h4 className="text-base font-extrabold text-gray-950 mb-4 tracking-tight">
                  Explore
                </h4>
                <ul className="space-y-3 text-sm font-medium text-gray-600">
                  <li>
                    <Link href="#how-it-works" className="hover:text-gray-950 transition-colors">
                      How it works
                    </Link>
                  </li>
                  <li>
                    <Link href="#credits" className="hover:text-gray-950 transition-colors">
                      ZonoFit credits
                    </Link>
                  </li>
                  <li>
                    <Link href="#membership" className="hover:text-gray-950 transition-colors">
                      Membership
                    </Link>
                  </li>
                  <li>
                    <Link href="#for-gyms" className="hover:text-gray-950 transition-colors">
                      For gyms
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Column 2: Account */}
              <div>
                <h4 className="text-base font-extrabold text-gray-950 mb-4 tracking-tight">
                  Account
                </h4>
                <ul className="space-y-3 text-sm font-medium text-gray-600">
                  <li>
                    <Link href="/auth/signup" className="hover:text-gray-950 transition-colors">
                      Join ZonoFit
                    </Link>
                  </li>
                  <li>
                    <Link href="/auth/login" className="hover:text-gray-950 transition-colors">
                      Member login
                    </Link>
                  </li>
                  <li>
                    <Link href="#faq" className="hover:text-gray-950 transition-colors">
                      FAQs
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Column 3: Legal */}
              <div>
                <h4 className="text-base font-extrabold text-gray-950 mb-4 tracking-tight">
                  Legal
                </h4>
                <ul className="space-y-3 text-sm font-medium text-gray-600">
                  <li>
                    <Link href="/privacy-policy" className="hover:text-gray-950 transition-colors">
                      Privacy Policy
                    </Link>
                  </li>
                  <li>
                    <Link href="/terms-and-conditions" className="hover:text-gray-950 transition-colors">
                      Terms &amp; Conditions
                    </Link>
                  </li>
                  <li>
                    <Link href="/refund-policy" className="hover:text-gray-950 transition-colors">
                      Refund &amp; Cancellation
                    </Link>
                  </li>
                  <li>
                    <Link href="/support" className="hover:text-gray-950 transition-colors">
                      Contact
                    </Link>
                  </li>
                </ul>
              </div>

            </div>

          </div>

          {/* Bottom Copyright */}
          <div className="pt-8 border-t border-[#d2e4ce]/40 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 font-normal gap-4">
            <p>© 2026 ZonoFit. All rights reserved.</p>
          </div>

        </div>
      </footer>
    </div>
  );
}
