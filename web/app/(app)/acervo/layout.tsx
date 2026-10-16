import { UploadCloud } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionTabs } from "@/components/ui/SectionTabs";
import { Button } from "@/components/ui/Button";

export default function LibraryLayout({ children }: LayoutProps<"/acervo">) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Meu Acervo"
        actions={
          <Button href="/acervo/importar" icon={<UploadCloud size={17} aria-hidden />}>
            Importar fotos
          </Button>
        }
      />
      <SectionTabs
        label="Seções do acervo"
        tabs={[
          { href: "/acervo", label: "Todas as fotos" },
          { href: "/acervo/albuns", label: "Álbuns", matchPrefix: true },
          { href: "/acervo/importacoes", label: "Importações" },
        ]}
      />
      {children}
    </div>
  );
}
