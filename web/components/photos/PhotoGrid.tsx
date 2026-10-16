"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/cn";
import type { GalleryPhoto } from "@/lib/types";
import { PhotoLightbox } from "./PhotoLightbox";

/** Grade responsiva de fotos; tocar numa foto abre a visualização em tela cheia. */
export function PhotoGrid({
  photos,
  allowDownload = true,
  dense = false,
}: {
  photos: GalleryPhoto[];
  allowDownload?: boolean;
  dense?: boolean;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const close = useCallback(() => setOpenIndex(null), []);
  const prev = useCallback(
    () => setOpenIndex((i) => (i === null ? i : (i - 1 + photos.length) % photos.length)),
    [photos.length],
  );
  const next = useCallback(
    () => setOpenIndex((i) => (i === null ? i : (i + 1) % photos.length)),
    [photos.length],
  );

  return (
    <>
      <ul
        className={cn(
          "grid gap-1 sm:gap-1.5",
          dense
            ? "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6"
            : "grid-cols-3 sm:grid-cols-4 lg:grid-cols-5",
        )}
      >
        {photos.map((photo, i) => (
          <li key={photo.id}>
            <button
              type="button"
              onClick={() => setOpenIndex(i)}
              aria-label={`Abrir foto ${i + 1}${photo.albumName ? `, ${photo.albumName}` : ""}`}
              className="group relative block aspect-square w-full overflow-hidden rounded-nf-sm bg-nf-sunken"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.thumbnailUrl}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-full w-full animate-nf-fade-in object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
              />
            </button>
          </li>
        ))}
      </ul>
      {openIndex !== null && photos[openIndex] && (
        <PhotoLightbox
          photo={photos[openIndex]}
          position={openIndex + 1}
          total={photos.length}
          allowDownload={allowDownload}
          onClose={close}
          onPrev={photos.length > 1 ? prev : undefined}
          onNext={photos.length > 1 ? next : undefined}
        />
      )}
    </>
  );
}
