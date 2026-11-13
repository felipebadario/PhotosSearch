import { and, desc, eq, gt, sql } from "drizzle-orm";
import type { Db } from "../db/index.ts";
import { leads, leadStatus, type Lead } from "../db/schema/index.ts";
import { ValidationError } from "./collections.ts";

export type LeadStatus = (typeof leadStatus.enumValues)[number];
export const LEAD_STATUSES = leadStatus.enumValues;

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  new: "Novo",
  contacted: "Em contato",
  proposal: "Proposta enviada",
  won: "Assinou",
  lost: "Perdido",
};

export const LEAD_PLANS = ["start", "pro", "business", "enterprise", "events", "nao-sei"] as const;
export const LEAD_PLAN_LABEL: Record<(typeof LEAD_PLANS)[number], string> = {
  start: "Start (até 5 mil fotos)",
  pro: "Pro (até 20 mil fotos)",
  business: "Business (até 50 mil fotos)",
  enterprise: "Enterprise (volume sob medida)",
  events: "Events (pagamento por evento)",
  "nao-sei": "Ainda não sei",
};

export const LEAD_SOURCES = ["site", "planos", "limite", "assinatura"] as const;

export type LeadInput = {
  name: string;
  email: string;
  phone?: string | null;
  organizationName?: string | null;
  segment?: string | null;
  plan?: string | null;
  expectedPhotos?: string | null;
  message?: string | null;
  source?: string | null;
};

export type LeadContext = { organizationId: string; userId: string; usedPhotos: number; photoLimit: number | null } | null;

const clip = (v: string | null | undefined, max: number) => {
  const s = (v ?? "").trim().replace(/\s+/g, " ");
  return s ? s.slice(0, max) : null;
};

/** Valida e normaliza o que veio do formulário público. */
export function normalizeLead(input: LeadInput) {
  const name = clip(input.name, 120);
  if (!name || name.length < 2) throw new ValidationError("name", "Informe seu nome.");
  const email = (clip(input.email, 200) ?? "").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ValidationError("email", "Confira o e-mail digitado.");
  const phone = clip(input.phone, 40);
  if (phone && phone.replace(/\D/g, "").length < 10) throw new ValidationError("phone", "Confira o WhatsApp com DDD.");
  const plan = (LEAD_PLANS as readonly string[]).includes(input.plan ?? "") ? input.plan! : null;
  const source = (LEAD_SOURCES as readonly string[]).includes(input.source ?? "") ? input.source! : "site";
  const message = (input.message ?? "").trim().slice(0, 2000) || null;
  return {
    name,
    email,
    phone,
    organizationName: clip(input.organizationName, 160),
    segment: clip(input.segment, 80),
    plan,
    expectedPhotos: clip(input.expectedPhotos, 40),
    message,
    source,
  };
}

/**
 * Registra o pedido. O mesmo e-mail pedindo de novo em menos de um dia atualiza
 * o pedido aberto em vez de criar outro (evita duplicar no CRM).
 */
export async function createLead(db: Db, input: LeadInput, ctx: LeadContext = null): Promise<Lead> {
  const data = normalizeLead(input);
  const values = {
    ...data,
    organizationId: ctx?.organizationId ?? null,
    userId: ctx?.userId ?? null,
    usedPhotos: ctx?.usedPhotos ?? null,
    photoLimit: ctx?.photoLimit ?? null,
  };
  const [recent] = await db
    .select({ id: leads.id })
    .from(leads)
    .where(and(eq(leads.email, data.email), gt(leads.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000))))
    .orderBy(desc(leads.createdAt))
    .limit(1);
  if (recent) {
    const [row] = await db
      .update(leads)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(leads.id, recent.id))
      .returning();
    return row;
  }
  const [row] = await db.insert(leads).values(values).returning();
  return row;
}

export async function listLeads(db: Db, opts: { status?: LeadStatus | null } = {}) {
  return db
    .select()
    .from(leads)
    .where(opts.status ? eq(leads.status, opts.status) : undefined)
    .orderBy(desc(leads.createdAt))
    .limit(500);
}

export async function countLeadsByStatus(db: Db) {
  const rows = await db.select({ status: leads.status, n: sql<number>`count(*)::int` }).from(leads).groupBy(leads.status);
  return Object.fromEntries(LEAD_STATUSES.map((s) => [s, rows.find((r) => r.status === s)?.n ?? 0])) as Record<LeadStatus, number>;
}

export async function updateLead(db: Db, id: string, patch: { status?: string; notes?: string | null }) {
  const set: Partial<typeof leads.$inferInsert> = { updatedAt: new Date() };
  if (patch.status !== undefined) {
    if (!(LEAD_STATUSES as readonly string[]).includes(patch.status)) throw new ValidationError("status", "Status inválido.");
    set.status = patch.status as LeadStatus;
  }
  if (patch.notes !== undefined) set.notes = (patch.notes ?? "").trim().slice(0, 5000) || null;
  const [row] = await db.update(leads).set(set).where(eq(leads.id, id)).returning();
  return row ?? null;
}

/**
 * Equipe do NossaFoto: e-mails na variável NOSSAFOTO_EQUIPE (separados por vírgula).
 * Sem a variável, ninguém vê os pedidos.
 */
export function isTeamEmail(email: string | null | undefined, env = process.env.NOSSAFOTO_EQUIPE) {
  if (!email || !env) return false;
  const list = env.split(/[,;\s]+/).map((e) => e.trim().toLowerCase()).filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}
