/* eslint-disable @next/next/no-html-link-for-pages, @next/next/no-img-element */
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

const SPLASH_MESSAGES = [
  "Have you bought a gym membership?",
  "And stopped going after a month?",
  "We know the feeling.",
  "It's time for a change."
];

export default function LandingPage() {
  const [splashStep, setSplashStep] = useState(0);
  const [showSplash, setShowSplash] = useState(true);

  const [activeScreen, setActiveScreen] = useState(0);
  const [membership, setMembership] = useState(3000);
  const [visits, setVisits] = useState(15);
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
        if (prev >= SPLASH_MESSAGES.length - 1) {
          clearInterval(interval);
          setTimeout(() => setShowSplash(false), 1000);
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
        className={`fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center px-6 transition-all duration-1000 ${showSplash ? 'opacity-100' : 'opacity-0 pointer-events-none scale-105'}`}
      >
        <button 
          onClick={() => setShowSplash(false)}
          className="absolute top-8 right-8 px-6 py-2 rounded-full border border-gray-200 text-sm font-bold text-gray-400 hover:text-gray-900 hover:bg-gray-50 hover:border-gray-300 transition-all z-50"
        >
          Skip Intro
        </button>
        <div 
          className="w-full max-w-5xl text-center cursor-pointer group"
          onClick={() => {
            if (splashStep >= SPLASH_MESSAGES.length - 1) {
              setShowSplash(false);
            } else {
              setSplashStep(s => s + 1);
            }
          }}
        >
          <div className="overflow-hidden py-10">
            <h1 
              key={splashStep}
              className="text-5xl md:text-8xl font-black tracking-tighter text-gray-900 animate-fade-up"
              style={{ lineHeight: '1.1' }}
            >
              {SPLASH_MESSAGES[splashStep]}
            </h1>
          </div>
          <p className="mt-6 text-sm font-bold tracking-widest uppercase text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            Tap to continue
          </p>
        </div>
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-3">
          {SPLASH_MESSAGES.map((_, i) => (
            <div 
              key={i} 
              onClick={() => setSplashStep(i)}
              className={`h-2 rounded-full cursor-pointer transition-all duration-700 ${
                i === splashStep 
                  ? 'w-12 bg-primary shadow-[0_0_12px_rgba(31,122,62,0.6)]' 
                  : i < splashStep 
                    ? 'w-4 bg-primary/40 hover:bg-primary/60' 
                    : 'w-4 bg-gray-200 hover:bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className={`transition-opacity duration-700 ${!showSplash ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
<header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500 bg-white shadow-sm"
      >
        <div
          className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between"
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
              href="#habit"
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
            href="#habit"
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
        <section id="calculator" className="bg-background py-20 md:py-28 px-5">
          <div className="max-w-6xl mx-auto">
            <div className="mb-10">
              <span className="section-label">02 / PERSONAL VALUE CALCULATOR</span>
              <h2
                className="mt-4 text-3xl md:text-5xl font-extrabold tracking-tight text-foreground leading-tight"
              >
                How much of your membership<br /><span className="text-primary"
                  >do you actually use?</span
                >
              </h2>
              <p className="mt-3 text-base text-muted-foreground max-w-md">
                Adjust the values below. This is an estimate based on your
                inputs — not a guarantee.
              </p>
            </div>
            <div
              className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start"
            >
              <div className="space-y-8">
                <div className="spotlight-card bg-secondary rounded-2xl p-6">
                  <div className="flex justify-between items-baseline mb-4">
                    <label className="section-label">Monthly Membership</label
                    ><span
                      className="text-3xl font-black text-foreground tracking-tight"
                      >₹{membership.toLocaleString()}</span
                    >
                  </div>
                  <input
                    type="range"
                    min="500"
                    max="8000"
                    step="100"
                    className="w-full"
                    aria-label="Monthly membership cost"
                    value={membership}
                    onChange={(e) => setMembership(Number(e.target.value))}
                  />
                  <div className="flex justify-between mt-1.5">
                    <span className="text-xs text-muted-foreground">₹500</span
                    ><span className="text-xs text-muted-foreground">₹8,000</span>
                  </div>
                </div>
                <div className="spotlight-card bg-secondary rounded-2xl p-6">
                  <div className="flex justify-between items-baseline mb-4">
                    <label className="section-label">Your Actual Visits</label
                    ><span
                      className="text-3xl font-black text-foreground tracking-tight"
                      >{visits}<span
                        className="text-base font-semibold text-muted-foreground ml-1"
                        >/ 30 days</span
                      ></span
                    >
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="1"
                    className="w-full"
                    aria-label="Number of gym visits"
                    value={visits}
                    onChange={(e) => setVisits(Number(e.target.value))}
                  />
                  <div className="flex justify-between mt-1.5">
                    <span className="text-xs text-muted-foreground">0</span
                    ><span className="text-xs text-muted-foreground">30</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div
                    className="spotlight-card bg-light-green rounded-2xl p-5 border border-primary/20"
                  >
                    <p className="section-label mb-2">Value Used</p>
                    <p className="text-2xl font-black text-foreground">₹{valueUsed.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {visits} visits
                    </p>
                  </div>
                  <div className="spotlight-card bg-secondary rounded-2xl p-5">
                    <p className="section-label mb-2">Estimated Unused</p>
                    <p className="text-2xl font-black text-foreground">₹{estimatedUnused.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {30 - visits} days unused
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-8">
                <div className="bg-secondary rounded-2xl p-6">
                  <div className="flex justify-between items-center mb-5">
                    <span className="section-label">Your Month</span>
                    <div className="flex items-center gap-4 text-xs font-semibold">
                      <span className="flex items-center gap-1.5"
                        ><span
                          className="w-3 h-3 rounded-full bg-primary inline-block"
                        ></span
                        >Used</span
                      ><span className="flex items-center gap-1.5"
                        ><span
                          className="w-3 h-3 rounded-full bg-gray-200 inline-block"
                        ></span
                        >Unused</span
                      >
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {[...Array(30)].map((_, i) => (
                      <div 
                        key={i} 
                        className={`cal-day cursor-pointer hover:opacity-80 ${i < visits ? 'used' : 'unused'}`} 
                        title={`Day ${i + 1}`}
                        onClick={() => setVisits(i + 1)}
                      >
                        {i + 1}
                      </div>
                    ))}
                  </div>
                  <div className="mt-5">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="progress-fill" style={{ width: `${(visits / 30) * 100}%` }}></div>
                    </div>
                    <div
                      className="flex justify-between mt-2 text-xs text-muted-foreground font-medium"
                    >
                      <span>{Math.round((visits / 30) * 100)}% used</span><span>{Math.round(((30 - visits) / 30) * 100)}% unused</span>
                    </div>
                  </div>
                </div>
                <div
                  className="bg-dark-bg rounded-2xl p-6 transition-all duration-700 opacity-0 translate-y-6"
                >
                  <p
                    className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-4"
                  >
                    What if unused value could stay useful?
                  </p>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">Traditional</p>
                      <p className="text-xl font-black text-gray-400 line-through">
                        ₹{estimatedUnused.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">gone</p>
                    </div>
                    <div className="flex-1 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <div className="w-px h-4 bg-primary/40"></div>
                        <div
                          className="w-2 h-2 rounded-full bg-primary value-float"
                        ></div>
                        <div className="w-px h-4 bg-primary/40"></div>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-primary/70 mb-1">ZonoFit</p>
                      <p className="text-xl font-black text-primary">₹{estimatedUnused.toLocaleString()}</p>
                      <p className="text-xs text-primary/60 mt-0.5">→ credits</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-gray-300"
                      >💊{/* */} 
                      {/* */} Supplements</span
                    ><span
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-gray-300"
                      >🧘{/* */} 
                      {/* */} Wellness</span
                    ><span
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-gray-300"
                      >🏃{/* */} 
                      {/* */} Sports</span
                    ><span
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-gray-300"
                      >✨{/* */} 
                      {/* */} More</span
                    >
                  </div>
                  <p className="mt-4 text-sm font-semibold text-white leading-snug">
                    That&#x27;s where ZonoFit changes the model.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section
          id="how-it-works"
          className="dark-section-gradient py-24 md:py-32 px-5 relative overflow-hidden"
        >
          <div
            className="absolute inset-0 opacity-5 pointer-events-none"
            style={{ backgroundImage: "linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)", backgroundSize: "60px 60px" }}
          ></div>
          <div className="max-w-5xl mx-auto relative z-10">
            <span className="section-label section-label-dark"
              >03 / ZONOFIT REVEAL</span
            >
            <div className="mt-6 reveal">
              <h2
                className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight"
              >
                A gym membership that thinks<br /><span className="text-primary"
                  >beyond the gym.</span
                >
              </h2>
              <p
                className="mt-5 text-xl md:text-2xl font-light text-gray-400 max-w-xl leading-relaxed"
              >
                Meet ZonoFit.
              </p>
            </div>
            <div
              className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8 reveal reveal-delay-1"
            >
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
                <p
                  className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-6"
                >
                  Traditional Membership
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-gray-500"
                    >
                      1
                    </div>
                    <span className="text-base font-semibold text-gray-400"
                      >Pay</span
                    >
                    <div className="ml-auto text-gray-700 text-sm">↓</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-gray-500"
                    >
                      2
                    </div>
                    <span className="text-base font-semibold text-gray-400"
                      >Use</span
                    >
                    <div className="ml-auto text-gray-700 text-sm">↓</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-gray-500"
                    >
                      3
                    </div>
                    <span className="text-base font-semibold text-gray-400"
                      >Miss Days</span
                    >
                    <div className="ml-auto text-gray-700 text-sm">↓</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-gray-500"
                    >
                      4
                    </div>
                    <span
                      className="text-base font-semibold text-gray-600 line-through"
                      >Value Unused</span
                    >
                  </div>
                </div>
              </div>
              <div
                className="bg-primary/5 border border-primary/20 rounded-2xl p-8 relative"
              >
                <div
                  className="absolute top-4 right-4 px-2 py-0.5 bg-primary/10 rounded-full text-xs font-bold text-primary"
                >
                  ZonoFit
                </div>
                <p
                  className="text-xs font-bold tracking-widest uppercase text-primary/60 mb-6"
                >
                  ZonoFit Model
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-white/5 border border-white/10 text-gray-500"
                    >
                      1
                    </div>
                    <span className="text-base font-semibold text-gray-300"
                      >Pay</span
                    >
                    <div className="ml-auto text-primary/40 text-sm">↓</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-white/5 border border-white/10 text-gray-500"
                    >
                      2
                    </div>
                    <span className="text-base font-semibold text-gray-300"
                      >Commit</span
                    >
                    <div className="ml-auto text-primary/40 text-sm">↓</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-white/5 border border-white/10 text-gray-500"
                    >
                      3
                    </div>
                    <span className="text-base font-semibold text-gray-300"
                      >Show Up</span
                    >
                    <div className="ml-auto text-primary/40 text-sm">↓</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-primary text-primary-foreground"
                    >
                      4
                    </div>
                    <span className="text-base font-semibold text-primary"
                      >Build Habit</span
                    >
                    <div className="ml-auto text-primary/40 text-sm">↓</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-primary text-primary-foreground"
                    >
                      5
                    </div>
                    <span className="text-base font-semibold text-primary"
                      >Value</span
                    >
                    <div className="ml-auto text-primary/40 text-sm">↓</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-primary text-primary-foreground"
                    >
                      6
                    </div>
                    <span className="text-base font-semibold text-primary"
                      >Credits</span
                    >
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-20 text-center">
              <h3
                className="scroll-scrub-text text-2xl md:text-4xl font-extrabold tracking-tight leading-tight"
                style={{
                  backgroundImage: "linear-gradient(to right, #ffffff 50%, #3a3a3a 50%)",
                  backgroundSize: "200% 100%",
                  backgroundPosition: "100% 0",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent"
                }}
              >
                Your life can change.<br />Your membership can adapt.
              </h3>
            </div>
          </div>
        </section>
        <section id="habit" className="bg-background py-20 md:py-28 px-5">
          <div className="max-w-5xl mx-auto">
            <span className="section-label">04 / BUILD THE HABIT</span>
            <div className="mt-6 reveal">
              <h2
                className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground leading-tight"
              >
                Don&#x27;t start by trying to<br />become perfect.
              </h2>
              <p className="mt-3 text-2xl md:text-3xl font-extrabold text-primary">
                Start by becoming consistent.
              </p>
            </div>
            <div
              className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-10 items-start"
            >
              <div className="reveal reveal-delay-1">
                <div className="bg-secondary rounded-2xl p-7">
                  <div className="flex items-center justify-between mb-2">
                    <span className="section-label">First 4 Months</span
                    ><span
                      className="text-xs font-bold text-primary bg-light-green px-2.5 py-1 rounded-full"
                      >Phase 1</span
                    >
                  </div>
                  <p
                    className="text-4xl font-black text-foreground mt-3 tracking-tight"
                  >
                    10<span
                      className="text-lg font-semibold text-muted-foreground ml-2"
                      >visits / month</span
                    >
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Build the habit. That&#x27;s the only goal.
                  </p>
                  <div className="mt-6">
                    <div className="grid grid-cols-7 gap-1.5">
                      <div
                        className="habit-marker workout"
                        style={{ transitionDelay: '0ms' }}
                      >
                        ✓
                      </div>
                      <div
                        className="habit-marker rest"
                        style={{ transitionDelay: '0ms' }}
                      >
                        2
                      </div>
                      <div
                        className="habit-marker rest"
                        style={{ transitionDelay: '0ms' }}
                      >
                        3
                      </div>
                      <div
                        className="habit-marker workout"
                        style={{ transitionDelay: '0ms' }}
                      >
                        ✓
                      </div>
                      <div
                        className="habit-marker rest"
                        style={{ transitionDelay: '0ms' }}
                      >
                        5
                      </div>
                      <div
                        className="habit-marker workout"
                        style={{ transitionDelay: '0ms' }}
                      >
                        ✓
                      </div>
                      <div
                        className="habit-marker rest"
                        style={{ transitionDelay: '0ms' }}
                      >
                        7
                      </div>
                      <div
                        className="habit-marker workout"
                        style={{ transitionDelay: '0ms' }}
                      >
                        ✓
                      </div>
                      <div
                        className="habit-marker rest"
                        style={{ transitionDelay: '0ms' }}
                      >
                        9
                      </div>
                      <div
                        className="habit-marker workout"
                        style={{ transitionDelay: '0ms' }}
                      >
                        ✓
                      </div>
                      <div
                        className="habit-marker rest"
                        style={{ transitionDelay: '0ms' }}
                      >
                        11
                      </div>
                      <div
                        className="habit-marker workout"
                        style={{ transitionDelay: '0ms' }}
                      >
                        ✓
                      </div>
                      <div
                        className="habit-marker rest"
                        style={{ transitionDelay: '0ms' }}
                      >
                        13
                      </div>
                      <div
                        className="habit-marker rest"
                        style={{ transitionDelay: '0ms' }}
                      >
                        14
                      </div>
                      <div
                        className="habit-marker workout"
                        style={{ transitionDelay: '0ms' }}
                      >
                        ✓
                      </div>
                      <div
                        className="habit-marker rest"
                        style={{ transitionDelay: '0ms' }}
                      >
                        16
                      </div>
                      <div
                        className="habit-marker workout"
                        style={{ transitionDelay: '0ms' }}
                      >
                        ✓
                      </div>
                      <div
                        className="habit-marker rest"
                        style={{ transitionDelay: '0ms' }}
                      >
                        18
                      </div>
                      <div
                        className="habit-marker rest"
                        style={{ transitionDelay: '0ms' }}
                      >
                        19
                      </div>
                      <div
                        className="habit-marker workout"
                        style={{ transitionDelay: '0ms' }}
                      >
                        ✓
                      </div>
                      <div
                        className="habit-marker rest"
                        style={{ transitionDelay: '0ms' }}
                      >
                        21
                      </div>
                      <div
                        className="habit-marker workout"
                        style={{ transitionDelay: '0ms' }}
                      >
                        ✓
                      </div>
                      <div
                        className="habit-marker rest"
                        style={{ transitionDelay: '0ms' }}
                      >
                        23
                      </div>
                      <div
                        className="habit-marker rest"
                        style={{ transitionDelay: '0ms' }}
                      >
                        24
                      </div>
                      <div
                        className="habit-marker rest"
                        style={{ transitionDelay: '0ms' }}
                      >
                        25
                      </div>
                      <div
                        className="habit-marker rest"
                        style={{ transitionDelay: '0ms' }}
                      >
                        26
                      </div>
                      <div
                        className="habit-marker rest"
                        style={{ transitionDelay: '0ms' }}
                      >
                        27
                      </div>
                      <div
                        className="habit-marker rest"
                        style={{ transitionDelay: '0ms' }}
                      >
                        28
                      </div>
                      <div
                        className="habit-marker rest"
                        style={{ transitionDelay: '0ms' }}
                      >
                        29
                      </div>
                      <div
                        className="habit-marker rest"
                        style={{ transitionDelay: '0ms' }}
                      >
                        30
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground font-medium">
                      10 workouts highlighted — the rest is yours.
                    </p>
                  </div>
                </div>
              </div>
              <div
                className="reveal reveal-delay-2 transition-all duration-700 opacity-40"
              >
                <div className="bg-secondary rounded-2xl p-7">
                  <div className="flex items-center justify-between mb-2">
                    <span className="section-label">After 4 Months</span
                    ><span
                      className="text-xs font-bold text-primary bg-light-green px-2.5 py-1 rounded-full"
                      >Phase 2</span
                    >
                  </div>
                  <p
                    className="text-4xl font-black text-foreground mt-3 tracking-tight"
                  >
                    15<span
                      className="text-lg font-semibold text-muted-foreground ml-2"
                      >visits / month</span
                    >
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Once the habit is built, your commitment can grow.
                  </p>
                  <div className="mt-6">
                    <div className="grid grid-cols-7 gap-1.5">
                      <div
                        className="habit-marker workout"
                        style={{ transitionDelay: '0ms' }}
                      >
                        ✓
                      </div>
                      <div
                        className="habit-marker rest"
                        style={{ transitionDelay: '0ms' }}
                      >
                        2
                      </div>
                      <div
                        className="habit-marker workout"
                        style={{ transitionDelay: '0ms' }}
                      >
                        ✓
                      </div>
                      <div
                        className="habit-marker rest"
                        style={{ transitionDelay: '0ms' }}
                      >
                        4
                      </div>
                      <div
                        className="habit-marker workout"
                        style={{ transitionDelay: '0ms' }}
                      >
                        ✓
                      </div>
                      <div
                        className="habit-marker rest"
                        style={{ transitionDelay: '0ms' }}
                      >
                        6
                      </div>
                      <div
                        className="habit-marker workout"
                        style={{ transitionDelay: '0ms' }}
                      >
                        ✓
                      </div>
                      <div
                        className="habit-marker rest"
                        style={{ transitionDelay: '0ms' }}
                      >
                        8
                      </div>
                      <div
                        className="habit-marker workout"
                        style={{ transitionDelay: '0ms' }}
                      >
                        ✓
                      </div>
                      <div
                        className="habit-marker rest"
                        style={{ transitionDelay: '0ms' }}
                      >
                        10
                      </div>
                      <div
                        className="habit-marker workout"
                        style={{ transitionDelay: '0ms' }}
                      >
                        ✓
                      </div>
                      <div
                        className="habit-marker rest"
                        style={{ transitionDelay: '0ms' }}
                      >
                        12
                      </div>
                      <div
                        className="habit-marker workout"
                        style={{ transitionDelay: '0ms' }}
                      >
                        ✓
                      </div>
                      <div
                        className="habit-marker rest"
                        style={{ transitionDelay: '0ms' }}
                      >
                        14
                      </div>
                      <div
                        className="habit-marker workout"
                        style={{ transitionDelay: '0ms' }}
                      >
                        ✓
                      </div>
                      <div
                        className="habit-marker rest"
                        style={{ transitionDelay: '0ms' }}
                      >
                        16
                      </div>
                      <div
                        className="habit-marker workout"
                        style={{ transitionDelay: '0ms' }}
                      >
                        ✓
                      </div>
                      <div
                        className="habit-marker rest"
                        style={{ transitionDelay: '0ms' }}
                      >
                        18
                      </div>
                      <div
                        className="habit-marker workout"
                        style={{ transitionDelay: '0ms' }}
                      >
                        ✓
                      </div>
                      <div
                        className="habit-marker rest"
                        style={{ transitionDelay: '0ms' }}
                      >
                        20
                      </div>
                      <div
                        className="habit-marker workout"
                        style={{ transitionDelay: '0ms' }}
                      >
                        ✓
                      </div>
                      <div
                        className="habit-marker rest"
                        style={{ transitionDelay: '0ms' }}
                      >
                        22
                      </div>
                      <div
                        className="habit-marker workout"
                        style={{ transitionDelay: '0ms' }}
                      >
                        ✓
                      </div>
                      <div
                        className="habit-marker rest"
                        style={{ transitionDelay: '0ms' }}
                      >
                        24
                      </div>
                      <div
                        className="habit-marker workout"
                        style={{ transitionDelay: '0ms' }}
                      >
                        ✓
                      </div>
                      <div
                        className="habit-marker rest"
                        style={{ transitionDelay: '0ms' }}
                      >
                        26
                      </div>
                      <div
                        className="habit-marker workout"
                        style={{ transitionDelay: '0ms' }}
                      >
                        ✓
                      </div>
                      <div
                        className="habit-marker rest"
                        style={{ transitionDelay: '0ms' }}
                      >
                        28
                      </div>
                      <div
                        className="habit-marker workout"
                        style={{ transitionDelay: '0ms' }}
                      >
                        ✓
                      </div>
                      <div
                        className="habit-marker rest"
                        style={{ transitionDelay: '0ms' }}
                      >
                        30
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground font-medium">
                      15 workouts — consistency becomes normal.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-14 reveal reveal-delay-2">
              <div
                className="bg-light-green border border-primary/20 rounded-2xl p-8"
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0"
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path
                        d="M3 9l4.5 4.5L15 4.5"
                        stroke="#111111"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      ></path>
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground leading-snug">
                      You are not financially punished before you&#x27;ve built
                      the habit.
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      The initial commitment is designed to help you establish
                      consistency. Minimum ≠ maximum. Do more whenever
                      you&#x27;re ready.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section id="value" className="bg-secondary py-20 md:py-28 px-5">
          <div className="max-w-5xl mx-auto">
            <span className="section-label">05 / HOW VALUE WORKS</span>
            <div className="mt-6 reveal">
              <h2
                className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground leading-tight"
              >
                Show up first.<br /><span className="text-primary"
                  >Build value along the way.</span
                >
              </h2>
              <p className="mt-4 text-base text-muted-foreground max-w-lg">
                Consistency creates the foundation. The value system exists to
                make your membership more flexible and useful — not to replace
                showing up.
              </p>
            </div>
            <div className="mt-14 reveal reveal-delay-1">
              <div className="flex flex-col md:flex-row items-stretch gap-0">
                <div
                  className="flex-1 bg-background rounded-2xl p-5 text-center shadow-sm border border-border"
                >
                  <div className="text-3xl mb-2">🏋️</div>
                  <p className="text-sm font-bold text-foreground">
                    Your Membership
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Start with a realistic commitment
                  </p>
                </div>
                <div className="flex items-center justify-center px-2 py-2 md:py-0">
                  <span
                    className="text-primary font-bold text-lg md:text-xl rotate-90 md:rotate-0"
                    >→</span
                  >
                </div>
                <div
                  className="flex-1 bg-background rounded-2xl p-5 text-center shadow-sm border border-border"
                >
                  <div className="text-3xl mb-2">✅</div>
                  <p className="text-sm font-bold text-foreground">Your Visits</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    10 visits/month, Phase 1
                  </p>
                </div>
                <div className="flex items-center justify-center px-2 py-2 md:py-0">
                  <span
                    className="text-primary font-bold text-lg md:text-xl rotate-90 md:rotate-0"
                    >→</span
                  >
                </div>
                <div
                  className="flex-1 bg-background rounded-2xl p-5 text-center shadow-sm border border-border"
                >
                  <div className="text-3xl mb-2">📅</div>
                  <p className="text-sm font-bold text-foreground">
                    Your Consistency
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Show up. Build the rhythm.
                  </p>
                </div>
                <div className="flex items-center justify-center px-2 py-2 md:py-0">
                  <span
                    className="text-primary font-bold text-lg md:text-xl rotate-90 md:rotate-0"
                    >→</span
                  >
                </div>
                <div
                  className="flex-1 bg-background rounded-2xl p-5 text-center shadow-sm border border-border"
                >
                  <div className="text-3xl mb-2">💚</div>
                  <p className="text-sm font-bold text-foreground">ZonoFit Value</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Commitment earns credits
                  </p>
                </div>
                <div className="flex items-center justify-center px-2 py-2 md:py-0">
                  <span
                    className="text-primary font-bold text-lg md:text-xl rotate-90 md:rotate-0"
                    >→</span
                  >
                </div>
                <div
                  className="flex-1 bg-background rounded-2xl p-5 text-center shadow-sm border border-border"
                >
                  <div className="text-3xl mb-2">🪙</div>
                  <p className="text-sm font-bold text-foreground">Credits</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Usable across the ecosystem
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-14 reveal reveal-delay-2">
              <p className="section-label mb-6">Credits can be used across</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div
                  className="ecosystem-card text-center"
                  style={{ transitionDelay: '0ms' }}
                >
                  <div className="text-3xl mb-3">💊</div>
                  <p className="font-bold text-foreground text-sm">Supplements</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Protein, vitamins, recovery
                  </p>
                </div>
                <div
                  className="ecosystem-card text-center"
                  style={{ transitionDelay: '80ms' }}
                >
                  <div className="text-3xl mb-3">🧘</div>
                  <p className="font-bold text-foreground text-sm">Wellness</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Yoga, meditation, recovery
                  </p>
                </div>
                <div
                  className="ecosystem-card text-center"
                  style={{ transitionDelay: '160ms' }}
                >
                  <div className="text-3xl mb-3">🏃</div>
                  <p className="font-bold text-foreground text-sm">Sports</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Equipment, classes, gear
                  </p>
                </div>
                <div
                  className="ecosystem-card text-center"
                  style={{ transitionDelay: '240ms' }}
                >
                  <div className="text-3xl mb-3">✨</div>
                  <p className="font-bold text-foreground text-sm">More</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Growing ZonoFit ecosystem
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-12 reveal reveal-delay-3">
              <div className="text-center py-8 border-t border-border">
                <p
                  className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight"
                >
                  Consistency creates the foundation.
                </p>
                <p
                  className="mt-3 text-base text-muted-foreground max-w-md mx-auto"
                >
                  The value system exists to make your membership more flexible
                  — not to skip the gym.
                </p>
              </div>
            </div>
          </div>
        </section>
        <section
          id="app"
          className="dark-section-gradient py-24 md:py-32 px-5 relative overflow-hidden"
        >
          <div
            className="absolute inset-0 opacity-5 pointer-events-none"
            style={{ backgroundImage: "linear-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.08) 1px, transparent 1px)", backgroundSize: "60px 60px" }}
          ></div>
          <div className="max-w-5xl mx-auto relative z-10">
            <span className="section-label section-label-dark"
              >06 / EXPERIENCE THE APP</span
            >
            <div className="mt-6 reveal">
              <h2
                className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight"
              >
                And this is what ZonoFit<br /><span className="text-primary"
                  >feels like.</span
                >
              </h2>
            </div>
            <div className="mt-14 flex flex-col md:flex-row items-center gap-12">
              <div className="flex-shrink-0 reveal reveal-delay-1">
                <div className="phone-wrapper mx-auto">
                  <div className="relative w-full h-full">
                    <div
                      className="absolute inset-0 bg-gray-900 rounded-[36px] shadow-2xl border-2 border-gray-700"
                    ></div>
                    <div
                      className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-5 bg-gray-900 rounded-full z-20 border border-gray-700"
                    ></div>
                    <div
                      className="absolute top-8 bottom-6 left-2 right-2 bg-white rounded-[28px] overflow-hidden"
                    >
                      <div className={`phone-screen ${activeScreen === 0 ? "active" : ""}`}>
                        <div className="flex flex-col h-full bg-white p-4">
                          <div className="flex items-center justify-between mb-5">
                            <div>
                              <p className="text-xs text-gray-400 font-medium">
                                Good morning
                              </p>
                              <p
                                className="text-base font-extrabold text-gray-900 tracking-tight"
                              >
                                Rahul
                              </p>
                            </div>
                            <div
                              className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-black text-primary-foreground"
                            >
                              R
                            </div>
                          </div>
                          <div className="bg-gray-900 rounded-2xl p-4 mb-4">
                            <p className="text-xs text-gray-400 mb-1">
                              Phase 1 Membership
                            </p>
                            <p className="text-xl font-black text-white">
                              ₹3,000 / mo
                            </p>
                            <div
                              className="mt-3 h-1.5 bg-gray-700 rounded-full overflow-hidden"
                            >
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: '53%' }}
                              ></div>
                            </div>
                            <div className="flex justify-between mt-1.5">
                              <span className="text-xs text-gray-400"
                                >8 / 10 visits</span
                              ><span className="text-xs text-primary font-bold"
                                >2 remaining</span
                              >
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-gray-50 rounded-xl p-3">
                              <p className="text-xs text-gray-400">This Month</p>
                              <p className="text-lg font-black text-gray-900">8</p>
                              <p className="text-xs text-gray-500">visits</p>
                            </div>
                            <div className="bg-light-green rounded-xl p-3">
                              <p className="text-xs text-green-700">Credits</p>
                              <p className="text-lg font-black text-green-800">
                                ₹240
                              </p>
                              <p className="text-xs text-green-600">available</p>
                            </div>
                          </div>
                          <button
                            className="w-full bg-primary text-primary-foreground font-bold text-sm py-3 rounded-xl"
                          >
                            Book Next Visit
                          </button>
                        </div>
                      </div>
                      <div className={`phone-screen ${activeScreen === 1 ? "active" : ""}`}>
                        <div className="flex flex-col h-full bg-white p-4">
                          <p
                            className="text-base font-extrabold text-gray-900 mb-4"
                          >
                            Book a Visit
                          </p>
                          <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                            <div
                              className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold bg-gray-100 text-gray-600"
                            >
                              Mon 11
                            </div>
                            <div
                              className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground"
                            >
                              Tue 12
                            </div>
                            <div
                              className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold bg-gray-100 text-gray-600"
                            >
                              Wed 13
                            </div>
                            <div
                              className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold bg-gray-100 text-gray-600"
                            >
                              Thu 14
                            </div>
                            <div
                              className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold bg-gray-100 text-gray-600"
                            >
                              Fri 15
                            </div>
                          </div>
                          <p className="text-xs text-gray-400 font-medium mb-3">
                            Available Times
                          </p>
                          <div className="space-y-2 flex-1">
                            <div
                              className="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50"
                            >
                              <span className="text-sm font-semibold text-gray-700"
                                >06:00 AM</span
                              >
                            </div>
                            <div
                              className="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50"
                            >
                              <span className="text-sm font-semibold text-gray-700"
                                >07:30 AM</span
                              >
                            </div>
                            <div
                              className="flex items-center justify-between px-4 py-3 rounded-xl bg-primary/10 border border-primary/30"
                            >
                              <span className="text-sm font-semibold text-primary"
                                >09:00 AM</span
                              ><span className="text-xs text-primary font-bold"
                                >Selected</span
                              >
                            </div>
                            <div
                              className="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50"
                            >
                              <span className="text-sm font-semibold text-gray-700"
                                >05:30 PM</span
                              >
                            </div>
                            <div
                              className="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50"
                            >
                              <span className="text-sm font-semibold text-gray-700"
                                >07:00 PM</span
                              >
                            </div>
                          </div>
                          <button
                            className="w-full bg-primary text-primary-foreground font-bold text-sm py-3 rounded-xl mt-3"
                          >
                            Confirm Booking
                          </button>
                        </div>
                      </div>
                      <div className={`phone-screen ${activeScreen === 2 ? "active" : ""}`}>
                        <div
                          className="flex flex-col h-full bg-white p-4 items-center justify-center text-center"
                        >
                          <div
                            className="w-20 h-20 rounded-full bg-primary flex items-center justify-center mb-5"
                          >
                            <svg
                              width="36"
                              height="36"
                              viewBox="0 0 36 36"
                              fill="none"
                            >
                              <path
                                d="M7 18l8 8L29 10"
                                stroke="#111111"
                                strokeWidth="3.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              ></path>
                            </svg>
                          </div>
                          <p
                            className="text-xl font-extrabold text-gray-900 tracking-tight"
                          >
                            You&#x27;re Checked In!
                          </p>
                          <p className="text-sm text-gray-500 mt-2">
                            Tuesday, Aug 12 · 09:00 AM
                          </p>
                          <div
                            className="mt-5 bg-light-green rounded-2xl px-6 py-4 border border-primary/20"
                          >
                            <p className="text-xs text-green-700 font-medium">
                              Visit 9 of 10
                            </p>
                            <p className="text-2xl font-black text-green-800 mt-1">
                              ₹30
                            </p>
                            <p className="text-xs text-green-600">
                              credits earned today
                            </p>
                          </div>
                          <p className="mt-5 text-sm text-gray-400">
                            1 more visit to complete Phase 1 goal
                          </p>
                        </div>
                      </div>
                      <div className={`phone-screen ${activeScreen === 3 ? "active" : ""}`}>
                        <div className="flex flex-col h-full bg-white p-4">
                          <p
                            className="text-base font-extrabold text-gray-900 mb-4"
                          >
                            My Wallet
                          </p>
                          <div
                            className="bg-gray-900 rounded-2xl p-5 mb-4 text-center"
                          >
                            <p className="text-xs text-gray-400 mb-1">
                              Total Credits
                            </p>
                            <p className="text-4xl font-black text-primary">₹240</p>
                            <p className="text-xs text-gray-500 mt-1">
                              Available to use
                            </p>
                          </div>
                          <p className="text-xs text-gray-400 font-medium mb-3">
                            Recent Activity
                          </p>
                          <div className="space-y-2 flex-1">
                            <div
                              className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3"
                            >
                              <div>
                                <p className="text-xs font-semibold text-gray-800">
                                  Visit #8 — Morning Session
                                </p>
                                <p className="text-xs text-gray-400">Today</p>
                              </div>
                              <span className="text-sm font-bold text-primary"
                                >+₹30</span
                              >
                            </div>
                            <div
                              className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3"
                            >
                              <div>
                                <p className="text-xs font-semibold text-gray-800">
                                  Visit #7 — Evening Session
                                </p>
                                <p className="text-xs text-gray-400">Aug 9</p>
                              </div>
                              <span className="text-sm font-bold text-primary"
                                >+₹30</span
                              >
                            </div>
                            <div
                              className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3"
                            >
                              <div>
                                <p className="text-xs font-semibold text-gray-800">
                                  Supplements — Protein
                                </p>
                                <p className="text-xs text-gray-400">Aug 7</p>
                              </div>
                              <span className="text-sm font-bold text-gray-500"
                                >-₹150</span
                              >
                            </div>
                            <div
                              className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3"
                            >
                              <div>
                                <p className="text-xs font-semibold text-gray-800">
                                  Visit #6 — Morning Session
                                </p>
                                <p className="text-xs text-gray-400">Aug 5</p>
                              </div>
                              <span className="text-sm font-bold text-primary"
                                >+₹30</span
                              >
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className={`phone-screen ${activeScreen === 4 ? "active" : ""}`}>
                        <div className="flex flex-col h-full bg-white p-4">
                          <p
                            className="text-base font-extrabold text-gray-900 mb-4"
                          >
                            My Journey
                          </p>
                          <div
                            className="bg-light-green rounded-2xl p-4 mb-4 flex items-center gap-4"
                          >
                            <div
                              className="w-14 h-14 rounded-full bg-primary flex items-center justify-center flex-shrink-0"
                            >
                              <span
                                className="text-lg font-black text-primary-foreground"
                                >87</span
                              >
                            </div>
                            <div>
                              <p className="text-sm font-extrabold text-green-900">
                                Consistency Score
                              </p>
                              <p className="text-xs text-green-700 mt-0.5">
                                Great momentum this month!
                              </p>
                            </div>
                          </div>
                          <p className="text-xs text-gray-400 font-medium mb-3">
                            Milestones
                          </p>
                          <div className="space-y-2 flex-1">
                            <div
                              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-light-green"
                            >
                              <div
                                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 bg-primary"
                              >
                                <svg
                                  width="10"
                                  height="10"
                                  viewBox="0 0 10 10"
                                  fill="none"
                                >
                                  <path
                                    d="M2 5l2.5 2.5L8 3"
                                    stroke="#111111"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  ></path>
                                </svg>
                              </div>
                              <span className="text-xs font-semibold text-green-800"
                                >First Week Done</span
                              >
                            </div>
                            <div
                              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-light-green"
                            >
                              <div
                                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 bg-primary"
                              >
                                <svg
                                  width="10"
                                  height="10"
                                  viewBox="0 0 10 10"
                                  fill="none"
                                >
                                  <path
                                    d="M2 5l2.5 2.5L8 3"
                                    stroke="#111111"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  ></path>
                                </svg>
                              </div>
                              <span className="text-xs font-semibold text-green-800"
                                >5 Visits Streak</span
                              >
                            </div>
                            <div
                              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-light-green"
                            >
                              <div
                                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 bg-primary"
                              >
                                <svg
                                  width="10"
                                  height="10"
                                  viewBox="0 0 10 10"
                                  fill="none"
                                >
                                  <path
                                    d="M2 5l2.5 2.5L8 3"
                                    stroke="#111111"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  ></path>
                                </svg>
                              </div>
                              <span className="text-xs font-semibold text-green-800"
                                >8 Visits This Month</span
                              >
                            </div>
                            <div
                              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50"
                            >
                              <div
                                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-200"
                              ></div>
                              <span className="text-xs font-semibold text-gray-400"
                                >Phase 1 Complete</span
                              >
                            </div>
                            <div
                              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50"
                            >
                              <div
                                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-200"
                              ></div>
                              <span className="text-xs font-semibold text-gray-400"
                                >Phase 2 Unlocked</span
                              >
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className={`phone-screen ${activeScreen === 5 ? "active" : ""}`}>
                        <div className="flex flex-col h-full bg-white p-4">
                          <p
                            className="text-base font-extrabold text-gray-900 mb-4"
                          >
                            Discover
                          </p>
                          <div className="grid grid-cols-2 gap-3 flex-1">
                            <div
                              className="bg-gray-900 rounded-2xl p-4 flex flex-col justify-between"
                            >
                              <span className="text-2xl">🏋️</span>
                              <div>
                                <p className="text-sm font-extrabold text-white">
                                  Gym
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  Book sessions
                                </p>
                              </div>
                            </div>
                            <div
                              className="bg-light-green rounded-2xl p-4 flex flex-col justify-between"
                            >
                              <span className="text-2xl">🧘</span>
                              <div>
                                <p
                                  className="text-sm font-extrabold text-green-900"
                                >
                                  Wellness
                                </p>
                                <p className="text-xs text-green-700 mt-0.5">
                                  Yoga &amp; recovery
                                </p>
                              </div>
                            </div>
                            <div
                              className="bg-secondary rounded-2xl p-4 flex flex-col justify-between"
                            >
                              <span className="text-2xl">🏃</span>
                              <div>
                                <p
                                  className="text-sm font-extrabold text-foreground"
                                >
                                  Sports
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Outdoor activities
                                </p>
                              </div>
                            </div>
                            <div
                              className="bg-primary rounded-2xl p-4 flex flex-col justify-between"
                            >
                              <span className="text-2xl">💊</span>
                              <div>
                                <p
                                  className="text-sm font-extrabold text-primary-foreground"
                                >
                                  Supplements
                                </p>
                                <p
                                  className="text-xs text-primary-foreground/70 mt-0.5"
                                >
                                  Use credits
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      className="absolute bottom-2 left-1/2 -translate-x-1/2 w-16 h-1 bg-gray-600 rounded-full"
                    ></div>
                  </div>
                </div>
              </div>
              <div className="flex-1 w-full reveal reveal-delay-2">
                <div className="flex flex-wrap gap-2 mb-8">
                  <button
                    className={activeScreen === 0 ? "px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 bg-primary text-primary-foreground" : "px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10"}
                    onClick={() => setActiveScreen(0)}
                  >
                    Home
                  </button>
                  <button
                    className={activeScreen === 1 ? "px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 bg-primary text-primary-foreground" : "px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10"}
                    onClick={() => setActiveScreen(1)}
                  >
                    Book
                  </button>
                  <button
                    className={activeScreen === 2 ? "px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 bg-primary text-primary-foreground" : "px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10"}
                    onClick={() => setActiveScreen(2)}
                  >
                    Check In
                  </button>
                  <button
                    className={activeScreen === 3 ? "px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 bg-primary text-primary-foreground" : "px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10"}
                    onClick={() => setActiveScreen(3)}
                  >
                    Wallet
                  </button>
                  <button
                    className={activeScreen === 4 ? "px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 bg-primary text-primary-foreground" : "px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10"}
                    onClick={() => setActiveScreen(4)}
                  >
                    Journey
                  </button>
                  <button
                    className={activeScreen === 5 ? "px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 bg-primary text-primary-foreground" : "px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10"}
                    onClick={() => setActiveScreen(5)}
                  >
                    Discover
                  </button>
                </div>
                <div className="mb-8">
                  <p
                    className="text-2xl md:text-3xl font-extrabold text-white tracking-tight"
                  >
                    {[
                      "Your Dashboard",
                      "Book a Visit",
                      "Check In",
                      "Wallet",
                      "My Journey",
                      "Discover"
                    ][activeScreen]}
                  </p>
                  <p className="text-base text-gray-400 mt-2">
                    {[
                      "Track visits & credits",
                      "Find your gym and reserve a slot",
                      "Scan QR code at the front desk",
                      "Manage your credits and value",
                      "Track milestones and consistency",
                      "Explore premium facilities near you"
                    ][activeScreen]}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    className={`screen-dot ${activeScreen === 0 ? "active" : ""}`}
                    aria-label="View screen 1"
                    onClick={() => setActiveScreen(0)}
                  ></button>
                  <button
                    className={`screen-dot ${activeScreen === 1 ? "active" : ""}`}
                    aria-label="View screen 2"
                    onClick={() => setActiveScreen(1)}
                  ></button>
                  <button
                    className={`screen-dot ${activeScreen === 2 ? "active" : ""}`}
                    aria-label="View screen 3"
                    onClick={() => setActiveScreen(2)}
                  ></button>
                  <button
                    className={`screen-dot ${activeScreen === 3 ? "active" : ""}`}
                    aria-label="View screen 4"
                    onClick={() => setActiveScreen(3)}
                  ></button>
                  <button
                    className={`screen-dot ${activeScreen === 4 ? "active" : ""}`}
                    aria-label="View screen 5"
                    onClick={() => setActiveScreen(4)}
                  ></button>
                  <button
                    className={`screen-dot ${activeScreen === 5 ? "active" : ""}`}
                    aria-label="View screen 6"
                    onClick={() => setActiveScreen(5)}
                  ></button>
                </div>
                <div className="mt-10 pt-8 border-t border-white/10">
                  <p className="text-lg font-bold text-white leading-snug">
                    You don&#x27;t need to change everything at once.
                  </p>
                  <p className="text-base text-gray-400 mt-2">
                    You just need to keep showing up.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Journey Section */}
        <section className="bg-white py-20 md:py-28 px-5">
          <div className="max-w-5xl mx-auto">
            
            {/* Header */}
            <div className="mb-16">
              <h2 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 leading-tight">
                You&apos;re not just completing visits.<br />
                <span className="text-primary">You&apos;re building a journey.</span>
              </h2>
            </div>

            {/* Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Left Timeline Box */}
              <div className="md:col-span-7 bg-[#F7F7F7] rounded-[24px] p-8 md:p-12 border border-gray-200">
                <div className="relative">
                  {/* Vertical Line */}
                  <div className="absolute left-[7px] top-3 bottom-3 w-0.5 bg-primary"></div>
                  
                  {/* Timeline Items */}
                  <div className="space-y-10 relative">
                    <div className="flex items-start gap-8">
                      <div className="w-4 h-4 rounded-full bg-white border-2 border-primary mt-1 shrink-0 z-10"></div>
                      <div className="flex gap-12 w-full">
                        <span className="text-sm font-semibold text-gray-400 w-16">Month 1</span>
                        <span className="text-sm font-bold text-gray-900">Starting.</span>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-8">
                      <div className="w-4 h-4 rounded-full bg-white border-2 border-primary mt-1 shrink-0 z-10"></div>
                      <div className="flex gap-12 w-full">
                        <span className="text-sm font-semibold text-gray-400 w-16">Month 2</span>
                        <span className="text-sm font-bold text-gray-900">Building consistency.</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-8">
                      <div className="w-4 h-4 rounded-full bg-white border-2 border-primary mt-1 shrink-0 z-10"></div>
                      <div className="flex gap-12 w-full">
                        <span className="text-sm font-semibold text-gray-400 w-16">Month 4</span>
                        <span className="text-sm font-bold text-gray-900">Foundation.</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-8">
                      <div className="w-4 h-4 rounded-full bg-white border-2 border-primary mt-1 shrink-0 z-10"></div>
                      <div className="flex gap-12 w-full">
                        <span className="text-sm font-semibold text-gray-400 w-16">Month 6</span>
                        <span className="text-sm font-bold text-gray-900">Momentum.</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-8">
                      <div className="w-4 h-4 rounded-full bg-white border-2 border-primary mt-1 shrink-0 z-10"></div>
                      <div className="flex gap-12 w-full">
                        <span className="text-sm font-semibold text-gray-400 w-16">Month 9</span>
                        <span className="text-sm font-bold text-gray-900">Progress.</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-8">
                      <div className="w-4 h-4 rounded-full bg-white border-2 border-primary mt-1 shrink-0 z-10"></div>
                      <div className="flex gap-12 w-full">
                        <span className="text-sm font-semibold text-gray-400 w-16">Month 12</span>
                        <span className="text-sm font-bold text-gray-900">Completion.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Boxes */}
              <div className="md:col-span-5 flex flex-col gap-6">
                
                {/* Z Score Box */}
                <div className="bg-[#f0fdf4] rounded-[24px] p-8 border border-primary/20">
                  <p className="text-xs font-bold text-gray-500 mb-4">Your Z Score</p>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-6xl font-black text-gray-900 tracking-tighter">78</span>
                    <span className="text-xl font-bold text-gray-400">/ 100</span>
                  </div>
                  <p className="text-sm font-bold text-gray-900 mb-4">Strong Momentum</p>
                  <p className="text-[13px] text-gray-500 leading-relaxed font-medium">
                    Your consistency is shaping your journey. The score reflects how steadily you show up and how far you&apos;ve moved through your 12 months.
                  </p>
                </div>

                {/* What's Next Box */}
                <div className="bg-white rounded-[24px] p-8 border border-gray-200 shadow-sm flex-1">
                  <p className="text-base font-extrabold text-gray-900 mb-1">What&apos;s next?</p>
                  <p className="text-[13px] text-gray-500 mb-6 font-medium">Your next chapter could be:</p>
                  
                  <ul className="space-y-4">
                    <li className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-sm bg-primary shrink-0"></div>
                      <span className="text-[13px] font-bold text-gray-600">A stronger consistency goal</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-sm bg-primary shrink-0"></div>
                      <span className="text-[13px] font-bold text-gray-600">A new fitness goal</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-sm bg-primary shrink-0"></div>
                      <span className="text-[13px] font-bold text-gray-600">A new phase of your journey</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-sm bg-primary shrink-0"></div>
                      <span className="text-[13px] font-bold text-gray-600">More ways to stay active</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom Connected Section */}
        <section className="bg-[#F7F7F7] py-24 px-5 border-t border-gray-100">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-gray-900 mb-4">
              Your fitness doesn&apos;t stop at the gym.
            </h2>
            <p className="text-[15px] font-bold text-gray-400 mb-20">
              One membership, more ways to keep moving.
            </p>
            
            {/* Horizontal Timeline */}
            <div className="relative max-w-2xl mx-auto">
              {/* Line */}
              <div className="absolute top-1/2 left-[10%] right-[10%] h-[1px] bg-gray-300 -translate-y-1/2 z-0"></div>
              
              {/* Nodes */}
              <div className="relative z-10 flex justify-between items-center">
                <div className="flex flex-col items-center gap-4 bg-[#F7F7F7]">
                  <div className="w-10 h-10 rounded-full bg-primary shadow-lg shadow-primary/30"></div>
                  <span className="text-xs font-bold text-gray-900">Gym</span>
                </div>
                
                <div className="flex flex-col items-center gap-4 bg-[#F7F7F7]">
                  <div className="w-10 h-10 rounded-full bg-white border border-gray-300"></div>
                  <span className="text-xs font-bold text-gray-400">Sports</span>
                </div>
                
                <div className="flex flex-col items-center gap-4 bg-[#F7F7F7]">
                  <div className="w-10 h-10 rounded-full bg-white border border-gray-300"></div>
                  <span className="text-xs font-bold text-gray-400">Wellness</span>
                </div>
                
                <div className="flex flex-col items-center gap-4 bg-[#F7F7F7]">
                  <div className="w-10 h-10 rounded-full bg-white border border-gray-300"></div>
                  <span className="text-xs font-bold text-gray-400">More possibilities</span>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        <section className="bg-background py-20 md:py-28 px-5">
          <div className="max-w-5xl mx-auto">
            <span className="section-label">07 / WHAT HAPPENS NEXT</span>
            <div className="mt-6 reveal">
              <h2
                className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground leading-tight"
              >
                What happens when consistency<br /><span className="text-primary"
                  >becomes normal?</span
                >
              </h2>
            </div>
            <div className="mt-14 reveal reveal-delay-1">
              <div className="hidden md:flex items-center gap-0">
                <div
                  className="flex-1 text-center py-6 px-4 rounded-2xl transition-all duration-500 cursor-pointer bg-primary/10 border-2 border-primary scale-105"
                >
                  <div className="text-3xl mb-2">🏋️</div>
                  <p className="text-sm font-bold text-foreground">Gym</p>
                  <p className="text-xs mt-1 text-muted-foreground">
                    Start showing up
                  </p>
                </div>
                <div
                  className="px-1 text-xl transition-colors duration-500 text-border"
                >
                  →
                </div>
                <div
                  className="flex-1 text-center py-6 px-4 rounded-2xl transition-all duration-500 cursor-pointer bg-secondary border-2 border-transparent"
                >
                  <div className="text-3xl mb-2">📅</div>
                  <p className="text-sm font-bold text-muted-foreground">Habit</p>
                  <p className="text-xs mt-1 text-muted-foreground/50">
                    Consistency builds
                  </p>
                </div>
                <div
                  className="px-1 text-xl transition-colors duration-500 text-border"
                >
                  →
                </div>
                <div
                  className="flex-1 text-center py-6 px-4 rounded-2xl transition-all duration-500 cursor-pointer bg-secondary border-2 border-transparent"
                >
                  <div className="text-3xl mb-2">💪</div>
                  <p className="text-sm font-bold text-muted-foreground">
                    Strength
                  </p>
                  <p className="text-xs mt-1 text-muted-foreground/50">
                    Progress compounds
                  </p>
                </div>
                <div
                  className="px-1 text-xl transition-colors duration-500 text-border"
                >
                  →
                </div>
                <div
                  className="flex-1 text-center py-6 px-4 rounded-2xl transition-all duration-500 cursor-pointer bg-secondary border-2 border-transparent"
                >
                  <div className="text-3xl mb-2">🎯</div>
                  <p className="text-sm font-bold text-muted-foreground">
                    Confidence
                  </p>
                  <p className="text-xs mt-1 text-muted-foreground/50">
                    New goals emerge
                  </p>
                </div>
                <div
                  className="px-1 text-xl transition-colors duration-500 text-border"
                >
                  →
                </div>
                <div
                  className="flex-1 text-center py-6 px-4 rounded-2xl transition-all duration-500 cursor-pointer bg-secondary border-2 border-transparent"
                >
                  <div className="text-3xl mb-2">🚀</div>
                  <p className="text-sm font-bold text-muted-foreground">
                    Next Chapter
                  </p>
                  <p className="text-xs mt-1 text-muted-foreground/50">
                    Your journey continues
                  </p>
                </div>
              </div>
              <div className="md:hidden space-y-3">
                <div
                  className="flex items-center gap-4 p-4 rounded-2xl transition-all duration-500 bg-primary/10 border-2 border-primary"
                >
                  <span className="text-2xl">🏋️</span>
                  <div>
                    <p className="text-sm font-bold text-foreground">Gym</p>
                    <p className="text-xs text-muted-foreground">
                      Start showing up
                    </p>
                  </div>
                  <div
                    className="ml-auto w-2 h-2 rounded-full bg-primary pulse-green"
                  ></div>
                </div>
                <div
                  className="flex items-center gap-4 p-4 rounded-2xl transition-all duration-500 bg-secondary border-2 border-transparent"
                >
                  <span className="text-2xl">📅</span>
                  <div>
                    <p className="text-sm font-bold text-muted-foreground">Habit</p>
                    <p className="text-xs text-muted-foreground">
                      Consistency builds
                    </p>
                  </div>
                </div>
                <div
                  className="flex items-center gap-4 p-4 rounded-2xl transition-all duration-500 bg-secondary border-2 border-transparent"
                >
                  <span className="text-2xl">💪</span>
                  <div>
                    <p className="text-sm font-bold text-muted-foreground">
                      Strength
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Progress compounds
                    </p>
                  </div>
                </div>
                <div
                  className="flex items-center gap-4 p-4 rounded-2xl transition-all duration-500 bg-secondary border-2 border-transparent"
                >
                  <span className="text-2xl">🎯</span>
                  <div>
                    <p className="text-sm font-bold text-muted-foreground">
                      Confidence
                    </p>
                    <p className="text-xs text-muted-foreground">
                      New goals emerge
                    </p>
                  </div>
                </div>
                <div
                  className="flex items-center gap-4 p-4 rounded-2xl transition-all duration-500 bg-secondary border-2 border-transparent"
                >
                  <span className="text-2xl">🚀</span>
                  <div>
                    <p className="text-sm font-bold text-muted-foreground">
                      Next Chapter
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Your journey continues
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-14 reveal reveal-delay-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div
                  className="bg-light-green rounded-2xl p-8 border border-primary/20"
                >
                  <p
                    className="text-xl font-extrabold text-foreground leading-snug"
                  >
                    A system you grow with.
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Not a membership you repeatedly buy and forget. ZonoFit is
                    designed to evolve as your commitment deepens.
                  </p>
                </div>
                <div className="bg-secondary rounded-2xl p-8">
                  <p
                    className="text-xl font-extrabold text-foreground leading-snug"
                  >
                    The goal isn&#x27;t perfection.
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    The goal is to help you become someone who consistently
                    shows up. Everything else follows from that.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section id="faq" className="bg-background py-20 md:py-28 px-5">
          <div className="max-w-3xl mx-auto">
            <span className="section-label">09 / FAQ</span>
            <div className="mt-6 reveal">
              <h2
                className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground"
              >
                Still wondering?
              </h2>
            </div>
            <div className="mt-10 reveal reveal-delay-1">
              <div className="border-b border-border">
                <button
                  className="w-full flex items-center justify-between py-5 text-left gap-4 group"
                  aria-expanded="true"
                >
                  <span
                    className="text-base font-semibold transition-colors text-foreground"
                    >How does ZonoFit work?</span
                  >
                  <div
                    className="flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-300 border-primary bg-primary rotate-45"
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path
                        d="M5 2v6M2 5h6"
                        stroke="#111111"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      ></path>
                    </svg>
                  </div>
                </button>
                <div className="faq-answer open">
                  <p className="pb-5 text-sm text-muted-foreground leading-relaxed">
                    ZonoFit is a commitment-based gym membership. You start with
                    a realistic goal — 10 visits per month in Phase 1. As you
                    build consistency, your commitment grows to 15 visits in
                    Phase 2. Your membership is structured around building a
                    habit, not just paying for access.
                  </p>
                </div>
              </div>
              <div className="border-b border-border">
                <button
                  className="w-full flex items-center justify-between py-5 text-left gap-4 group"
                  aria-expanded="false"
                >
                  <span
                    className="text-base font-semibold transition-colors text-foreground/80 group-hover:text-foreground"
                    >Why are there mandatory visits?</span
                  >
                  <div
                    className="flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-300 border-border"
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path
                        d="M5 2v6M2 5h6"
                        stroke="#6b7280"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      ></path>
                    </svg>
                  </div>
                </button>
                <div className="faq-answer">
                  <p className="pb-5 text-sm text-muted-foreground leading-relaxed">
                    Mandatory visits exist because consistency is the foundation
                    of any fitness habit. Rather than punishing you for not
                    going, ZonoFit starts with a manageable minimum — 10 visits
                    — to help you establish a rhythm before asking for more.
                  </p>
                </div>
              </div>
              <div className="border-b border-border">
                <button
                  className="w-full flex items-center justify-between py-5 text-left gap-4 group"
                  aria-expanded="false"
                >
                  <span
                    className="text-base font-semibold transition-colors text-foreground/80 group-hover:text-foreground"
                    >What happens if I miss a mandatory visit?</span
                  >
                  <div
                    className="flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-300 border-border"
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path
                        d="M5 2v6M2 5h6"
                        stroke="#6b7280"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      ></path>
                    </svg>
                  </div>
                </button>
                <div className="faq-answer">
                  <p className="pb-5 text-sm text-muted-foreground leading-relaxed">
                    ZonoFit is designed to support your journey, not penalize
                    you. If you miss visits, your progress is tracked and the
                    system helps you understand where you are relative to your
                    commitment. Specific policies will be communicated clearly
                    at signup.
                  </p>
                </div>
              </div>
              <div className="border-b border-border">
                <button
                  className="w-full flex items-center justify-between py-5 text-left gap-4 group"
                  aria-expanded="false"
                >
                  <span
                    className="text-base font-semibold transition-colors text-foreground/80 group-hover:text-foreground"
                    >How do credits work?</span
                  >
                  <div
                    className="flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-300 border-border"
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path
                        d="M5 2v6M2 5h6"
                        stroke="#6b7280"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      ></path>
                    </svg>
                  </div>
                </button>
                <div className="faq-answer">
                  <p className="pb-5 text-sm text-muted-foreground leading-relaxed">
                    As you meet your visit commitments, your membership earns
                    ZonoFit credits. These credits represent the value of your
                    consistency and can be applied across the ZonoFit ecosystem.
                    The exact credit structure will be detailed in your
                    membership agreement.
                  </p>
                </div>
              </div>
              <div className="border-b border-border">
                <button
                  className="w-full flex items-center justify-between py-5 text-left gap-4 group"
                  aria-expanded="false"
                >
                  <span
                    className="text-base font-semibold transition-colors text-foreground/80 group-hover:text-foreground"
                    >Where can I use credits?</span
                  >
                  <div
                    className="flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-300 border-border"
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path
                        d="M5 2v6M2 5h6"
                        stroke="#6b7280"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      ></path>
                    </svg>
                  </div>
                </button>
                <div className="faq-answer">
                  <p className="pb-5 text-sm text-muted-foreground leading-relaxed">
                    ZonoFit credits can be used across supported ecosystem
                    partners including supplements, wellness services, sports,
                    and more. The ecosystem is growing — specific partners and
                    categories are available in the app.
                  </p>
                </div>
              </div>
              <div className="border-b border-border">
                <button
                  className="w-full flex items-center justify-between py-5 text-left gap-4 group"
                  aria-expanded="false"
                >
                  <span
                    className="text-base font-semibold transition-colors text-foreground/80 group-hover:text-foreground"
                    >Can I do more than the minimum visits?</span
                  >
                  <div
                    className="flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-300 border-border"
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path
                        d="M5 2v6M2 5h6"
                        stroke="#6b7280"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      ></path>
                    </svg>
                  </div>
                </button>
                <div className="faq-answer">
                  <p className="pb-5 text-sm text-muted-foreground leading-relaxed">
                    Absolutely. The minimum is just that — a minimum. You can
                    visit as often as you like. Additional visits beyond the
                    requirement are encouraged and tracked in your journey.
                  </p>
                </div>
              </div>
              <div className="border-b border-border">
                <button
                  className="w-full flex items-center justify-between py-5 text-left gap-4 group"
                  aria-expanded="false"
                >
                  <span
                    className="text-base font-semibold transition-colors text-foreground/80 group-hover:text-foreground"
                    >Can I choose my gym?</span
                  >
                  <div
                    className="flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-300 border-border"
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path
                        d="M5 2v6M2 5h6"
                        stroke="#6b7280"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      ></path>
                    </svg>
                  </div>
                </button>
                <div className="faq-answer">
                  <p className="pb-5 text-sm text-muted-foreground leading-relaxed">
                    ZonoFit works with partner gyms and fitness facilities. When
                    you sign up, you&#x27;ll select your primary gym from the
                    available network. Gym availability depends on your city and
                    the ZonoFit network.
                  </p>
                </div>
              </div>
              <div className="border-b border-border">
                <button
                  className="w-full flex items-center justify-between py-5 text-left gap-4 group"
                  aria-expanded="false"
                >
                  <span
                    className="text-base font-semibold transition-colors text-foreground/80 group-hover:text-foreground"
                    >What happens after my membership ends?</span
                  >
                  <div
                    className="flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-300 border-border"
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path
                        d="M5 2v6M2 5h6"
                        stroke="#6b7280"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      ></path>
                    </svg>
                  </div>
                </button>
                <div className="faq-answer">
                  <p className="pb-5 text-sm text-muted-foreground leading-relaxed">
                    Any earned credits remain in your wallet for the duration
                    specified in your membership terms. Your journey data and
                    consistency score are preserved. You can renew, upgrade, or
                    pause depending on your situation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section id="final-cta" className="bg-background py-28 md:py-36 px-5">
          <div className="max-w-3xl mx-auto text-center">
            <div className="reveal">
              <h2
                className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground leading-tight"
              >
                Don&#x27;t waste the membership<br />you already paid for.
              </h2>
            </div>
            <div className="mt-5 reveal reveal-delay-1">
              <p className="text-lg md:text-xl text-muted-foreground font-medium">
                Make it part of your journey.
              </p>
            </div>
            <div
              className="mt-12 flex items-center justify-center gap-3 reveal reveal-delay-2"
            >
              <img
                alt="ZonoFit logo"
                loading="lazy"
                width="48"
                height="48"
                decoding="async"
                className="h-12 w-12 object-cover rounded-md"
                src="/logo.jpeg"
              /><span className="text-3xl font-black tracking-tight text-foreground"
                >ZonoFit</span
              >
            </div>
            <div
              className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 reveal reveal-delay-3"
            >
              <a
                href="#calculator"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-extrabold text-base px-8 py-4 rounded-full hover:opacity-90 transition-opacity pulse-green"
                >Start Your Journey<svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <path
                    d="M3 8h10M9 4l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  ></path></svg></a
              ><a
                href="#how-it-works"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border-2 border-border text-foreground font-semibold text-base px-8 py-4 rounded-full hover:border-foreground transition-colors"
                >Explore ZonoFit</a
              >
            </div>
            <div className="mt-10 reveal reveal-delay-3">
              <p
                className="text-sm font-bold tracking-widest uppercase text-muted-foreground"
              >
                Move Better. Live Smarter.
              </p>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-border py-8 px-5">
        <div
          className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <a className="flex items-center gap-2" href="/"
            ><img
              alt="ZonoFit logo"
              loading="lazy"
              width="24"
              height="24"
              decoding="async"
              className="h-6 w-6 object-cover rounded-md"
              src="/logo.jpeg"
            /><span
              className="font-extrabold text-sm tracking-tight text-foreground"
              >ZonoFit</span
            ></a
          >
          <div
            className="flex items-center gap-6 text-sm font-medium text-muted-foreground"
          >
            <a
              href="#how-it-works"
              className="hover:text-foreground transition-colors"
              >How It Works</a
            ><a href="#faq" className="hover:text-foreground transition-colors"
              >FAQ</a
            ><a href="#" className="hover:text-foreground transition-colors"
              >Privacy</a
            ><a href="#" className="hover:text-foreground transition-colors"
              >Terms</a
            >
          </div>
          <p className="text-xs text-muted-foreground">
            © 2026 ZonoFit. Move Better. Live Smarter.
          </p>
        </div>
      </footer>
      </div>
    </div>
  );
}
