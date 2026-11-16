"use server";

import { APIError } from "better-auth/api";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { requireTeamAction } from "@/lib/server/manager";
import { updateLead } from "@/lib/server/repos/leads";
import { ValidationError } from "@/lib/server/repos/collections";
import { setOrganizationPlan } from "@/lib/server/repos/manager";

const text = (form: FormData, key: string) => String(form.get(key) ?? "");

export async function updateLeadAction(form: FormData) {
  await requireTeamAction();
  const patch: { status?: string; notes?: string } = {};
  if (form.has("status")) patch.status = text(form, "status");
  if (form.has("notes")) patch.notes = text(form, "notes");
  await updateLead(db, text(form, "id"), patch);
  revalidatePath("/manager", "layout");
}

export type PlanFormState = { error?: string; ok?: string };

export async function setPlanAction(_prev: PlanFormState, form: FormData): Promise<PlanFormState> {
  const user = await requireTeamAction();
  try {
    await setOrganizationPlan(db, user.id, {
      organizationId: text(form, "organizationId"),
      planId: text(form, "planId"),
      status: text(form, "status"),
      photoLimit: text(form, "photoLimit"),
    });
  } catch (err) {
    if (err instanceof ValidationError) return { error: err.message };
    console.error(err);
    return { error: "Não foi possível salvar agora." };
  }
  revalidatePath("/manager", "layout");
  return { ok: "Plano atualizado. A organização já pode usar o novo limite." };
}

export type ManagerSignInState = { error?: string; ok?: boolean; email?: string };

/**
 * Login do manager. Não redireciona no servidor: um redirect dentro da ação seria
 * renderizado sem passar pelo proxy do subdomínio. O navegador recarrega a página.
 */
export async function managerSignInAction(_prev: ManagerSignInState, form: FormData): Promise<ManagerSignInState> {
  const email = text(form, "email").trim();
  try {
    await auth.api.signInEmail({ body: { email, password: text(form, "password") }, headers: await headers() });
  } catch (err) {
    if (err instanceof APIError) return { error: "E-mail ou senha incorretos.", email };
    console.error(err);
    return { error: "Não foi possível entrar agora. Tente de novo em instantes.", email };
  }
  return { ok: true };
}

export async function managerSignOutAction() {
  await auth.api.signOut({ headers: await headers() });
}
