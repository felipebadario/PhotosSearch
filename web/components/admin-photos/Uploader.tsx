"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, FolderUp, ImagePlus, Loader2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatNumber, plural } from "@/lib/format";
import { cn } from "@/lib/cn";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 30 * 1024 * 1024;
const BATCH = 100;
const PARALLEL = 4;

type Album = { id: string; name: string };
type Usage = { used: number; limit: number | null };

type Tally = {
  total: number;
  done: number;
  sent: number;
  added: number;
  alreadyHere: number;
  repeated: number;
  quota: number;
  invalid: number;
  failed: number;
};

const empty: Tally = { total: 0, done: 0, sent: 0, added: 0, alreadyHere: 0, repeated: 0, quota: 0, invalid: 0, failed: 0 };

type UploadItem = {
  clientId: string;
  status: "upload" | "added" | "already_here" | "duplicate_in_batch" | "quota_exceeded" | "invalid";
  photoId?: string;
  upload?: { url: string; headers: Record<string, string> };
};

async function sha256(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>) {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Não foi possível enviar agora. Tente de novo.");
  return data as T;
}

/** Pasta de primeiro nível do arquivo, quando ele veio de "Enviar uma pasta". */
function folderOf(file: File) {
  const path = (file as File & { webkitRelativePath?: string }).webkitRelativePath ?? "";
  const parts = path.split("/");
  return parts.length > 1 ? parts[0] : null;
}

export function Uploader({
  collectionId,
  albums,
  initialAlbumId,
  usage,
}: {
  collectionId: string;
  albums: Album[];
  initialAlbumId?: string | null;
  usage: Usage;
}) {
  const router = useRouter();
  const filesRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const [destination, setDestination] = useState(initialAlbumId ?? "");
  const [newAlbum, setNewAlbum] = useState("");
  const [busy, setBusy] = useState(false);
  const [tally, setTally] = useState<Tally | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  // Atualizada a cada lote; a do servidor vale de novo quando a página recarrega.
  const [liveUsage, setCurrentUsage] = useState<Usage | null>(null);
  const currentUsage = busy && liveUsage ? liveUsage : usage;
  useEffect(() => {
    folderRef.current?.setAttribute("webkitdirectory", "");
    folderRef.current?.setAttribute("directory", "");
  }, []);

  const bump = (patch: Partial<Tally>) =>
    setTally((t) => {
      const base = t ?? empty;
      const next = { ...base };
      for (const [k, v] of Object.entries(patch)) next[k as keyof Tally] += v as number;
      return next;
    });

  async function sendGroup(files: File[], target: { albumId?: string | null; albumName?: string | null }) {
    let albumId = target.albumId ?? null;
    let albumName = albumId ? null : (target.albumName ?? null);
    for (let start = 0; start < files.length; start += BATCH) {
      const chunk = files.slice(start, start + BATCH);
      const hashed = await mapLimit(chunk, PARALLEL, async (file) => ({ file, hash: await sha256(file) }));
      const byId = new Map(hashed.map((h, i) => [String(start + i), h.file]));
      const res = await post<{ albumId: string | null; items: UploadItem[]; usage: Usage }>("/api/uploads", {
        collectionId,
        albumId,
        albumName,
        files: hashed.map((h, i) => ({ clientId: String(start + i), name: h.file.name, size: h.file.size, type: h.file.type, sha256: h.hash })),
      });
      albumId = res.albumId;
      albumName = null;
      setCurrentUsage(res.usage);

      const toSend = res.items.filter((it) => it.status === "upload");
      bump({
        added: res.items.filter((i) => i.status === "added").length,
        alreadyHere: res.items.filter((i) => i.status === "already_here").length,
        repeated: res.items.filter((i) => i.status === "duplicate_in_batch").length,
        quota: res.items.filter((i) => i.status === "quota_exceeded").length,
        invalid: res.items.filter((i) => i.status === "invalid").length,
        done: res.items.length - toSend.length,
      });

      const sent = await mapLimit(toSend, PARALLEL, async (it) => {
        const file = byId.get(it.clientId)!;
        try {
          const put = await fetch(it.upload!.url, { method: "PUT", headers: it.upload!.headers, body: file });
          bump({ done: 1 });
          return put.ok ? it.photoId! : null;
        } catch {
          bump({ done: 1 });
          return null;
        }
      });
      const ok = sent.filter((id): id is string => Boolean(id));
      const failedPut = sent.length - ok.length;
      if (ok.length) {
        const done = await post<{ done: string[]; missing: string[] }>("/api/uploads/complete", { collectionId, albumId, photoIds: ok });
        bump({ sent: done.done.length, failed: failedPut + done.missing.length });
      } else {
        bump({ failed: failedPut });
      }
    }
  }

  async function start(list: FileList | File[] | null) {
    const all = Array.from(list ?? []);
    if (all.length === 0 || busy) return;
    if (destination === "__new" && !newAlbum.trim()) {
      setError("Dê um nome ao novo álbum ou escolha outro destino.");
      return;
    }
    const valid = all.filter((f) => ACCEPTED.includes(f.type) && f.size > 0 && f.size <= MAX_BYTES);
    setError(null);
    setBusy(true);
    setTally({ ...empty, total: all.length, invalid: all.length - valid.length, done: all.length - valid.length });

    const fallback = destination === "__new" ? { albumName: newAlbum.trim() } : { albumId: destination || null };
    const groups = new Map<string, File[]>();
    for (const f of valid) {
      const key = folderOf(f) ?? "";
      groups.set(key, [...(groups.get(key) ?? []), f]);
    }
    try {
      for (const [folder, files] of groups) await sendGroup(files, folder ? { albumName: folder } : fallback);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar agora. Tente de novo.");
    } finally {
      setBusy(false);
      if (filesRef.current) filesRef.current.value = "";
      if (folderRef.current) folderRef.current.value = "";
      setNewAlbum("");
      router.refresh();
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    start(e.dataTransfer.files);
  }

  const pct = tally && tally.total ? (tally.done / tally.total) * 100 : 0;
  const finished = tally && !busy;
  const full = currentUsage.limit != null && currentUsage.used >= currentUsage.limit;

  return (
    <section aria-labelledby="enviar" className="rounded-nf-lg border border-nf-line bg-nf-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="enviar" className="text-lg font-semibold text-nf-text">Enviar fotos</h2>
        <p className="text-sm text-nf-muted">
          {currentUsage.limit == null
            ? `${formatNumber(currentUsage.used)} fotos no plano`
            : `${formatNumber(currentUsage.used)} de ${formatNumber(currentUsage.limit)} fotos do plano`}
        </p>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="destino">Colocar no álbum</Label>
          <Select id="destino" value={destination} onChange={(e) => setDestination(e.target.value)} disabled={busy}>
            <option value="">Sem álbum</option>
            {albums.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
            <option value="__new">Novo álbum…</option>
          </Select>
        </div>
        {destination === "__new" && (
          <div>
            <Label htmlFor="novo-album">Nome do novo álbum</Label>
            <Input id="novo-album" value={newAlbum} onChange={(e) => setNewAlbum(e.target.value)} maxLength={120} disabled={busy} placeholder="Ex.: Culto de domingo" />
          </div>
        )}
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "mt-4 flex flex-col items-center gap-3 rounded-nf border-2 border-dashed px-4 py-8 text-center transition-colors",
          dragging ? "border-nf-accent bg-nf-accent-soft" : "border-nf-line",
        )}
      >
        <UploadCloud size={28} className="text-nf-subtle" aria-hidden />
        <p className="text-sm text-nf-muted">Arraste as fotos para cá ou escolha abaixo. JPG, PNG ou WebP, até 30 MB cada.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="primary" icon={<ImagePlus size={16} aria-hidden />} onClick={() => filesRef.current?.click()} disabled={busy || full}>
            Escolher fotos
          </Button>
          <Button variant="secondary" icon={<FolderUp size={16} aria-hidden />} onClick={() => folderRef.current?.click()} disabled={busy || full}>
            Enviar uma pasta
          </Button>
        </div>
        <p className="text-xs text-nf-subtle">Cada pasta enviada vira um álbum com o nome dela. Fotos repetidas não são enviadas de novo.</p>
        <input ref={filesRef} type="file" accept={ACCEPTED.join(",")} multiple className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => start(e.target.files)} />
        <input ref={folderRef} type="file" multiple className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => start(e.target.files)} />
      </div>

      {full && !busy && (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-nf bg-nf-warning-soft px-3.5 py-3 text-sm text-nf-warning">
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            O plano chegou ao limite de fotos. <Link href="/assinatura" className="font-medium underline">Veja como ampliar</Link>.
          </span>
        </p>
      )}

      {error && (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-nf bg-nf-danger-soft px-3.5 py-3 text-sm text-nf-danger">
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}

      {tally && (
        <div className="mt-5 space-y-3" aria-live="polite">
          <div className="flex items-center gap-2 text-sm font-medium text-nf-text">
            {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <CheckCircle2 size={16} className="text-nf-success" aria-hidden />}
            {busy ? `Enviando ${formatNumber(tally.done)} de ${formatNumber(tally.total)}` : "Envio concluído"}
          </div>
          <ProgressBar value={pct} tone="accent" label="Progresso do envio" />
          {finished && (
            <ul className="space-y-1 text-sm text-nf-muted">
              {tally.sent > 0 && <li>{plural(tally.sent, "foto enviada", "fotos enviadas")}</li>}
              {tally.added > 0 && <li>{plural(tally.added, "foto já estava em outro acervo e foi incluída sem novo envio", "fotos já estavam em outro acervo e foram incluídas sem novo envio")}</li>}
              {tally.alreadyHere > 0 && <li>{plural(tally.alreadyHere, "foto já estava neste acervo", "fotos já estavam neste acervo")}</li>}
              {tally.repeated > 0 && <li>{plural(tally.repeated, "foto repetida no envio foi ignorada", "fotos repetidas no envio foram ignoradas")}</li>}
              {tally.invalid > 0 && <li className="text-nf-warning">{plural(tally.invalid, "arquivo não é JPG, PNG ou WebP de até 30 MB", "arquivos não são JPG, PNG ou WebP de até 30 MB")}</li>}
              {tally.quota > 0 && (
                <li className="text-nf-warning">
                  {plural(tally.quota, "foto ficou de fora porque o plano chegou ao limite", "fotos ficaram de fora porque o plano chegou ao limite")}.{" "}
                  <Link href="/assinatura" className="font-medium underline">Ampliar o plano</Link>
                </li>
              )}
              {tally.failed > 0 && <li className="text-nf-danger">{plural(tally.failed, "foto não chegou. Envie de novo", "fotos não chegaram. Envie de novo")}</li>}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
