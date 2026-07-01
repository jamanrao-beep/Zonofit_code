"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { ShieldAlert } from "lucide-react";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, initialize } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    initialize();
    setLoading(false);
  }, [initialize]);

  useEffect(() => {
    if (!loading && (!user || user.role !== "ADMIN")) {
      router.replace("/");
    }
  }, [user, loading, router]);

  if (loading) return null; // Or a spinner

  if (!user || user.role !== "ADMIN") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[calc(100vh-80px)] text-center">
        <ShieldAlert size={64} className="text-red-500 mb-4" />
        <h1 className="text-3xl font-bold text-white mb-2">Access Denied</h1>
        <p className="text-gray-400">You must be an Administrator to view this page.</p>
      </div>
    );
  }

  return <>{children}</>;
}
