"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera } from "lucide-react";
import { cn } from "@/lib/cn";
import { OrgMark } from "@/components/ui/OrgMark";
import { mockOrganization } from "@/lib/mock-data";
import { navItems } from "./nav-items";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-df-line bg-df-white md:flex">
      <div className="flex items-center gap-2 px-6 py-6">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-df-primary text-df-white">
          <Camera size={17} strokeWidth={2.3} />
        </span>
        <span className="font-display text-base font-bold text-df-ink">
          Descomplica <span className="text-df-accent-dark">Fotos</span>
        </span>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-df-mint-soft text-df-primary-dark"
                  : "text-df-muted hover:bg-df-cream hover:text-df-ink",
              )}
            >
              <Icon size={18} strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-3 border-t border-df-line px-4 py-4">
        <OrgMark name={mockOrganization.name} logoUrl={mockOrganization.logoUrl} size={36} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-df-ink">
            {mockOrganization.name}
          </p>
          <p className="truncate text-xs text-df-muted">Plano padrão</p>
        </div>
      </div>
    </aside>
  );
}
