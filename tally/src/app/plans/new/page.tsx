"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * /plans/new — Redirect to dashboard.
 * Plan creation is now handled via the quick-create modal on the dashboard.
 */
export default function NewPlanPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-sage-200 border-t-sage-500" />
    </div>
  );
}
