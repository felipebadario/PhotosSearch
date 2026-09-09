import Link from "next/link";
import { Camera, GalleryVertical, HardDrive, Plus, Search } from "lucide-react";
import { getDashboardStats, getRecentAlbums } from "@/lib/api/dashboard";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatBytes, formatNumber } from "@/lib/format";

export default async function DashboardPage() {
  const [stats, recentAlbums] = await Promise.all([
    getDashboardStats(),
    getRecentAlbums(5),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-df-ink">Dashboard</h1>
          <p className="mt-1 text-sm text-df-muted">
            Um resumo dos álbuns e da atividade da sua igreja.
          </p>
        </div>
        <Button href="/albums/new" icon={<Plus size={17} />}>
          Criar álbum
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Fotos este mês"
          value={formatNumber(stats.photosThisMonth)}
          icon={<Camera size={17} />}
        />
        <StatCard
          label="Álbuns ativos"
          value={formatNumber(stats.activeAlbums)}
          icon={<GalleryVertical size={17} />}
        />
        <StatCard
          label="Buscas realizadas"
          value={formatNumber(stats.searchesPerformed)}
          icon={<Search size={17} />}
        />
        <StatCard
          label="Armazenamento"
          value={formatBytes(stats.storageUsedBytes)}
          icon={<HardDrive size={17} />}
          hint={`de ${formatBytes(stats.storageLimitBytes)}`}
        />
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-df-ink">Álbuns recentes</h2>
          <Link href="/albums" className="text-sm font-semibold text-df-primary hover:underline">
            Ver todos
          </Link>
        </div>

        {recentAlbums.length === 0 ? (
          <EmptyState
            icon={<GalleryVertical size={22} />}
            title="Nenhum álbum ainda"
            description="Crie o primeiro álbum para começar a publicar fotos do seu evento."
            action={<Button href="/albums/new">Criar álbum</Button>}
          />
        ) : (
          <Card className="divide-y divide-df-line overflow-hidden p-0">
            {recentAlbums.map((album) => (
              <Link
                key={album.id}
                href={`/albums/${album.id}`}
                className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-df-cream"
              >
                <div
                  className="h-12 w-12 shrink-0 rounded-xl bg-df-mint-soft bg-cover bg-center"
                  style={
                    album.coverPhotoUrl
                      ? { backgroundImage: `url(${album.coverPhotoUrl})` }
                      : undefined
                  }
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-df-ink">{album.name}</p>
                  <p className="truncate text-xs text-df-muted">
                    {formatNumber(album.photoCount)} fotos ·{" "}
                    {new Date(album.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <StatusBadge status={album.status} />
              </Link>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
