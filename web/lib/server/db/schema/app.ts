import { sql } from "drizzle-orm";
import { boolean, check, index, integer, pgEnum, pgTable, real, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
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

export type Collection = typeof collections.$inferSelect;
export type Album = typeof albums.$inferSelect;
