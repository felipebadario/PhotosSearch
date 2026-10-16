import { and, asc, eq } from "drizzle-orm";
import type { Db } from "../db/index.ts";
import { invitation, member, user } from "../db/schema/index.ts";
import type { TenantContext } from "../tenant-types.ts";

export async function listMembers(db: Db, ctx: TenantContext) {
  return db
    .select({ id: member.id, role: member.role, userId: user.id, name: user.name, email: user.email, since: member.createdAt })
    .from(member)
    .innerJoin(user, eq(user.id, member.userId))
    .where(eq(member.organizationId, ctx.organizationId))
    .orderBy(asc(member.createdAt));
}

export async function listPendingInvitations(db: Db, ctx: TenantContext) {
  const rows = await db
    .select({ id: invitation.id, email: invitation.email, role: invitation.role, expiresAt: invitation.expiresAt })
    .from(invitation)
    .where(and(eq(invitation.organizationId, ctx.organizationId), eq(invitation.status, "pending")))
    .orderBy(asc(invitation.createdAt));
  const now = new Date();
  return rows.filter((r) => r.expiresAt > now);
}

export async function countMembers(db: Db, ctx: TenantContext) {
  return (await db.select({ id: member.id }).from(member).where(eq(member.organizationId, ctx.organizationId))).length;
}
