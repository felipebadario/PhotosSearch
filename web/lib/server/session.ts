import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { auth } from "./auth.ts";
import { db } from "./db/index.ts";
import { member, organization } from "./db/schema/index.ts";
import type { Role } from "./permissions.ts";
import type { TenantContext } from "./tenant-types.ts";

export type AdminContext = TenantContext & {
  user: { id: string; name: string; email: string };
  organization: { id: string; name: string; slug: string };
};

/** Sessão do Better Auth para esta requisição (memoizada por render). */
export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

/**
 * Organização ativa do usuário: a marcada na sessão, se ele ainda for membro;
 * senão, a primeira em que entrou. O papel vem sempre da tabela de membros,
 * nunca do navegador.
 */
const loadContext = cache(async (): Promise<AdminContext | "no-session" | "no-organization"> => {
  const session = await getSession();
  if (!session) return "no-session";
  const preferred = session.session.activeOrganizationId;

  const memberships = await db
    .select({ role: member.role, id: organization.id, name: organization.name, slug: organization.slug })
    .from(member)
    .innerJoin(organization, eq(organization.id, member.organizationId))
    .where(eq(member.userId, session.user.id))
    .orderBy(asc(member.createdAt));

  const active = memberships.find((m) => m.id === preferred) ?? memberships[0];
  if (!active) return "no-organization";

  return {
    userId: session.user.id,
    organizationId: active.id,
    role: active.role as Role,
    user: { id: session.user.id, name: session.user.name, email: session.user.email },
    organization: { id: active.id, name: active.name, slug: active.slug },
  };
});

/** Para páginas e ações do Admin: sem sessão vai para o login; sem organização, para a criação dela. */
export async function requireAdmin(): Promise<AdminContext> {
  const ctx = await loadContext();
  if (ctx === "no-session") redirect("/entrar");
  if (ctx === "no-organization") redirect("/criar-organizacao");
  return ctx;
}

export async function isMember(organizationId: string, userId: string) {
  const [row] = await db
    .select({ id: member.id })
    .from(member)
    .where(and(eq(member.organizationId, organizationId), eq(member.userId, userId)))
    .limit(1);
  return Boolean(row);
}
