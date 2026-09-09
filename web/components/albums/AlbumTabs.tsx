"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export function AlbumTabs({ albumId }: { albumId: string }) {
  const pathname = usePathname();
  const base = `/albums/${albumId}`;
  const tabs = [
    { href: base, label: "Visão geral" },
    { href: `${base}/fotos`, label: "Fotos" },
    { href: `${base}/compartilhamento`, label: "Compartilhamento" },
    { href: `${base}/configuracoes`, label: "Configurações" },
  ];

  return (
    <div className="flex gap-1 overflow-x-auto border-b border-df-line">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-semibold transition-colors",
              active
                ? "border-df-primary text-df-primary"
                : "border-transparent text-df-muted hover:text-df-ink",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
