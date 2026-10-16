import type { ReactNode } from "react";
import { getCurrentUser, getSubscription } from "@/lib/api/account";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { MobileTopbar } from "./MobileTopbar";

export async function AppShell({ children }: { children: ReactNode }) {
  const [user, { plan }] = await Promise.all([getCurrentUser(), getSubscription()]);

  return (
    <div className="flex min-h-screen">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-nf focus:bg-nf-surface focus:px-4 focus:py-2 focus:shadow-nf-float"
      >
        Pular para o conteúdo
      </a>
      <Sidebar userName={user.name} planName={plan.name} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopbar userName={user.name} />
        <main id="conteudo" className="flex-1 px-4 pb-28 pt-6 sm:px-6 md:px-10 md:pb-12 md:pt-10">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
