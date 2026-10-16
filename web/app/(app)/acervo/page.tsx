import type { Metadata } from "next";
import { getLibrarySummary, listLibraryPhotos } from "@/lib/api/library";
import { PhotoGrid } from "@/components/photos/PhotoGrid";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { plural } from "@/lib/format";

export const metadata: Metadata = { title: "Meu Acervo" };

export default async function AllPhotosPage() {
  const [summary, photos] = await Promise.all([getLibrarySummary(), listLibraryPhotos()]);

  if (summary.photoCount === 0) {
    return (
      <EmptyState
        title="Nenhuma foto ainda"
        description="Importe fotos do computador ou do celular para montar seu acervo."
        action={<Button href="/acervo/importar">Importar fotos</Button>}
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-nf-muted">
        {plural(summary.photoCount, "foto", "fotos")} no acervo. Mostrando as mais recentes.
      </p>
      <PhotoGrid photos={photos} dense />
    </div>
  );
}
