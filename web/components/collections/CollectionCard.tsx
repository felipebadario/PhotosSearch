import Link from "next/link";
import { CalendarDays, Globe, Library, Lock } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { cn } from "@/lib/cn";
import { formatNumber, plural } from "@/lib/format";

export type CollectionCardData = {
  id: string;
  name: string;
  kind: "permanent" | "event";
  subtitle: string;
  status: { label: string; tone: "neutral" | "success" | "accent" | "warning" };
  shared: boolean;
  photos: number;
  indexed: number;
  pending: number;
  failed: number;
  recent: string[];
};

/** Card de acervo com mosaico das fotos mais recentes e o andamento da busca. */
export function CollectionCard({ c, className }: { c: CollectionCardData; className?: string }) {
  const Icon = c.kind === "event" ? CalendarDays : Library;
  const ready = c.photos ? Math.round((c.indexed / c.photos) * 100) : 0;
  const tiles = [0, 1, 2, 3];
  return (
    <Link
      href={`/acervos/${c.id}`}
      className={cn(
        "group flex h-full min-w-0 flex-col overflow-hidden rounded-nf-lg border border-nf-line bg-nf-surface transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-nf-line-strong",
        className,
      )}
    >
      <div className="grid aspect-[16/9] grid-cols-4 grid-rows-2 gap-0.5 bg-nf-sunken">
        {c.recent.length === 0 ? (
          <span className="col-span-4 row-span-2 flex items-center justify-center text-nf-subtle">
            <Icon size={26} aria-hidden />
          </span>
        ) : (
          tiles.map((i) => {
            const id = c.recent[i];
            return (
              <span key={i} className={cn("relative min-w-0 overflow-hidden bg-nf-sunken", i === 0 ? "col-span-2 row-span-2" : i === 1 ? "col-span-2" : "")}>
                {id && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/fotos/${id}`}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                )}
              </span>
            );
          })
        )}
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold text-nf-text">{c.name}</p>
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-[13px] text-nf-muted">
              <Icon size={13} aria-hidden /> {c.subtitle}
            </p>
          </div>
          <Badge tone={c.status.tone} className="shrink-0">{c.status.label}</Badge>
        </div>
        <div className="mt-auto pt-5">
          <div className="flex items-center justify-between text-[13px] text-nf-muted">
            <span className="tabular-nums">{plural(c.photos, "foto", "fotos")}</span>
            <span className="inline-flex items-center gap-1.5">
              {c.shared ? <Globe size={13} aria-hidden /> : <Lock size={13} aria-hidden />}
              {c.shared ? "Aberto por link" : "Privado"}
            </span>
          </div>
          {c.photos > 0 && (
            <div className="mt-2.5">
              <ProgressBar value={ready} tone={c.pending ? "accent" : "ink"} label="Fotos prontas para a busca" />
              <p className="mt-1.5 text-xs text-nf-muted">
                {c.pending
                  ? `Preparando ${formatNumber(c.pending)} para a busca`
                  : c.failed
                    ? `${formatNumber(c.failed)} não puderam ser lidas`
                    : "Todas prontas para a busca"}
              </p>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
