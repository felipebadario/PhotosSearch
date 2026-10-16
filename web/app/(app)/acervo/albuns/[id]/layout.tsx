import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ScanFace } from "lucide-react";
import { getAlbum } from "@/lib/api/albums";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SectionTabs } from "@/components/ui/SectionTabs";
import { formatShortDate, plural } from "@/lib/format";

export default async function AlbumLayout({ children, params }: LayoutProps<"/acervo/albuns/[id]">) {
  const { id } = await params;
  const album = await getAlbum(id);
  if (!album) notFound();

  const base = `/acervo/albuns/${album.id}`;
  const meta = [
    album.photoCount > 0 ? plural(album.photoCount, "foto", "fotos") : "Sem fotos",
    album.eventDate ? formatShortDate(album.eventDate) : null,
    album.isPublic ? plural(album.searchCount, "busca", "buscas") : null,
  ].filter(Boolean);

  return (
    <div className="space-y-5 border-t border-nf-line pt-5">
      <Link
        href="/acervo/albuns"
        className="inline-flex items-center gap-1 text-sm text-nf-muted hover:text-nf-text"
      >
        <ChevronLeft size={16} aria-hidden /> Álbuns
      </Link>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-xl font-semibold text-nf-text sm:text-2xl">{album.name}</h2>
            {album.status !== "ready" && <StatusBadge status={album.status} />}
          </div>
          <p className="mt-1 text-sm text-nf-muted">{meta.join(" · ")}</p>
          {album.description && <p className="mt-2 max-w-xl text-[15px] text-nf-text">{album.description}</p>}
        </div>
        {album.photoCount > 0 && album.status !== "processing" && (
          <Button href={`/buscar/rosto?album=${album.id}`} variant="accent" icon={<ScanFace size={17} aria-hidden />}>
            Buscar neste álbum
          </Button>
        )}
      </div>

      {album.status === "processing" && album.processingProgress !== null && (
        <div className="rounded-nf-lg border border-nf-accent/20 bg-nf-accent-soft px-4 py-3">
          <p className="text-sm font-medium text-nf-accent-ink">
            Preparando as fotos para a busca · {album.processingProgress}%
          </p>
          <ProgressBar value={album.processingProgress} tone="accent" className="mt-2 bg-nf-surface" label="Preparação do álbum" />
        </div>
      )}
      {album.status === "error" && (
        <div className="rounded-nf-lg border border-nf-danger/20 bg-nf-danger-soft px-4 py-3 text-sm text-nf-danger">
          Alguns arquivos da última importação não puderam ser lidos. Veja os detalhes em Importações.
        </div>
      )}

      <SectionTabs
        label="Seções do álbum"
        tabs={[
          { href: base, label: "Fotos" },
          { href: `${base}/compartilhar`, label: "Compartilhar" },
          { href: `${base}/ajustes`, label: "Ajustes" },
        ]}
      />
      {children}
    </div>
  );
}
