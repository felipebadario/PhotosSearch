"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Recarrega a página a cada poucos segundos enquanto houver algo em andamento. */
export function AutoRefresh({ active, seconds = 5 }: { active: boolean; seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(id);
  }, [active, seconds, router]);
  return null;
}
