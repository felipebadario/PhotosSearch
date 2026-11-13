import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PageTitle, SearchBox, Usage, fmtDate, fmtDateTime } from "@/components/manager/shared";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";
import { db } from "@/lib/server/db";
import { managerBase } from "@/lib/server/manager";
import { listOrganizations } from "@/lib/server/repos/manager";

export const metadata: Metadata = { title: "Organizações" };

export default async function OrganizacoesPage({ searchParams }: PageProps<"/manager/organizacoes">) {
  const { q, filtro } = await searchParams;
  const query = typeof q === "string" ? q : "";
  const filter = filtro === "limite" ? "limite" : null;
  const [base, rows] = await Promise.all([managerBase(), listOrganizations(db, { q: query, filter })]);
  const href = (p: string) => `${base}${p}`;
  return (
    <>
      <PageTitle title="Organizações" description={`${formatNumber(rows.length)} ${filter ? "perto ou no limite do plano" : "no total"}.`}>
        <SearchBox action={href("/organizacoes")} q={query} placeholder="Nome, endereço ou e-mail do dono">
          {filter && <input type="hidden" name="filtro" value="limite" />}
        </SearchBox>
      </PageTitle>
      <nav aria-label="Filtro" className="mb-4 flex gap-2">
        {[
          { label: "Todas", to: "/organizacoes", on: !filter },
          { label: "Perto do limite", to: "/organizacoes?filtro=limite", on: Boolean(filter) },
        ].map((f) => (
          <Link
            key={f.label}
            href={href(f.to)}
            aria-current={f.on ? "page" : undefined}
            className={cn("rounded-full border px-3.5 py-1.5 text-sm", f.on ? "border-nf-ink bg-nf-ink text-white" : "border-nf-line bg-nf-surface text-nf-text")}
          >
            {f.label}
          </Link>
        ))}
      </nav>
      {rows.length === 0 ? (
        <p className="mt-10 text-center text-nf-muted">Nenhuma organização encontrada.</p>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-nf-line text-xs uppercase tracking-wider text-nf-subtle">
              <tr>
                <th className="px-4 py-3 font-medium">Organização</th>
                <th className="px-4 py-3 font-medium">Dono</th>
                <th className="px-4 py-3 font-medium">Plano</th>
                <th className="px-4 py-3 font-medium">Fotos</th>
                <th className="px-4 py-3 font-medium text-right">Membros</th>
                <th className="px-4 py-3 font-medium text-right">Acervos</th>
                <th className="px-4 py-3 font-medium">Último envio</th>
                <th className="px-4 py-3 font-medium">Criada em</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} className="border-b border-nf-line align-top last:border-0">
                  <td className="px-4 py-3">
                    <Link href={href(`/organizacoes/${o.id}`)} className="font-medium text-nf-text hover:underline">{o.name}</Link>
                    <p className="text-xs text-nf-subtle">{o.slug}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-nf-text">{o.ownerName ?? "—"}</p>
                    {o.ownerEmail && <a href={`mailto:${o.ownerEmail}`} className="text-xs text-nf-accent hover:underline">{o.ownerEmail}</a>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-nf-text">{o.planName}</p>
                    {o.leads > 0 && <Badge tone="accent">pediu assinatura</Badge>}
                  </td>
                  <td className="px-4 py-3"><Usage used={o.used} limit={o.limit} compact /></td>
                  <td className="px-4 py-3 text-right tabular-nums text-nf-text">{o.members}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-nf-text">{o.collections}</td>
                  <td className="px-4 py-3 text-nf-muted">{fmtDateTime(o.lastPhotoAt)}</td>
                  <td className="px-4 py-3 text-nf-muted">{fmtDate(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
