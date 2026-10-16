import { and, count, desc, eq } from "drizzle-orm";
import type { Db } from "../db/index.ts";
import { auditLogs, collections, type Collection } from "../db/schema/index.ts";
import { can } from "../permissions.ts";
import { ForbiddenError, NotFoundError, type TenantContext } from "../tenant-types.ts";

export type CollectionKind = Collection["kind"];

export type CollectionInput = {
  kind: CollectionKind;
  name: string;
  description?: string | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  publicUntil?: Date | null;
  retentionDays?: number | null;
  allowDownload?: boolean;
};

export class ValidationError extends Error {
  field: string;
  constructor(field: string, message: string) {
    super(message);
    this.field = field;
    this.name = "ValidationError";
  }
}

export function slugify(name: string) {
  return (
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "acervo"
  );
}

function validate(input: CollectionInput) {
  const name = input.name.trim();
  if (name.length < 2) throw new ValidationError("name", "Dê um nome com pelo menos 2 letras.");
  if (name.length > 120) throw new ValidationError("name", "O nome pode ter até 120 caracteres.");
  if (input.kind === "event") {
    if (!input.startsAt || !input.endsAt) throw new ValidationError("dates", "Informe o início e o fim do evento.");
    if (input.endsAt < input.startsAt) throw new ValidationError("dates", "O fim do evento precisa ser depois do início.");
    if (input.publicUntil && input.publicUntil < input.endsAt) {
      throw new ValidationError("publicUntil", "A disponibilidade precisa ir pelo menos até o fim do evento.");
    }
  }
  if (input.retentionDays != null && (input.retentionDays < 1 || input.retentionDays > 3650)) {
    throw new ValidationError("retentionDays", "A retenção vai de 1 a 3650 dias.");
  }
  return name;
}

const scoped = (ctx: TenantContext, id: string) =>
  and(eq(collections.organizationId, ctx.organizationId), eq(collections.id, id));

export async function listCollections(db: Db, ctx: TenantContext) {
  return db
    .select()
    .from(collections)
    .where(eq(collections.organizationId, ctx.organizationId))
    .orderBy(desc(collections.createdAt));
}

export async function countCollections(db: Db, ctx: TenantContext) {
  const rows = await db
    .select({ kind: collections.kind, n: count() })
    .from(collections)
    .where(eq(collections.organizationId, ctx.organizationId))
    .groupBy(collections.kind);
  return {
    permanent: rows.find((r) => r.kind === "permanent")?.n ?? 0,
    event: rows.find((r) => r.kind === "event")?.n ?? 0,
  };
}

export async function getCollection(db: Db, ctx: TenantContext, id: string) {
  const [row] = await db.select().from(collections).where(scoped(ctx, id)).limit(1);
  if (!row) throw new NotFoundError("Acervo não encontrado.");
  return row;
}

async function uniqueSlug(db: Db, ctx: TenantContext, base: string, exceptId?: string) {
  const taken = new Set(
    (
      await db
        .select({ id: collections.id, slug: collections.slug })
        .from(collections)
        .where(eq(collections.organizationId, ctx.organizationId))
    )
      .filter((r) => r.id !== exceptId)
      .map((r) => r.slug),
  );
  let slug = base;
  for (let i = 2; taken.has(slug); i++) slug = `${base}-${i}`;
  return slug;
}

function fields(input: CollectionInput, name: string) {
  const event = input.kind === "event";
  return {
    kind: input.kind,
    name,
    description: input.description?.trim() || null,
    startsAt: event ? input.startsAt ?? null : null,
    endsAt: event ? input.endsAt ?? null : null,
    publicUntil: event ? input.publicUntil ?? input.endsAt ?? null : null,
    retentionDays: input.retentionDays ?? null,
    allowDownload: input.allowDownload ?? true,
  };
}

export async function createCollection(db: Db, ctx: TenantContext, input: CollectionInput) {
  if (!can(ctx.role, { collection: ["create"] })) throw new ForbiddenError();
  const name = validate(input);
  const slug = await uniqueSlug(db, ctx, slugify(name));
  const [row] = await db
    .insert(collections)
    .values({ ...fields(input, name), slug, organizationId: ctx.organizationId, createdBy: ctx.userId })
    .returning();
  await db.insert(auditLogs).values({
    organizationId: ctx.organizationId,
    actorUserId: ctx.userId,
    action: "collection.create",
    target: row.id,
  });
  return row;
}

export async function updateCollection(db: Db, ctx: TenantContext, id: string, input: CollectionInput) {
  if (!can(ctx.role, { collection: ["update"] })) throw new ForbiddenError();
  const current = await getCollection(db, ctx, id);
  const name = validate(input);
  const slug = name === current.name ? current.slug : await uniqueSlug(db, ctx, slugify(name), id);
  const [row] = await db
    .update(collections)
    .set({ ...fields(input, name), slug, updatedAt: new Date() })
    .where(scoped(ctx, id))
    .returning();
  if (!row) throw new NotFoundError("Acervo não encontrado.");
  await db.insert(auditLogs).values({
    organizationId: ctx.organizationId,
    actorUserId: ctx.userId,
    action: "collection.update",
    target: id,
  });
  return row;
}

export async function deleteCollection(db: Db, ctx: TenantContext, id: string) {
  if (!can(ctx.role, { collection: ["delete"] })) throw new ForbiddenError();
  const deleted = await db.delete(collections).where(scoped(ctx, id)).returning({ id: collections.id });
  if (deleted.length === 0) throw new NotFoundError("Acervo não encontrado.");
  await db.insert(auditLogs).values({
    organizationId: ctx.organizationId,
    actorUserId: ctx.userId,
    action: "collection.delete",
    target: id,
  });
}
