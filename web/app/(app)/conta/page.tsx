import type { Metadata } from "next";
import { getAccount, getCurrentUser } from "@/lib/api/account";
import { Card, CardBody } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { SITE_HOST } from "@/lib/config";

export const metadata: Metadata = { title: "Perfil" };

export default async function ProfilePage() {
  const [user, account] = await Promise.all([getCurrentUser(), getAccount()]);

  return (
    <Card>
      <CardBody className="space-y-5">
        <div className="flex items-center gap-4">
          <Avatar name={user.name} size={56} />
          <div>
            <p className="text-base font-semibold text-nf-text">{user.name}</p>
            <p className="text-sm text-nf-muted">{user.email}</p>
          </div>
        </div>
        <Field label="Nome">{(p) => <Input {...p} defaultValue={user.name} disabled />}</Field>
        <Field label="E-mail">{(p) => <Input {...p} type="email" defaultValue={user.email} disabled />}</Field>
        <Field label="Endereço dos álbuns compartilhados" hint="Aparece no link dos álbuns que você compartilha.">
          {(p) => (
            <div className="flex h-11 items-center overflow-hidden rounded-nf border border-nf-line bg-nf-sunken text-[15px]">
              <span className="border-r border-nf-line px-3.5 text-nf-muted">{SITE_HOST}/</span>
              <input {...p} defaultValue={account.handle} disabled className="h-full w-full bg-transparent px-3 text-nf-muted outline-none" />
            </div>
          )}
        </Field>
        <div className="flex flex-col gap-2 border-t border-nf-line pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-nf-muted">A edição do perfil chega junto com o login.</p>
          <Button disabled>Salvar</Button>
        </div>
      </CardBody>
    </Card>
  );
}
