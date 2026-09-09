import { notFound } from "next/navigation";
import { Camera, Calendar, Link2, ScanFace, Search } from "lucide-react";
import { getAlbum } from "@/lib/api/albums";
import { Card, CardBody } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatDate, formatNumber } from "@/lib/format";

export default async function AlbumOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const album = await getAlbum(id);
  if (!album) notFound();

  const publicUrl = album.isPublic
    ? `descomplicafotos.com/comunidade-vida-nova/${album.slug}`
    : null;

  const stats = [
    { label: "Fotos", value: formatNumber(album.photoCount), icon: Camera },
    { label: "Rostos identificados", value: formatNumber(album.faceCount), icon: ScanFace },
    { label: "Buscas realizadas", value: formatNumber(album.searchCount), icon: Search },
    { label: "Criado em", value: formatDate(album.createdAt), icon: Calendar },
  ];

  return (
    <div className="space-y-6">
      {album.status === "processing" && album.processingProgress !== null && (
        <Card className="border-df-accent/30 bg-df-accent-soft">
          <CardBody className="pt-5">
            <p className="text-sm font-semibold text-df-accent-dark">
              Analisando as fotos... {album.processingProgress}%
            </p>
            <ProgressBar value={album.processingProgress} className="mt-3" />
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-5">
            <stat.icon size={17} className="mb-3 text-df-primary" />
            <p className="font-display text-xl font-bold text-df-ink">{stat.value}</p>
            <p className="text-xs text-df-muted">{stat.label}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardBody className="pt-6">
          <h3 className="mb-3 flex items-center gap-2 font-display font-bold text-df-ink">
            <Link2 size={16} /> URL pública
          </h3>
          {publicUrl ? (
            <a
              href="#"
              className="break-all text-sm font-medium text-df-primary hover:underline"
            >
              {publicUrl}
            </a>
          ) : (
            <p className="text-sm text-df-muted">
              Disponível assim que o álbum for publicado. Veja a aba Compartilhamento.
            </p>
          )}
        </CardBody>
      </Card>

      {album.description && (
        <Card>
          <CardBody className="pt-6">
            <h3 className="mb-2 font-display font-bold text-df-ink">Descrição</h3>
            <p className="text-sm text-df-muted">{album.description}</p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
