import type { Metadata } from "next";
import { Check } from "lucide-react";
import { getSubscription } from "@/lib/api/account";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatBytes, formatNumber } from "@/lib/format";

export const metadata: Metadata = { title: "Assinatura" };

export default async function SubscriptionPage() {
  const { plan } = await getSubscription();
  const features = [
    `Até ${formatNumber(plan.photoLimit)} fotos`,
    `${formatBytes(plan.storageLimitBytes)} de armazenamento`,
    `${formatNumber(plan.monthlySearchLimit)} buscas por mês`,
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardBody>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-nf-muted">Plano atual</p>
              <p className="mt-1 text-xl font-semibold text-nf-text">{plan.name}</p>
            </div>
            <Badge tone="accent">Gratuito durante a prévia</Badge>
          </div>
          <ul className="mt-5 space-y-2">
            {features.map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-sm text-nf-text">
                <Check size={16} className="text-nf-success" aria-hidden /> {feature}
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
      <p className="text-sm text-nf-muted">
        Os planos de assinatura do NossaFoto ainda não estão disponíveis. Quando chegarem, você
        vai poder escolher e gerenciar seu plano aqui.
      </p>
    </div>
  );
}
