import type { Metadata } from "next";
import { Cloud, ShieldCheck, Smartphone, UploadCloud } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Fontes" };

export default function SourcesPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Fontes" description="De onde as fotos chegam ao seu acervo." />

      <div className="grid gap-3 lg:grid-cols-3">
        <Card id="upload" className="scroll-mt-24">
          <CardBody className="flex h-full flex-col">
            <div className="flex items-start justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-nf-ink text-white">
                <UploadCloud size={20} aria-hidden />
              </span>
              <Badge tone="success" dot>
                Disponível
              </Badge>
            </div>
            <h2 className="mt-4 text-base font-semibold text-nf-text">Upload direto</h2>
            <p className="mt-1 flex-1 text-sm text-nf-muted">
              Selecione ou arraste fotos do computador. Ideal para trazer pastas grandes de uma vez.
            </p>
            <Button href="/acervo/importar?origem=upload" className="mt-5 self-start">
              Enviar fotos
            </Button>
          </CardBody>
        </Card>

        <Card id="dispositivo" className="scroll-mt-24">
          <CardBody className="flex h-full flex-col">
            <div className="flex items-start justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-nf-ink text-white">
                <Smartphone size={20} aria-hidden />
              </span>
              <Badge tone="success" dot>
                Disponível
              </Badge>
            </div>
            <h2 className="mt-4 text-base font-semibold text-nf-text">Dispositivo</h2>
            <p className="mt-1 flex-1 text-sm text-nf-muted">
              No celular, escolha fotos direto da galeria do aparelho, sem passar pelo computador.
            </p>
            <Button href="/acervo/importar?origem=dispositivo" variant="secondary" className="mt-5 self-start">
              Escolher da galeria
            </Button>
          </CardBody>
        </Card>

        <Card id="google-drive" className="scroll-mt-24">
          <CardBody className="flex h-full flex-col">
            <div className="flex items-start justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-nf-sunken text-nf-muted">
                <Cloud size={20} aria-hidden />
              </span>
              <Badge>Em breve</Badge>
            </div>
            <h2 className="mt-4 text-base font-semibold text-nf-text">Google Drive</h2>
            <p className="mt-1 flex-1 text-sm text-nf-muted">
              Conecte sua conta Google e escolha as pastas ou arquivos que quer trazer para o acervo.
            </p>
            <Button disabled variant="secondary" className="mt-5 self-start">
              Conectar
            </Button>
          </CardBody>
        </Card>
      </div>

      <div className="flex gap-3 rounded-nf-lg bg-nf-sunken p-5 text-sm text-nf-muted">
        <ShieldCheck size={20} className="shrink-0 text-nf-text" aria-hidden />
        <p>
          A conexão com o Google Drive vai usar o login oficial do Google, com um seletor de
          arquivos: você escolhe exatamente o que compartilhar e pode revogar o acesso a qualquer
          momento. Nenhum link de pasta pública é usado.
        </p>
      </div>
    </div>
  );
}
