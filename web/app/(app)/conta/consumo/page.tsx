import type { Metadata } from "next";
import { getUsage } from "@/lib/api/account";
import { Card, CardBody } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatBytes, formatNumber } from "@/lib/format";

export const metadata: Metadata = { title: "Consumo" };

export default async function UsagePage() {
  const usage = await getUsage();
  const rows = [
    { label: "Fotos", used: formatNumber(usage.photoCount), limit: formatNumber(usage.photoLimit), pct: (usage.photoCount / usage.photoLimit) * 100 },
    { label: "Armazenamento", used: formatBytes(usage.storageUsedBytes), limit: formatBytes(usage.storageLimitBytes), pct: (usage.storageUsedBytes / usage.storageLimitBytes) * 100 },
    { label: "Buscas este mês", used: formatNumber(usage.searchesThisMonth), limit: formatNumber(usage.monthlySearchLimit), pct: (usage.searchesThisMonth / usage.monthlySearchLimit) * 100 },
  ];

  return (
    <Card>
      <CardBody className="space-y-6">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <span className="text-[15px] font-medium text-nf-text">{row.label}</span>
              <span className="text-sm tabular-nums text-nf-muted">
                <span className="font-medium text-nf-text">{row.used}</span> de {row.limit}
              </span>
            </div>
            <ProgressBar value={row.pct} label={`${row.label}: ${Math.round(row.pct)}% usado`} />
          </div>
        ))}
        <p className="border-t border-nf-line pt-5 text-xs text-nf-muted">
          Valores de exemplo da prévia, recalculados a partir do acervo de demonstração.
        </p>
      </CardBody>
    </Card>
  );
}
