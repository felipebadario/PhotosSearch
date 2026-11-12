"use server";

import { APIError } from "better-auth/api";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/server/auth";
import { can } from "@/lib/server/permissions";
import { requireAdmin } from "@/lib/server/session";

export type OrgFormState = { error?: string; ok?: string; inviteLink?: string };

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const ROLES = ["admin", "member"] as const;

function explain(err: unknown) {
  if (err instanceof APIError) {
    const code = (err.body as { code?: string } | undefined)?.code ?? "";
    if (code.includes("ALREADY_A_MEMBER")) return "Esta pessoa já faz parte da organização.";
    if (code.includes("ALREADY_INVITED")) return "Já existe um convite pendente para este e-mail.";
    if (code.includes("NOT_ALLOWED") || err.status === "FORBIDDEN" || err.status === "UNAUTHORIZED") {
      return "Você não tem permissão para esta ação.";
    }
    if (code.includes("SLUG")) return "Este endereço já está em uso.";
    if (code.includes("OWNER")) return "A organização precisa de pelo menos um dono.";
  }
  console.error(err);
  return "Não foi possível concluir agora. Tente de novo em instantes.";
}

export async function updateOrganizationAction(_prev: OrgFormState, form: FormData): Promise<OrgFormState> {
  const ctx = await requireAdmin();
  if (!can(ctx.role, { organization: ["update"] })) return { error: "Você não tem permissão para esta ação." };
  const name = text(form, "name");
  if (name.length < 2) return { error: "Informe o nome da organização." };
  try {
    await auth.api.updateOrganization({
      body: { organizationId: ctx.organizationId, data: { name } },
      headers: await headers(),
    });
  } catch (err) {
    return { error: explain(err) };
  }
  revalidatePath("/", "layout");
  return { ok: "Organização atualizada." };
}

export async function inviteMemberAction(_prev: OrgFormState, form: FormData): Promise<OrgFormState> {
  const ctx = await requireAdmin();
  if (!can(ctx.role, { invitation: ["create"] })) return { error: "Você não tem permissão para convidar." };
  const email = text(form, "email").toLowerCase();
  const role = ROLES.find((r) => r === text(form, "role")) ?? "member";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Confira o e-mail digitado." };
  try {
    const invite = await auth.api.createInvitation({
      body: { email, role, organizationId: ctx.organizationId },
      headers: await headers(),
    });
    const h = await headers();
    const origin = process.env.BETTER_AUTH_URL ?? `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
    revalidatePath("/configuracoes/membros");
    return { ok: `Convite criado para ${email}. Envie o link abaixo para a pessoa.`, inviteLink: `${origin}/convite/${invite.id}` };
  } catch (err) {
    return { error: explain(err) };
  }
}

export async function cancelInvitationAction(form: FormData) {
  await requireAdmin();
  await auth.api.cancelInvitation({ body: { invitationId: text(form, "invitationId") }, headers: await headers() });
  revalidatePath("/configuracoes/membros");
}

export async function updateMemberRoleAction(form: FormData) {
  const ctx = await requireAdmin();
  const role = ROLES.find((r) => r === text(form, "role"));
  if (!role) return;
  await auth.api.updateMemberRole({
    body: { memberId: text(form, "memberId"), role, organizationId: ctx.organizationId },
    headers: await headers(),
  });
  revalidatePath("/configuracoes/membros");
}

export async function removeMemberAction(form: FormData) {
  const ctx = await requireAdmin();
  await auth.api.removeMember({
    body: { memberIdOrEmail: text(form, "memberId"), organizationId: ctx.organizationId },
    headers: await headers(),
  });
  revalidatePath("/configuracoes/membros");
}
