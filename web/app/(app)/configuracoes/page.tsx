import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { OrganizationForm } from "@/components/settings/OrganizationForm";
import { roleLabel } from "@/lib/labels";
import { can } from "@/lib/server/permissions";
import { requireAdmin } from "@/lib/server/session";

export const metadata: Metadata = { title: "Organização" };

export default async function OrganizacaoPage() {
  const ctx = await requireAdmin();
  return (
    <div className="grid max-w-2xl gap-6">
      <Card className="p-6">
        <h2 className="mb-4 font-semibold text-nf-text">Organização</h2>
        <OrganizationForm
          name={ctx.organization.name}
          slug={ctx.organization.slug}
          disabled={!can(ctx.role, { organization: ["update"] })}
        />
      </Card>
      <Card className="p-6">
        <h2 className="font-semibold text-nf-text">Sua conta</h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-[120px_1fr]">
          <dt className="text-nf-muted">Nome</dt>
          <dd className="text-nf-text">{ctx.user.name}</dd>
          <dt className="text-nf-muted">E-mail</dt>
          <dd className="text-nf-text">{ctx.user.email}</dd>
          <dt className="text-nf-muted">Papel</dt>
          <dd className="text-nf-text">{roleLabel(ctx.role)}</dd>
        </dl>
      </Card>
    </div>
  );
}
