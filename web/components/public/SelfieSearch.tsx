"use client";

import { useRef, useState } from "react";
import { Camera, RotateCcw, ScanFace } from "lucide-react";
import { OrgMark } from "@/components/ui/OrgMark";
import { searchAlbumBySelfie } from "@/lib/api/public";
import type { PublicAlbum, SearchResultPhoto } from "@/lib/types";
import { PhotoLightbox } from "./PhotoLightbox";

type Phase = "idle" | "searching" | "results";

export function SelfieSearch({ album }: { album: PublicAlbum }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [results, setResults] = useState<SearchResultPhoto[]>([]);
  const [lightboxPhoto, setLightboxPhoto] = useState<SearchResultPhoto | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSelfie(file: File | undefined) {
    if (!file) return;
    setPhase("searching");
    // A selfie nunca sai do navegador neste mock (não há upload real). Em
    // produção, os bytes vão para o Face Search Service, o embedding é
    // calculado, comparado, e a selfie é descartada — nunca persistida.
    const found = await searchAlbumBySelfie(album.organizationSlug, album.albumSlug);
    setResults(found);
    setPhase("results");
  }

  function reset() {
    setPhase("idle");
    setResults([]);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-10">
      <header className="mb-10 flex flex-col items-center text-center">
        <OrgMark name={album.organizationName} logoUrl={album.organizationLogoUrl} size={52} />
        <p className="mt-3 text-sm font-medium text-df-muted">{album.organizationName}</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-df-ink">{album.albumName}</h1>
      </header>

      {phase === "idle" && (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-df-mint-soft text-df-primary">
            <ScanFace size={34} />
          </span>
          <h2 className="mt-6 font-display text-xl font-bold text-df-ink">
            Encontre suas fotos
          </h2>
          <p className="mt-2 max-w-xs text-sm text-df-muted">
            Tire uma selfie e encontraremos as fotos em que você aparece.
          </p>
          <button
            onClick={() => inputRef.current?.click()}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-df-primary px-6 py-4 font-semibold text-df-white shadow-df-soft transition-transform active:scale-[0.98]"
          >
            <Camera size={19} /> Encontrar minhas fotos
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={(e) => handleSelfie(e.target.files?.[0])}
          />
          <p className="mt-4 text-xs text-df-muted">
            Sua selfie é usada só para a busca e não fica salva.
          </p>
        </div>
      )}

      {phase === "searching" && (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <span className="h-14 w-14 animate-spin rounded-full border-4 border-df-mint border-t-df-primary" />
          <p className="mt-6 font-display text-lg font-bold text-df-ink">
            Procurando suas fotos...
          </p>
          <p className="mt-1 text-sm text-df-muted">Isso leva só alguns segundos.</p>
        </div>
      )}

      {phase === "results" && (
        <div className="flex-1">
          <p className="mb-5 text-center font-display text-lg font-bold text-df-ink">
            {results.length > 0
              ? `Encontramos ${results.length} fotos suas`
              : "Não encontramos fotos suas"}
          </p>
          {results.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {results.map((photo) => (
                <button key={photo.id} onClick={() => setLightboxPhoto(photo)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.thumbnailUrl}
                    alt=""
                    className="aspect-square w-full rounded-lg bg-df-mint-soft object-cover"
                  />
                </button>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-df-muted">
              Tente novamente com uma selfie de rosto bem iluminado, olhando para a câmera.
            </p>
          )}
          <button
            onClick={reset}
            className="mx-auto mt-8 flex items-center gap-2 text-sm font-semibold text-df-primary"
          >
            <RotateCcw size={15} /> Fazer nova busca
          </button>
        </div>
      )}

      {lightboxPhoto && (
        <PhotoLightbox photo={lightboxPhoto} onClose={() => setLightboxPhoto(null)} />
      )}
    </div>
  );
}
