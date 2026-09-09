import { mockOrganization, mockSubscriptions } from "@/lib/mock-data";
import { Card, CardBody } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { OrgMark } from "@/components/ui/OrgMark";

export default function SettingsPage() {
  const subscription = mockSubscriptions[0];

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-df-ink">Configurações</h1>
        <p className="mt-1 text-sm text-df-muted">
          Dados da sua organização no Descomplica Fotos.
        </p>
      </div>

      <Card>
        <CardBody className="space-y-5 pt-6">
          <div className="flex items-center gap-4">
            <OrgMark name={mockOrganization.name} logoUrl={mockOrganization.logoUrl} size={56} />
            <Button variant="secondary" size="sm" disabled title="Em breve">
              Alterar logo
            </Button>
          </div>
          <Field label="Nome da organização">
            <Input defaultValue={mockOrganization.name} />
          </Field>
          <Field
            label="Endereço público"
            hint="Usado na URL dos seus álbuns publicados."
          >
            <div className="flex items-center overflow-hidden rounded-xl border border-df-line focus-within:border-df-primary focus-within:ring-2 focus-within:ring-df-primary/15">
              <span className="border-r border-df-line bg-df-cream px-3 py-2.5 text-sm text-df-muted">
                descomplicafotos.com/
              </span>
              <input
                defaultValue={mockOrganization.slug}
                className="w-full px-3 py-2.5 text-sm text-df-ink outline-none"
              />
            </div>
          </Field>
          <div className="flex justify-end">
            <Button disabled title="Em breve">
              Salvar
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex items-center justify-between pt-6">
          <div>
            <p className="font-display font-bold text-df-ink">Plano atual</p>
            <p className="text-sm text-df-muted capitalize">
              Descomplica Fotos · {subscription.plan}
            </p>
          </div>
          <span className="rounded-full bg-df-mint-soft px-3 py-1 text-xs font-semibold text-df-primary-dark">
            Ativo
          </span>
        </CardBody>
      </Card>
    </div>
  );
}
