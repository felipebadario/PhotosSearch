import { and, desc, eq, sql } from "drizzle-orm";
import type { Db } from "../db/index.ts";
import { auditLogs, collections, driveSources } from "../db/schema/index.ts";
import { can } from "../permissions.ts";
import { ForbiddenError, NotFoundError, type TenantContext } from "../tenant-types.ts";
import { ValidationError } from "./collections.ts";

export const MAX_DRIVE_SOURCES_PER_COLLECTION = 20;

function assertCanImport(ctx: TenantContext) {
  if (!can(ctx.role, { photo: ["upload"] })) throw new ForbiddenError();
}

export async function listDriveSources(db: Db, ctx: TenantContext, collectionId: string) {
  return db
    .select()
    .from(driveSources)
    .where(and(eq(driveSources.organizationId, ctx.organizationId), eq(driveSources.collectionId, collectionId)))
    .orderBy(desc(driveSources.createdAt));
}

export async function addDriveSource(
  db: Db,
  ctx: TenantContext,
  input: { collectionId: string; folderId: string; resourceKey: string | null; folderName: string },
) {
  assertCanImport(ctx);
  const [c] = await db
    .select({ id: collections.id })
    .from(collections)
    .where(and(eq(collections.organizationId, ctx.organizationId), eq(collections.id, input.collectionId)))
    .limit(1);
  if (!c) throw new NotFoundError("Acervo não encontrado.");
  const existing = await listDriveSources(db, ctx, input.collectionId);
  if (existing.some((s) => s.folderId === input.folderId)) throw new ValidationError("link", "Essa pasta já está ligada a este acervo.");
  if (existing.length >= MAX_DRIVE_SOURCES_PER_COLLECTION) throw new ValidationError("link", `Cada acervo aceita até ${MAX_DRIVE_SOURCES_PER_COLLECTION} pastas do Drive.`);
  const [row] = await db
    .insert(driveSources)
    .values({
      organizationId: ctx.organizationId,
      collectionId: input.collectionId,
      folderId: input.folderId,
      resourceKey: input.resourceKey,
      folderName: input.folderName.slice(0, 255),
      createdBy: ctx.userId,
    })
    .returning();
  await db.insert(auditLogs).values({ organizationId: ctx.organizationId, actorUserId: ctx.userId, action: "drive_source.add", target: row.id });
  return row;
}

async function ownSource(db: Db, ctx: TenantContext, collectionId: string, sourceId: string) {
  const [s] = await db
    .select({ id: driveSources.id })
    .from(driveSources)
    .where(and(eq(driveSources.organizationId, ctx.organizationId), eq(driveSources.collectionId, collectionId), eq(driveSources.id, sourceId)))
    .limit(1);
  if (!s) throw new NotFoundError("Pasta não encontrada.");
}

/** Pede ao serviço de rostos para olhar a pasta de novo assim que puder. */
export async function requestDriveSync(db: Db, ctx: TenantContext, collectionId: string, sourceId: string) {
  assertCanImport(ctx);
  await ownSource(db, ctx, collectionId, sourceId);
  await db
    .update(driveSources)
    .set({ syncRequestedAt: sql`now()`, status: sql`case when ${driveSources.status} = 'syncing' then 'syncing' else 'pending' end` })
    .where(eq(driveSources.id, sourceId));
}

/** Desliga a pasta. As fotos que já vieram continuam no acervo. */
export async function removeDriveSource(db: Db, ctx: TenantContext, collectionId: string, sourceId: string) {
  assertCanImport(ctx);
  await ownSource(db, ctx, collectionId, sourceId);
  await db.delete(driveSources).where(eq(driveSources.id, sourceId));
  await db.insert(auditLogs).values({ organizationId: ctx.organizationId, actorUserId: ctx.userId, action: "drive_source.remove", target: sourceId });
}
