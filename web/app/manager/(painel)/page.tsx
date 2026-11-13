import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { PageTitle, Usage, fmtDate } from "@/components/manager/shared";
import { formatNumber } from "@/lib/format";
import { db } from "@/lib/server/db";
import { managerBase } from "@/lib/server/manager";
import { listOrganizations, overview } from "@/lib/server/repos/manager";

export const metadata: Metadata = { title: "Visão geral" };

export default async function ManagerHome() {
  const [base, s, near, recent] = await Promise.all([
    managerBase(),
    overview(db),
    listOrganizations(db, { filter: "limite" }),
    listOrganizations(db).then((r) => r.slice(0, 8)),
  ]);
  const href = (p: string) => `${base}${p}`;
  const stats = [
    { label: "Contas", value: s.users, sub: `+${formatNumber(s.users_week)} na semana`, to: "/contas" },
    { label: "Organizações", value: s.orgs, sub: `+${formatNumber(s.orgs_week)} na semana`, to: "/organizacoes" },
    { label: "Assinantes", value: s.paying, sub: "com plano pago ativo", to: "/organizacoes" },
    { label: "Pedidos novos", value: s.leads_new, sub: `${formatNumber(s.leads_open)} em andamento`, to: "/pedidos" },
    { label: "Fotos guardadas", value: s.photos, sub: `${formatNumber(s.indexed)} prontas para busca` },
    { label: "Buscas por selfie", value: s.searches_week, sub: "nos últimos 7 dias" },
  ];
  return (
    <>
      <PageTitle title="Visão geral" description="Quem está entrando no NossaFoto e quem precisa de um plano maior." />
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {stats.map((st) => {
          const body = (
            <Card className="h-full p-5">
              <p className="text-sm text-nf-muted">{st.label}</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums text-nf-text">{formatNumber(st.value)}</p>
              <p className="mt-1 text-xs text-nf-subtle">{st.sub}</p>
            </Card>
          );
          return <li key={st.label}>{st.to ? <Link href={href(st.to)} className="block rounded-nf-xl hover:opacity-90">{body}</Link> : body}</li>;
        })}
      </ul>

      <section className="mt-10" aria-labelledby="limite">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="limite" className="text-lg font-semibold text-nf-text">Perto ou no limite do plano</h2>
          <Link href={href("/organizacoes?filtro=limite")} className="text-sm text-nf-accent hover:underline">Ver todas</Link>
        </div>
        {near.length === 0 ? (
          <p className="text-sm text-nf-muted">Nenhuma organização passou de 80% do plano.</p>
        ) : (
          <OrgTable rows={near.slice(0, 10)} href={href} />
        )}
      </section>

      <section className="mt-10" aria-labelledby="recentes">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="recentes" className="text-lg font-semibold text-nf-text">Organizações mais recentes</h2>
          <Link href={href("/organizacoes")} className="text-sm text-nf-accent hover:underline">Ver todas</Link>
        </div>
        {recent.length === 0 ? <p className="text-sm text-nf-muted">Nenhuma organização ainda.</p> : <OrgTable rows={recent} href={href} />}
      </section>
    </>
  );
}

function OrgTable({ rows, href }: { rows: Awaited<ReturnType<typeof listOrganizations>>; href: (p: string) => string }) {
  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-nf-line text-xs uppercase tracking-wider text-nf-subtle">
          <tr>
            <th className="px-4 py-3 font-medium">Organização</th>
            <th className="px-4 py-3 font-medium">Dono</th>
            <th className="px-4 py-3 font-medium">Plano</th>
            <th className="px-4 py-3 font-medium">Fotos</th>
            <th className="px-4 py-3 font-medium">Criada em</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o.id} className="border-b border-nf-line last:border-0">
              <td className="px-4 py-3">
                <Link href={href(`/organizacoes/${o.id}`)} className="font-medium text-nf-text hover:underline">{o.name}</Link>
              </td>
              <td className="px-4 py-3 text-nf-muted">{o.ownerEmail ?? "—"}</td>
              <td className="px-4 py-3 text-nf-text">{o.planName}</td>
              <td className="px-4 py-3"><Usage used={o.used} limit={o.limit} compact /></td>
              <td className="px-4 py-3 text-nf-muted">{fmtDate(o.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
