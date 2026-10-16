"use client";

import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Download, Share2, X } from "lucide-react";
import type { GalleryPhoto } from "@/lib/types";
import { sourceLabel } from "@/lib/labels";
import { formatShortDate } from "@/lib/format";

export function PhotoLightbox({
  photo,
  position,
  total,
  allowDownload = true,
  onClose,
  onPrev,
  onNext,
}: {
  photo: GalleryPhoto;
  position: number;
  total: number;
  allowDownload?: boolean;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev?.();
      if (e.key === "ArrowRight") onNext?.();
    };
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [onClose, onPrev, onNext]);

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ url: photo.url });
      } catch {
        // o usuário cancelou o compartilhamento nativo
      }
    } else {
      await navigator.clipboard.writeText(photo.url).catch(() => {});
    }
  }

  const details = [
    photo.albumName ?? "Fora de álbuns",
    sourceLabel(photo.source),
    formatShortDate(photo.takenAt),
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Foto ${position} de ${total}`}
      className="fixed inset-0 z-50 flex animate-nf-fade-in flex-col bg-[#0c0c0e]/95"
      onClick={onClose}
    >
      <div className="flex items-center justify-between px-4 py-3 text-white/80">
        <span className="text-sm tabular-nums">
          {position} de {total}
        </span>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="flex h-11 w-11 items-center justify-center rounded-full text-white hover:bg-white/10"
        >
          <X size={22} />
        </button>
      </div>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-16"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={photo.id}
          src={photo.url}
          alt={`Foto do álbum ${photo.albumName ?? "acervo"}`}
          className="max-h-full max-w-full animate-nf-fade-in rounded-nf object-contain"
        />
        {onPrev && (
          <button
            type="button"
            onClick={onPrev}
            aria-label="Foto anterior"
            className="absolute left-2 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:flex"
          >
            <ChevronLeft size={22} />
          </button>
        )}
        {onNext && (
          <button
            type="button"
            onClick={onNext}
            aria-label="Próxima foto"
            className="absolute right-2 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:flex"
          >
            <ChevronRight size={22} />
          </button>
        )}
      </div>

      <div
        className="flex flex-col items-center gap-4 px-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-4"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-center text-xs text-white/60">{details.join(" · ")}</p>
        <div className="flex gap-2">
          {onPrev && (
            <button
              type="button"
              onClick={onPrev}
              aria-label="Foto anterior"
              className="flex h-11 w-11 items-center justify-center rounded-nf bg-white/10 text-white sm:hidden"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          {allowDownload && (
            <a
              href={photo.url}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-11 items-center gap-2 rounded-nf bg-white px-5 text-sm font-medium text-nf-text"
            >
              <Download size={17} aria-hidden /> Baixar
            </a>
          )}
          <button
            type="button"
            onClick={handleShare}
            className="flex h-11 items-center gap-2 rounded-nf bg-white/10 px-5 text-sm font-medium text-white hover:bg-white/15"
          >
            <Share2 size={17} aria-hidden /> Compartilhar
          </button>
          {onNext && (
            <button
              type="button"
              onClick={onNext}
              aria-label="Próxima foto"
              className="flex h-11 w-11 items-center justify-center rounded-nf bg-white/10 text-white sm:hidden"
            >
              <ChevronRight size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
