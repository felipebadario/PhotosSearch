import Link from "next/link";
import { GalleryVertical, Plus } from "lucide-react";
import { listAlbums } from "@/lib/api/albums";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatDate, formatNumber } from "@/lib/format";

export default async function AlbumsPage() {
  const albums = await listAlbums();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-df-ink">Álbuns</h1>
          <p className="mt-1 text-sm text-df-muted">
            Todos os álbuns da sua igreja, publicados ou em preparação.
          </p>
        </div>
        <Button href="/albums/new" icon={<Plus size={17} />}>
          Criar álbum
        </Button>
      </div>

      {albums.length === 0 ? (
        <EmptyState
          icon={<GalleryVertical size={22} />}
          title="Nenhum álbum ainda"
          description="Crie o primeiro álbum para começar a publicar fotos do seu evento."
          action={<Button href="/albums/new">Criar álbum</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {albums.map((album) => (
            <Link key={album.id} href={`/albums/${album.id}`}>
              <Card className="h-full overflow-hidden p-0 transition-shadow hover:shadow-df-soft">
                <div
                  className="flex h-36 items-end bg-df-mint-soft bg-cover bg-center p-4"
                  style={
                    album.coverPhotoUrl
                      ? { backgroundImage: `url(${album.coverPhotoUrl})` }
                      : undefined
                  }
                >
                  <StatusBadge status={album.status} />
                </div>
                <div className="p-5">
                  <h3 className="font-display font-bold text-df-ink">{album.name}</h3>
                  <p className="mt-0.5 text-xs text-df-muted">{formatDate(album.eventDate)}</p>

                  {album.status === "processing" && album.processingProgress !== null ? (
                    <div className="mt-3">
                      <ProgressBar value={album.processingProgress} />
                      <p className="mt-1.5 text-xs text-df-muted">
                        Analisando as fotos... {album.processingProgress}%
                      </p>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-df-muted">
                      {formatNumber(album.photoCount)} fotos
                      {album.status === "published" &&
                        ` · ${formatNumber(album.searchCount)} buscas`}
                    </p>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
