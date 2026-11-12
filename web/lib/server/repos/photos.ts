import { and, asc, count, desc, eq, inArray, isNull, lt, ne, sql } from "drizzle-orm";
import type { Db } from "../db/index.ts";
import { albums, auditLogs, collectionPhotos, collections, photos, plans, subscriptions } from "../db/schema/index.ts";
import { can } from "../permissions.ts";
import { ForbiddenError, NotFoundError, type TenantContext } from "../tenant-types.ts";
import { ValidationError } from "./collections.ts";

/** Formatos que a indexação (OpenCV) lê hoje. HEIC fica para depois. */
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_FILE_BYTES = 30 * 1024 * 1024;
export const MAX_FILES_PER_REQUEST = 100;
/** Reserva de envio abandonada some depois disso e libera a franquia. */
const STALE_UPLOAD_MS = 2 * 60 * 60 * 1000;

export type UploadFile = { clientId: string; name: string; size: number; type: string; sha256: string };

export type UploadItem =
  | { clientId: string; status: "upload"; photoId: string; key: string; type: string; sha256: string }
  | { clientId: string; status: "added" | "already_here"; photoId: string }
  | { clientId: string; status: "duplicate_in_batch" | "quota_exceeded" | "invalid"; message?: string };

// ── Franquia ──

export async function getPlanLimit(db: Db, ctx: TenantContext) {
  const [sub] = await db
    .select({ planId: plans.id, name: plans.name, planLimit: plans.photoLimit, override: subscriptions.photoLimit, status: subscriptions.status })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .where(eq(subscriptions.organizationId, ctx.organizationId))
    .limit(1);
  if (sub) return { planId: sub.planId, name: sub.name, limit: sub.override ?? sub.planLimit, status: sub.status };
  const [trial] = await db.select().from(plans).where(eq(plans.id, "trial")).limit(1);
  return { planId: "trial", name: trial?.name ?? "Avaliação", limit: trial?.photoLimit ?? 1000, status: "trialing" as const };
}

/** Fotos que ocupam a franquia: cada conteúdo distinto da organização conta uma vez, em qualquer acervo. */
export async function countUsedPhotos(db: Db | Parameters<Parameters<Db["transaction"]>[0]>[0], ctx: TenantContext) {
  const [row] = await db
    .select({ n: count() })
    .from(photos)
    .where(and(eq(photos.organizationId, ctx.organizationId), ne(photos.status, "error")));
  return row?.n ?? 0;
}

export async function getUsage(db: Db, ctx: TenantContext) {
  const [plan, used] = await Promise.all([getPlanLimit(db, ctx), countUsedPhotos(db, ctx)]);
  return { ...plan, used };
}

// ── Álbuns ──

async function ownCollection(db: Db, ctx: TenantContext, collectionId: string) {
  const [c] = await db
    .select({ id: collections.id })
    .from(collections)
    .where(and(eq(collections.organizationId, ctx.organizationId), eq(collections.id, collectionId)))
    .limit(1);
  if (!c) throw new NotFoundError("Acervo não encontrado.");
}

async function ownAlbum(db: Db, ctx: TenantContext, collectionId: string, albumId: string) {
  const [a] = await db
    .select({ id: albums.id })
    .from(albums)
    .where(and(eq(albums.organizationId, ctx.organizationId), eq(albums.collectionId, collectionId), eq(albums.id, albumId)))
    .limit(1);
  if (!a) throw new NotFoundError("Álbum não encontrado.");
}

function albumName(raw: string) {
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length < 1) throw new ValidationError("name", "Dê um nome ao álbum.");
  if (name.length > 120) throw new ValidationError("name", "O nome pode ter até 120 caracteres.");
  return name;
}

export async function listAlbums(db: Db, ctx: TenantContext, collectionId: string) {
  return db
    .select({ id: albums.id, name: albums.name, createdAt: albums.createdAt, photoCount: count(collectionPhotos.photoId) })
    .from(albums)
    .leftJoin(collectionPhotos, and(eq(collectionPhotos.albumId, albums.id), eq(collectionPhotos.organizationId, ctx.organizationId)))
    .where(and(eq(albums.organizationId, ctx.organizationId), eq(albums.collectionId, collectionId)))
    .groupBy(albums.id)
    .orderBy(asc(albums.name));
}

export async function createAlbum(db: Db, ctx: TenantContext, collectionId: string, rawName: string) {
  if (!can(ctx.role, { collection: ["update"] })) throw new ForbiddenError();
  await ownCollection(db, ctx, collectionId);
  const name = albumName(rawName);
  const [existing] = await db
    .select()
    .from(albums)
    .where(and(eq(albums.organizationId, ctx.organizationId), eq(albums.collectionId, collectionId), sql`lower(${albums.name}) = lower(${name})`))
    .limit(1);
  if (existing) return existing;
  const [row] = await db.insert(albums).values({ organizationId: ctx.organizationId, collectionId, name }).returning();
  await db.insert(auditLogs).values({ organizationId: ctx.organizationId, actorUserId: ctx.userId, action: "album.create", target: row.id });
  return row;
}

export async function renameAlbum(db: Db, ctx: TenantContext, collectionId: string, albumId: string, rawName: string) {
  if (!can(ctx.role, { collection: ["update"] })) throw new ForbiddenError();
  const name = albumName(rawName);
  const [row] = await db
    .update(albums)
    .set({ name })
    .where(and(eq(albums.organizationId, ctx.organizationId), eq(albums.collectionId, collectionId), eq(albums.id, albumId)))
    .returning();
  if (!row) throw new NotFoundError("Álbum não encontrado.");
  return row;
}

/** Apaga só o álbum: as fotos continuam no acervo, sem álbum. */
export async function deleteAlbum(db: Db, ctx: TenantContext, collectionId: string, albumId: string) {
  if (!can(ctx.role, { collection: ["update"] })) throw new ForbiddenError();
  const deleted = await db
    .delete(albums)
    .where(and(eq(albums.organizationId, ctx.organizationId), eq(albums.collectionId, collectionId), eq(albums.id, albumId)))
    .returning({ id: albums.id });
  if (deleted.length === 0) throw new NotFoundError("Álbum não encontrado.");
  await db.insert(auditLogs).values({ organizationId: ctx.organizationId, actorUserId: ctx.userId, action: "album.delete", target: albumId });
}

// ── Envio ──

function check(file: UploadFile): string | null {
  if (!/^[0-9a-f]{64}$/.test(file.sha256)) return "Arquivo ilegível.";
  if (!(ACCEPTED_TYPES as readonly string[]).includes(file.type)) return "Formato não aceito. Envie JPG, PNG ou WebP.";
  if (!(file.size > 0) || file.size > MAX_FILE_BYTES) return "O arquivo passa de 30 MB.";
  return null;
}

/**
 * Primeira etapa do envio. Para cada arquivo, pelo SHA-256:
 * - já está neste acervo: nada a fazer;
 * - já existe na organização: entra no acervo na hora, sem novo envio e sem gastar franquia;
 * - é novo: reserva a foto e devolve a chave para envio, até o limite do plano.
 * Uma trava por organização evita que dois lotes simultâneos passem do limite.
 */
export async function requestUploads(
  db: Db,
  ctx: TenantContext,
  input: { collectionId: string; albumId?: string | null; files: UploadFile[] },
  keyFor: (sha256: string) => string,
) {
  if (!can(ctx.role, { photo: ["upload"] })) throw new ForbiddenError();
  if (input.files.length > MAX_FILES_PER_REQUEST) throw new ValidationError("files", "Envie no máximo 100 arquivos por vez.");
  await ownCollection(db, ctx, input.collectionId);
  if (input.albumId) await ownAlbum(db, ctx, input.collectionId, input.albumId);
  const { limit } = await getPlanLimit(db, ctx);

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${ctx.organizationId}))`);
    await tx
      .delete(photos)
      .where(and(eq(photos.organizationId, ctx.organizationId), eq(photos.status, "uploading"), lt(photos.createdAt, new Date(Date.now() - STALE_UPLOAD_MS))));

    const hashes = [...new Set(input.files.map((f) => f.sha256).filter((h) => /^[0-9a-f]{64}$/.test(h)))];
    const existing = hashes.length
      ? await tx
          .select({ id: photos.id, hash: photos.contentHash, status: photos.status, inCollection: collectionPhotos.photoId })
          .from(photos)
          .leftJoin(collectionPhotos, and(eq(collectionPhotos.photoId, photos.id), eq(collectionPhotos.collectionId, input.collectionId)))
          .where(and(eq(photos.organizationId, ctx.organizationId), inArray(photos.contentHash, hashes)))
      : [];
    const byHash = new Map(existing.map((e) => [e.hash, e]));

    let used = await countUsedPhotos(tx, ctx);
    const seen = new Set<string>();
    const items: UploadItem[] = [];
    const toLink: string[] = [];

    for (const file of input.files) {
      const problem = check(file);
      if (problem) {
        items.push({ clientId: file.clientId, status: "invalid", message: problem });
        continue;
      }
      if (seen.has(file.sha256)) {
        items.push({ clientId: file.clientId, status: "duplicate_in_batch" });
        continue;
      }
      seen.add(file.sha256);
      const found = byHash.get(file.sha256);
      if (found && found.status === "error") {
        // Falhou antes: tenta de novo com o mesmo registro.
        if (limit != null && used >= limit) {
          items.push({ clientId: file.clientId, status: "quota_exceeded" });
          continue;
        }
        await tx.update(photos).set({ status: "uploading", errorMessage: null, createdAt: new Date() }).where(eq(photos.id, found.id));
        used++;
        items.push({ clientId: file.clientId, status: "upload", photoId: found.id, key: keyFor(file.sha256), type: file.type, sha256: file.sha256 });
      } else if (found && found.status === "uploading") {
        items.push({ clientId: file.clientId, status: "upload", photoId: found.id, key: keyFor(file.sha256), type: file.type, sha256: file.sha256 });
      } else if (found) {
        if (found.inCollection) items.push({ clientId: file.clientId, status: "already_here", photoId: found.id });
        else {
          toLink.push(found.id);
          items.push({ clientId: file.clientId, status: "added", photoId: found.id });
        }
      } else {
        if (limit != null && used >= limit) {
          items.push({ clientId: file.clientId, status: "quota_exceeded" });
          continue;
        }
        const [row] = await tx
          .insert(photos)
          .values({
            organizationId: ctx.organizationId,
            contentHash: file.sha256,
            storageKey: keyFor(file.sha256),
            originalName: file.name.slice(0, 255),
            mimeType: file.type,
            sizeBytes: file.size,
            createdBy: ctx.userId,
          })
          .returning({ id: photos.id, storageKey: photos.storageKey });
        used++;
        items.push({ clientId: file.clientId, status: "upload", photoId: row.id, key: row.storageKey!, type: file.type, sha256: file.sha256 });
      }
    }

    if (toLink.length) {
      await tx
        .insert(collectionPhotos)
        .values(toLink.map((photoId) => ({ organizationId: ctx.organizationId, collectionId: input.collectionId, photoId, albumId: input.albumId ?? null })))
        .onConflictDoNothing();
    }
    return { items, usage: { used, limit } };
  });
}

/**
 * Segunda etapa: confere no armazenamento que cada arquivo chegou com o tamanho
 * esperado, põe a foto na fila de indexação e a coloca no acervo.
 */
export async function completeUploads(
  db: Db,
  ctx: TenantContext,
  input: { collectionId: string; albumId?: string | null; photoIds: string[] },
  head: (key: string) => Promise<{ size: number } | null>,
) {
  if (!can(ctx.role, { photo: ["upload"] })) throw new ForbiddenError();
  await ownCollection(db, ctx, input.collectionId);
  if (input.albumId) await ownAlbum(db, ctx, input.collectionId, input.albumId);
  const ids = [...new Set(input.photoIds)].slice(0, MAX_FILES_PER_REQUEST);
  if (ids.length === 0) return { done: [], missing: [] };

  const rows = await db
    .select()
    .from(photos)
    .where(and(eq(photos.organizationId, ctx.organizationId), inArray(photos.id, ids)));
  const done: string[] = [];
  const missing: string[] = [];
  for (const p of rows) {
    if (p.status !== "uploading") {
      done.push(p.id);
      continue;
    }
    const obj = p.storageKey ? await head(p.storageKey) : null;
    if (!obj || (p.sizeBytes != null && obj.size !== p.sizeBytes)) {
      missing.push(p.id);
      continue;
    }
    await db.update(photos).set({ status: "queued" }).where(and(eq(photos.organizationId, ctx.organizationId), eq(photos.id, p.id)));
    done.push(p.id);
  }
  if (done.length) {
    await db
      .insert(collectionPhotos)
      .values(done.map((photoId) => ({ organizationId: ctx.organizationId, collectionId: input.collectionId, photoId, albumId: input.albumId ?? null })))
      .onConflictDoNothing();
    await db.insert(auditLogs).values({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      action: "photo.upload",
      target: input.collectionId,
    });
  }
  return { done, missing };
}

// ── Leitura ──

export async function listCollectionPhotos(
  db: Db,
  ctx: TenantContext,
  collectionId: string,
  opts: { albumId?: string | "none" | null; limit?: number; offset?: number } = {},
) {
  const where = [eq(collectionPhotos.organizationId, ctx.organizationId), eq(collectionPhotos.collectionId, collectionId)];
  if (opts.albumId === "none") where.push(isNull(collectionPhotos.albumId));
  else if (opts.albumId) where.push(eq(collectionPhotos.albumId, opts.albumId));
  return db
    .select({
      id: photos.id,
      name: photos.originalName,
      status: photos.status,
      albumId: collectionPhotos.albumId,
      addedAt: collectionPhotos.addedAt,
    })
    .from(collectionPhotos)
    .innerJoin(photos, and(eq(photos.id, collectionPhotos.photoId), eq(photos.organizationId, ctx.organizationId)))
    .where(and(...where, ne(photos.status, "uploading")))
    .orderBy(desc(collectionPhotos.addedAt), asc(photos.id))
    .limit(opts.limit ?? 120)
    .offset(opts.offset ?? 0);
}

export async function countCollectionPhotos(db: Db, ctx: TenantContext, collectionId: string) {
  const [row] = await db
    .select({ n: count() })
    .from(collectionPhotos)
    .innerJoin(photos, eq(photos.id, collectionPhotos.photoId))
    .where(and(eq(collectionPhotos.organizationId, ctx.organizationId), eq(collectionPhotos.collectionId, collectionId), ne(photos.status, "uploading")));
  return row?.n ?? 0;
}

export async function getPhoto(db: Db, ctx: TenantContext, id: string) {
  const [row] = await db
    .select()
    .from(photos)
    .where(and(eq(photos.organizationId, ctx.organizationId), eq(photos.id, id)))
    .limit(1);
  if (!row) throw new NotFoundError("Foto não encontrada.");
  return row;
}

// ── Exclusão ──

/**
 * Tira as fotos do acervo. A que não estiver em nenhum outro acervo é apagada
 * de vez e libera a franquia; as chaves devolvidas devem sair do armazenamento.
 */
export async function removePhotosFromCollection(db: Db, ctx: TenantContext, collectionId: string, photoIds: string[]) {
  if (!can(ctx.role, { photo: ["delete"] })) throw new ForbiddenError();
  await ownCollection(db, ctx, collectionId);
  const ids = [...new Set(photoIds)];
  if (ids.length === 0) return { removed: 0, deletedKeys: [] as string[] };

  return db.transaction(async (tx) => {
    const unlinked = await tx
      .delete(collectionPhotos)
      .where(and(eq(collectionPhotos.organizationId, ctx.organizationId), eq(collectionPhotos.collectionId, collectionId), inArray(collectionPhotos.photoId, ids)))
      .returning({ photoId: collectionPhotos.photoId });
    const candidates = unlinked.map((u) => u.photoId);
    let deletedKeys: string[] = [];
    if (candidates.length) {
      const orphans = await tx
        .delete(photos)
        .where(
          and(
            eq(photos.organizationId, ctx.organizationId),
            inArray(photos.id, candidates),
            sql`not exists (select 1 from ${collectionPhotos} cp where cp.photo_id = ${photos.id})`,
          ),
        )
        .returning({ key: photos.storageKey });
      deletedKeys = orphans.map((o) => o.key).filter((k): k is string => Boolean(k));
      await tx.insert(auditLogs).values({
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        action: "photo.remove",
        target: collectionId,
      });
    }
    return { removed: candidates.length, deletedKeys };
  });
}

/** Ids das fotos de um acervo, para limpar as órfãs depois de apagá-lo. */
export async function collectionPhotoIds(db: Db, ctx: TenantContext, collectionId: string) {
  const rows = await db
    .select({ id: collectionPhotos.photoId })
    .from(collectionPhotos)
    .where(and(eq(collectionPhotos.organizationId, ctx.organizationId), eq(collectionPhotos.collectionId, collectionId)));
  return rows.map((r) => r.id);
}

/** Depois de apagar um acervo: as fotos dele que não estão em outro acervo saem de vez. */
export async function deleteOrphanPhotos(db: Db, ctx: TenantContext, photoIds: string[]) {
  if (photoIds.length === 0) return [];
  const orphans = await db
    .delete(photos)
    .where(
      and(
        eq(photos.organizationId, ctx.organizationId),
        inArray(photos.id, photoIds),
        sql`not exists (select 1 from ${collectionPhotos} cp where cp.photo_id = ${photos.id})`,
      ),
    )
    .returning({ key: photos.storageKey });
  return orphans.map((o) => o.key).filter((k): k is string => Boolean(k));
}

// ── Indexação (visão do Admin) ──

export async function getIndexingStats(db: Db, ctx: TenantContext, collectionId: string) {
  const rows = await db
    .select({ status: photos.status, n: count() })
    .from(collectionPhotos)
    .innerJoin(photos, eq(photos.id, collectionPhotos.photoId))
    .where(and(eq(collectionPhotos.organizationId, ctx.organizationId), eq(collectionPhotos.collectionId, collectionId)))
    .groupBy(photos.status);
  const n = (st: string) => rows.find((r) => r.status === st)?.n ?? 0;
  const failed = await db
    .select({ id: photos.id, name: photos.originalName, message: photos.errorMessage })
    .from(collectionPhotos)
    .innerJoin(photos, eq(photos.id, collectionPhotos.photoId))
    .where(and(eq(collectionPhotos.organizationId, ctx.organizationId), eq(collectionPhotos.collectionId, collectionId), eq(photos.status, "error")))
    .limit(10);
  return { indexed: n("indexed"), pending: n("queued") + n("processing"), failed: n("error"), failures: failed };
}

/** Manda de volta para a fila as fotos que falharam neste acervo. */
export async function retryFailedPhotos(db: Db, ctx: TenantContext, collectionId: string) {
  if (!can(ctx.role, { photo: ["upload"] })) throw new ForbiddenError();
  await ownCollection(db, ctx, collectionId);
  const ids = db
    .select({ id: collectionPhotos.photoId })
    .from(collectionPhotos)
    .where(and(eq(collectionPhotos.organizationId, ctx.organizationId), eq(collectionPhotos.collectionId, collectionId)));
  const res = await db
    .update(photos)
    .set({ status: "queued", attempts: 0, errorMessage: null })
    .where(and(eq(photos.organizationId, ctx.organizationId), eq(photos.status, "error"), inArray(photos.id, ids)))
    .returning({ id: photos.id });
  return res.length;
}
