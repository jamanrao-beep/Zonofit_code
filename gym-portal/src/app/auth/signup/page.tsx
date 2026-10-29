"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export default function SignupPage() {
  return (
    <div className="flex-1 flex items-center justify-center relative min-h-[calc(100vh-80px)] py-12">
      <div className="absolute top-[30%] right-[20%] w-[40%] h-[40%] rounded-full bg-emerald-100/60 blur-[120px] pointer-events-none" />

      <div className="glass w-full max-w-md p-8 rounded-3xl relative z-10 shadow-xl border border-black/5 mx-4">
        <div className="text-center mb-6">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <ShieldCheck size={22} />
          </div>
          <h1 className="text-3xl font-bold text-black mb-2">Partner access</h1>
          <p className="text-gray-600 text-sm">
            Gym partner accounts are created when ZonoFit approves a gym application. Open signup is closed.
          </p>
        </div>

        <p className="text-sm text-gray-600 leading-relaxed">
          If you already have a partner login, sign in. A new gym is added from a member account, then an admin approves it and turns that account into a gym partner.
        </p>

        <Link
          href="/auth/login"
          className="mt-6 bg-primary hover:bg-primary-dark text-white py-3.5 rounded-xl font-semibold transition-all flex items-center justify-center"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
