import { Cloud, ShieldCheck } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-df-ink">Integrações</h1>
        <p className="mt-1 text-sm text-df-muted">
          Conecte outras ferramentas para trazer fotos automaticamente para seus álbuns.
        </p>
      </div>

      <Card>
        <CardBody className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-df-mint-soft text-df-primary">
              <Cloud size={20} />
            </span>
            <div>
              <p className="font-display font-bold text-df-ink">Google Drive</p>
              <p className="text-sm text-df-muted">Não conectado</p>
            </div>
          </div>
          <Button disabled title="Em breve">
            Conectar
          </Button>
        </CardBody>
      </Card>

      <Card className="border-df-line bg-df-mint-soft/40">
        <CardBody className="flex gap-3 pt-6">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-df-primary" />
          <p className="text-sm text-df-ink">
            A conexão vai usar o login oficial do Google (OAuth) com um seletor de pastas —
            você escolhe exatamente o que compartilhar, e pode revogar o acesso a qualquer
            momento pela sua conta Google. Nenhum link de pasta pública é usado.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
