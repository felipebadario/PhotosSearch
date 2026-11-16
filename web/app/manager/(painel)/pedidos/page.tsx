import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { updateLeadAction } from "@/lib/actions/manager";
import { PageTitle, whatsappUrl } from "@/components/manager/shared";
import { managerBase } from "@/lib/server/manager";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";
import { db } from "@/lib/server/db";
import {
  LEAD_PLAN_LABEL,
  LEAD_STATUSES,
  LEAD_STATUS_LABEL,
  countLeadsByStatus,
  listLeads,
  type LeadStatus,
} from "@/lib/server/repos/leads";

export const metadata: Metadata = { title: "Pedidos de assinatura" };

const SOURCE_LABEL: Record<string, string> = { site: "Site", planos: "Seção de planos", limite: "Bateu o limite", assinatura: "Tela de assinatura" };
const fmt = (d: Date) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(d);

/** CRM simples da equipe NossaFoto: quem pediu para assinar e em que pé está a conversa. */
export default async function LeadsPage({ searchParams }: PageProps<"/manager/pedidos">) {
  const { status } = await searchParams;
  const filter = (LEAD_STATUSES as readonly string[]).includes(String(status)) ? (status as LeadStatus) : null;
  const [base, rows, counts] = await Promise.all([managerBase(), listLeads(db, { status: filter }), countLeadsByStatus(db)]);
  const href = (p: string) => `${base}${p}`;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <>
      <PageTitle title="Pedidos de assinatura" description="Quem pediu para assinar pelo site ou ao bater o limite. Mude o status conforme a conversa anda." />
        <nav aria-label="Filtrar por status" className="mt-6 flex flex-wrap gap-2">
          {[{ key: null, label: "Todos", n: total }, ...LEAD_STATUSES.map((s) => ({ key: s, label: LEAD_STATUS_LABEL[s], n: counts[s] }))].map((f) => (
            <Link
              key={f.key ?? "todos"}
              href={href(f.key ? `/pedidos?status=${f.key}` : "/pedidos")}
              aria-current={filter === f.key ? "page" : undefined}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm",
                filter === f.key ? "border-nf-ink bg-nf-ink text-white" : "border-nf-line bg-nf-surface text-nf-text hover:border-nf-line-strong",
              )}
            >
              {f.label} <span className="tabular-nums opacity-70">{f.n}</span>
            </Link>
          ))}
        </nav>

        {rows.length === 0 ? (
          <p className="mt-10 text-center text-nf-muted">Nenhum pedido {filter ? "com este status" : "ainda"}.</p>
        ) : (
          <ul className="mt-6 space-y-3">
            {rows.map((l) => (
              <li key={l.id} id={l.id} className="scroll-mt-24">
                <Card className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-nf-text">
                        {l.name}
                        {l.organizationName && <span className="font-normal text-nf-muted"> · {l.organizationName}</span>}
                      </p>
                      <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm">
                        <a href={`mailto:${l.email}`} className="text-nf-accent underline-offset-2 hover:underline">{l.email}</a>
                        {l.phone && (
                          <a href={whatsappUrl(l.phone)} target="_blank" rel="noopener noreferrer" className="text-nf-accent underline-offset-2 hover:underline">
                            WhatsApp {l.phone}
                          </a>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={l.status === "new" ? "accent" : l.status === "won" ? "success" : "neutral"}>{LEAD_STATUS_LABEL[l.status]}</Badge>
                      <span className="text-xs text-nf-subtle">{fmt(l.createdAt)}</span>
                    </div>
                  </div>
                  <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                    {([
                      ["Plano", l.plan ? (LEAD_PLAN_LABEL as Record<string, string>)[l.plan] ?? l.plan : null],
                      ["Volume", l.expectedPhotos],
                      ["Tipo", l.segment],
                      ["Origem", SOURCE_LABEL[l.source] ?? l.source],
                      ["Organização no app", l.organizationId ? <Link key="o" href={href(`/organizacoes/${l.organizationId}`)} className="text-nf-accent hover:underline">abrir</Link> : null],
                      ["Uso atual", l.usedPhotos != null ? `${formatNumber(l.usedPhotos)}${l.photoLimit != null ? ` de ${formatNumber(l.photoLimit)}` : ""} fotos (já tem conta)` : null],
                    ] as [string, React.ReactNode][])
                      .filter(([, v]) => v)
                      .map(([k, v]) => (
                        <div key={k} className="flex gap-2">
                          <dt className="text-nf-subtle">{k}:</dt>
                          <dd className="text-nf-text">{v}</dd>
                        </div>
                      ))}
                  </dl>
                  {l.message && <p className="mt-3 whitespace-pre-line rounded-nf bg-nf-sunken px-3.5 py-2.5 text-sm text-nf-text">{l.message}</p>}
                  <form action={updateLeadAction} className="mt-4 grid gap-2 sm:grid-cols-[180px_1fr_auto] sm:items-start">
                    <input type="hidden" name="id" value={l.id} />
                    <label className="sr-only" htmlFor={`status-${l.id}`}>Status</label>
                    <select
                      id={`status-${l.id}`}
                      name="status"
                      defaultValue={l.status}
                      className="h-10 rounded-nf border border-nf-line bg-nf-surface px-3 text-sm text-nf-text"
                    >
                      {LEAD_STATUSES.map((s) => (
                        <option key={s} value={s}>{LEAD_STATUS_LABEL[s]}</option>
                      ))}
                    </select>
                    <label className="sr-only" htmlFor={`notes-${l.id}`}>Anotações</label>
                    <textarea
                      id={`notes-${l.id}`}
                      name="notes"
                      rows={1}
                      defaultValue={l.notes ?? ""}
                      placeholder="Anotações da equipe"
                      className="min-h-10 rounded-nf border border-nf-line bg-nf-surface px-3 py-2 text-sm text-nf-text"
                    />
                    <button type="submit" className="h-10 rounded-nf bg-nf-ink px-4 text-sm font-medium text-white hover:bg-nf-ink-hover">
                      Salvar
                    </button>
                  </form>
                </Card>
              </li>
            ))}
          </ul>
        )}
    </>
  );
}
