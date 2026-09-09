import { HardDrive } from "lucide-react";
import { getDashboardStats } from "@/lib/api/dashboard";
import { listAlbums } from "@/lib/api/albums";
import { Card, CardBody } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatBytes, formatNumber } from "@/lib/format";

export default async function StoragePage() {
  const [stats, albums] = await Promise.all([getDashboardStats(), listAlbums()]);
  const usedPct = Math.round((stats.storageUsedBytes / stats.storageLimitBytes) * 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-df-ink">Armazenamento</h1>
        <p className="mt-1 text-sm text-df-muted">
          Quanto espaço as fotos dos seus álbuns estão usando no seu plano.
        </p>
      </div>

      <Card>
        <CardBody className="pt-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-df-mint-soft text-df-primary">
              <HardDrive size={18} />
            </span>
            <div>
              <p className="font-display text-xl font-bold text-df-ink">
                {formatBytes(stats.storageUsedBytes)}{" "}
                <span className="text-sm font-medium text-df-muted">
                  de {formatBytes(stats.storageLimitBytes)}
                </span>
              </p>
              <p className="text-xs text-df-muted">{usedPct}% do seu plano usado</p>
            </div>
          </div>
          <ProgressBar value={usedPct} className="mt-4" />
        </CardBody>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-df-line px-6 py-4">
          <h3 className="font-display font-bold text-df-ink">Uso por álbum</h3>
        </div>
        <div className="divide-y divide-df-line">
          {albums.map((album) => (
            <div key={album.id} className="flex items-center justify-between px-6 py-3.5">
              <span className="text-sm font-medium text-df-ink">{album.name}</span>
              <span className="text-sm text-df-muted">
                {formatNumber(album.photoCount)} fotos
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
