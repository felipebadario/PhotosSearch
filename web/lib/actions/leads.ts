"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/lib/server/db";
import { createLead, isTeamEmail, updateLead } from "@/lib/server/repos/leads";
import { ValidationError } from "@/lib/server/repos/collections";
import { getUsage } from "@/lib/server/repos/photos";
import { getSession, getTenant } from "@/lib/server/session";

export type LeadFormState = { error?: string; ok?: boolean; values?: Record<string, string> };

const text = (form: FormData, key: string) => String(form.get(key) ?? "");
const FIELDS = ["name", "email", "phone", "organizationName", "segment", "plan", "expectedPhotos", "message", "source"] as const;

// Proteção simples contra robôs: no máximo 5 pedidos por IP a cada 10 minutos, por instância.
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > 5;
}

export async function submitLeadAction(_prev: LeadFormState, form: FormData): Promise<LeadFormState> {
  const values = Object.fromEntries(FIELDS.map((k) => [k, text(form, k)])) as Record<(typeof FIELDS)[number], string>;
  // Campo escondido: gente não preenche, robô preenche. Fingimos sucesso.
  if (text(form, "website")) return { ok: true };
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "desconhecido";
  if (limited(ip)) return { error: "Recebemos vários pedidos seguidos. Aguarde alguns minutos e tente de novo.", values };

  // Quem já está logado leva junto o contexto da organização (uso e limite na hora do pedido).
  const tenant = await getTenant();
  const ctx = tenant
    ? await getUsage(db, tenant).then((u) => ({ organizationId: tenant.organizationId, userId: tenant.userId, usedPhotos: u.used, photoLimit: u.limit }))
    : null;
  try {
    await createLead(db, values, ctx);
  } catch (err) {
    if (err instanceof ValidationError) return { error: err.message, values };
    console.error(err);
    return { error: "Não foi possível enviar agora. Tente de novo em instantes.", values };
  }
  return { ok: true };
}

async function requireTeam() {
  const session = await getSession();
  if (!session || !isTeamEmail(session.user.email)) throw new Error("Acesso restrito à equipe.");
}

export async function updateLeadAction(form: FormData) {
  await requireTeam();
  const id = text(form, "id");
  const patch: { status?: string; notes?: string } = {};
  if (form.has("status")) patch.status = text(form, "status");
  if (form.has("notes")) patch.notes = text(form, "notes");
  await updateLead(db, id, patch);
  revalidatePath("/equipe/leads");
}
