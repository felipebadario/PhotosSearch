import { PageHeader } from "@/components/ui/PageHeader";
import { SectionTabs } from "@/components/ui/SectionTabs";

export default function SearchLayout({ children }: LayoutProps<"/buscar">) {
  return (
    <div className="space-y-6">
      <PageHeader title="Buscar" description="Encontre a foto que você procura, mesmo entre milhares." />
      <SectionTabs
        label="Tipos de busca"
        tabs={[
          { href: "/buscar/rosto", label: "Por rosto" },
          { href: "/buscar/descricao", label: "Por descrição" },
          { href: "/buscar/filtros", label: "Filtros" },
        ]}
      />
      {children}
    </div>
  );
}
