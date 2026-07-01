"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { ShieldAlert } from "lucide-react";

export default function GymGuard({ children }: { children: React.ReactNode }) {
  const { user, initialize } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    initialize();
    setLoading(false);
  }, [initialize]);

  useEffect(() => {
    if (!loading && (!user || user.role !== "GYM_OWNER")) {
      router.replace("/");
    }
  }, [user, loading, router]);

  if (loading) return null;

  if (!user || user.role !== "GYM_OWNER") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[calc(100vh-80px)] text-center">
        <ShieldAlert size={64} className="text-red-500 mb-4" />
        <h1 className="text-3xl font-bold text-black mb-2">Access Denied</h1>
        <p className="text-gray-600">You must be a Gym Owner to view this page.</p>
      </div>
    );
  }

  return <>{children}</>;
}
