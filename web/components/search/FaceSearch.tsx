"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, RotateCcw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Input";
import { PhotoGrid } from "@/components/photos/PhotoGrid";
import { SearchingIndicator } from "./SearchingIndicator";
import { searchByFaceAction } from "@/lib/actions/search";
import type { SearchResultPhoto } from "@/lib/types";
import { plural } from "@/lib/format";

type Phase = "pick" | "searching" | "results";

export function FaceSearch({
  albums,
  initialAlbumId,
}: {
  albums: { id: string; name: string }[];
  initialAlbumId?: string;
}) {
  const [phase, setPhase] = useState<Phase>("pick");
  const [preview, setPreview] = useState<string | null>(null);
  const [scope, setScope] = useState<string>(initialAlbumId ?? "library");
  const [results, setResults] = useState<SearchResultPhoto[]>([]);
  const selfieRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  // A foto de referência fica só no navegador (URL local) e é liberada ao trocar.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function handleFile(file: File | undefined) {
    if (!file) return;
    setPreview(URL.createObjectURL(file));
  }

  async function handleSearch() {
    if (!preview) return;
    setPhase("searching");
    const found = await searchByFaceAction(
      scope === "library" ? { kind: "library" } : { kind: "album", albumId: scope },
    );
    setResults(found);
    setPhase("results");
  }

  function reset() {
    setPreview(null);
    setResults([]);
    setPhase("pick");
  }

  const scopeName =
    scope === "library" ? "todo o acervo" : (albums.find((a) => a.id === scope)?.name ?? "");

  if (phase === "searching") {
    return (
      <Card>
        <SearchingIndicator description={`Procurando em ${scopeName}.`}>
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-cover" />
          )}
        </SearchingIndicator>
      </Card>
    );
  }

  if (phase === "results") {
    return (
      <div className="animate-nf-rise space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {preview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt="Sua foto de referência"
                className="h-12 w-12 rounded-full object-cover ring-2 ring-nf-surface"
              />
            )}
            <div>
              <h2 className="text-lg font-semibold text-nf-text">
                {results.length > 0
                  ? `Encontramos ${plural(results.length, "foto", "fotos")}`
                  : "Não encontramos fotos"}
              </h2>
              <p className="text-sm text-nf-muted">Em {scopeName}</p>
            </div>
          </div>
          <Button variant="secondary" icon={<RotateCcw size={16} aria-hidden />} onClick={reset}>
            Nova busca
          </Button>
        </div>

        <div className="flex items-start gap-3 rounded-nf border border-nf-accent/20 bg-nf-accent-soft px-4 py-3">
          <Badge tone="accent" className="shrink-0 bg-nf-surface">
            Demonstração
          </Badge>
          <p className="text-sm text-nf-accent-ink">
            Nesta prévia a busca ainda não analisa a sua foto. Estas imagens são exemplos de como
            os resultados vão aparecer quando a busca estiver ligada ao seu acervo.
          </p>
        </div>

        {results.length > 0 && <PhotoGrid photos={results} />}
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Card>
        <CardBody className="space-y-6">
          <section aria-labelledby="passo-foto">
            <h2 id="passo-foto" className="text-sm font-medium text-nf-muted">
              1. Sua foto de referência
            </h2>
            {preview ? (
              <div className="mt-3 flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt="Foto de referência escolhida"
                  className="h-20 w-20 animate-nf-fade-in rounded-full object-cover"
                />
                <div>
                  <p className="text-[15px] font-medium text-nf-text">Foto escolhida</p>
                  <button
                    type="button"
                    onClick={() => setPreview(null)}
                    className="mt-0.5 text-sm text-nf-muted underline-offset-4 hover:text-nf-text hover:underline"
                  >
                    Trocar foto
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => selfieRef.current?.click()}
                  className="flex items-center gap-3 rounded-nf-lg border border-nf-line p-4 text-left transition-colors hover:border-nf-line-strong hover:bg-nf-sunken/50"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-nf-ink text-white">
                    <Camera size={20} aria-hidden />
                  </span>
                  <span>
                    <span className="block text-[15px] font-medium text-nf-text">Tirar selfie</span>
                    <span className="block text-[13px] text-nf-muted">Usa a câmera frontal</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => uploadRef.current?.click()}
                  className="flex items-center gap-3 rounded-nf-lg border border-nf-line p-4 text-left transition-colors hover:border-nf-line-strong hover:bg-nf-sunken/50"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-nf-sunken text-nf-text">
                    <ImagePlus size={20} aria-hidden />
                  </span>
                  <span>
                    <span className="block text-[15px] font-medium text-nf-text">Enviar uma foto</span>
                    <span className="block text-[13px] text-nf-muted">Da galeria ou do computador</span>
                  </span>
                </button>
              </div>
            )}
            <input
              ref={selfieRef}
              type="file"
              accept="image/*"
              capture="user"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <input
              ref={uploadRef}
              type="file"
              accept="image/*"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </section>

          <section aria-labelledby="passo-acervo">
            <h2 id="passo-acervo" className="text-sm font-medium text-nf-muted">
              <label htmlFor="escopo-busca">2. Onde procurar</label>
            </h2>
            <div className="mt-3">
              <Select id="escopo-busca" value={scope} onChange={(e) => setScope(e.target.value)}>
                <option value="library">Todo o acervo</option>
                {albums.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </div>
          </section>

          <Button
            variant="accent"
            size="lg"
            className="w-full sm:w-auto"
            disabled={!preview}
            onClick={handleSearch}
          >
            Buscar minhas fotos
          </Button>
        </CardBody>
      </Card>

      <aside className="flex gap-3 rounded-nf-lg bg-nf-sunken p-5 text-sm text-nf-muted lg:flex-col">
        <ShieldCheck size={20} className="shrink-0 text-nf-text" aria-hidden />
        <div className="space-y-2">
          <p className="font-medium text-nf-text">Sua foto não fica salva</p>
          <p>
            A foto de referência é usada só para esta busca e descartada em seguida. A busca
            acontece apenas dentro do seu acervo.
          </p>
        </div>
      </aside>
    </div>
  );
}
