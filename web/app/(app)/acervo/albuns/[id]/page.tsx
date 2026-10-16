import { notFound } from "next/navigation";
import { ImageIcon, UploadCloud } from "lucide-react";
import { getAlbum, listAlbumPhotos } from "@/lib/api/albums";
import { PhotoGrid } from "@/components/photos/PhotoGrid";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { formatNumber } from "@/lib/format";

export default async function AlbumPhotosPage({ params }: PageProps<"/acervo/albuns/[id]">) {
  const { id } = await params;
  const album = await getAlbum(id);
  if (!album) notFound();
  const photos = await listAlbumPhotos(id);

  if (album.photoCount === 0) {
    return (
      <EmptyState
        icon={<ImageIcon size={22} aria-hidden />}
        title="Este álbum ainda está vazio"
        description="Importe fotos para este álbum para poder buscar nelas."
        action={
          <Button href={`/acervo/importar?album=${album.id}`} icon={<UploadCloud size={16} aria-hidden />}>
            Adicionar fotos
          </Button>
        }
      />
    );
  }

  if (photos.length === 0) {
    return (
      <EmptyState
        icon={<ImageIcon size={22} aria-hidden />}
        title={`${formatNumber(album.photoCount)} fotos recebidas`}
        description="Nesta prévia as imagens enviadas não ficam armazenadas, por isso não aparecem aqui. Com o armazenamento definitivo, elas vão aparecer nesta grade."
        action={
          <Button href={`/acervo/importar?album=${album.id}`} variant="secondary">
            Adicionar mais fotos
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {photos.length < album.photoCount && (
        <p className="text-sm text-nf-muted">
          Mostrando {formatNumber(photos.length)} de {formatNumber(album.photoCount)} fotos.
        </p>
      )}
      <PhotoGrid photos={photos} />
    </div>
  );
}
