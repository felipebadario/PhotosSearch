import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/session";
import { SignInForm } from "@/components/auth/SignInForm";

export const metadata: Metadata = { title: "Entrar" };

export default async function EntrarPage({ searchParams }: PageProps<"/entrar">) {
  const { next } = await searchParams;
  const target = typeof next === "string" ? next : undefined;
  if (await getSession()) redirect(target?.startsWith("/") ? target : "/painel");
  return (
    <>
      <h1 className="text-2xl font-semibold text-nf-text">Entrar no NossaFoto</h1>
      <p className="mb-8 mt-1.5 text-[15px] text-nf-muted">Acesse o painel da sua organização.</p>
      <SignInForm next={target} />
    </>
  );
}
