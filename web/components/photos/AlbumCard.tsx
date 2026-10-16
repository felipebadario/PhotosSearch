import Link from "next/link";
import { ImageIcon } from "lucide-react";
import type { Album } from "@/lib/types";
import { StatusBadge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatShortDate, plural } from "@/lib/format";
import { cn } from "@/lib/cn";

export function AlbumCard({ album, compact = false }: { album: Album; compact?: boolean }) {
  const showBadge = album.status !== "ready";
  return (
    <Link
      href={`/acervo/albuns/${album.id}`}
      className="group block rounded-nf-lg focus-visible:outline-offset-4"
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-nf-lg bg-nf-sunken",
          compact ? "aspect-[4/3]" : "aspect-[4/3]",
        )}
      >
        {album.coverPhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={album.coverPhotoUrl}
            alt=""
            loading="lazy"
            className="h-full w-full animate-nf-fade-in object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-nf-subtle">
            <ImageIcon size={28} strokeWidth={1.5} aria-hidden />
          </div>
        )}
        {showBadge && (
          <StatusBadge
            status={album.status}
            className="absolute left-2.5 top-2.5 bg-nf-surface/95 backdrop-blur"
          />
        )}
      </div>
      <div className="px-0.5 pt-2.5">
        <h3 className="truncate text-[15px] font-medium text-nf-text">{album.name}</h3>
        {album.status === "processing" && album.processingProgress !== null ? (
          <div className="mt-1.5">
            <ProgressBar
              value={album.processingProgress}
              tone="accent"
              label={`Preparando ${album.name}`}
            />
            <p className="mt-1 text-xs text-nf-muted">
              Preparando as fotos · {album.processingProgress}%
            </p>
          </div>
        ) : (
          <p className="mt-0.5 truncate text-[13px] text-nf-muted">
            {album.photoCount > 0 ? plural(album.photoCount, "foto", "fotos") : "Sem fotos ainda"}
            {!compact && album.eventDate && ` · ${formatShortDate(album.eventDate)}`}
          </p>
        )}
      </div>
    </Link>
  );
}
