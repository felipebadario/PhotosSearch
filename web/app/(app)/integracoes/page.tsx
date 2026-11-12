import type { Metadata } from "next";
import { Cloud, HardDrive, Package } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireAdmin } from "@/lib/server/session";
import { driveConfigured } from "@/lib/server/google-drive";

export const metadata: Metadata = { title: "Integrações" };

const sources = (driveReady: boolean) => [
  driveReady
    ? {
        name: "Google Drive",
        text: "Dentro de um acervo, cole o link de uma pasta compartilhada. Subpastas viram álbuns e as fotos novas chegam sozinhas. O NossaFoto não pede acesso à sua conta do Google.",
        icon: HardDrive,
        when: "Disponível",
      }
    : { name: "Google Drive", text: "Importe fotos do Drive direto para um acervo.", icon: HardDrive, when: "Em configuração" },
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
        {sources(driveConfigured()).map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.name} className="flex flex-col p-5">
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-nf bg-nf-sunken text-nf-muted">
                  <Icon size={18} aria-hidden />
                </span>
                <Badge tone={s.when === "Disponível" ? "success" : "neutral"}>{s.when}</Badge>
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
