"use client";

import { useEffect } from "react";
import { Download, Share2, X } from "lucide-react";
import type { SearchResultPhoto } from "@/lib/types";

export function PhotoLightbox({
  photo,
  onClose,
}: {
  photo: SearchResultPhoto;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ url: photo.url });
      } catch {
        // usuário cancelou o share nativo — sem ação necessária
      }
    } else {
      await navigator.clipboard.writeText(photo.url).catch(() => {});
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="flex justify-end p-4">
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white"
        >
          <X size={20} />
        </button>
      </div>
      <div className="flex flex-1 items-center justify-center px-4" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.url}
          alt=""
          className="max-h-[70vh] max-w-full rounded-lg object-contain shadow-2xl"
        />
      </div>
      <div
        className="flex justify-center gap-3 p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        <a
          href={photo.url}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-df-ink"
        >
          <Download size={17} /> Baixar
        </a>
        <button
          onClick={handleShare}
          className="flex items-center gap-2 rounded-xl bg-white/15 px-5 py-3 text-sm font-semibold text-white"
        >
          <Share2 size={17} /> Compartilhar
        </button>
      </div>
    </div>
  );
}
