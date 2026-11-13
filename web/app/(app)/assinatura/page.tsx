import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { UsageMeter } from "@/components/admin-photos/UsageMeter";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/cn";
import { db } from "@/lib/server/db";
import { plans } from "@/lib/server/db/schema";
import { getUsage } from "@/lib/server/repos/photos";
import { requireAdmin } from "@/lib/server/session";

export const metadata: Metadata = { title: "Assinatura" };

const price = (cents: number | null) =>
  cents == null ? "Sob consulta" : `R$ ${(cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mês`;

export default async function AssinaturaPage() {
  const ctx = await requireAdmin();
  const [usage, business] = await Promise.all([
    getUsage(db, ctx),
    db.select().from(plans).where(eq(plans.kind, "business")).orderBy(asc(plans.sortOrder)),
  ]);
  return (
    <div className="space-y-8">
      <PageHeader title="Assinatura" description="A cobrança é feita pelo volume de fotos. Participantes nunca pagam para encontrar suas fotos." />
      <Card className="max-w-2xl p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-nf-subtle">Uso do plano</p>
        <div className="mt-3">
          <UsageMeter used={usage.used} limit={usage.limit} planName={usage.name} />
        </div>
        <p className="mt-4 text-sm text-nf-muted">
          Cada foto conta uma vez, mesmo que esteja em vários acervos. Excluir uma foto de todos os acervos libera o espaço na hora.
          {usage.planId === "trial" && usage.limit != null && ` O plano de avaliação não tem custo e vai até ${formatNumber(usage.limit)} fotos.`}
        </p>
      </Card>

      <section aria-labelledby="planos" className="max-w-4xl">
        <h2 id="planos" className="mb-3 text-lg font-semibold text-nf-text">Planos NossaFoto Business</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {business.map((p) => (
            <li key={p.id}>
              <Card className={cn("h-full p-5", p.id === usage.planId && "border-nf-accent")}>
                <p className="font-semibold text-nf-text">{p.name}</p>
                <p className="mt-1 text-sm text-nf-muted">{p.photoLimit ? `Até ${formatNumber(p.photoLimit)} fotos` : "Volume personalizado"}</p>
                <p className="mt-3 text-sm font-medium text-nf-text">{price(p.priceCents)}</p>
                {p.id !== usage.planId && (
                  <Link href={`/assinar?origem=assinatura&plano=${p.id}`} className="mt-3 inline-block text-sm font-medium text-nf-accent underline-offset-2 hover:underline">
                    Quero este plano
                  </Link>
                )}
              </Card>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button href="/assinar?origem=assinatura">Quero assinar</Button>
          <p className="text-sm text-nf-muted">Nossa equipe fala com você para montar o plano e combinar o pagamento.</p>
        </div>
      </section>
    </div>
  );
}
