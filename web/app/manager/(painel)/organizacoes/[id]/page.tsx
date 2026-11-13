import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PlanForm } from "@/components/manager/PlanForm";
import { PageTitle, Usage, fmtDate, fmtDateTime } from "@/components/manager/shared";
import { formatNumber } from "@/lib/format";
import { db } from "@/lib/server/db";
import { subscriptions } from "@/lib/server/db/schema";
import { managerBase } from "@/lib/server/manager";
import { LEAD_STATUS_LABEL, type LeadStatus } from "@/lib/server/repos/leads";
import { getOrganization, listPlans } from "@/lib/server/repos/manager";

export const metadata: Metadata = { title: "Organização" };

const ROLE: Record<string, string> = { owner: "Dono", admin: "Administrador", member: "Membro" };
const VIS: Record<string, string> = { private: "Privado", link: "Aberto por link", link_code: "Link com código", restricted: "Restrito" };

export default async function OrganizacaoPage({ params }: PageProps<"/manager/organizacoes/[id]">) {
  const { id } = await params;
  const [base, data, plans, [sub]] = await Promise.all([
    managerBase(),
    getOrganization(db, id),
    listPlans(db),
    db.select().from(subscriptions).where(eq(subscriptions.organizationId, id)).limit(1),
  ]);
  if (!data) notFound();
  const { org, members, collections, leads } = data;
  const href = (p: string) => `${base}${p}`;

  return (
    <>
      <Link href={href("/organizacoes")} className="mb-4 inline-flex items-center gap-1.5 text-sm text-nf-muted hover:text-nf-text">
        <ArrowLeft size={14} aria-hidden /> Organizações
      </Link>
      <PageTitle title={org.name} description={`nossafoto.app/${org.slug} · criada em ${fmtDate(org.createdAt)}`} />

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-nf-subtle">Uso</p>
            <div className="mt-3"><Usage used={org.used} limit={org.limit} /></div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              {[
                ["Plano", org.planName],
                ["Prontas para busca", formatNumber(org.indexed)],
                ["Acervos", formatNumber(org.collections)],
                ["Último envio", fmtDateTime(org.lastPhotoAt)],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-nf-subtle">{k}</dt>
                  <dd className="font-medium text-nf-text">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-nf-subtle">Membros</p>
            <ul className="mt-3 divide-y divide-nf-line">
              {members.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <div>
                    <p className="font-medium text-nf-text">{m.name} <span className="font-normal text-nf-muted">· {ROLE[m.role] ?? m.role}</span></p>
                    <a href={`mailto:${m.email}`} className="text-nf-accent hover:underline">{m.email}</a>
                  </div>
                  <p className="text-xs text-nf-subtle">Último acesso {fmtDateTime(m.lastSeenAt)}</p>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-nf-subtle">Acervos</p>
            {collections.length === 0 ? (
              <p className="mt-3 text-sm text-nf-muted">Nenhum acervo criado ainda.</p>
            ) : (
              <ul className="mt-3 divide-y divide-nf-line">
                {collections.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                    <p className="font-medium text-nf-text">
                      {c.name} <span className="font-normal text-nf-muted">· {c.kind === "event" ? "Evento" : "Acervo"} · {VIS[c.visibility] ?? c.visibility}</span>
                    </p>
                    <p className="tabular-nums text-nf-muted">{formatNumber(c.photos)} fotos</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-nf-subtle">Plano da organização</p>
            <PlanForm
              organizationId={org.id}
              plans={plans.filter((p) => p.active).map((p) => ({ id: p.id, name: p.name, photoLimit: p.photoLimit }))}
              current={{ planId: org.planId, status: org.subscriptionStatus, customLimit: sub?.photoLimit ?? null }}
            />
          </Card>
          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-nf-subtle">Pedidos de assinatura</p>
            {leads.length === 0 ? (
              <p className="mt-3 text-sm text-nf-muted">Nenhum pedido desta organização.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {leads.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-2 text-sm">
                    <Link href={href(`/pedidos#${l.id}`)} className="text-nf-text hover:underline">{fmtDate(l.createdAt)} · {l.name}</Link>
                    <Badge tone={l.status === "new" ? "accent" : l.status === "won" ? "success" : "neutral"}>{LEAD_STATUS_LABEL[l.status as LeadStatus] ?? l.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
