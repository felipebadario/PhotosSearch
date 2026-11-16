"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Inbox, LayoutDashboard, LogOut, Users } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/cn";
import { ManagerSignOut } from "./ManagerSignOut";

const items = [
  { path: "/", label: "Visão geral", icon: LayoutDashboard },
  { path: "/organizacoes", label: "Organizações", icon: Building2 },
  { path: "/contas", label: "Contas", icon: Users },
  { path: "/pedidos", label: "Pedidos de assinatura", icon: Inbox },
];

export function ManagerNav({ base, userName, newLeads }: { base: string; userName: string; newLeads: number }) {
  // No subdomínio o navegador mostra "/organizacoes"; em localhost, "/manager/organizacoes".
  const pathname = usePathname().replace(/^\/manager(?=\/|$)/, "") || "/";
  const href = (p: string) => (base ? `${base}${p === "/" ? "" : p}` : p);
  const active = (p: string) => (p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(`${p}/`));

  return (
    <header className="border-b border-nf-line bg-nf-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-8">
        <Link href={href("/")} className="flex items-center gap-2 rounded-nf" aria-label="NossaFoto Manager, visão geral">
          <Logo size={26} />
          <span className="rounded-full bg-nf-ink px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white">Manager</span>
        </Link>
        <nav aria-label="Manager" className="order-3 -mx-1 flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto sm:flex-1">
          {items.map((it) => {
            const Icon = it.icon;
            const on = active(it.path);
            return (
              <Link
                key={it.path}
                href={href(it.path)}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-2 rounded-nf px-3 text-sm font-medium",
                  on ? "bg-nf-sunken text-nf-text" : "text-nf-muted hover:bg-nf-sunken/70 hover:text-nf-text",
                )}
              >
                <Icon size={16} aria-hidden /> {it.label}
                {it.path === "/pedidos" && newLeads > 0 && (
                  <span className="rounded-full bg-nf-accent px-1.5 text-[11px] font-semibold tabular-nums text-white">{newLeads}</span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm text-nf-muted">
          <span className="hidden sm:inline">{userName}</span>
          <ManagerSignOut to={href("/entrar")} label="Sair" className="rounded-nf p-2 hover:bg-nf-sunken hover:text-nf-text">
            <LogOut size={16} aria-hidden />
          </ManagerSignOut>
        </div>
      </div>
    </header>
  );
}
