"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { Eye, EyeOff, Lock } from "lucide-react";

function Mark() {
  return (
    <div
      className="grid h-11 w-11 place-items-center rounded-[13px]"
      style={{ background: "linear-gradient(#92BB2B, #3F8230)" }}
    >
      <svg width="24" height="24" viewBox="0 0 40 40" aria-hidden="true">
        <path
          d="M11 14h17c2 0 2.5 2.4.6 3H17M11 21h8"
          stroke="#fff"
          strokeWidth="3.4"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="14" cy="28" r="2.6" fill="#fff" />
      </svg>
    </div>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [otpStep, setOtpStep] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const router = useRouter();
  const login = useAuthStore((state) => state.login);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const signIn = async (includeCode: boolean) => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/portal/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, ...(includeCode ? { code } : {}) }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        throw new Error(
          res.status === 503 || res.status === 502
            ? "API server is currently initializing. Please try again in a few moments."
            : `Server returned error (${res.status}).`
        );
      }

      if (!res.ok) {
        if (typeof data.retryAfterSeconds === "number") setResendIn(data.retryAfterSeconds);
        throw new Error(data.message || data.error || "Failed to login");
      }

      if (data.otpRequired) {
        setOtpStep(true);
        setCode("");
        setResendIn(5 * 60);
        return;
      }

      if (data.user.role !== "ADMIN") {
        throw new Error("This portal is for administrators only.");
      }

      login(data.user, data.token);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void signIn(otpStep);
  };

  return (
    <div
      className="grid min-h-dvh place-items-center px-6 py-8"
      style={{
        background: "radial-gradient(900px 500px at 50% -10%, #dcefdf, transparent), #fff",
        paddingTop: "max(24px, env(safe-area-inset-top))",
        paddingBottom: "max(24px, env(safe-area-inset-bottom))",
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-[400px] rounded-[28px] border border-[#E4EAE1] bg-white px-7 py-8 shadow-[0_30px_60px_-30px_rgba(15,36,23,0.25)]"
      >
        <Mark />
        <h1 className="mb-1.5 mt-4 text-[28px] text-[#0F2417]">{otpStep ? "Verify it’s you" : "Zonofit Admin"}</h1>
        <p className="mb-5 text-[#66756B]">
          {otpStep
            ? "Enter the 6-digit code we emailed you. It works for 10 minutes."
            : "Restricted area. Sign in with your admin account."}
        </p>

        {otpStep ? (
          <label className="mb-3.5 block">
            <span className="mb-1.5 block text-[12.5px] font-bold text-[#66756B]">6-digit code</span>
            <input
              className="h-12 w-full rounded-[14px] border-[1.5px] border-[#E4EAE1] px-3.5 tracking-[0.3em] outline-none focus:border-[#1F7A3F] focus:shadow-[0_0_0_4px_rgba(31,122,63,0.12)]"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </label>
        ) : (
          <>
            <label className="mb-3.5 block">
              <span className="mb-1.5 block text-[12.5px] font-bold text-[#66756B]">Email</span>
              <input
                className="h-12 w-full rounded-[14px] border-[1.5px] border-[#E4EAE1] px-3.5 outline-none focus:border-[#1F7A3F] focus:shadow-[0_0_0_4px_rgba(31,122,63,0.12)]"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="mb-3.5 block">
              <span className="mb-1.5 block text-[12.5px] font-bold text-[#66756B]">Password</span>
              <div className="relative">
                <input
                  className="h-12 w-full rounded-[14px] border-[1.5px] border-[#E4EAE1] px-3.5 pr-12 outline-none focus:border-[#1F7A3F] focus:shadow-[0_0_0_4px_rgba(31,122,63,0.12)]"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-1.5 top-1.5 grid h-9 w-9 place-items-center text-[#66756B]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((shown) => !shown)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
          </>
        )}

        <div className="mb-3 min-h-[18px] text-[13px] text-[#C2362D]" role="alert">
          {error}
        </div>

        <button
          type="submit"
          disabled={loading || (otpStep && code.length < 6)}
          className="flex h-[50px] w-full items-center justify-center rounded-[13px] bg-[#1F7A3F] text-base font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"
        >
          {loading ? "Please wait..." : otpStep ? "Verify and continue" : "Sign in"}
        </button>

        {otpStep ? (
          <div className="mt-3 flex flex-col items-center gap-2">
            <button
              type="button"
              disabled={loading || resendIn > 0}
              onClick={() => void signIn(false)}
              className="text-sm font-bold text-[#1F7A3F] disabled:opacity-45"
            >
              {resendIn > 0
                ? `Resend code in ${Math.floor(resendIn / 60)}:${String(resendIn % 60).padStart(2, "0")}`
                : "Resend code"}
            </button>
            <button
              type="button"
              className="text-sm font-bold text-[#66756B]"
              onClick={() => {
                setOtpStep(false);
                setCode("");
                setError("");
              }}
            >
              Use a different account
            </button>
          </div>
        ) : null}

        <div className="mt-4 flex items-center justify-center gap-2 text-center text-[12.5px] text-[#66756B]">
          <Lock size={15} />
          <span>A verification code is emailed after your password.</span>
        </div>
      </form>
    </div>
  );
}
