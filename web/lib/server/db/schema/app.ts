import { sql } from "drizzle-orm";
import { bigint, boolean, check, customType, index, integer, jsonb, pgEnum, pgTable, primaryKey, real, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer }>({ dataType: () => "bytea" });
import { organization, user } from "./auth.ts";

/**
 * Tabelas do produto. Toda tabela com dado de cliente carrega organization_id,
 * mesmo quando alcançável por join (ver docs/data-model.md).
 */

export const collectionKind = pgEnum("collection_kind", ["permanent", "event"]);
export const visibility = pgEnum("visibility", ["private", "link", "link_code", "restricted"]);

export const collections = pgTable(
  "collections",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
    organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    kind: collectionKind("kind").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    visibility: visibility("visibility").notNull().default("private"),
    allowDownload: boolean("allow_download").notNull().default(true),
    matchThreshold: real("match_threshold").notNull().default(0.45),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    publicUntil: timestamp("public_until", { withTimezone: true }),
    retentionDays: integer("retention_days"),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("collections_org_slug_uidx").on(t.organizationId, t.slug),
    index("collections_org_idx").on(t.organizationId),
    check("collections_event_dates", sql`${t.kind} = 'permanent' or (${t.startsAt} is not null and ${t.endsAt} is not null and ${t.endsAt} >= ${t.startsAt})`),
  ],
);

export const albums = pgTable(
  "albums",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
    organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    collectionId: text("collection_id").notNull().references(() => collections.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    eventDate: timestamp("event_date", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("albums_org_collection_idx").on(t.organizationId, t.collectionId)],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
    organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id").references(() => user.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    target: text("target"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_logs_org_time_idx").on(t.organizationId, t.createdAt)],
);

// ── Planos e assinatura: valores são dados, não código (preços ainda são hipóteses) ──

export const plans = pgTable("plans", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull(), // 'business' | 'event' | 'trial'
  name: text("name").notNull(),
  photoLimit: integer("photo_limit"), // null = personalizado
  priceCents: integer("price_cents"), // null = sob consulta
  currency: text("currency").notNull().default("BRL"),
  features: jsonb("features").notNull().default({}),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const subscriptionStatus = pgEnum("subscription_status", ["trialing", "active", "past_due", "canceled"]);

export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  organizationId: text("organization_id").notNull().unique().references(() => organization.id, { onDelete: "cascade" }),
  planId: text("plan_id").notNull().references(() => plans.id),
  status: subscriptionStatus("status").notNull().default("trialing"),
  photoLimit: integer("photo_limit"), // sobrescreve o plano (Enterprise)
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Fotos ──

/** uploading: reservada, aguardando o arquivo chegar ao armazenamento. */
export const photoStatus = pgEnum("photo_status", ["uploading", "queued", "processing", "indexed", "error"]);

export const photos = pgTable(
  "photos",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
    organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    contentHash: text("content_hash").notNull(), // SHA-256 em hex: base da deduplicação e da franquia
    origin: text("origin").notNull().default("upload"), // 'upload' | provedor
    externalRef: text("external_ref"),
    storageKey: text("storage_key"),
    originalName: text("original_name"),
    mimeType: text("mime_type"),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    width: integer("width"),
    height: integer("height"),
    takenAt: timestamp("taken_at", { withTimezone: true }),
    status: photoStatus("status").notNull().default("uploading"),
    modelVersion: text("model_version"),
    errorMessage: text("error_message"),
    indexedAt: timestamp("indexed_at", { withTimezone: true }),
    faceCount: integer("face_count"),
    attempts: integer("attempts").notNull().default(0),
    processingStartedAt: timestamp("processing_started_at", { withTimezone: true }),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("photos_org_hash_uidx").on(t.organizationId, t.contentHash),
    index("photos_org_status_idx").on(t.organizationId, t.status),
    index("photos_org_external_idx").on(t.organizationId, t.externalRef),
  ],
);

export const collectionPhotos = pgTable(
  "collection_photos",
  {
    organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    collectionId: text("collection_id").notNull().references(() => collections.id, { onDelete: "cascade" }),
    photoId: text("photo_id").notNull().references(() => photos.id, { onDelete: "cascade" }),
    albumId: text("album_id").references(() => albums.id, { onDelete: "set null" }),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.collectionId, t.photoId] }),
    index("collection_photos_org_idx").on(t.organizationId, t.collectionId),
    index("collection_photos_photo_idx").on(t.photoId),
  ],
);

// ── Fontes externas ──

/**
 * Pasta do Google Drive compartilhada por link ("qualquer pessoa com o link").
 * O serviço de rostos lista a pasta com a chave de API do NossaFoto, copia as fotos
 * novas para o nosso armazenamento e repete de tempos em tempos. Nenhuma credencial
 * do cliente é guardada. Subpastas viram álbuns.
 */
export const driveSources = pgTable(
  "drive_sources",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
    organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    collectionId: text("collection_id").notNull().references(() => collections.id, { onDelete: "cascade" }),
    folderId: text("folder_id").notNull(),
    resourceKey: text("resource_key"),
    folderName: text("folder_name"),
    status: text("status").notNull().default("pending"), // pending | syncing | ok | error
    lastError: text("last_error"),
    filesSeen: integer("files_seen").notNull().default(0),
    filesImported: integer("files_imported").notNull().default(0),
    syncRequestedAt: timestamp("sync_requested_at", { withTimezone: true }).defaultNow(),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("drive_sources_collection_folder_uidx").on(t.collectionId, t.folderId), index("drive_sources_org_idx").on(t.organizationId)],
);

// ── Rostos e buscas ──

/** Um rosto detectado numa foto. O embedding é o vetor de 512 float32 (little-endian) do modelo, já normalizado. */
export const faces = pgTable(
  "faces",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
    organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    photoId: text("photo_id").notNull().references(() => photos.id, { onDelete: "cascade" }),
    embedding: bytea("embedding").notNull(),
    bbox: jsonb("bbox").notNull(),
    detectionScore: real("detection_score"),
    modelVersion: text("model_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("faces_photo_idx").on(t.photoId), index("faces_org_idx").on(t.organizationId)],
);

/** Métrica de uso da busca. Nunca guarda a selfie nem o embedding dela. */
export const searchLogs = pgTable(
  "search_logs",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
    organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    collectionId: text("collection_id").references(() => collections.id, { onDelete: "set null" }),
    matchCount: integer("match_count").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("search_logs_collection_time_idx").on(t.collectionId, t.createdAt)],
);

export type Collection = typeof collections.$inferSelect;
export type Album = typeof albums.$inferSelect;
export type Photo = typeof photos.$inferSelect;
export type Plan = typeof plans.$inferSelect;
export type DriveSource = typeof driveSources.$inferSelect;
