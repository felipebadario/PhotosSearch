import { AppShell } from "@/components/layout/AppShell";

// Os dados desta fase vivem em memória no servidor (lib/mock-data.ts), então
// cada página é renderizada por requisição em vez de pré-gerada no build.
export const dynamic = "force-dynamic";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return <AppShell>{children}</AppShell>;
}
