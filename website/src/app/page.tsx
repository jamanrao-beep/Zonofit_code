/* eslint-disable @next/next/no-html-link-for-pages, @next/next/no-img-element */
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

const SPLASH_SCREENS = [
  (
    <div key="1" className="flex flex-col items-center justify-center space-y-4 px-4 text-center h-full">
      <h1 className="text-3xl md:text-5xl font-medium tracking-tight text-gray-500">
        Have you ever bought<br />a gym membership...
      </h1>
    </div>
  ),
  (
    <div key="2" className="flex flex-col items-center justify-center space-y-4 px-4 text-center h-full">
      <h1 className="text-3xl md:text-5xl font-medium tracking-tight text-gray-500">
        ...and stopped going?
      </h1>
    </div>
  ),
  (
    <div key="3" className="flex flex-col items-center justify-center space-y-4 px-4 text-center h-full">
      <p className="text-xs md:text-sm font-semibold tracking-[0.2em] text-gray-400 uppercase mb-2">
        The average Indian membership
      </p>
      <h1 className="text-7xl md:text-8xl font-semibold text-gray-700 tracking-tighter mb-2">
        ₹3,000
      </h1>
      <p className="text-2xl md:text-3xl font-medium text-gray-500">
        Gone.
      </p>
    </div>
  ),
  (
    <div key="4" className="flex flex-col items-center justify-center space-y-8 px-4 text-center h-full">
      <h1 className="text-6xl md:text-8xl font-bold tracking-tight text-black">
        Zono<span className="text-[#4ADE80]">Fit</span>
      </h1>
      <p className="text-xl md:text-3xl text-gray-500 font-medium">
        Fitness That Fits Life.
      </p>
    </div>
  )
];

export default function LandingPage() {
  const [splashStep, setSplashStep] = useState(0);
  const [showSplash, setShowSplash] = useState(true);
  const touchStartY = React.useRef(0);

  const [activeScreen, setActiveScreen] = useState(0);
  const [membership, setMembership] = useState(3000);
  const [visits, setVisits] = useState(15);
  const [faqCategory, setFaqCategory] = useState("All");
  const valueUsed = Math.round((membership / 30) * visits);
  const estimatedUnused = membership - valueUsed;

  // Autoplay carousel for the app preview
  useEffect(() => {
    if (showSplash) return;
    const interval = setInterval(() => {
      setActiveScreen(prev => (prev + 1) % 6);
    }, 3000);
    return () => clearInterval(interval);
  }, [showSplash]);


  // Scroll reveal animation
  useEffect(() => {
    if (showSplash) return; // Wait until splash is done
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('active');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    const revealElements = document.querySelectorAll('.reveal');
    revealElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [showSplash]);


  useEffect(() => {
    if (!showSplash) return;
    const interval = setInterval(() => {
      setSplashStep((prev) => {
        if (prev >= SPLASH_SCREENS.length - 1) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 3500);
    return () => clearInterval(interval);
  }, [showSplash]);

  return (
    <div className="relative min-h-screen bg-background">
      {/* Splash Screen */}
      <div 
        className={`fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center px-6 transition-all duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${showSplash ? 'translate-y-0' : '-translate-y-full pointer-events-none shadow-2xl'}`}
        onWheel={(e) => {
          if (splashStep === SPLASH_SCREENS.length - 1 && e.deltaY > 0) {
            setShowSplash(false);
          }
        }}
        onTouchStart={(e) => {
          touchStartY.current = e.touches[0].clientY;
        }}
        onTouchMove={(e) => {
          if (splashStep === SPLASH_SCREENS.length - 1 && touchStartY.current - e.touches[0].clientY > 50) {
            setShowSplash(false);
          }
        }}
      >
        <div className="absolute top-0 left-0 right-0 p-4 md:p-6 flex justify-between items-center z-50 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-2">
            <img src="/logo.jpeg" alt="ZonoFit logo" className="w-8 h-8 rounded-full" />
            <span className="font-bold text-xl tracking-tight text-gray-900">ZonoFit</span>
          </div>
          <nav className="hidden md:flex gap-8 items-center text-sm font-medium text-gray-500">
            <a href="#how-it-works" onClick={() => setShowSplash(false)} className="hover:text-gray-900 transition-colors">How It Works</a>
            <a href="#membership" onClick={() => setShowSplash(false)} className="hover:text-gray-900 transition-colors">Membership</a>
            <a href="#app" onClick={() => setShowSplash(false)} className="hover:text-gray-900 transition-colors">App</a>
            <a href="#faq" onClick={() => setShowSplash(false)} className="hover:text-gray-900 transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-6">
            <Link href="/auth/login" className="text-gray-500 text-sm font-medium hover:text-gray-900 transition-colors">Login</Link>
            <Link href="/auth/signup" className="bg-[#4ADE80] text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-[#3bca6b] transition-colors shadow-sm">
              Join ZonoFit
            </Link>
          </div>
        </div>
        <div 
          className="w-full max-w-5xl text-center cursor-pointer group flex-1 flex flex-col justify-center mt-16 md:mt-0"
          onClick={() => {
            if (splashStep >= SPLASH_SCREENS.length - 1) {
              setShowSplash(false);
            } else {
              setSplashStep(s => s + 1);
            }
          }}
        >
          <div className="overflow-hidden py-10 flex items-center justify-center min-h-[40vh]">
            <div 
              key={splashStep}
              className="animate-fade-up w-full"
            >
              {SPLASH_SCREENS[splashStep]}
            </div>
          </div>
          {splashStep === SPLASH_SCREENS.length - 1 ? (
            <div className="mt-12 flex flex-col items-center gap-4 animate-fade-up">
              <p className="text-sm md:text-base font-medium tracking-wide text-gray-500">
                Scroll to see what you're actually losing
              </p>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-bounce text-[#4ADE80]"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          ) : (
            <p className="mt-6 text-sm font-bold tracking-widest uppercase text-[#4ADE80] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              Tap to continue
            </p>
          )}
        </div>
        {splashStep < SPLASH_SCREENS.length - 1 && (
          <div className="absolute bottom-8 md:bottom-12 left-1/2 -translate-x-1/2 w-full max-w-md px-6 flex flex-col items-center gap-6 z-50">
            <div className="flex gap-2 w-full z-50">
              {SPLASH_SCREENS.map((_, i) => (
                <div 
                  key={i} 
                  onClick={(e) => { e.stopPropagation(); setSplashStep(i); }}
                  className={`h-1.5 rounded-full cursor-pointer transition-all duration-700 flex-1 ${
                    i === splashStep 
                      ? 'bg-[#4ADE80]' 
                      : i < splashStep 
                        ? 'bg-[#4ADE80]/40 hover:bg-[#4ADE80]/60' 
                        : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className={`transition-all duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${showSplash ? 'opacity-0 translate-y-32 h-screen overflow-hidden pointer-events-none' : 'opacity-100 translate-y-0'}`}>
<header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500 bg-white shadow-sm"
      >
        <div
          className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between"
        >
          <a className="flex items-center gap-2.5" href="/"
            ><img
              alt="ZonoFit logo"
              width="32"
              height="32"
              decoding="async"
              className="h-8 w-8 object-cover rounded-md"
              src="/logo.jpeg"
            /><span
              className="font-extrabold text-lg tracking-tight text-foreground"
              >ZonoFit</span
            ></a
          >
          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#how-it-works"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >How It Works</a
            ><a
              href="#membership"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >Membership</a
            ><a
              href="#app"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >App</a
            ><a
              href="#faq"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >FAQ</a
            >
          </nav>
          <div className="flex items-center gap-3">
            <a
              href="/auth/signup"
              className="hidden md:inline-flex items-center gap-2 bg-primary text-primary-foreground font-bold text-sm px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity pulse-green"
              >Start</a
            ><button
              className="md:hidden flex flex-col gap-1.5 p-2"
              aria-label="Open menu"
            >
              <span className="w-5 h-0.5 bg-foreground rounded-full block"></span
              ><span className="w-5 h-0.5 bg-foreground rounded-full block"></span
              ><span className="w-4 h-0.5 bg-foreground rounded-full block"></span>
            </button>
          </div>
        </div>
      </header>
      <div
        className="fixed inset-0 z-[60] bg-white flex flex-col transition-transform duration-500 translate-x-full"
      >
        <div
          className="flex items-center justify-between px-5 h-16 border-b border-border"
        >
          <a className="flex items-center gap-2.5" href="/"
            ><img
              alt="ZonoFit logo"
              loading="lazy"
              width="32"
              height="32"
              decoding="async"
              className="h-8 w-8 object-cover rounded-md"
              src="/logo.jpeg"
            /><span className="font-extrabold text-lg tracking-tight"
              >ZonoFit</span
            ></a
          ><button className="p-2 text-foreground" aria-label="Close menu">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M15 5L5 15M5 5l10 10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              ></path>
            </svg>
          </button>
        </div>
        <nav className="flex flex-col px-5 pt-8 gap-6">
          <a
            href="#how-it-works"
            className="text-2xl font-bold text-foreground hover:text-primary transition-colors"
            style={{ transitionDelay: '0ms' }}
            >How It Works</a
          ><a
            href="#membership"
            className="text-2xl font-bold text-foreground hover:text-primary transition-colors"
            style={{ transitionDelay: '60ms' }}
            >Membership</a
          ><a
            href="#app"
            className="text-2xl font-bold text-foreground hover:text-primary transition-colors"
            style={{ transitionDelay: '120ms' }}
            >App</a
          ><a
            href="#faq"
            className="text-2xl font-bold text-foreground hover:text-primary transition-colors"
            style={{ transitionDelay: '180ms' }}
            >FAQ</a
          ><a
            href="/auth/signup"
            className="mt-4 inline-flex items-center justify-center bg-primary text-primary-foreground font-bold text-base px-6 py-4 rounded-full"
            >Start Your Journey</a
          >
        </nav>
      </div>
      <main>
        <section id="how-it-works" className="bg-white py-24 md:py-32 px-5 border-t border-gray-100">
          <div className="max-w-5xl mx-auto">
            <div className="mb-12">
              <h2 className="text-4xl md:text-6xl font-semibold tracking-tight text-black leading-tight reveal">
                Let&apos;s make this personal.
              </h2>
              <p className="mt-4 text-base md:text-lg text-gray-500 font-medium max-w-2xl leading-relaxed">
                How much did your last gym membership cost? And be honest — how many days did you really go?
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
              
              {/* LEFT SIDE */}
              <div className="bg-white rounded-[24px] p-8 border border-gray-200 shadow-sm flex flex-col justify-between reveal">
                <div className="space-y-12">
                  <div>
                    <div className="flex justify-between items-baseline mb-4">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Membership Price / Month</label>
                      <span className="text-3xl font-medium text-black tracking-tight">₹{membership.toLocaleString()}</span>
                    </div>
                    <div className="relative h-2 bg-gray-100 rounded-full">
                      <div className="absolute top-0 left-0 h-full bg-[#4ADE80] rounded-full" style={{ width: `${((membership - 500) / 7500) * 100}%` }}></div>
                      <input
                        type="range"
                        min="500"
                        max="8000"
                        step="100"
                        className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                        value={membership}
                        onChange={(e) => setMembership(Number(e.target.value))}
                      />
                      <div className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white border-2 border-[#4ADE80] rounded-full shadow-sm pointer-events-none" style={{ left: `calc(${((membership - 500) / 7500) * 100}% - 10px)` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-baseline mb-4">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Days You Visited</label>
                      <span className="text-3xl font-medium text-black tracking-tight">{visits} days</span>
                    </div>
                    <div className="relative h-2 bg-gray-100 rounded-full">
                      <div className="absolute top-0 left-0 h-full bg-[#4ADE80] rounded-full" style={{ width: `${(visits / 30) * 100}%` }}></div>
                      <input
                        type="range"
                        min="0"
                        max="30"
                        step="1"
                        className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                        value={visits}
                        onChange={(e) => setVisits(Number(e.target.value))}
                      />
                      <div className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white border-2 border-[#4ADE80] rounded-full shadow-sm pointer-events-none" style={{ left: `calc(${(visits / 30) * 100}% - 10px)` }}></div>
                    </div>
                  </div>
                </div>

                <div className="mt-12 pt-6 border-t border-gray-100 text-sm font-medium text-gray-500">
                  ₹{membership.toLocaleString()} ÷ 30 = ₹{Math.round(membership/30).toLocaleString()}/day · {30 - visits} unused days × ₹{Math.round(membership/30).toLocaleString()}
                </div>
              </div>

              {/* RIGHT SIDE */}
              <div className="bg-white rounded-[24px] p-8 border border-gray-200 shadow-sm flex flex-col justify-between reveal">
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6">Your Membership</h3>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm font-medium text-gray-600 pb-4 border-b border-gray-100 border-dashed">
                      <span>Paid</span>
                      <span className="text-black font-semibold">₹{membership.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-medium text-gray-600 pb-4 border-b border-gray-100 border-dashed">
                      <span>Days available</span>
                      <span className="text-black font-semibold">30</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-medium text-gray-600 pb-4 border-b border-gray-100 border-dashed">
                      <span>Days used</span>
                      <span className="text-black font-semibold">{visits}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-medium text-gray-600 pb-4 border-b border-gray-100 border-dashed">
                      <span>Unused days</span>
                      <span className="text-black font-semibold">{30 - visits}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <h3 className="text-xs font-bold text-[#4ADE80] uppercase tracking-widest mb-2">Potential Unused Value</h3>
                  <div className="text-5xl font-bold tracking-tight text-[#4ADE80] mb-2">
                    ₹{estimatedUnused.toLocaleString()}
                  </div>
                  <p className="text-sm font-medium text-gray-500 mb-8">
                    Potential membership value left unused.
                  </p>
                  
                  <Link href="/auth/signup" className="block w-full py-4 px-6 bg-black text-white text-center rounded-2xl text-sm font-semibold hover:bg-gray-800 transition-colors">
                    What if that value could keep you moving?
                  </Link>
                </div>
              </div>

            </div>
          </div>
        </section>

        <section className="bg-[#fcfcfc] py-24 md:py-32 px-5 border-t border-gray-100">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-4xl md:text-6xl font-semibold tracking-tight text-black leading-tight mb-16 reveal">
              Your unused value doesn&apos;t<br />have to stop there.
            </h2>
            
            <div className="flex flex-col md:flex-row gap-6">
              {/* Left Large Card */}
              <div className="flex-1 bg-white rounded-[24px] p-8 md:p-12 border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center">
                <div className="w-24 h-24 rounded-full bg-[#3FA836] text-white flex items-center justify-center mb-6 shadow-lg shadow-[#3FA836]/20">
                  <span className="text-3xl font-medium">₹</span>
                </div>
                <h3 className="text-lg font-bold text-black mb-3">ZonoFit Credits</h3>
                <p className="text-sm font-medium text-gray-500 max-w-xs">
                  Value keeps moving instead of quietly disappearing.
                </p>
              </div>

              {/* Right Grid */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white rounded-[20px] p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-[#3FA836] mb-4">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                  </div>
                  <h4 className="text-sm font-bold text-black mb-2">Other Partnered Gyms</h4>
                  <p className="text-xs font-medium text-gray-500 leading-relaxed">
                    Explore other participating fitness locations according to ZonoFit rules.
                  </p>
                </div>

                <div className="bg-white rounded-[20px] p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-[#3FA836] mb-4">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
                  </div>
                  <h4 className="text-sm font-bold text-black mb-2">Sports</h4>
                  <p className="text-xs font-medium text-gray-500 leading-relaxed">
                    Use credits toward eligible sports experiences.
                  </p>
                </div>

                <div className="bg-white rounded-[20px] p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-[#3FA836] mb-4">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>
                  </div>
                  <h4 className="text-sm font-bold text-black mb-2">Wellness</h4>
                  <p className="text-xs font-medium text-gray-500 leading-relaxed">
                    Access participating wellness experiences.
                  </p>
                </div>

                <div className="bg-white rounded-[20px] p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-[#3FA836] mb-4">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>
                  </div>
                  <h4 className="text-sm font-bold text-black mb-2">Supplements / Products</h4>
                  <p className="text-xs font-medium text-gray-500 leading-relaxed">
                    Use credits on eligible fitness products.
                  </p>
                </div>

                <div className="bg-white rounded-[20px] p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-[#3FA836] mb-4">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg>
                  </div>
                  <h4 className="text-sm font-bold text-black mb-2">More</h4>
                  <p className="text-xs font-medium text-gray-500 leading-relaxed">
                    The ecosystem keeps expanding with new partners.
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-8 text-[10px] font-medium text-gray-400 max-w-xl">
              Available through participating partners and subject to ZonoFit plan terms.
            </p>
          </div>
        </section>

        {/* SECTION 1: This is where ZonoFit changes the equation */}
        <section className="bg-white py-24 md:py-32 px-5">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-4xl md:text-6xl font-semibold tracking-tight text-black leading-tight mb-16 reveal">
              This is where ZonoFit<br />changes the equation.
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Traditional Membership */}
              <div className="bg-[#fcfcfc] rounded-[24px] p-8 border border-gray-200">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-8">Traditional Membership</h3>
                <ul className="space-y-6 text-sm font-medium text-gray-500">
                  <li>Pay</li>
                  <li>Go</li>
                  <li>Miss</li>
                  <li>Value disappears</li>
                </ul>
              </div>

              {/* ZonoFit */}
              <div className="bg-white rounded-[24px] p-8 border border-gray-200 shadow-[0_2px_20px_rgba(0,0,0,0.04)] reveal">
                <h3 className="text-xs font-bold text-[#3FA836] uppercase tracking-widest mb-8">ZonoFit</h3>
                <ul className="space-y-6 text-sm font-medium text-black">
                  <li className="flex items-center gap-4">
                    <span className="text-[10px] text-[#3FA836] font-bold w-4">01</span> Pay
                  </li>
                  <li className="flex items-center gap-4">
                    <span className="text-[10px] text-[#3FA836] font-bold w-4">02</span> Choose your primary gym
                  </li>
                  <li className="flex items-center gap-4">
                    <span className="text-[10px] text-[#3FA836] font-bold w-4">03</span> Commit
                  </li>
                  <li className="flex items-center gap-4">
                    <span className="text-[10px] text-[#3FA836] font-bold w-4">04</span> Visit
                  </li>
                  <li className="flex items-center gap-4">
                    <span className="text-[10px] text-[#3FA836] font-bold w-4">05</span> Build consistency
                  </li>
                  <li className="flex items-center gap-4">
                    <span className="text-[10px] text-[#3FA836] font-bold w-4">06</span> Unused value can become credits
                  </li>
                  <li className="flex items-center gap-4">
                    <span className="text-[10px] text-[#3FA836] font-bold w-4">07</span> Use within the ZonoFit ecosystem
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: Your membership. Your starting point. */}
        <section id="membership" className="bg-white py-24 md:py-32 px-5">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-4xl md:text-6xl font-semibold tracking-tight text-black leading-tight mb-4 reveal">
              Your membership.<br />Your starting point.
            </h2>
            <p className="text-sm md:text-base font-medium text-gray-500 max-w-lg leading-relaxed mb-16">
              Plans, pricing and credit structure are managed centrally and may vary by city and partner gym.
            </p>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch pt-4">
              {/* Starter */}
              <div className="bg-white rounded-[24px] p-8 border border-gray-200 shadow-sm flex flex-col reveal transition-all duration-500 hover:-translate-y-3 hover:shadow-2xl hover:border-gray-300 group cursor-pointer">
                <div className="mb-8">
                  <h3 className="text-sm font-bold text-black mb-4">Starter</h3>
                  <div className="text-4xl font-bold tracking-tight text-black mb-1">₹1,499</div>
                  <div className="text-xs font-medium text-gray-500">per month</div>
                </div>
                
                <div className="space-y-6 flex-1 mb-10">
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 mb-1">Primary gym</h4>
                    <p className="text-sm font-semibold text-black">1 selected at signup</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 mb-1">Visit commitment</h4>
                    <p className="text-sm font-semibold text-black">10 visits / month</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 mb-1">Credit structure</h4>
                    <p className="text-sm font-semibold text-black leading-relaxed">Eligible unused value converts to credits monthly</p>
                  </div>
                </div>

                <ul className="space-y-4 mb-8 text-sm font-medium text-black">
                  <li className="flex gap-3 items-center"><svg className="text-[#3FA836] w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> 1 Primary Gym</li>
                  <li className="flex gap-3 items-center"><svg className="text-[#3FA836] w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Digital check in</li>
                  <li className="flex gap-3 items-center"><svg className="text-[#3FA836] w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Credit wallet</li>
                  <li className="flex gap-3 items-center"><svg className="text-[#3FA836] w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Partner network access</li>
                </ul>

                <Link href="/auth/signup" className="block w-full py-4 text-center rounded-full border border-gray-200 text-sm font-semibold text-black hover:bg-gray-50 transition-colors mt-auto">
                  Join ZonoFit
                </Link>
              </div>

              {/* Momentum */}
              <div className="bg-white rounded-[24px] p-8 border-2 border-[#3FA836] shadow-md relative flex flex-col transform lg:-translate-y-4 reveal transition-all duration-500 hover:-translate-y-3 lg:hover:-translate-y-7 hover:shadow-2xl group cursor-pointer">
                <div className="absolute -top-3 left-8 bg-[#E6F7E5] text-[#3FA836] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
                  Most chosen
                </div>
                <div className="mb-8 mt-2">
                  <h3 className="text-sm font-bold text-black mb-4">Momentum</h3>
                  <div className="text-4xl font-bold tracking-tight text-black mb-1">₹3,999</div>
                  <div className="text-xs font-medium text-gray-500">3 months</div>
                </div>
                
                <div className="space-y-6 flex-1 mb-10">
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 mb-1">Primary gym</h4>
                    <p className="text-sm font-semibold text-black">1 selected at signup</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 mb-1">Visit commitment</h4>
                    <p className="text-sm font-semibold text-black">10 visits / month</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 mb-1">Credit structure</h4>
                    <p className="text-sm font-semibold text-black leading-relaxed">Credits carry forward within the plan period</p>
                  </div>
                </div>

                <ul className="space-y-4 mb-8 text-sm font-medium text-black">
                  <li className="flex gap-3 items-center"><svg className="text-[#3FA836] w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> 1 Primary Gym</li>
                  <li className="flex gap-3 items-center"><svg className="text-[#3FA836] w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Digital check in</li>
                  <li className="flex gap-3 items-center"><svg className="text-[#3FA836] w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Credit wallet</li>
                  <li className="flex gap-3 items-center"><svg className="text-[#3FA836] w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Sports & wellness partners</li>
                  <li className="flex gap-3 items-center"><svg className="text-[#3FA836] w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Priority support</li>
                </ul>

                <Link href="/auth/signup" className="block w-full py-4 text-center rounded-full bg-[#3FA836] text-white text-sm font-semibold hover:bg-[#35902d] transition-colors mt-auto">
                  Join ZonoFit
                </Link>
              </div>

              {/* Journey */}
              <div className="bg-white rounded-[24px] p-8 border border-gray-200 shadow-sm flex flex-col reveal transition-all duration-500 hover:-translate-y-3 hover:shadow-2xl hover:border-gray-300 group cursor-pointer">
                <div className="mb-8">
                  <h3 className="text-sm font-bold text-black mb-4">Journey</h3>
                  <div className="text-4xl font-bold tracking-tight text-black mb-1">₹13,999</div>
                  <div className="text-xs font-medium text-gray-500">12 months</div>
                </div>
                
                <div className="space-y-6 flex-1 mb-10">
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 mb-1">Primary gym</h4>
                    <p className="text-sm font-semibold text-black">1 selected at signup</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 mb-1">Visit commitment</h4>
                    <p className="text-sm font-semibold text-black">10 visits (M1-4), 15 visits (M5-12)</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 mb-1">Credit structure</h4>
                    <p className="text-sm font-semibold text-black leading-relaxed">Highest credit eligibility across the ecosystem</p>
                  </div>
                </div>

                <ul className="space-y-4 mb-8 text-sm font-medium text-black">
                  <li className="flex gap-3 items-center"><svg className="text-[#3FA836] w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> 1 Primary Gym</li>
                  <li className="flex gap-3 items-center"><svg className="text-[#3FA836] w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Digital check in</li>
                  <li className="flex gap-3 items-center"><svg className="text-[#3FA836] w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Credit wallet</li>
                  <li className="flex gap-3 items-center"><svg className="text-[#3FA836] w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Full partner ecosystem</li>
                  <li className="flex gap-3 items-center"><svg className="text-[#3FA836] w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Product & supplement credits</li>
                </ul>

                <Link href="/auth/signup" className="block w-full py-4 text-center rounded-full border border-gray-200 text-sm font-semibold text-black hover:bg-gray-50 transition-colors mt-auto">
                  Join ZonoFit
                </Link>
              </div>
            </div>
          </div>
        </section>


        {/* Flexibility section */}
        <section className="bg-white py-24 md:py-32 px-5 border-t border-gray-100">
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="text-4xl md:text-6xl font-semibold tracking-tight text-black leading-tight mb-4 md:text-left reveal">
              Flexibility doesn&apos;t mean<br />zero commitment.
            </h2>
            <p className="text-xs text-gray-400 mb-16 md:text-left">
              We believe consistency is built through showing up — not chasing<br className="hidden md:block" /> perfection.
            </p>
            
            {/* The two cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 text-left">
              <div className="bg-white rounded-[24px] p-8 border border-gray-200 shadow-sm reveal">
                <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-4">Months 1-4</p>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-4xl font-bold text-black tracking-tight">10</span>
                  <span className="text-2xl font-semibold text-black tracking-tight">Visits</span>
                </div>
                <p className="text-[10px] text-gray-500 mb-8 font-medium">per month · Build the habit</p>
                
                <div className="space-y-3">
                  {[1, 2, 3, 4].map(m => (
                    <div key={m} className="flex items-center gap-3">
                      <span className="text-[10px] text-gray-400 w-4 font-medium">M{m}</span>
                      <div className="flex gap-1.5">
                        {[...Array(10)].map((_, i) => (
                          <div key={i} className="w-2 h-2 rounded-full bg-[#3FA836]"></div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-[24px] p-8 border border-gray-200 shadow-[0_2px_20px_rgba(0,0,0,0.04)] reveal">
                <p className="text-[10px] font-bold text-[#3FA836] tracking-widest uppercase mb-4">Months 5-12</p>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-4xl font-bold text-[#3FA836] tracking-tight">15</span>
                  <span className="text-2xl font-semibold text-[#3FA836] tracking-tight">Visits</span>
                </div>
                <p className="text-[10px] text-gray-500 mb-8 font-medium">per month · Build the momentum</p>
                
                <div className="space-y-3">
                  {[5, 6, 7, 8].map(m => (
                    <div key={m} className="flex items-center gap-3">
                      <span className="text-[10px] text-gray-400 w-4 font-medium">M{m}</span>
                      <div className="flex gap-1.5">
                        {[...Array(15)].map((_, i) => (
                          <div key={i} className="w-2 h-2 rounded-full bg-[#3FA836]"></div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-lg md:text-xl font-semibold text-black mb-32">
              First build the habit. Then build the momentum.
            </p>

            <p className="text-[11px] font-medium text-gray-400 mb-6">
              "Wait. If ZonoFit is flexible, why do I have to commit to visits?"
            </p>
            <h2 className="text-4xl md:text-6xl font-semibold tracking-tight text-black leading-tight mb-4 reveal">
              Because flexibility<br />without consistency<br />is just another excuse.
            </h2>
            <p className="text-sm font-medium text-[#3FA836] mb-12">Consistency &gt; Perfection</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
              <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm reveal">
                <p className="text-[10px] text-gray-500 mb-1 font-medium">Missed one day?</p>
                <p className="text-sm font-bold text-black">Come back.</p>
              </div>
              <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm reveal">
                <p className="text-[10px] text-gray-500 mb-1 font-medium">Bad week?</p>
                <p className="text-sm font-bold text-black">Start again.</p>
              </div>
              <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm reveal">
                <p className="text-[10px] text-gray-500 mb-1 font-medium">Busy month?</p>
                <p className="text-sm font-bold text-black">Keep moving.</p>
              </div>
            </div>

            <p className="text-xl md:text-2xl font-semibold text-black leading-snug mb-24">
              The goal isn&apos;t to never miss.<br />The goal is to keep coming back.
            </p>

            {/* Real 10 days card */}
            <div className="bg-white rounded-[24px] p-8 md:p-12 border border-gray-200 shadow-[0_2px_20px_rgba(0,0,0,0.03)] max-w-2xl mx-auto reveal">
              <p className="text-[10px] font-bold text-gray-500 tracking-widest uppercase mb-10">A Real Ten Days</p>
              
              <div className="flex justify-center gap-2 md:gap-3 mb-10">
                {/* 10 days array: check, check, x, check, check, x, check, check, check */}
                {[true, true, false, true, true, false, true, true, true].map((attended, i) => (
                  <div key={i} className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center ${attended ? 'bg-[#E6F7E5]' : 'bg-gray-100'}`}>
                    {attended ? (
                      <svg className="w-3 h-3 md:w-4 md:h-4 text-[#3FA836]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>
                    ) : (
                      <svg className="w-3 h-3 md:w-4 md:h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
                    )}
                  </div>
                ))}
              </div>

              <p className="text-sm font-bold text-black mb-2">
                Real life isn&apos;t perfect. Your fitness journey doesn&apos;t need to be either.
              </p>
              <p className="text-[10px] font-medium text-gray-500">
                ZonoFit is designed to reward the journey — not punish the missed day.
              </p>
            </div>
          </div>
        </section>

        {/* What you get with Zonofit */}
        <section id="app" className="bg-white py-24 md:py-32 px-5">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-4xl md:text-6xl font-semibold tracking-tight text-black leading-tight mb-16 reveal">
              What you get<br />with ZonoFit.
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col h-full reveal">
                <svg className="w-5 h-5 text-[#3FA836] mb-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                <div className="mt-auto">
                  <h3 className="text-xs font-bold text-black mb-1">Primary Gym Access</h3>
                  <p className="text-[10px] font-medium text-gray-500 leading-relaxed">Your regular fitness base.</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col h-full reveal">
                <svg className="w-5 h-5 text-[#3FA836] mb-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                <div className="mt-auto">
                  <h3 className="text-xs font-bold text-black mb-1">Structured Commitment</h3>
                  <p className="text-[10px] font-medium text-gray-500 leading-relaxed">A system designed to help you show up.</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col h-full reveal">
                <svg className="w-5 h-5 text-[#3FA836] mb-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>
                <div className="mt-auto">
                  <h3 className="text-xs font-bold text-black mb-1">ZonoFit Credits</h3>
                  <p className="text-[10px] font-medium text-gray-500 leading-relaxed">Eligible unused membership value can become credits according to plan rules.</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col h-full reveal">
                <svg className="w-5 h-5 text-[#3FA836] mb-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                <div className="mt-auto">
                  <h3 className="text-xs font-bold text-black mb-1">Fitness Ecosystem</h3>
                  <p className="text-[10px] font-medium text-gray-500 leading-relaxed">Partnered gyms, sports, wellness and eligible products.</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col h-full reveal">
                <svg className="w-5 h-5 text-[#3FA836] mb-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path></svg>
                <div className="mt-auto">
                  <h3 className="text-xs font-bold text-black mb-1">Digital Check-In</h3>
                  <p className="text-[10px] font-medium text-gray-500 leading-relaxed">Simple and trackable.</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col h-full reveal">
                <svg className="w-5 h-5 text-[#3FA836] mb-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"></path></svg>
                <div className="mt-auto">
                  <h3 className="text-xs font-bold text-black mb-1">One Membership</h3>
                  <p className="text-[10px] font-medium text-gray-500 leading-relaxed">One platform connecting multiple fitness experiences.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* The Rhetorical Questions */}
        <section className="bg-[#fcfcfc] py-24 md:py-32 px-5 border-t border-gray-100">
          <div className="max-w-5xl mx-auto space-y-20 md:space-y-32">
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-black leading-tight text-center reveal">
              What if missing a day didn&apos;t<br />mean the journey ended?
            </h2>
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-black leading-tight text-center reveal">
              What if your membership<br />could move with you?
            </h2>
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-black leading-tight text-center reveal">
              What if fitness<br />wasn&apos;t just one gym?
            </h2>
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-black leading-tight text-center reveal">
              What if the value you didn&apos;t use<br />could still help you stay active?
            </h2>
            <h2 className="text-5xl md:text-7xl font-bold tracking-tight text-[#3FA836] pt-10 text-center reveal">
              That&apos;s ZonoFit.
            </h2>
          </div>
        </section>

        {/* For Gyms Dark Section */}
        <section className="bg-[#111111] py-24 px-5">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-white leading-tight mb-12 reveal">
              For gyms, ZonoFit is a new<br />way to fill unused capacity.
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-sm reveal">
                <h3 className="text-xs font-bold text-white mb-2">Bring in new members</h3>
                <p className="text-[10px] text-gray-400 font-medium">Reach people looking for flexible fitness options.</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-sm reveal">
                <h3 className="text-xs font-bold text-white mb-2">Improve utilization</h3>
                <p className="text-[10px] text-gray-400 font-medium">Turn quieter periods into additional visits.</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-sm reveal">
                <h3 className="text-xs font-bold text-white mb-2">Grow revenue</h3>
                <p className="text-[10px] text-gray-400 font-medium">Create another channel for member acquisition.</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-sm reveal">
                <h3 className="text-xs font-bold text-white mb-2">Simple digital management</h3>
                <p className="text-[10px] text-gray-400 font-medium">Track ZonoFit users and visits through the partner system.</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <Link href="#" className="bg-[#3FA836] text-white text-[11px] font-bold px-6 py-2.5 rounded-full hover:bg-[#35902d] transition-colors">
                Become a ZonoFit Partner
              </Link>
              <Link href="#" className="bg-transparent text-white border border-white/20 text-[11px] font-bold px-6 py-2.5 rounded-full hover:bg-white/5 transition-colors">
                Gym Partner Login
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="bg-white py-24 md:py-32 px-5">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-4xl md:text-6xl font-semibold tracking-tight text-black mb-10 reveal">
              You probably have questions.
            </h2>
            
            <div className="flex flex-wrap gap-2 mb-12">
              {['All', 'Membership', 'Credits', 'Gyms', 'Commitment', 'Payments', 'Partners'].map(cat => (
                <button 
                  key={cat}
                  onClick={() => setFaqCategory(cat)}
                  className={`text-[10px] font-medium px-4 py-1.5 rounded-full border transition-colors ${
                    faqCategory === cat 
                      ? 'bg-[#3FA836] text-white border-[#3FA836]' 
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="space-y-0">
              {[
                { category: 'Commitment', q: 'Wait... what happens if I miss a day?' },
                { category: 'Gyms', q: 'Can I visit another gym?' },
                { category: 'Credits', q: 'Where can I use my credits?' },
                { category: 'Credits', q: 'How is my credit amount calculated?' },
                { category: 'Membership', q: 'Do I have to choose one gym?' },
                { category: 'Membership', q: 'Can I cancel?' },
                { category: 'Membership', q: 'How does check-in work?' },
                { category: 'Partners', q: 'Can my gym join ZonoFit?' }
              ]
                .filter(item => faqCategory === 'All' || item.category === faqCategory)
                .map((item, i) => (
                <div key={i} className="border-t border-gray-200 py-6 flex justify-between items-center group cursor-pointer hover:bg-gray-50 transition-colors -mx-5 px-5 md:mx-0 md:px-0">
                  <h3 className="text-[13px] font-bold text-black">{item.q}</h3>
                  <svg className="w-5 h-5 text-[#3FA836]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                </div>
              ))}
              <div className="border-t border-gray-200"></div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-[#fcfcfc] py-32 px-5 text-center border-t border-gray-100">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-4xl md:text-6xl font-semibold tracking-tight text-black mb-2 reveal">
              Don&apos;t waste the membership<br />you already paid for.
            </h2>
            <h3 className="text-4xl md:text-6xl font-semibold tracking-tight text-gray-400 mb-16">
              Make it part of your<br />journey.
            </h3>
            
            <div className="flex flex-col items-center gap-2 mb-12">
              <div className="flex items-center gap-1">
                <span className="text-2xl font-semibold text-black tracking-tight">Zono<span className="text-[#3FA836]">Fit</span></span>
              </div>
              <p className="text-[9px] text-gray-500 font-medium">Fitness That Fits Life.</p>
            </div>

            <div className="flex justify-center gap-4">
              <Link href="/auth/signup" className="bg-[#3FA836] text-white text-xs font-bold px-8 py-3 rounded-full hover:bg-[#35902d] transition-colors">
                Join ZonoFit
              </Link>
              <Link href="#" className="bg-white border border-gray-200 text-gray-600 text-xs font-bold px-8 py-3 rounded-full hover:bg-gray-50 transition-colors">
                Explore How It Works
              </Link>
            </div>
          </div>
        </section>
      </main>
      <footer className="bg-[#fcfcfc] pt-16 border-t border-gray-100">
        <div className="max-w-5xl mx-auto px-5 mb-16">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8">
            <div className="md:col-span-4">
              <div className="flex items-center gap-2 mb-4">
                <img src="/logo.jpeg" alt="ZonoFit" className="w-6 h-6 rounded-md" />
                <span className="font-bold text-[13px] text-gray-900 tracking-tight">ZonoFit</span>
              </div>
              <p className="text-[11px] text-gray-500 font-medium mb-6 leading-relaxed max-w-[220px]">
                Fitness That Fits Life. Don&apos;t waste the membership you already paid for.
              </p>
              <p className="text-[9px] text-gray-400 font-medium">
                Social handles are added once officially confirmed.
              </p>
            </div>
            
            <div className="md:col-span-2 md:col-start-6">
              <h4 className="text-[9px] font-bold text-gray-400 tracking-widest uppercase mb-4">Explore</h4>
              <ul className="space-y-3">
                <li><Link href="#" className="text-[11px] font-medium text-gray-600 hover:text-gray-900 transition-colors">How It Works</Link></li>
                <li><Link href="#" className="text-[11px] font-medium text-gray-600 hover:text-gray-900 transition-colors">Membership</Link></li>
                <li><Link href="#" className="text-[11px] font-medium text-gray-600 hover:text-gray-900 transition-colors">Credits</Link></li>
                <li><Link href="#" className="text-[11px] font-medium text-gray-600 hover:text-gray-900 transition-colors">Partner Gyms</Link></li>
                <li><Link href="#" className="text-[11px] font-medium text-gray-600 hover:text-gray-900 transition-colors">FAQ</Link></li>
              </ul>
            </div>
            
            <div className="md:col-span-2">
              <h4 className="text-[9px] font-bold text-gray-400 tracking-widest uppercase mb-4">Business</h4>
              <ul className="space-y-3">
                <li><Link href="#" className="text-[11px] font-medium text-gray-600 hover:text-gray-900 transition-colors">Partner With Us</Link></li>
                <li><Link href="#" className="text-[11px] font-medium text-gray-600 hover:text-gray-900 transition-colors">Gym Login</Link></li>
                <li><Link href="#" className="text-[11px] font-medium text-gray-600 hover:text-gray-900 transition-colors">Partner Dashboard</Link></li>
              </ul>
            </div>
            
            <div className="md:col-span-2">
              <h4 className="text-[9px] font-bold text-gray-400 tracking-widest uppercase mb-4">Company</h4>
              <ul className="space-y-3">
                <li><Link href="#" className="text-[11px] font-medium text-gray-600 hover:text-gray-900 transition-colors">Contact</Link></li>
                <li><Link href="#" className="text-[11px] font-medium text-gray-600 hover:text-gray-900 transition-colors">Terms &amp; Conditions</Link></li>
                <li><Link href="#" className="text-[11px] font-medium text-gray-600 hover:text-gray-900 transition-colors">Privacy Policy</Link></li>
                <li><Link href="#" className="text-[11px] font-medium text-gray-600 hover:text-gray-900 transition-colors">Refund / Cancellation</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 py-6 px-5">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-[9px] text-gray-500 font-medium">© 2026 ZonoFit. All rights reserved.</p>
            <p className="text-[9px] text-gray-500 font-medium">Credits, partner access and benefits are subject to ZonoFit plan terms.</p>
          </div>
        </div>
        <div className="h-4 w-full bg-[#1e1e1e]"></div>
      </footer>
      </div>
    </div>
  );
}
