import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isTeamEmail } from "./repos/leads.ts";
import { getSession } from "./session.ts";

/** "" em manager.nossafoto.app; "/manager" em localhost e nos previews, onde não há subdomínio. */
export async function managerBase() {
  return (await headers()).get("x-nf-manager-host") ? "" : "/manager";
}

export async function managerHref(path: string) {
  const base = await managerBase();
  return `${base}${path === "/" && base ? "" : path}` || "/";
}

/** Páginas do manager: sem login vai para o login do manager; quem não é da equipe não entra. */
export async function requireTeam() {
  const session = await getSession();
  if (!session) redirect(await managerHref("/entrar"));
  if (!isTeamEmail(session.user.email)) redirect(await managerHref("/sem-acesso"));
  return session.user;
}

/** Ações do manager: falha em vez de redirecionar. */
export async function requireTeamAction() {
  const session = await getSession();
  if (!session || !isTeamEmail(session.user.email)) throw new Error("Acesso restrito à equipe NossaFoto.");
  return session.user;
}
