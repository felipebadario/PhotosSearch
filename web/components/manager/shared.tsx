import { ProgressBar } from "@/components/ui/ProgressBar";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";

export const fmtDateTime = (d: Date | null) =>
  d ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(d) : "—";
export const fmtDate = (d: Date | null) => (d ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" }).format(d) : "—");

export function whatsappUrl(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits.length <= 11 ? `55${digits}` : digits}`;
}

/** Uso de fotos com a barra; destaca perto (80%) e no limite. */
export function Usage({ used, limit, compact = false }: { used: number; limit: number | null; compact?: boolean }) {
  const pct = limit ? (used / limit) * 100 : 0;
  const full = limit != null && used >= limit;
  const near = limit != null && pct >= 80;
  return (
    <div className={cn(compact ? "min-w-[120px]" : "")}>
      <p className={cn("text-sm tabular-nums", full ? "font-medium text-nf-danger" : near ? "font-medium text-nf-warning" : "text-nf-text")}>
        {formatNumber(used)}
        <span className="text-nf-muted">{limit != null ? ` / ${formatNumber(limit)}` : " / sem limite"}</span>
      </p>
      {limit != null && <ProgressBar value={pct} tone={near ? "accent" : "ink"} label="Fotos do plano em uso" className="mt-1" />}
    </div>
  );
}

export function PageTitle({ title, description, children }: { title: string; description?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-nf-text">{title}</h1>
        {description && <p className="mt-1 text-[15px] text-nf-muted">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export function SearchBox({ action, q, placeholder, children }: { action: string; q: string; placeholder: string; children?: React.ReactNode }) {
  return (
    <form action={action} className="flex flex-wrap gap-2" role="search">
      <label className="sr-only" htmlFor="q">Buscar</label>
      <input
        id="q"
        name="q"
        defaultValue={q}
        placeholder={placeholder}
        className="h-10 w-64 max-w-full rounded-nf border border-nf-line bg-nf-surface px-3 text-sm text-nf-text outline-none focus:border-nf-accent"
      />
      {children}
      <button type="submit" className="h-10 rounded-nf bg-nf-ink px-4 text-sm font-medium text-white hover:bg-nf-ink-hover">Buscar</button>
    </form>
  );
}
