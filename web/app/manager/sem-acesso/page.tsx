import type { Metadata } from "next";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { ManagerSignOut } from "@/components/manager/ManagerSignOut";
import { managerHref } from "@/lib/server/manager";
import { getSession } from "@/lib/server/session";

export const metadata: Metadata = { title: "Sem acesso" };

export default async function SemAcessoPage() {
  const session = await getSession();
  return (
    <div className="flex min-h-screen items-start justify-center px-4 pt-16 sm:pt-24">
      <div className="w-full max-w-[420px]">
        <Logo size={28} />
        <h1 className="mt-8 text-2xl font-semibold text-nf-text">Esta área é só da equipe NossaFoto</h1>
        <p className="mt-1.5 text-[15px] text-nf-muted">
          {session ? `A conta ${session.user.email} não tem acesso ao Manager.` : "Entre com uma conta da equipe."} Se você usa o NossaFoto na sua
          organização, o painel fica em nossafoto.app.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button href="https://nossafoto.app/painel">Ir para o painel</Button>
          {session && (
            <ManagerSignOut
              to={await managerHref("/entrar")}
              className="inline-flex h-11 items-center rounded-nf border border-nf-line bg-nf-surface px-4.5 text-sm font-medium text-nf-text hover:bg-nf-sunken/60"
            >
              Sair e trocar de conta
            </ManagerSignOut>
          )}
        </div>
      </div>
    </div>
  );
}
