"use client";

import { FormEvent, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { COPY, type Lang } from "./copy";
import { PARTNER_GYMS, SHOW_SAMPLE_GYMS } from "./network";
import "./partner-portal.css";

const ART = [
  "linear-gradient(135deg,#2B8A4B,#0C2416)",
  "linear-gradient(135deg,#8DBE2A,#2B8A4B)",
  "linear-gradient(135deg,#1F7A3F,#3F8230 60%,#8DBE2A)",
  "linear-gradient(135deg,#0F5A2D,#2B8A4B)",
  "linear-gradient(135deg,#3F8230,#14532B)",
];

const UDAIPUR_ART = "M5 38h38M10 38V27h28v11M10 27v-5a3 3 0 016 0v5M32 27v-5a3 3 0 016 0v5M20 27v-8a4 4 0 018 0v8M24 15v-4M19 38v-4a2 2 0 014 0v4M25 38v-4a2 2 0 014 0v4M8 43c3-2 5 2 8 0s5 2 8 0 5 2 8 0 5 2 8 0";

const MOUTH: Record<string, string> = {
  idle: "M104 144q16 14 32 0",
  em: "M100 142q20 20 40 0",
  pw: "M112 148a8 8 0 0116 0a8 8 0 01-16 0z",
  joy: "M96 138q24 34 48 0z",
  sad: "M104 154q16-14 32 0",
};

function emailOk(value: string) {
  return /^\S+@\S+\.\S+$/.test(value);
}

export function PartnerPortal({ fontClass }: { fontClass: string }) {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [lang, setLang] = useState<Lang>("en");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [otpStep, setOtpStep] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [badField, setBadField] = useState<"email" | "password" | "code" | "">("");
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [mascot, setMascot] = useState("");
  const [mouth, setMouth] = useState("idle");
  const [bubble, setBubble] = useState("b_idle");
  const [opening, setOpening] = useState(false);
  const [bubbleOn, setBubbleOn] = useState(true);
  const [marqueePause, setMarqueePause] = useState(false);
  const mascotRef = useRef<HTMLDivElement>(null);
  const pupilRef = useRef<SVGGElement>(null);

  const t = (key: string) => COPY[lang][key] ?? key;
  const emailValid = emailOk(email.trim());
  const passwordValid = password.length >= 8;
  const codeValid = code.length === 6;
  const ready = emailValid && passwordValid && (!otpStep || codeValid);
  const charge = otpStep
    ? (emailValid ? 34 : 0) + (passwordValid ? 33 : 0) + (codeValid ? 33 : 0)
    : (emailValid ? 50 : 0) + (passwordValid ? 50 : 0);
  const cards = useMemo(() => [...PARTNER_GYMS, ...PARTNER_GYMS], []);
  const quoteWords = t("q_text").split(" ");
  const quoteHits = new Set(t("q_hl").split("|"));

  useEffect(() => {
    try {
      const saved = localStorage.getItem("zf_lang");
      if (saved === "hi" || saved === "en") setLang(saved);
    } catch {
      // Language stays English when storage is blocked.
    }
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  useEffect(() => {
    setBubbleOn(false);
    const timer = window.setTimeout(() => setBubbleOn(true), 120);
    return () => window.clearTimeout(timer);
  }, [bubble, lang]);

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      const pupil = pupilRef.current;
      const mascotNode = mascotRef.current;
      if (!pupil || !mascotNode) return;
      if (mascot === "pw" || document.activeElement?.id === "partner-email") return;
      const rect = mascotNode.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      const dist = Math.hypot(dx, dy) || 1;
      const reach = Math.min(7, dist / 40);
      pupil.style.transform = `translate(${(dx / dist) * reach}px, ${(dy / dist) * reach}px)`;
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [mascot]);

  useEffect(() => {
    const nodes = document.querySelectorAll(".zf-portal .rv");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  const lookAlongEmail = (value: string) => {
    const count = Math.min(value.length, 24);
    if (pupilRef.current) pupilRef.current.style.transform = `translate(${2 + count * 0.18}px, 5px)`;
  };

  const chooseLang = (next: Lang) => {
    setLang(next);
    setBubble("b_idle");
    try {
      localStorage.setItem("zf_lang", next);
    } catch {
      // The toggle still works for this visit.
    }
  };

  const fail = (message: string, field: "email" | "password" | "code") => {
    setError(message);
    setBadField(field);
    setMascot("sad");
    setMouth("sad");
    setBubble("b_err");
  };

  const signIn = async (includeCode: boolean) => {
    const trimmed = email.trim().toLowerCase();
    if (!emailOk(trimmed)) {
      fail(t("e1"), "email");
      return;
    }
    if (password.length < 8) {
      fail(t("e2"), "password");
      return;
    }
    if (includeCode && !/^\d{4}$/.test(code)) {
      fail(t("b_otp"), "code");
      return;
    }

    setLoading(true);
    setError("");
    setBadField("");
    try {
      const res = await fetch("/api/auth/portal/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmed,
          password,
          ...(includeCode ? { code } : {}),
        }),
      });
      let data: {
        otpRequired?: boolean;
        retryAfterSeconds?: number;
        message?: string;
        error?: string;
        token?: string;
        user?: { id?: string; name?: string; email?: string; role?: string };
      } = {};
      try {
        data = await res.json();
      } catch {
        throw new Error(res.status === 503 || res.status === 502 ? "The portal is starting. Try again in a moment." : "Could not reach the portal.");
      }
      if (!res.ok) {
        if (typeof data.retryAfterSeconds === "number") setResendIn(data.retryAfterSeconds);
        throw new Error(data.message || data.error || "Could not sign in.");
      }
      if (data.otpRequired) {
        setOtpStep(true);
        setCode("");
        setResendIn(5 * 60);
        setMascot("");
        setMouth("em");
        setBubble("b_otp");
        return;
      }
      const user = data.user;
      if (!data.token || !user?.id || !user.name || !user.email || user.role !== "GYM_OWNER") {
        throw new Error("This portal is for gym partners only.");
      }
      login({ id: user.id, name: user.name, email: user.email, role: "GYM_OWNER" }, data.token);
      setMascot("joy");
      setMouth("joy");
      setBubble("b_ok");
      setOpening(true);
      window.setTimeout(() => router.push("/dashboard"), 900);
    } catch (err) {
      fail(err instanceof Error ? err.message : "Could not sign in.", includeCode ? "code" : "password");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void signIn(otpStep);
  };

  return (
    <div className={`zf-portal ${fontClass}`} lang={lang}>
      <section className="s1" id="login">
        <div className="orb o1" />
        <div className="orb o2" />
        <div className="orb o3" />
        <div className="grid" />
        <div className="top">
          <div className="brand">
            <span className="logo" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 40 40">
                <path d="M11 14h17c2 0 2.5 2.4.6 3H17M11 21h8" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" fill="none" />
                <circle cx="14" cy="28" r="2.6" fill="#fff" />
              </svg>
            </span>
            Zonofit <small>{t("tag")}</small>
          </div>
          <div className="lang" role="group" aria-label="Language">
            <button type="button" className={lang === "en" ? "on" : ""} onClick={() => chooseLang("en")}>EN</button>
            <button type="button" className={lang === "hi" ? "on" : ""} onClick={() => chooseLang("hi")}>हिं</button>
          </div>
        </div>

        <div className="wrap">
          <div className="l">
            <div className={`mas ${mascot}`} ref={mascotRef} aria-hidden="true">
              <div className={`bub${bubbleOn ? "" : " sw"}`}>{t(bubble)}</div>
              <svg viewBox="0 0 240 230">
                <defs>
                  <linearGradient id="zfp-body" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#9BC82F" />
                    <stop offset="1" stopColor="#3F8230" />
                  </linearGradient>
                </defs>
                <ellipse cx="120" cy="214" rx="72" ry="9" fill="rgba(0,0,0,.28)" />
                <g className="body">
                  <rect x="72" y="176" width="36" height="22" rx="11" fill="#0F2417" />
                  <rect x="132" y="176" width="36" height="22" rx="11" fill="#0F2417" />
                  <rect x="34" y="26" width="172" height="162" rx="48" fill="url(#zfp-body)" />
                  <rect x="34" y="26" width="172" height="162" rx="48" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="2" />
                  <path d="M58 70c0-10 8-18 20-18h104c-2 13-11 24-24 24H58z" fill="#fff" opacity=".96" />
                  <circle cx="70" cy="140" r="9" fill="#F5C84B" opacity=".55" />
                  <circle cx="170" cy="140" r="9" fill="#F5C84B" opacity=".55" />
                  <g className="eyew">
                    <circle cx="92" cy="108" r="19" fill="#fff" stroke="#14532B" strokeWidth="2.5" />
                    <circle cx="148" cy="108" r="19" fill="#fff" stroke="#14532B" strokeWidth="2.5" />
                  </g>
                  <g className="pup" ref={pupilRef}>
                    <circle cx="92" cy="108" r="9" fill="#0F2417" />
                    <circle cx="148" cy="108" r="9" fill="#0F2417" />
                    <circle cx="95" cy="104" r="3" fill="#fff" />
                    <circle cx="151" cy="104" r="3" fill="#fff" />
                  </g>
                  <path d={MOUTH[mouth]} fill={mouth === "joy" || mouth === "pw" ? "#0F2417" : "none"} stroke="#0F2417" strokeWidth="5" strokeLinecap="round" />
                  <g className="hand hl">
                    <circle cx="50" cy="190" r="20" fill="#F3FBDD" stroke="#1F5A31" strokeWidth="3.5" />
                    <path d="M42 184v-5M50 182v-7M58 184v-5" stroke="#1F5A31" strokeWidth="3" strokeLinecap="round" fill="none" />
                  </g>
                  <g className="hand hr">
                    <circle cx="190" cy="190" r="20" fill="#F3FBDD" stroke="#1F5A31" strokeWidth="3.5" />
                    <path d="M182 184v-5M190 182v-7M198 184v-5" stroke="#1F5A31" strokeWidth="3" strokeLinecap="round" fill="none" />
                  </g>
                </g>
              </svg>
            </div>
            <h1>{t("h1")}</h1>
            <p>{t("h1p")}</p>
          </div>

          <form className="card" onSubmit={onSubmit} noValidate>
            <div className="charge" style={{ width: `${charge}%` }} />
            <h2>{otpStep ? t("b_otp") : t("wl")}</h2>
            <p className="sub">{otpStep ? t("otpHint") : t("sub")}</p>
            <div className={`f${emailValid ? " v" : ""}${badField === "email" ? " bad" : ""}`}>
              <input
                id="partner-email"
                type="email"
                inputMode="email"
                autoComplete="username"
                placeholder=" "
                value={email}
                aria-label={t("le")}
                onFocus={() => { setMascot(""); setMouth("em"); setBubble("b_em"); lookAlongEmail(email); }}
                onChange={(event) => { setEmail(event.target.value); setBadField(""); setError(""); lookAlongEmail(event.target.value); if (emailOk(event.target.value.trim()) && password.length >= 8) setBubble("b_ready"); }}
              />
              <label htmlFor="partner-email">{t("le")}</label>
              <span className="ok" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
              </span>
            </div>
            <div className={`f${badField === "password" ? " bad" : ""}`}>
              <input
                id="partner-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder=" "
                value={password}
                aria-label={t("lp")}
                onFocus={() => { setMascot(showPassword ? "peek" : "pw"); setMouth("pw"); setBubble(showPassword ? "b_peek" : "b_pw"); }}
                onChange={(event) => { setPassword(event.target.value); setBadField(""); setError(""); if (emailValid && event.target.value.length >= 8) setBubble("b_ready"); }}
              />
              <label htmlFor="partner-password">{t("lp")}</label>
              <button
                type="button"
                className="eye"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => {
                  setShowPassword((current) => !current);
                  setMascot(showPassword ? "pw" : "peek");
                  setBubble(showPassword ? "b_pw" : "b_peek");
                }}
              >
                <svg className="i" viewBox="0 0 24 24"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z" /></svg>
              </button>
            </div>
            {otpStep ? (
              <div className={`f${badField === "code" ? " bad" : ""}`}>
                <input
                  id="partner-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder=" "
                  maxLength={6}
                  value={code}
                  aria-label={t("lc")}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                />
                <label htmlFor="partner-code">{t("lc")}</label>
              </div>
            ) : null}
            <div className="err" role="alert">{error}</div>
            <div className="row">
              <label className="sw">
                <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
                <i />
                <span>{t("rm")}</span>
              </label>
            </div>
            <button className={`go${ready && !loading ? " ready" : ""}${loading ? " busy" : ""}`} type="submit" disabled={loading}>
              <span className="tx">{otpStep ? t("verify") : t("si")}</span>
              <span className="sp" />
            </button>
            {otpStep ? (
              <button type="button" className="resend" disabled={loading || resendIn > 0} onClick={() => void signIn(false)}>
                {resendIn > 0
                  ? `${t("resend")} ${Math.floor(resendIn / 60)}:${String(resendIn % 60).padStart(2, "0")}`
                  : t("resend")}
              </button>
            ) : null}
            <div className="help">
              <span>{t("hp")}</span>
              <a href="mailto:zonofitofficial@gmail.com">{t("hp2")}</a>
              <Link href="/auth/signup">{t("join")}</Link>
            </div>
          </form>
        </div>
        <div className="sec">
          <svg className="i" viewBox="0 0 24 24" style={{ width: 15, height: 15 }}><path d="M6 11h12v9H6zM8 11V8a4 4 0 018 0v3" /></svg>
          <span>{t("secure")}</span>
        </div>
        <a className="cue" href="#net">
          <span>{t("cue")}</span>
          <svg className="i" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
        </a>
      </section>

      <section className="s2" id="net">
        <div className="in">
          <div className="rv">
            <div className="eyebrow">{t("c_e")}</div>
            <h2>{t("c_h")}</h2>
          </div>
          <article className="hp rv">
            <div className="hp-t">
              <span className="live"><i />{t("live")}</span>
              <h3>{t("c_city")}</h3>
              <p>{t("c_lp")}</p>
              <div className="stub"><span>ZONOFIT</span><span>PARTNER NETWORK</span><span>UDAIPUR</span></div>
            </div>
            <svg className="hp-a" viewBox="0 0 48 48" aria-hidden="true">
              <defs>
                <linearGradient id="zfp-art" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#8DBE2A" />
                  <stop offset="1" stopColor="#2B8A4B" />
                </linearGradient>
              </defs>
              <path d={UDAIPUR_ART} stroke="url(#zfp-art)" />
            </svg>
          </article>
          <div className="mqh rv"><h3>{t("mq_h")}</h3></div>
          <div
            id="partner-gyms"
            className={`mq rv${marqueePause ? " pause" : ""}`}
            onTouchStart={() => setMarqueePause(true)}
            onTouchEnd={() => window.setTimeout(() => setMarqueePause(false), 1500)}
          >
            <div className="mqt">
              {cards.map((gym, index) => (
                <article className="gp" key={`${gym.name}-${index}`}>
                  <div className="ph" style={{ background: ART[index % ART.length] }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" width="70" height="70">
                      <path d="M6 8v8M3 10v4M18 8v8M21 10v4M6 12h12" />
                    </svg>
                    <span className="pt">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6zM9 12l2 2 4-4" /></svg>
                      {t("partner")}
                    </span>
                    {!gym.real && SHOW_SAMPLE_GYMS ? <span className="sm">{t("sample")}</span> : null}
                  </div>
                  <div className="bd">
                    <b>{gym.name}</b>
                    <small>{gym.area}, Udaipur</small>
                    <div className="ch">
                      {[...gym.facilities, ...gym.equipment].map((tag) => <span key={tag}>{tag}</span>)}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="s3">
        <div className="in quote-wrap">
          <figure className="q rv">
            <div className="qm" aria-hidden="true">&ldquo;</div>
            <blockquote>
              {quoteWords.map((word, index) => (
                <span
                  key={`${word}-${index}`}
                  className={quoteHits.has(word.replace(/[.,।]/g, "")) ? "hl" : undefined}
                  style={{ "--i": index } as CSSProperties}
                >
                  {word}
                </span>
              ))}
            </blockquote>
            <figcaption>
              <span className="lg" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 40 40">
                  <path d="M11 14h17c2 0 2.5 2.4.6 3H17M11 21h8" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" fill="none" />
                  <circle cx="14" cy="28" r="2.6" fill="#fff" />
                </svg>
              </span>
              <span>{t("q_by")}</span>
            </figcaption>
            <div className="qc">
              <span><svg className="i" viewBox="0 0 24 24"><path d="M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2" /></svg><b>{t("qc1")}</b></span>
              <span><svg className="i" viewBox="0 0 24 24"><path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6zM9 12l2 2 4-4" /></svg><b>{t("qc2")}</b></span>
              <span><svg className="i" viewBox="0 0 24 24"><path d="M7 4h10M7 9h10M7 4c5 0 6 5 0 5l7 8" /></svg><b>{t("qc3")}</b></span>
            </div>
          </figure>
          <div className="back rv">
            <span>{t("bk")}</span>
            <a href="#login">{t("bk2")}<svg className="i" viewBox="0 0 24 24"><path d="M18 15l-6-6-6 6" /></svg></a>
          </div>
        </div>
      </section>
      <footer>Zonofit · {t("foot")}</footer>

      <div className={`wipe${opening ? " on" : ""}`} />
      <div className={`done${opening ? " on" : ""}`}>
        <div className="logo">
          <svg width="34" height="34" viewBox="0 0 40 40">
            <path d="M11 14h17c2 0 2.5 2.4.6 3H17M11 21h8" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" fill="none" />
            <circle cx="14" cy="28" r="2.6" fill="#fff" />
          </svg>
        </div>
        <h2>{t("dh")}</h2>
        <p>{t("dp")}</p>
      </div>
    </div>
  );
}
