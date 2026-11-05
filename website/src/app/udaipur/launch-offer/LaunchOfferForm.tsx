"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Camera, Share2 } from "lucide-react";
import "./launch-offer.css";

const INSTA_HANDLE = "zonofit.app";
const INSTA_URL = "https://www.instagram.com/zonofit.app/";
const OFFER_URL = "https://zonofit.com/udaipur/launch-offer";

function InstaIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://api.zonofit.com";

export type LiveGym = {
  name: string;
  area: string;
};

export type UnlockGym = {
  name: string;
  area: string;
  baseVotes: number;
};

const LIVE_GYMS: LiveGym[] = [
  { name: "Pro Fitness Studio", area: "Hiran Magri" },
  { name: "Mrinaal Fitness Empire", area: "Sector 4" },
  { name: "Prime Fitness Studio", area: "Bhupalpura" },
  { name: "Veer Fitness Gym", area: "Sukher" },
  { name: "Fireup Wolverinez Gym & Fitness", area: "Shobhagpura" },
  { name: "B1 Fitness Gym and Supplement Store", area: "Pratap Nagar" },
  { name: "Zoro Fitness", area: "Udaipur" },
  { name: "B&H Gym", area: "Udaipur" },
  { name: "The Gym Zone", area: "Udaipur" },
  { name: "The Fitness Zone Unisex Gym", area: "Udaipur" },
  { name: "108 Being Fit Fitness", area: "Udaipur" },
  { name: "Being Fit Fitness 2.0", area: "Udaipur" },
  { name: "Dolphin Health Club", area: "Udaipur" },
];

const UNLOCK_GYMS: UnlockGym[] = [
  { name: "Healthline Fitness Studio", area: "Udaipur · Not live yet", baseVotes: 6 },
  { name: "ALPHA FITNESS CLUB", area: "Udaipur · Not live yet", baseVotes: 7 },
  { name: "The Fitness Freak Health Club", area: "Udaipur · Not live yet", baseVotes: 5 },
  { name: "Core fitness gym udaipur", area: "Udaipur · Not live yet", baseVotes: 6 },
  { name: "Scitify Gym & Performance", area: "Udaipur · Not live yet", baseVotes: 8 },
  { name: "Shape Up Fitness", area: "Udaipur · Not live yet", baseVotes: 4 },
  { name: "Delta fitness", area: "Udaipur · Not live yet", baseVotes: 5 },
  { name: "Metroflex gym", area: "Udaipur · Not live yet", baseVotes: 7 },
  { name: "Ekaay fitness", area: "Udaipur · Not live yet", baseVotes: 3 },
  { name: "Energy Fitness", area: "Udaipur · Not live yet", baseVotes: 6 },
  { name: "Paliwal Gym", area: "Udaipur · Not live yet", baseVotes: 4 },
  { name: "Strong Fit Gym", area: "Udaipur · Not live yet", baseVotes: 7 },
  { name: "Daesthetic club", area: "Udaipur · Not live yet", baseVotes: 5 },
];

/** Keep this list in sync with server/src/routes/launchOffer.ts */
const GYMS = [
  ...LIVE_GYMS.map((g) => g.name),
  ...UNLOCK_GYMS.map((g) => g.name),
];

const SEX = ["Male", "Female", "Other"] as const;

type Errors = Partial<Record<"name" | "phone" | "age" | "sex" | "gym", string>>;
type Sent = { firstName: string; gym: string };

function Confetti() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let frame = 0;
    let alive = true;

    const burst = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const colors = ["#4ade80", "#16a34a", "#ffffff", "#facc15", "#86efac"];
      const pieces = Array.from({ length: 150 }, () => ({
        x: window.innerWidth / 2 + (Math.random() - 0.5) * 120,
        y: window.innerHeight * 0.45,
        vx: (Math.random() - 0.5) * 16,
        vy: -Math.random() * 17 - 4,
        w: 6 + Math.random() * 7,
        h: 9 + Math.random() * 9,
        r: Math.random() * 6,
        vr: (Math.random() - 0.5) * 0.35,
        c: colors[(Math.random() * colors.length) | 0],
      }));
      let tick = 0;
      const draw = () => {
        if (!alive) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        tick += 1;
        pieces.forEach((piece) => {
          piece.vy += 0.42;
          piece.vx *= 0.992;
          piece.x += piece.vx;
          piece.y += piece.vy;
          piece.r += piece.vr;
          ctx.save();
          ctx.translate(piece.x, piece.y);
          ctx.rotate(piece.r);
          ctx.globalAlpha = Math.max(0, 1 - tick / 190);
          ctx.fillStyle = piece.c;
          ctx.fillRect(-piece.w / 2, -piece.h / 2, piece.w, piece.h);
          ctx.restore();
        });
        if (tick < 190) frame = window.requestAnimationFrame(draw);
        else ctx.clearRect(0, 0, canvas.width, canvas.height);
      };
      window.cancelAnimationFrame(frame);
      draw();
    };

    burst();
    const again = window.setTimeout(burst, 1300);
    return () => {
      alive = false;
      window.cancelAnimationFrame(frame);
      window.clearTimeout(again);
    };
  }, []);

  return <canvas ref={ref} className="lu-confetti" aria-hidden="true" />;
}

async function shareOffer() {
  const text = `Zonofit is giving free gym memberships in Udaipur. I just applied. Apply too: ${OFFER_URL}`;
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title: "ZonoFit Udaipur", text, url: OFFER_URL });
      return;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
    }
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
}

async function postStory(gymName: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const font = "Inter, Roboto, Segoe UI, Helvetica, Arial, sans-serif";
  const paint = ctx.createLinearGradient(0, 0, 1080, 1920);
  paint.addColorStop(0, "#16703f");
  paint.addColorStop(0.45, "#0b3d26");
  paint.addColorStop(1, "#06281a");
  ctx.fillStyle = paint;
  ctx.fillRect(0, 0, 1080, 1920);
  ctx.textAlign = "center";
  ctx.fillStyle = "#4ade80";
  ctx.font = `700 40px ${font}`;
  ctx.fillText("LAUNCH · UDAIPUR", 540, 360);
  ctx.fillStyle = "#fff";
  ctx.font = `800 170px ${font}`;
  ctx.fillText("I'M IN.", 540, 640);
  ctx.font = `600 54px ${font}`;
  ctx.fillStyle = "rgba(255,255,255,.85)";
  ctx.fillText("I applied for a free gym", 540, 800);
  ctx.fillText("membership with Zonofit.", 540, 870);
  ctx.fillStyle = "rgba(255,255,255,.1)";
  ctx.beginPath();
  ctx.roundRect(140, 1000, 800, 200, 40);
  ctx.fill();
  ctx.fillStyle = "#b8f5cf";
  ctx.font = `600 34px ${font}`;
  ctx.fillText("MY GYM", 540, 1070);
  ctx.fillStyle = "#fff";
  ctx.font = `800 52px ${font}`;
  const gymLine = gymName.length > 28 ? `${gymName.slice(0, 26)}…` : gymName;
  ctx.fillText(gymLine, 540, 1145);
  ctx.fillStyle = "#4ade80";
  ctx.font = `800 64px ${font}`;
  ctx.fillText("Pay for the workout,", 540, 1440);
  ctx.fillStyle = "#fff";
  ctx.fillText("not the membership.", 540, 1520);
  ctx.fillStyle = "rgba(255,255,255,.7)";
  ctx.font = `600 44px ${font}`;
  ctx.fillText("Apply free at zonofit.com", 540, 1740);
  ctx.fillText(`@${INSTA_HANDLE}`, 540, 1810);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return;
  const file = new File([blob], "zonofit-udaipur.png", { type: "image/png" });
  const shareData = { files: [file], text: `Tag @${INSTA_HANDLE}` };
  try {
    if (typeof navigator.canShare === "function" && navigator.canShare(shareData)) {
      await navigator.share(shareData);
      return;
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") return;
  }
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "zonofit-udaipur.png";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1500);
}

function SuccessPage({ sent, onClose }: { sent: Sent; onClose: () => void }) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <>
      <div className="lu-page" role="dialog" aria-modal="true" aria-labelledby="lu-hi">
        <div className="lu-pin">
          <div className="lu-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Zonofit_Logo_RemovedBackground.png" alt="" />
            ZONO<b>FIT</b>
          </div>
          <div className="lu-ring2">
            <i>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </i>
          </div>
          <span className="lu-tag">Application received</span>
          <h1 id="lu-hi">You&apos;re in the draw, {sent.firstName}.</h1>
          <p className="lu-gp">Applied for: {sent.gym}</p>

          <div className="lu-big">
            <small>Results declared on</small>
            <strong>Instagram Story</strong>
            <a className="lu-at" href={INSTA_URL} target="_blank" rel="noopener noreferrer">@{INSTA_HANDLE}</a>
            <p>Follow, share, or post and tag us. <b>That way we can find your name.</b></p>
            <a className="lu-btn lu-white" href={INSTA_URL} target="_blank" rel="noopener noreferrer">
              <InstaIcon size={18} /> Follow on Instagram
            </a>
          </div>

          <div className="lu-acts">
            <a className="lu-act" href={INSTA_URL} target="_blank" rel="noopener noreferrer">
              <InstaIcon size={22} />
              <strong>Follow</strong>
              <span>@{INSTA_HANDLE}</span>
            </a>
            <button className="lu-act" type="button" onClick={() => void shareOffer()}>
              <Share2 size={22} />
              <strong>Share</strong>
              <span>Send to a friend</span>
            </button>
            <button className="lu-act" type="button" onClick={() => void postStory(sent.gym)}>
              <Camera size={22} />
              <strong>Post</strong>
              <span>Tag @{INSTA_HANDLE}</span>
            </button>
          </div>
          <button className="lu-close" type="button" onClick={onClose}>Back to zonofit.com</button>
        </div>
      </div>
      <Confetti />
    </>
  );
}

export default function LaunchOfferForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("");
  const [query, setQuery] = useState("");
  const [gym, setGym] = useState("");
  const [custom, setCustom] = useState(false);
  const [customGym, setCustomGym] = useState("");
  const [instagram, setInstagram] = useState("");
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [fail, setFail] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<Sent | null>(null);
  const [mounted, setMounted] = useState(false);
  const customRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredLive = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return LIVE_GYMS;
    return LIVE_GYMS.filter(
      (item) => item.name.toLowerCase().includes(q) || item.area.toLowerCase().includes(q)
    );
  }, [query]);

  const filteredUnlock = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return UNLOCK_GYMS;
    return UNLOCK_GYMS.filter(
      (item) => item.name.toLowerCase().includes(q) || item.area.toLowerCase().includes(q)
    );
  }, [query]);

  function validate(): boolean {
    const next: Errors = {};
    const ageNumber = Number(age);
    if (name.trim().length < 2) next.name = "Enter your name";
    if (!/^[6-9]\d{9}$/.test(phone.trim())) next.phone = "Enter a valid 10-digit mobile number";
    if (!Number.isInteger(ageNumber) || ageNumber < 16 || ageNumber > 70) next.age = "16 to 70";
    if (!sex) next.sex = "Pick one";
    if (custom ? customGym.trim().length < 3 : !gym) next.gym = "Pick a gym or tell us yours";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit() {
    if (sending || done) return;
    setFail("");
    if (website.trim()) {
      setDone({ firstName: name.trim().split(/\s+/)[0] || "there", gym: custom ? customGym.trim() : gym });
      return;
    }
    if (!validate()) {
      setFail("Please fix the fields above.");
      window.setTimeout(() => {
        document.querySelector(".lu-in.bad, .lu-err:not(:empty)")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 30);
      return;
    }

    setSending(true);
    try {
      const response = await fetch(`${API}/api/launch-offer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "launch-udaipur",
          name: name.trim(),
          phone: phone.trim(),
          age: Number(age),
          sex,
          gym: custom ? "" : gym,
          customGym: custom ? customGym.trim() : "",
          instagram: instagram.trim().replace(/^@+/, ""),
          website,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        setFail(payload?.message || "Could not send. Check your network and try again.");
        setSending(false);
        return;
      }
      setDone({ firstName: name.trim().split(/\s+/)[0] || "there", gym: custom ? customGym.trim() : gym });
    } catch {
      setFail("Could not send. Check your network and try again.");
      setSending(false);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (event.key === "Enter" && target.tagName === "INPUT" && target.id !== "lu-q") {
      event.preventDefault();
      void submit();
    }
  }

  return (
    <>
    {done && mounted ? createPortal(<SuccessPage sent={done} onClose={() => { window.location.href = "/"; }} />, document.body) : null}
    <section className="lu" aria-labelledby="lu-h">
      {/* Top Navigation Bar with Back to zonofit.com button */}
      <div className="lu-topbar">
        <a href="https://zonofit.com" className="lu-top-brand" title="ZonoFit Home">
          <span className="lu-brand-mark">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/Zonofit_Logo_RemovedBackground.png"
              alt="ZonoFit"
              className="lu-brand-img"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </span>
          <span className="lu-brand-text">ZonoFit</span>
        </a>

        <a href="https://zonofit.com" className="lu-back-home-btn" title="Back to zonofit.com">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lu-back-icon"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          <span>Back to zonofit.com</span>
        </a>
      </div>

      <div className="lu-wrap">
        <div>
          <span className="lu-eyebrow"><span className="lu-dot" />Launch offer · Udaipur</span>
          <h2 id="lu-h">Train free.<br /><em>Tell us what worked.</em></h2>
          <p className="lu-sub">
            We’re picking people in Udaipur to get a free gym membership and test Zonofit, the flexible, smarter way to train. You show up. We learn.
          </p>
          <div className="lu-steps">
            <div className="lu-step"><b>01</b><div><strong>Apply in 60 seconds</strong><span>Pick the gym you want near you.</span></div></div>
            <div className="lu-step"><b>02</b><div><strong>Get selected, train free</strong><span>Real membership. Real gym. No payment.</span></div></div>
            <div className="lu-step"><b>03</b><div><strong>Give us the honest version</strong><span>A short testimonial and what we should fix.</span></div></div>
          </div>
          <p className="lu-ask">In return, we want to hear:</p>
          <div className="lu-chips">
            <span className="lu-chip">How it helped you</span>
            <span className="lu-chip">What to improve</span>
            <span className="lu-chip">Gyms you need near you</span>
          </div>
        </div>

        <div className="lu-panel">
          <div id="lu-form" onKeyDown={onKeyDown}>
            <h3>Claim your spot</h3>
            <p className="lu-p">Free. Udaipur only. Limited seats.</p>

            <div className="lu-f">
              <label htmlFor="lu-name">Name</label>
              <input
                className={errors.name ? "lu-in bad" : "lu-in"}
                id="lu-name"
                autoComplete="name"
                placeholder="Your full name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              <div className="lu-err">{errors.name}</div>
            </div>

            <div className="lu-f">
              <label htmlFor="lu-phone">Mobile number</label>
              <div className="lu-ph">
                <span>+91</span>
                <input
                  className={errors.phone ? "lu-in bad" : "lu-in"}
                  id="lu-phone"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  autoComplete="tel-national"
                  placeholder="10-digit number"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))}
                />
              </div>
              <div className="lu-err">{errors.phone}</div>
            </div>

            <div className="lu-f lu-row">
              <div>
                <label htmlFor="lu-age">Age</label>
                <input
                  className={errors.age ? "lu-in bad" : "lu-in"}
                  id="lu-age"
                  type="number"
                  inputMode="numeric"
                  min={16}
                  max={70}
                  placeholder="22"
                  value={age}
                  onChange={(event) => setAge(event.target.value)}
                />
                <div className="lu-err">{errors.age}</div>
              </div>
              <div>
                <span className="lu-lab">Sex</span>
                <div className="lu-seg">
                  {SEX.map((item) => (
                    <button key={item} type="button" aria-pressed={sex === item} onClick={() => setSex(item)}>
                      {item}
                    </button>
                  ))}
                </div>
                <div className="lu-err">{errors.sex}</div>
              </div>
            </div>

            <div className="lu-f">
              <span className="lu-lab">Pick your gym</span>
              <div className="lu-gym-picker">
                <div className="lu-search-wrap">
                  <svg className="lu-search-ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    className="lu-search-in"
                    id="lu-q"
                    placeholder="Search gyms"
                    aria-label="Search gyms"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                  {query ? (
                    <button type="button" className="lu-search-clear" aria-label="Clear search" onClick={() => setQuery("")}>
                      ×
                    </button>
                  ) : null}
                </div>

                <div className="lu-gym-scroll">
                  {filteredLive.length > 0 && (
                    <div className="lu-gym-sec">
                      <div className="lu-sec-hdr">
                        <span className="lu-sec-title">
                          <span className="lu-live-dot" /> LIVE ON ZONOFIT
                        </span>
                        <span className="lu-sec-count">{filteredLive.length} {filteredLive.length === 1 ? "gym" : "gyms"}</span>
                      </div>
                      <div className="lu-card-grid">
                        {filteredLive.map((item) => {
                          const isSelected = !custom && gym === item.name;
                          return (
                            <button
                              key={item.name}
                              type="button"
                              className={`lu-gym-card lu-live-card ${isSelected ? "selected" : ""}`}
                              aria-pressed={isSelected}
                              onClick={() => {
                                setGym(item.name);
                                setCustom(false);
                              }}
                            >
                              <div className="lu-card-info">
                                <strong className="lu-card-name">{item.name}</strong>
                                <span className="lu-card-area">{item.area}</span>
                              </div>
                              <div className="lu-badge-row">
                                <span className="lu-live-pill">Free seats open</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {filteredUnlock.length > 0 && (
                    <div className="lu-gym-sec">
                      <div className="lu-sec-hdr">
                        <span className="lu-sec-title">UNLOCK YOUR GYM</span>
                        <span className="lu-sec-meta">Votes needed to go live</span>
                      </div>
                      <div className="lu-card-grid">
                        {filteredUnlock.map((item) => {
                          const isSelected = !custom && gym === item.name;
                          const votes = Math.min(30, item.baseVotes + (isSelected ? 1 : 0));
                          const needed = Math.max(0, 30 - votes);
                          const pct = Math.min(100, Math.round((votes / 30) * 100));

                          return (
                            <button
                              key={item.name}
                              type="button"
                              className={`lu-gym-card lu-unlock-card ${isSelected ? "selected" : ""}`}
                              aria-pressed={isSelected}
                              onClick={() => {
                                setGym(item.name);
                                setCustom(false);
                              }}
                            >
                              <div className="lu-card-info">
                                <strong className="lu-card-name">{item.name}</strong>
                                <span className="lu-card-area">{item.area}</span>
                              </div>
                              <div className="lu-prog-wrap">
                                <div className="lu-prog-track">
                                  <div className="lu-prog-fill" style={{ width: `${pct}%` }} />
                                </div>
                                <div className="lu-count-row">
                                  <span className="lu-count-left">
                                    <b>{votes}</b> / 30 members
                                  </span>
                                  <span className="lu-count-right">
                                    {needed} to unlock
                                  </span>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {filteredLive.length === 0 && filteredUnlock.length === 0 && (
                    <div className="lu-no-matches">
                      No gyms found matching &ldquo;{query}&rdquo;
                    </div>
                  )}

                  <button
                    type="button"
                    className={`lu-gym-card lu-custom-toggle ${custom ? "selected" : ""}`}
                    aria-pressed={custom}
                    onClick={() => {
                      setCustom(true);
                      setGym("");
                      requestAnimationFrame(() => customRef.current?.focus());
                    }}
                  >
                    <div className="lu-custom-info">
                      <strong>My gym isn’t listed</strong>
                      <small>Request it — we unlock partner gyms as votes reach 30</small>
                    </div>
                    <span className="lu-custom-plus">{custom ? "✓" : "+"}</span>
                  </button>
                </div>
              </div>
              {custom ? (
                <div className="lu-custom">
                  <input
                    ref={customRef}
                    className="lu-in"
                    placeholder="Gym name and area"
                    value={customGym}
                    onChange={(event) => setCustomGym(event.target.value)}
                  />
                  <p className="lu-note">Not a partner yet? Tell us. When enough people ask for the same gym, we partner with them.</p>
                </div>
              ) : null}
              <div className="lu-err">{errors.gym}</div>
            </div>

            <div className="lu-f">
              <label htmlFor="lu-ig">Your Instagram <i>(optional)</i></label>
              <input
                className="lu-in"
                id="lu-ig"
                autoCapitalize="off"
                placeholder="@yourhandle"
                value={instagram}
                onChange={(event) => setInstagram(event.target.value)}
              />
              <p className="lu-note">Already follow us? Add your handle. It improves your chances.</p>
            </div>

            <input
              className="lu-hp"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
            />
            <div className="lu-err lu-fail">{fail}</div>
            <button className="lu-btn lu-pri" type="button" disabled={sending} onClick={() => void submit()}>
              {sending ? "Sending…" : "Apply for free membership"}
            </button>
            <p className="lu-fine">No payment. Your details are used only for this offer.</p>
          </div>
        </div>
      </div>
    </section>
    </>
  );
}
