import type { Metadata } from "next";
import { FolderPlus } from "lucide-react";
import { listAlbums } from "@/lib/api/albums";
import { AlbumCard } from "@/components/photos/AlbumCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Álbuns" };

export default async function AlbumsPage() {
  const albums = await listAlbums();

  if (albums.length === 0) {
    return (
      <EmptyState
        icon={<FolderPlus size={22} aria-hidden />}
        title="Nenhum álbum ainda"
        description="Crie um álbum ao importar fotos para manter cada momento no seu lugar."
        action={<Button href="/acervo/importar">Criar álbum</Button>}
      />
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
      {albums.map((album) => (
        <li key={album.id}>
          <AlbumCard album={album} />
        </li>
      ))}
    </ul>
  );
}
