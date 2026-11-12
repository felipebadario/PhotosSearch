import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/session";
import { SignUpForm } from "@/components/auth/SignUpForm";

export const metadata: Metadata = { title: "Criar conta" };

export default async function CriarContaPage({ searchParams }: PageProps<"/criar-conta">) {
  const { convite } = await searchParams;
  const invitationId = typeof convite === "string" ? convite : undefined;
  if (await getSession()) redirect(invitationId ? `/convite/${invitationId}` : "/painel");
  return (
    <>
      <h1 className="text-2xl font-semibold text-nf-text">
        {invitationId ? "Crie sua conta para aceitar o convite" : "Crie a conta da sua organização"}
      </h1>
      <p className="mb-8 mt-1.5 text-[15px] text-nf-muted">
        {invitationId
          ? "Depois de criar a conta, você confirma a entrada na organização."
          : "Organize seus acervos e deixe cada pessoa encontrar as próprias fotos com uma selfie."}
      </p>
      <SignUpForm invitationId={invitationId} />
    </>
  );
}
