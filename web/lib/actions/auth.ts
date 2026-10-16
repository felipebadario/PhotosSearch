"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/server/auth";
import { getSession } from "@/lib/server/session";
import { slugify } from "@/lib/server/repos/collections";

export type FormState = { error?: string; values?: Record<string, string> };

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

/** Mensagens do Better Auth traduzidas para o que a pessoa precisa fazer. */
function explain(err: unknown): string {
  if (err instanceof APIError) {
    const code = (err.body as { code?: string } | undefined)?.code ?? "";
    if (code.includes("USER_ALREADY_EXISTS")) return "Já existe uma conta com este e-mail. Entre com ela.";
    if (code.includes("INVALID_EMAIL_OR_PASSWORD")) return "E-mail ou senha incorretos.";
    if (code.includes("PASSWORD_TOO_SHORT")) return "A senha precisa ter pelo menos 8 caracteres.";
    if (code.includes("INVALID_EMAIL")) return "Confira o e-mail digitado.";
    if (code.includes("SLUG_IS_TAKEN") || code.includes("ORGANIZATION_ALREADY_EXISTS")) {
      return "Já existe uma organização com este endereço. Tente outro nome.";
    }
    if (code.includes("INVITATION")) return "Este convite não é válido, expirou ou é de outro e-mail.";
    if (err.status === "TOO_MANY_REQUESTS") return "Muitas tentativas. Aguarde um minuto e tente de novo.";
  }
  console.error(err);
  return "Não foi possível concluir agora. Tente de novo em instantes.";
}

async function availableOrgSlug(name: string) {
  const base = slugify(name);
  for (let i = 1; i < 50; i++) {
    const slug = i === 1 ? base : `${base}-${i}`;
    const taken = await auth.api.checkOrganizationSlug({ body: { slug } }).then(() => false, () => true);
    if (!taken) return slug;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function signUpAction(_prev: FormState, form: FormData): Promise<FormState> {
  const values = { name: text(form, "name"), email: text(form, "email"), organization: text(form, "organization") };
  const password = String(form.get("password") ?? "");
  // Quem chega por convite entra na organização de quem convidou, sem criar outra.
  const invitationId = text(form, "invitationId");
  if (values.name.length < 2) return { error: "Informe seu nome.", values };
  if (!invitationId && values.organization.length < 2) return { error: "Informe o nome da sua organização.", values };

  try {
    const { user } = await auth.api.signUpEmail({
      body: { name: values.name, email: values.email, password },
      headers: await headers(),
    });
    if (!invitationId) {
      await auth.api.createOrganization({
        body: { name: values.organization, slug: await availableOrgSlug(values.organization), userId: user.id },
      });
    }
  } catch (err) {
    return { error: explain(err), values };
  }
  redirect(invitationId ? `/convite/${encodeURIComponent(invitationId)}` : "/painel");
}

export async function signInAction(_prev: FormState, form: FormData): Promise<FormState> {
  const values = { email: text(form, "email") };
  const next = text(form, "next");
  try {
    await auth.api.signInEmail({
      body: { email: values.email, password: String(form.get("password") ?? "") },
      headers: await headers(),
    });
  } catch (err) {
    return { error: explain(err), values };
  }
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/painel");
}

export async function signOutAction() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/entrar");
}

export async function createOrganizationAction(_prev: FormState, form: FormData): Promise<FormState> {
  const values = { organization: text(form, "organization") };
  if (values.organization.length < 2) return { error: "Informe o nome da organização.", values };
  try {
    await auth.api.createOrganization({
      body: { name: values.organization, slug: await availableOrgSlug(values.organization) },
      headers: await headers(),
    });
  } catch (err) {
    return { error: explain(err), values };
  }
  redirect("/painel");
}

export async function acceptInvitationAction(_prev: FormState, form: FormData): Promise<FormState> {
  const invitationId = text(form, "invitationId");
  if (!(await getSession())) redirect(`/entrar?next=/convite/${encodeURIComponent(invitationId)}`);
  try {
    const result = await auth.api.acceptInvitation({ body: { invitationId }, headers: await headers() });
    if (result?.member?.organizationId) {
      await auth.api.setActiveOrganization({
        body: { organizationId: result.member.organizationId },
        headers: await headers(),
      });
    }
  } catch (err) {
    return { error: explain(err) };
  }
  redirect("/painel");
}
