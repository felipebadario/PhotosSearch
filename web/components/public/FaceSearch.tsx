"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, RotateCcw, ShieldCheck, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PhotoGrid } from "@/components/photos/PhotoGrid";
import { plural } from "@/lib/format";
import type { GalleryPhoto } from "@/lib/types";

type Result = { photos: { id: string; token: string; albumName: string | null; takenAt: string | null }[]; pending: number; searchable: number };

const MAX_SIDE = 1280;
/** Até 3 fotos da pessoa: ajuda quando a selfie é com óculos e as fotos não (ou o contrário), ou de lado. */
const MAX_SELFIES = 3;

/** Reduz a selfie no próprio aparelho: envia menos dados e o tamanho não passa do limite do servidor. */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("falha"))), "image/jpeg", 0.88));
}

export function FaceSearch({ orgSlug, collectionSlug, allowDownload }: { orgSlug: string; collectionSlug: string; allowDownload: boolean }) {
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  // As selfies ficam só na memória desta página (para refinar a busca) e somem ao sair dela.
  const [selfies, setSelfies] = useState<Blob[]>([]);
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);

  const base = `/api/publico/${orgSlug}/${collectionSlug}`;

  async function search(file: File | undefined) {
    if (!file || busy) return;
    setError(null);
    setBusy(true);
    try {
      let blob: Blob;
      try {
        blob = await shrink(file);
      } catch {
        throw new Error("Não foi possível abrir essa foto. Tente outra selfie.");
      }
      // Com um resultado na tela, a foto nova se soma às anteriores; senão, começa do zero.
      const next = result ? [...selfies, blob].slice(-MAX_SELFIES) : [blob];
      const form = new FormData();
      next.forEach((b, i) => form.append("selfie", b, `selfie-${i + 1}.jpg`));
      form.set("consent", "1");
      const res = await fetch(`${base}/buscar`, { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "A busca não respondeu agora. Tente de novo em instantes.");
      setSelfies(next);
      setResult(data as Result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "A busca não respondeu agora. Tente de novo em instantes.");
    } finally {
      setBusy(false);
      if (cameraRef.current) cameraRef.current.value = "";
      if (libraryRef.current) libraryRef.current.value = "";
    }
  }

  const photoUrl = (id: string, token: string) => `${base}/fotos/${id}?t=${encodeURIComponent(token)}`;
  const gallery: GalleryPhoto[] =
    result?.photos.map((p) => ({
      id: p.id,
      url: photoUrl(p.id, p.token),
      thumbnailUrl: photoUrl(p.id, p.token),
      downloadUrl: `${photoUrl(p.id, p.token)}&baixar=1`,
      albumName: p.albumName,
      source: "upload",
      takenAt: p.takenAt,
    })) ?? [];

  const inputs = (
    <>
      <input ref={cameraRef} type="file" accept="image/*" capture="user" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => search(e.target.files?.[0])} />
      <input ref={libraryRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => search(e.target.files?.[0])} />
    </>
  );

  if (result) {
    const canRefine = selfies.length < MAX_SELFIES;
    return (
      <section aria-labelledby="resultado" className="mb-8 rounded-nf-lg border border-nf-line bg-nf-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="resultado" className="text-lg font-semibold text-nf-text">
            {gallery.length > 0 ? `Encontramos ${plural(gallery.length, "foto", "fotos")} com você` : "Não encontramos fotos com você"}
          </h2>
          <Button
            variant="secondary"
            size="sm"
            icon={<RotateCcw size={15} aria-hidden />}
            onClick={() => {
              setResult(null);
              setSelfies([]);
              setError(null);
            }}
          >
            Buscar de novo
          </Button>
        </div>
        {gallery.length === 0 ? (
          <p className="mt-2 text-sm text-nf-muted">
            Tente com o rosto de frente e bem iluminado, ou adicione outra foto sua abaixo.
            {result.pending > 0 && ` Ainda estamos preparando ${plural(result.pending, "foto", "fotos")}: volte daqui a pouco.`}
          </p>
        ) : (
          <>
            {result.pending > 0 && <p className="mt-2 text-sm text-nf-muted">Ainda estamos preparando {plural(result.pending, "foto", "fotos")}. Busque de novo mais tarde para ver todas.</p>}
            <div className="mt-4">
              <PhotoGrid photos={gallery} allowDownload={allowDownload} dense />
            </div>
          </>
        )}
        {canRefine && (
          <div className="mt-5 rounded-nf border border-nf-line bg-nf-sunken p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-nf-text">
              <UserPlus size={16} aria-hidden /> Faltou alguma foto?
            </p>
            <p className="mt-1 text-sm text-nf-muted">
              Adicione outra foto sua, de preferência diferente da primeira: sem óculos (ou com), de lado, com outro cabelo. Procuramos de novo usando
              {selfies.length === 1 ? " as duas" : " todas"}, sem perder o rigor.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" disabled={busy} onClick={() => cameraRef.current?.click()} icon={busy ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Camera size={15} aria-hidden />}>
                {busy ? "Procurando..." : "Tirar outra selfie"}
              </Button>
              <Button variant="secondary" size="sm" disabled={busy} onClick={() => libraryRef.current?.click()} icon={<ImagePlus size={15} aria-hidden />}>
                Escolher outra foto
              </Button>
            </div>
          </div>
        )}
        {error && (
          <p role="alert" className="mt-4 rounded-nf bg-nf-danger-soft px-3.5 py-3 text-sm text-nf-danger">
            {error}
          </p>
        )}
        {inputs}
        <p className="mt-4 text-xs text-nf-subtle">
          {selfies.length > 1
            ? "Suas fotos não foram guardadas: o servidor as descarta na hora, e elas somem deste aparelho quando você sai da página."
            : "Sua selfie não foi guardada: o servidor a descarta na hora, e ela some deste aparelho quando você sai da página."}
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="buscar-rosto" className="mb-8 rounded-nf-lg border border-nf-line bg-nf-surface p-5 text-center sm:p-6">
      <h2 id="buscar-rosto" className="text-lg font-semibold text-nf-text">Encontre suas fotos</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-nf-muted">Tire uma selfie e mostramos só as fotos em que você aparece.</p>

      <label className="mx-auto mt-4 flex max-w-md items-start gap-3 text-left text-sm text-nf-text">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-nf-accent)]" />
        <span>
          Concordo em usar minha selfie só para esta busca. Ela é comparada na hora com as fotos deste acervo e descartada em seguida, sem ser guardada.
        </span>
      </label>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Button variant="primary" disabled={!consent || busy} onClick={() => cameraRef.current?.click()} icon={busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Camera size={16} aria-hidden />}>
          {busy ? "Procurando..." : "Tirar selfie"}
        </Button>
        <Button variant="secondary" disabled={!consent || busy} onClick={() => libraryRef.current?.click()} icon={<ImagePlus size={16} aria-hidden />}>
          Escolher uma foto
        </Button>
      </div>
      {inputs}

      {error && (
        <p role="alert" className="mx-auto mt-4 max-w-md rounded-nf bg-nf-danger-soft px-3.5 py-3 text-sm text-nf-danger">
          {error}
        </p>
      )}
      <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-nf-subtle">
        <ShieldCheck size={14} aria-hidden /> Só as fotos deste acervo são consultadas.
      </p>
    </section>
  );
}
