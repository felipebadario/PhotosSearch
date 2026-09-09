import { notFound } from "next/navigation";
import { ImageIcon } from "lucide-react";
import { getAlbum, listAlbumPhotos } from "@/lib/api/albums";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export default async function AlbumPhotosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const album = await getAlbum(id);
  if (!album) notFound();
  const photos = await listAlbumPhotos(id);

  if (photos.length === 0) {
    return (
      <EmptyState
        icon={<ImageIcon size={22} />}
        title="Nenhuma foto neste álbum ainda"
        description="Envie as fotos do evento para começar o processamento."
        action={<Button href="/albums/new">Adicionar fotos</Button>}
      />
    );
  }

  return (
    <div>
      <p className="mb-4 text-sm text-df-muted">
        {photos.length} de {album.photoCount} fotos exibidas.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {photos.map((photo) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={photo.id}
            src={photo.thumbnailUrl}
            alt=""
            className="aspect-[4/3] w-full rounded-xl bg-df-mint-soft object-cover"
            loading="lazy"
          />
        ))}
      </div>
    </div>
  );
}
