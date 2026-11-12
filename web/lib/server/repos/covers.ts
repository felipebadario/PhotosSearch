import { and, eq, isNull } from "drizzle-orm";
import type { Db } from "../db/index.ts";
import { covers } from "../db/schema/index.ts";
import { can } from "../permissions.ts";
import { ForbiddenError, NotFoundError, type TenantContext } from "../tenant-types.ts";
import { getCollection } from "./collections.ts";

function target(organizationId: string, collectionId: string | null) {
  return and(eq(covers.organizationId, organizationId), collectionId === null
    ? isNull(covers.collectionId)
    : eq(covers.collectionId, collectionId));
}

export async function getCover(db: Db, organizationId: string, collectionId: string | null) {
  const [row] = await db.select({ image: covers.image }).from(covers).where(target(organizationId, collectionId));
  return row?.image ?? null;
}

export async function saveCover(db: Db, ctx: TenantContext, collectionId: string | null, image: string | null) {
  if (collectionId === null) {
    if (!can(ctx.role, { organization: ["update"] })) throw new ForbiddenError();
  } else {
    if (!can(ctx.role, { collection: ["update"] })) throw new ForbiddenError();
    const collection = await getCollection(db, ctx, collectionId);
    if (collection.kind !== "event") throw new NotFoundError("Evento não encontrado.");
  }
  if (image === null) {
    await db.delete(covers).where(target(ctx.organizationId, collectionId));
    return;
  }
  await db.insert(covers).values({ organizationId: ctx.organizationId, collectionId, image })
    .onConflictDoUpdate({ target: [covers.organizationId, covers.collectionId], set: { image } });
}
