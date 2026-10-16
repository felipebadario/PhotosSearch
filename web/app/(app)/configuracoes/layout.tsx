import { PageHeader } from "@/components/ui/PageHeader";
import { SectionTabs } from "@/components/ui/SectionTabs";

export default function ConfiguracoesLayout({ children }: LayoutProps<"/configuracoes">) {
  return (
    <div className="space-y-8">
      <PageHeader title="Configurações" />
      <SectionTabs
        label="Seções de configurações"
        tabs={[
          { href: "/configuracoes", label: "Organização" },
          { href: "/configuracoes/membros", label: "Membros" },
        ]}
      />
      {children}
    </div>
  );
}
