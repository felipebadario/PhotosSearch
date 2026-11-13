import { asc, eq, sql } from "drizzle-orm";
import type { Db } from "../db/index.ts";
import { auditLogs, plans, subscriptionStatus, subscriptions } from "../db/schema/index.ts";
import { ValidationError } from "./collections.ts";

/**
 * Consultas da área interna da equipe (manager.nossafoto.app). Atravessam todas
 * as organizações de propósito: nunca chame daqui sem checar que é a equipe.
 */

const TRIAL_LIMIT = sql`coalesce((select photo_limit from plans where id = 'trial'), 1000)`;

export type ManagerOrg = {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  ownerName: string | null;
  ownerEmail: string | null;
  members: number;
  collections: number;
  used: number;
  indexed: number;
  limit: number | null;
  planId: string;
  planName: string;
  subscriptionStatus: string | null;
  lastPhotoAt: Date | null;
  leads: number;
};

const toDate = (v: unknown) => (v == null ? null : v instanceof Date ? v : new Date(String(v)));

function mapOrg(r: Record<string, unknown>): ManagerOrg {
  return {
    id: String(r.id),
    name: String(r.name),
    slug: String(r.slug),
    createdAt: toDate(r.created_at)!,
    ownerName: (r.owner_name as string) ?? null,
    ownerEmail: (r.owner_email as string) ?? null,
    members: Number(r.members),
    collections: Number(r.collections),
    used: Number(r.used),
    indexed: Number(r.indexed),
    limit: r.photo_limit == null ? null : Number(r.photo_limit),
    planId: String(r.plan_id),
    planName: String(r.plan_name),
    subscriptionStatus: (r.subscription_status as string) ?? null,
    lastPhotoAt: toDate(r.last_photo_at),
    leads: Number(r.leads),
  };
}

const ORG_SELECT = sql`
  select o.id, o.name, o.slug, o.created_at,
    ow.name as owner_name, ow.email as owner_email,
    (select count(*) from member m where m.organization_id = o.id) as members,
    (select count(*) from collections c where c.organization_id = o.id) as collections,
    (select count(*) from photos ph where ph.organization_id = o.id and ph.status <> 'error') as used,
    (select count(*) from photos ph where ph.organization_id = o.id and ph.status = 'indexed') as indexed,
    (select max(ph.created_at) from photos ph where ph.organization_id = o.id) as last_photo_at,
    (select count(*) from leads l where l.organization_id = o.id or (ow.email is not null and l.email = ow.email)) as leads,
    case when s.id is null then ${TRIAL_LIMIT} else coalesce(s.photo_limit, p.photo_limit) end as photo_limit,
    coalesce(s.plan_id, 'trial') as plan_id,
    coalesce(p.name, 'Avaliação') as plan_name,
    s.status as subscription_status
  from organization o
  left join subscriptions s on s.organization_id = o.id
  left join plans p on p.id = s.plan_id
  left join lateral (
    select u.name, u.email from member m join "user" u on u.id = m.user_id
    where m.organization_id = o.id and m.role = 'owner' order by m.created_at limit 1
  ) ow on true
`;

export async function listOrganizations(db: Db, opts: { q?: string | null; filter?: "limite" | null } = {}) {
  const q = (opts.q ?? "").trim();
  const like = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
  const rows = await db.execute(sql`
    select * from (${ORG_SELECT}) x
    where (${q} = '' or x.name ilike ${like} or x.slug ilike ${like} or coalesce(x.owner_email, '') ilike ${like} or coalesce(x.owner_name, '') ilike ${like})
      and (${opts.filter ?? ""} <> 'limite' or (x.photo_limit is not null and x.used >= x.photo_limit * 0.8))
    order by x.created_at desc
    limit 500
  `);
  return (rows as unknown as Record<string, unknown>[]).map(mapOrg);
}

export async function getOrganization(db: Db, id: string) {
  const rows = await db.execute(sql`select * from (${ORG_SELECT}) x where x.id = ${id}`);
  const r = (rows as unknown as Record<string, unknown>[])[0];
  if (!r) return null;
  const org = mapOrg(r);
  const [members, cols, leadRows] = await Promise.all([
    db.execute(sql`
      select u.id, u.name, u.email, m.role, m.created_at,
        (select max(coalesce(se.updated_at, se.created_at)) from session se where se.user_id = u.id) as last_seen_at
      from member m join "user" u on u.id = m.user_id
      where m.organization_id = ${id} order by m.created_at
    `),
    db.execute(sql`
      select c.id, c.name, c.kind, c.visibility, c.created_at,
        (select count(*) from collection_photos cp where cp.collection_id = c.id) as photos
      from collections c where c.organization_id = ${id} order by c.created_at desc
    `),
    db.execute(sql`
      select id, name, email, status, created_at from leads
      where organization_id = ${id} or (${org.ownerEmail ?? ""} <> '' and email = ${org.ownerEmail ?? ""})
      order by created_at desc
    `),
  ]);
  return {
    org,
    members: (members as unknown as Record<string, unknown>[]).map((m) => ({
      id: String(m.id),
      name: String(m.name),
      email: String(m.email),
      role: String(m.role),
      createdAt: toDate(m.created_at)!,
      lastSeenAt: toDate(m.last_seen_at),
    })),
    collections: (cols as unknown as Record<string, unknown>[]).map((c) => ({
      id: String(c.id),
      name: String(c.name),
      kind: String(c.kind),
      visibility: String(c.visibility),
      createdAt: toDate(c.created_at)!,
      photos: Number(c.photos),
    })),
    leads: (leadRows as unknown as Record<string, unknown>[]).map((l) => ({
      id: String(l.id),
      name: String(l.name),
      email: String(l.email),
      status: String(l.status),
      createdAt: toDate(l.created_at)!,
    })),
  };
}

export type ManagerUser = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  lastSeenAt: Date | null;
  organizations: { id: string; name: string; role: string }[];
};

export async function listUsers(db: Db, opts: { q?: string | null } = {}) {
  const q = (opts.q ?? "").trim();
  const like = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
  const rows = await db.execute(sql`
    select u.id, u.name, u.email, u.created_at,
      (select max(coalesce(se.updated_at, se.created_at)) from session se where se.user_id = u.id) as last_seen_at,
      coalesce((
        select json_agg(json_build_object('id', o.id, 'name', o.name, 'role', m.role) order by m.created_at)
        from member m join organization o on o.id = m.organization_id where m.user_id = u.id
      ), '[]'::json) as orgs
    from "user" u
    where ${q} = '' or u.name ilike ${like} or u.email ilike ${like}
    order by u.created_at desc
    limit 500
  `);
  return (rows as unknown as Record<string, unknown>[]).map(
    (r): ManagerUser => ({
      id: String(r.id),
      name: String(r.name),
      email: String(r.email),
      createdAt: toDate(r.created_at)!,
      lastSeenAt: toDate(r.last_seen_at),
      organizations: (typeof r.orgs === "string" ? JSON.parse(r.orgs) : r.orgs) as ManagerUser["organizations"],
    }),
  );
}

export async function overview(db: Db) {
  const rows = await db.execute(sql`
    select
      (select count(*) from "user") as users,
      (select count(*) from "user" where created_at > now() - interval '7 days') as users_week,
      (select count(*) from organization) as orgs,
      (select count(*) from organization where created_at > now() - interval '7 days') as orgs_week,
      (select count(*) from photos where status <> 'error') as photos,
      (select count(*) from photos where status = 'indexed') as indexed,
      (select count(*) from subscriptions where status = 'active' and plan_id <> 'trial') as paying,
      (select count(*) from leads where status = 'new') as leads_new,
      (select count(*) from leads where status in ('contacted', 'proposal')) as leads_open,
      (select count(*) from search_logs where created_at > now() - interval '7 days') as searches_week
  `);
  const r = (rows as unknown as Record<string, unknown>[])[0];
  return Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Number(v)])) as Record<
    "users" | "users_week" | "orgs" | "orgs_week" | "photos" | "indexed" | "paying" | "leads_new" | "leads_open" | "searches_week",
    number
  >;
}

export async function listPlans(db: Db) {
  return db.select().from(plans).orderBy(asc(plans.sortOrder));
}

export const SUBSCRIPTION_STATUSES = subscriptionStatus.enumValues;

/**
 * Troca o plano de uma organização. 'trial' volta para a avaliação (remove a assinatura).
 * photoLimit vazio usa o limite do plano; preenchido, vale só para esta organização.
 */
export async function setOrganizationPlan(
  db: Db,
  actorUserId: string,
  input: { organizationId: string; planId: string; status?: string; photoLimit?: string | number | null },
) {
  const planId = input.planId.trim();
  if (planId === "trial") {
    await db.delete(subscriptions).where(eq(subscriptions.organizationId, input.organizationId));
  } else {
    const [plan] = await db.select({ id: plans.id, photoLimit: plans.photoLimit }).from(plans).where(eq(plans.id, planId)).limit(1);
    if (!plan) throw new ValidationError("planId", "Plano não encontrado.");
    const status = (SUBSCRIPTION_STATUSES as readonly string[]).includes(input.status ?? "") ? (input.status as (typeof SUBSCRIPTION_STATUSES)[number]) : "active";
    const raw = input.photoLimit == null ? "" : String(input.photoLimit).replace(/\D/g, "");
    const photoLimit = raw ? Number(raw) : null;
    if (photoLimit != null && (photoLimit < 1 || photoLimit > 10_000_000)) throw new ValidationError("photoLimit", "Limite inválido.");
    if (photoLimit == null && plan.photoLimit == null) throw new ValidationError("photoLimit", "Este plano não tem limite fixo: informe o limite de fotos.");
    await db
      .insert(subscriptions)
      .values({ organizationId: input.organizationId, planId, status, photoLimit })
      .onConflictDoUpdate({ target: subscriptions.organizationId, set: { planId, status, photoLimit } });
  }
  await db.insert(auditLogs).values({ organizationId: input.organizationId, actorUserId, action: "manager.plan", target: planId });
}
