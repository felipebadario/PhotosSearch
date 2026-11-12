import { and, asc, count, desc, eq, isNull, ne } from "drizzle-orm";
import type { Db } from "../db/index.ts";
import { albums, auditLogs, collectionPhotos, collections, organization, photos, type Collection } from "../db/schema/index.ts";
import { can } from "../permissions.ts";
import { ForbiddenError, NotFoundError, type TenantContext } from "../tenant-types.ts";

/**
 * Leitura pública (sem login) de um acervo compartilhado por link.
 * Tudo aqui parte do par organização/acervo da URL e só devolve o que pertence
 * a esse acervo; acervo privado se comporta como se não existisse.
 */
export type PublicCollection = {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  name: string;
  slug: string;
  description: string | null;
  kind: Collection["kind"];
  allowDownload: boolean;
  /** open: fotos visíveis. closed: evento passou do prazo de disponibilidade. */
  state: "open" | "closed";
};

/** Hoje só "link" abre o acervo. link_code e restricted ficam fechados até existirem. */
const isShared = (visibility: Collection["visibility"]) => visibility === "link";

export async function getPublicCollection(db: Db, orgSlug: string, collectionSlug: string, now = new Date()): Promise<PublicCollection | null> {
  const [row] = await db
    .select({ c: collections, orgName: organization.name, orgSlug: organization.slug })
    .from(collections)
    .innerJoin(organization, eq(organization.id, collections.organizationId))
    .where(and(eq(organization.slug, orgSlug), eq(collections.slug, collectionSlug)))
    .limit(1);
  if (!row || !isShared(row.c.visibility)) return null;
  const closed = row.c.kind === "event" && row.c.publicUntil != null && row.c.publicUntil < now;
  return {
    id: row.c.id,
    organizationId: row.c.organizationId,
    organizationName: row.orgName,
    organizationSlug: row.orgSlug,
    name: row.c.name,
    slug: row.c.slug,
    description: row.c.description,
    kind: row.c.kind,
    allowDownload: row.c.allowDownload,
    state: closed ? "closed" : "open",
  };
}

const visible = (c: PublicCollection) =>
  and(eq(collectionPhotos.organizationId, c.organizationId), eq(collectionPhotos.collectionId, c.id), ne(photos.status, "uploading"), ne(photos.status, "error"));

export async function listPublicAlbums(db: Db, c: PublicCollection) {
  if (c.state !== "open") return [];
  return db
    .select({ id: albums.id, name: albums.name, photoCount: count(collectionPhotos.photoId) })
    .from(albums)
    .innerJoin(collectionPhotos, eq(collectionPhotos.albumId, albums.id))
    .innerJoin(photos, eq(photos.id, collectionPhotos.photoId))
    .where(and(eq(albums.collectionId, c.id), visible(c)))
    .groupBy(albums.id)
    .orderBy(asc(albums.name));
}

export async function countPublicPhotos(db: Db, c: PublicCollection) {
  if (c.state !== "open") return 0;
  const [row] = await db
    .select({ n: count() })
    .from(collectionPhotos)
    .innerJoin(photos, eq(photos.id, collectionPhotos.photoId))
    .where(visible(c));
  return row?.n ?? 0;
}

export async function listPublicPhotos(db: Db, c: PublicCollection, opts: { albumId?: string | "none" | null; limit?: number } = {}) {
  if (c.state !== "open") return [];
  const where = [visible(c)];
  if (opts.albumId === "none") where.push(isNull(collectionPhotos.albumId));
  else if (opts.albumId) where.push(eq(collectionPhotos.albumId, opts.albumId));
  return db
    .select({ id: photos.id, albumName: albums.name, takenAt: photos.takenAt })
    .from(collectionPhotos)
    .innerJoin(photos, eq(photos.id, collectionPhotos.photoId))
    .leftJoin(albums, eq(albums.id, collectionPhotos.albumId))
    .where(and(...where))
    .orderBy(desc(collectionPhotos.addedAt), asc(photos.id))
    .limit(opts.limit ?? 120);
}

/** A foto só sai se estiver neste acervo e ele estiver aberto. */
export async function getPublicPhoto(db: Db, c: PublicCollection, photoId: string) {
  if (c.state !== "open") return null;
  const [row] = await db
    .select({ id: photos.id, storageKey: photos.storageKey, name: photos.originalName })
    .from(collectionPhotos)
    .innerJoin(photos, eq(photos.id, collectionPhotos.photoId))
    .where(and(visible(c), eq(photos.id, photoId)))
    .limit(1);
  return row ?? null;
}

/** Liga ou desliga o compartilhamento por link (Admin). */
export async function setCollectionSharing(db: Db, ctx: TenantContext, collectionId: string, shared: boolean) {
  if (!can(ctx.role, { collection: ["update"] })) throw new ForbiddenError();
  const [row] = await db
    .update(collections)
    .set({ visibility: shared ? "link" : "private", updatedAt: new Date() })
    .where(and(eq(collections.organizationId, ctx.organizationId), eq(collections.id, collectionId)))
    .returning({ id: collections.id });
  if (!row) throw new NotFoundError("Acervo não encontrado.");
  await db.insert(auditLogs).values({
    organizationId: ctx.organizationId,
    actorUserId: ctx.userId,
    action: shared ? "collection.share" : "collection.unshare",
    target: collectionId,
  });
}
