"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import Link from "next/link";

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
    <div className="flex-1 flex items-center justify-center relative min-h-[calc(100vh-80px)]">
      {/* Background gradients */}
      <div className="absolute top-[10%] left-[20%] w-[40%] h-[40%] rounded-full bg-emerald-100/60 blur-[120px] pointer-events-none" />
      
      <div className="glass w-full max-w-md p-8 rounded-3xl relative z-10 shadow-xl border border-black/5 mx-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">Welcome Back</h1>
          <p className="text-gray-600 text-sm">Login to the ZonoFit Admin Console</p>
        </div>

        {error ? (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-lg mb-6">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="email"
              placeholder="Email address"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-12 pr-4 text-black focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-gray-400"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-12 pr-12 text-black focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-gray-400"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {otpStep ? (
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="4-digit code from your email"
              required
              maxLength={4}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-black tracking-[0.3em] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:tracking-normal placeholder:text-gray-400"
            />
          ) : null}

          <button 
            type="submit" 
            disabled={loading || (otpStep && code.length < 4)}
            className="mt-2 bg-primary hover:bg-primary-dark text-white py-3.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? "Please wait..." : otpStep ? "Verify and login" : "Login"} <ArrowRight size={18} />
          </button>
          {otpStep ? (
            <button
              type="button"
              disabled={loading || resendIn > 0}
              onClick={() => void signIn(false)}
              className="text-center text-xs text-gray-500 hover:text-black disabled:hover:text-gray-500"
            >
              {resendIn > 0
                ? `Resend OTP in ${Math.floor(resendIn / 60)}:${String(resendIn % 60).padStart(2, "0")}`
                : "Resend OTP"}
            </button>
          ) : null}
          {otpStep ? (
            <p className="text-center text-xs text-gray-500 -mt-2">The code works for 10 minutes.</p>
          ) : null}
        </form>

      </div>
    </div>
  );
}
