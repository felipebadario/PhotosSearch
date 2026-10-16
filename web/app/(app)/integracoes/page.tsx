import type { Metadata } from "next";
import { Cloud, HardDrive, Package } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireAdmin } from "@/lib/server/session";

export const metadata: Metadata = { title: "Integrações" };

const sources = [
  { name: "Google Drive", text: "Conecte pastas do Drive da organização. As fotos continuam lá; o NossaFoto indexa e mantém a referência.", icon: HardDrive, when: "Próxima fase" },
  { name: "Microsoft OneDrive", text: "Pastas do OneDrive e do SharePoint da organização.", icon: Cloud, when: "Planejado" },
  { name: "Dropbox", text: "Pastas compartilhadas do Dropbox.", icon: Package, when: "Planejado" },
];

export default async function IntegracoesPage() {
  await requireAdmin();
  return (
    <div className="space-y-8">
      <PageHeader
        title="Integrações"
        description="Além do envio direto, você vai poder conectar as fontes onde as fotos já estão. Todas ficam pesquisáveis no mesmo lugar."
      />
      <div className="grid gap-3 md:grid-cols-3">
        {sources.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.name} className="flex flex-col p-5">
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-nf bg-nf-sunken text-nf-muted">
                  <Icon size={18} aria-hidden />
                </span>
                <Badge>{s.when}</Badge>
              </div>
              <h2 className="mt-4 font-semibold text-nf-text">{s.name}</h2>
              <p className="mt-1 text-sm text-nf-muted">{s.text}</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
