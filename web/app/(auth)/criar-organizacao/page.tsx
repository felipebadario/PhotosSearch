import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/session";
import { CreateOrganizationForm } from "@/components/auth/CreateOrganizationForm";

export const metadata: Metadata = { title: "Criar organização" };

export default async function CriarOrganizacaoPage() {
  if (!(await getSession())) redirect("/entrar");
  return (
    <>
      <h1 className="text-2xl font-semibold text-nf-text">Crie sua organização</h1>
      <p className="mb-8 mt-1.5 text-[15px] text-nf-muted">
        Sua conta ainda não participa de nenhuma organização. Crie uma ou peça um convite a quem já usa o NossaFoto.
      </p>
      <CreateOrganizationForm />
    </>
  );
}
