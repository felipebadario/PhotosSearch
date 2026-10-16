"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Logo } from "@/components/brand/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { isActive, navItems } from "./nav-items";

export function Sidebar({ userName, planName }: { userName: string; planName: string }) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-nf-line bg-nf-surface md:flex">
      <div className="px-5 pb-6 pt-6">
        <Link href="/" aria-label="NossaFoto, início" className="inline-flex rounded-nf">
          <Logo size={28} />
        </Link>
      </div>

      <nav aria-label="Principal" className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {navItems.map((item) => {
          const active = isActive(item, pathname);
          const Icon = item.icon;
          return (
            <div key={item.href}>
              <Link
                href={item.href}
                aria-current={active && !item.children ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-nf px-3 text-sm font-medium transition-colors",
                  active
                    ? "bg-nf-sunken text-nf-text"
                    : "text-nf-muted hover:bg-nf-sunken/70 hover:text-nf-text",
                )}
              >
                <Icon size={18} strokeWidth={active ? 2.2 : 1.8} aria-hidden />
                {item.label}
              </Link>
              {active && item.children && (
                <ul className="mb-2 ml-[22px] mt-1 space-y-0.5 border-l border-nf-line pl-3">
                  {item.children.map((child) => {
                    const childActive = pathname === child.href;
                    return (
                      <li key={child.href}>
                        <Link
                          href={child.href}
                          aria-current={childActive ? "page" : undefined}
                          className={cn(
                            "flex h-8 items-center rounded-nf-sm px-2 text-[13px] transition-colors",
                            childActive
                              ? "font-medium text-nf-text"
                              : "text-nf-muted hover:text-nf-text",
                          )}
                        >
                          {child.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      <Link
        href="/conta"
        className="mx-3 mb-3 flex items-center gap-3 rounded-nf px-2 py-2.5 transition-colors hover:bg-nf-sunken"
      >
        <Avatar name={userName} size={34} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-nf-text">{userName}</span>
          <span className="block truncate text-xs text-nf-muted">Plano {planName}</span>
        </span>
      </Link>
    </aside>
  );
}
