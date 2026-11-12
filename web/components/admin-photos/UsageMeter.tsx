import Link from "next/link";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatNumber } from "@/lib/format";

/** Fotos do plano em uso. Cada foto conta uma vez, mesmo que esteja em vários acervos. */
export function UsageMeter({ used, limit, planName, showLink = false }: { used: number; limit: number | null; planName: string; showLink?: boolean }) {
  const pct = limit ? (used / limit) * 100 : 0;
  const near = limit != null && used >= limit * 0.9;
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-nf-muted">
          Plano <span className="font-medium text-nf-text">{planName}</span>
        </p>
        <p className="text-sm tabular-nums text-nf-text">
          {formatNumber(used)}
          {limit != null && <span className="text-nf-muted"> de {formatNumber(limit)} fotos</span>}
          {limit == null && <span className="text-nf-muted"> fotos</span>}
        </p>
      </div>
      {limit != null && <ProgressBar value={pct} tone={near ? "accent" : "ink"} label="Fotos do plano em uso" className="mt-2" />}
      {near && (
        <p className="mt-2 text-sm text-nf-warning">
          {used >= limit! ? "O plano chegou ao limite: novas fotos ficam de fora." : "O plano está perto do limite."}{" "}
          {showLink && <Link href="/assinatura" className="font-medium underline">Ver planos</Link>}
        </p>
      )}
    </div>
  );
}
