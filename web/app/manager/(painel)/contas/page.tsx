import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { PageTitle, SearchBox, fmtDate, fmtDateTime } from "@/components/manager/shared";
import { formatNumber } from "@/lib/format";
import { db } from "@/lib/server/db";
import { managerBase } from "@/lib/server/manager";
import { listUsers } from "@/lib/server/repos/manager";

export const metadata: Metadata = { title: "Contas" };

const ROLE: Record<string, string> = { owner: "dono", admin: "admin", member: "membro" };

export default async function ContasPage({ searchParams }: PageProps<"/manager/contas">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q : "";
  const [base, rows] = await Promise.all([managerBase(), listUsers(db, { q: query })]);
  const href = (p: string) => `${base}${p}`;
  return (
    <>
      <PageTitle title="Contas" description={`${formatNumber(rows.length)} pessoas cadastradas${query ? " com esta busca" : ""}.`}>
        <SearchBox action={href("/contas")} q={query} placeholder="Nome ou e-mail" />
      </PageTitle>
      {rows.length === 0 ? (
        <p className="mt-10 text-center text-nf-muted">Nenhuma conta encontrada.</p>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-nf-line text-xs uppercase tracking-wider text-nf-subtle">
              <tr>
                <th className="px-4 py-3 font-medium">Pessoa</th>
                <th className="px-4 py-3 font-medium">Organizações</th>
                <th className="px-4 py-3 font-medium">Cadastro</th>
                <th className="px-4 py-3 font-medium">Último acesso</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="border-b border-nf-line align-top last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-nf-text">{u.name}</p>
                    <a href={`mailto:${u.email}`} className="text-xs text-nf-accent hover:underline">{u.email}</a>
                  </td>
                  <td className="px-4 py-3">
                    {u.organizations.length === 0 ? (
                      <span className="text-nf-muted">Sem organização</span>
                    ) : (
                      <ul className="space-y-0.5">
                        {u.organizations.map((o) => (
                          <li key={o.id}>
                            <Link href={href(`/organizacoes/${o.id}`)} className="text-nf-text hover:underline">{o.name}</Link>{" "}
                            <span className="text-xs text-nf-subtle">({ROLE[o.role] ?? o.role})</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className="px-4 py-3 text-nf-muted">{fmtDate(u.createdAt)}</td>
                  <td className="px-4 py-3 text-nf-muted">{fmtDateTime(u.lastSeenAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
