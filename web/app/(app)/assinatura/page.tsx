import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireAdmin } from "@/lib/server/session";

export const metadata: Metadata = { title: "Assinatura" };

export default async function AssinaturaPage() {
  await requireAdmin();
  return (
    <div className="space-y-8">
      <PageHeader title="Assinatura" description="A cobrança é feita pelo volume de fotos indexadas. Participantes nunca pagam para encontrar suas fotos." />
      <Card className="max-w-2xl p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-nf-subtle">Plano atual</p>
        <p className="mt-2 text-xl font-semibold text-nf-text">Avaliação</p>
        <p className="mt-1 text-sm text-nf-muted">
          Sem cobrança enquanto o NossaFoto está em fase de testes. Os planos e o acompanhamento de consumo aparecem aqui quando o envio de fotos estiver disponível.
        </p>
      </Card>
    </div>
  );
}
