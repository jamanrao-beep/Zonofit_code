"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OffersPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh] text-muted font-medium">
      Redirecting to Partner Dashboard...
    </div>
  );
}
