import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { ManagerSignInForm } from "@/components/manager/ManagerSignInForm";
import { managerHref } from "@/lib/server/manager";
import { getSession } from "@/lib/server/session";

export const metadata: Metadata = { title: "Entrar" };

export default async function ManagerEntrarPage() {
  const home = await managerHref("/");
  if (await getSession()) redirect(home);
  return (
    <div className="flex min-h-screen items-start justify-center px-4 pt-16 sm:pt-24">
      <div className="w-full max-w-[380px]">
        <div className="flex items-center gap-2">
          <Logo size={28} />
          <span className="rounded-full bg-nf-ink px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white">Manager</span>
        </div>
        <h1 className="mt-8 text-2xl font-semibold text-nf-text">Área da equipe</h1>
        <p className="mb-8 mt-1.5 text-[15px] text-nf-muted">Entre com a conta NossaFoto liberada para a equipe.</p>
        <ManagerSignInForm next={home} />
      </div>
    </div>
  );
}
