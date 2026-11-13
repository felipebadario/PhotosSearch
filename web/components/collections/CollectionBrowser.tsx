"use client";

import { useMemo, useState } from "react";
import { LayoutGrid, List, Search, X } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { plural } from "@/lib/format";
import { CollectionCard, type CollectionCardData } from "./CollectionCard";

type Filter = "all" | "permanent" | "event" | "open";

const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Lista de acervos com busca por nome, filtros e troca entre grade e lista. */
export function CollectionBrowser({ items }: { items: CollectionCardData[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");

  const counts = useMemo(
    () => ({
      all: items.length,
      permanent: items.filter((c) => c.kind === "permanent").length,
      event: items.filter((c) => c.kind === "event").length,
      open: items.filter((c) => c.shared).length,
    }),
    [items],
  );
  const shown = useMemo(() => {
    const q = normalize(query.trim());
    return items.filter((c) => {
      if (filter === "permanent" && c.kind !== "permanent") return false;
      if (filter === "event" && c.kind !== "event") return false;
      if (filter === "open" && !c.shared) return false;
      return !q || normalize(c.name).includes(q);
    });
  }, [items, filter, query]);

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "Todos" },
    { id: "permanent", label: "Acervos" },
    { id: "event", label: "Eventos" },
    { id: "open", label: "Abertos por link" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="radiogroup" aria-label="Filtrar">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm transition-colors",
                filter === f.id ? "border-nf-ink bg-nf-ink text-white" : "border-nf-line bg-nf-surface text-nf-text hover:border-nf-line-strong",
              )}
            >
              {f.label}
              <span className={cn("tabular-nums text-xs", filter === f.id ? "text-white/70" : "text-nf-muted")}>{counts[f.id]}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <label className="relative flex-1 lg:w-64 lg:flex-none">
            <span className="sr-only">Buscar acervo pelo nome</span>
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-nf-subtle" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar pelo nome"
              className="h-10 w-full rounded-nf border border-nf-line bg-nf-surface pl-9 pr-3 text-sm text-nf-text outline-none transition-[border-color,box-shadow] placeholder:text-nf-subtle focus:border-nf-accent focus:shadow-nf-focus"
            />
          </label>
          <div className="hidden rounded-nf border border-nf-line bg-nf-surface p-0.5 sm:flex" role="radiogroup" aria-label="Exibição">
            {[
              { v: "grid" as const, icon: LayoutGrid, label: "Grade" },
              { v: "list" as const, icon: List, label: "Lista" },
            ].map((o) => {
              const Icon = o.icon;
              return (
                <button
                  key={o.v}
                  type="button"
                  role="radio"
                  aria-checked={view === o.v}
                  aria-label={o.label}
                  title={o.label}
                  onClick={() => setView(o.v)}
                  className={cn("flex h-9 w-9 items-center justify-center rounded-[10px] transition-colors", view === o.v ? "bg-nf-sunken text-nf-text" : "text-nf-muted hover:text-nf-text")}
                >
                  <Icon size={16} aria-hidden />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">{plural(shown.length, "acervo encontrado", "acervos encontrados")}</p>

      {shown.length === 0 ? (
        <div className="flex flex-col items-center rounded-nf-lg border border-dashed border-nf-line-strong px-6 py-12 text-center">
          <p className="font-semibold text-nf-text">Nada por aqui</p>
          <p className="mt-1 text-sm text-nf-muted">Nenhum acervo combina com esse filtro.</p>
          <button
            type="button"
            onClick={() => { setQuery(""); setFilter("all"); }}
            className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-nf px-3 text-sm font-medium text-nf-text hover:bg-nf-sunken"
          >
            <X size={15} aria-hidden /> Limpar filtros
          </button>
        </div>
      ) : view === "grid" ? (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((c, i) => (
            <li key={c.id} className="animate-nf-rise" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
              <CollectionCard c={c} />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="divide-y divide-nf-line rounded-nf-lg border border-nf-line bg-nf-surface">
          {shown.map((c) => (
            <li key={c.id}>
              <Link href={`/acervos/${c.id}`} className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-nf-sunken/60 sm:px-5">
                <span className="h-11 w-11 shrink-0 overflow-hidden rounded-nf bg-nf-sunken">
                  {c.recent[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/fotos/${c.recent[0]}`} alt="" loading="lazy" className="h-full w-full object-cover" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-nf-text">{c.name}</span>
                  <span className="block truncate text-sm text-nf-muted">{c.subtitle} · {plural(c.photos, "foto", "fotos")}</span>
                </span>
                <Badge tone={c.status.tone} className="hidden sm:inline-flex">{c.status.label}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
