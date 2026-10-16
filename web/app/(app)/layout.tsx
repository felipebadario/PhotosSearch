import { AppShell } from "@/components/layout/AppShell";

// Tudo no Admin depende da sessão e do banco: nada é pré-gerado no build.
export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: LayoutProps<"/">) {
  return <AppShell>{children}</AppShell>;
}
