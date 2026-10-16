"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export interface SectionTab {
  href: string;
  label: string;
  /** Marca a aba como ativa também em sub-rotas (ex.: /acervo/albuns/123). */
  matchPrefix?: boolean;
}

export function SectionTabs({ tabs, label }: { tabs: SectionTab[]; label: string }) {
  const pathname = usePathname();

  return (
    <nav aria-label={label} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="inline-flex gap-1 rounded-full bg-nf-sunken p-1">
        {tabs.map((tab) => {
          const active = tab.matchPrefix
            ? pathname === tab.href || pathname.startsWith(`${tab.href}/`)
            : pathname === tab.href;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-9 items-center whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors",
                  active
                    ? "bg-nf-surface text-nf-text shadow-[0_1px_2px_rgba(22,23,26,0.08)]"
                    : "text-nf-muted hover:text-nf-text",
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
