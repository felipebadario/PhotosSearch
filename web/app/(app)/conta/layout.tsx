import { PageHeader } from "@/components/ui/PageHeader";
import { SectionTabs } from "@/components/ui/SectionTabs";

export default function AccountLayout({ children }: LayoutProps<"/conta">) {
  return (
    <div className="space-y-6">
      <PageHeader title="Minha Conta" />
      <SectionTabs
        label="Seções da conta"
        tabs={[
          { href: "/conta", label: "Perfil" },
          { href: "/conta/assinatura", label: "Assinatura" },
          { href: "/conta/consumo", label: "Consumo" },
          { href: "/conta/privacidade", label: "Privacidade" },
        ]}
      />
      <div className="max-w-2xl">{children}</div>
    </div>
  );
}
