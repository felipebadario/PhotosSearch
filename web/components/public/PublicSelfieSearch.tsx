"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, RotateCcw } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { PhotoGrid } from "@/components/photos/PhotoGrid";
import { SearchingIndicator } from "@/components/search/SearchingIndicator";
import { LogoMark } from "@/components/brand/Logo";
import { searchPublicAlbumAction } from "@/lib/actions/search";
import type { PublicAlbum, SearchResultPhoto } from "@/lib/types";
import { plural } from "@/lib/format";

type Phase = "idle" | "searching" | "results";

/** Página pública de um álbum compartilhado: selfie, procura, galeria. */
export function PublicSelfieSearch({ album }: { album: PublicAlbum }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResultPhoto[]>([]);
  const selfieRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function handleSelfie(file: File | undefined) {
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setPhase("searching");
    // Nesta prévia a selfie não sai do navegador; veja lib/actions/search.ts.
    const found = await searchPublicAlbumAction(album.accountHandle, album.albumSlug);
    setResults(found);
    setPhase("results");
  }

  function reset() {
    setPreview(null);
    setResults([]);
    setPhase("idle");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-5 pb-10 pt-8">
      <header className="flex flex-col items-center text-center">
        <Avatar name={album.accountName} imageUrl={album.accountAvatarUrl} size={44} />
        <p className="mt-3 text-sm text-nf-muted">Álbum de {album.accountName}</p>
        <h1 className="mt-1 text-2xl font-semibold text-nf-text sm:text-3xl">{album.albumName}</h1>
      </header>

      <main className="flex flex-1 flex-col">
        {phase === "idle" && (
          <div className="mx-auto flex w-full max-w-sm flex-1 animate-nf-rise flex-col items-center justify-center py-10 text-center">
            {album.coverPhotoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={album.coverPhotoUrl}
                alt=""
                className="mb-8 aspect-[4/3] w-full rounded-nf-xl object-cover"
              />
            )}
            <h2 className="text-xl font-semibold text-nf-text">Encontre suas fotos</h2>
            <p className="mt-2 text-[15px] text-nf-muted">
              Tire uma selfie e encontraremos as fotos em que você aparece.
            </p>
            <button
              type="button"
              onClick={() => selfieRef.current?.click()}
              className="mt-7 flex h-14 w-full items-center justify-center gap-2 rounded-nf-lg bg-nf-ink text-base font-medium text-white transition-[background-color,transform] hover:bg-nf-ink-hover active:scale-[0.98]"
            >
              <Camera size={20} aria-hidden /> Encontrar minhas fotos
            </button>
            <button
              type="button"
              onClick={() => uploadRef.current?.click()}
              className="mt-2 flex h-11 items-center gap-2 rounded-nf px-4 text-sm text-nf-muted hover:text-nf-text"
            >
              <ImagePlus size={16} aria-hidden /> Usar uma foto da galeria
            </button>
            <input
              ref={selfieRef}
              type="file"
              accept="image/*"
              capture="user"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(e) => handleSelfie(e.target.files?.[0])}
            />
            <input
              ref={uploadRef}
              type="file"
              accept="image/*"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(e) => handleSelfie(e.target.files?.[0])}
            />
            <p className="mt-5 text-xs text-nf-muted">Sua selfie é usada só para a busca e não fica salva.</p>
          </div>
        )}

        {phase === "searching" && (
          <div className="flex flex-1 items-center justify-center">
            <SearchingIndicator>
              {preview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="" className="h-full w-full object-cover" />
              )}
            </SearchingIndicator>
          </div>
        )}

        {phase === "results" && (
          <div className="mt-8 animate-nf-rise space-y-4">
            <div className="text-center">
              <p className="text-lg font-semibold text-nf-text" aria-live="polite">
                {results.length > 0
                  ? `Encontramos ${plural(results.length, "foto sua", "fotos suas")}`
                  : "Não encontramos fotos suas"}
              </p>
              <Badge tone="accent" className="mt-2">
                Prévia: resultados de exemplo
              </Badge>
            </div>
            {results.length > 0 ? (
              <PhotoGrid photos={results} />
            ) : (
              <p className="text-center text-sm text-nf-muted">
                Tente de novo com o rosto bem iluminado, olhando para a câmera.
              </p>
            )}
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={reset}
                className="flex h-11 items-center gap-2 rounded-nf border border-nf-line bg-nf-surface px-5 text-sm font-medium text-nf-text hover:border-nf-line-strong"
              >
                <RotateCcw size={16} aria-hidden /> Fazer nova busca
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-10 flex items-center justify-center gap-2 text-xs text-nf-subtle">
        <LogoMark size={16} /> Feito com NossaFoto
      </footer>
    </div>
  );
}
