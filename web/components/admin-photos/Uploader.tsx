"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, FolderUp, HardDrive, ImagePlus, Loader2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatNumber, plural } from "@/lib/format";
import { cn } from "@/lib/cn";
import { chooseFromDrive, DriveAuthError, driveConfigured, driveDownload, driveMetadata } from "@/lib/google-drive";

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

/** Um arquivo a enviar, do computador ou do Drive. `hash` já conhecido evita baixar só para comparar. */
type Item = { name: string; size: number; type: string; externalRef?: string; hash?: string | null; load: () => Promise<Blob> };

const acceptable = (i: { type: string; size: number }) => ACCEPTED.includes(i.type) && i.size > 0 && i.size <= MAX_BYTES;

async function sha256(file: Blob) {
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
  const [phase, setPhase] = useState<string | null>(null);
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

  async function sendGroup(
    items: Item[],
    target: { albumId?: string | null; albumName?: string | null },
    origin: "upload" | "google_drive" = "upload",
    batch = BATCH,
  ) {
    let albumId = target.albumId ?? null;
    let albumName = albumId ? null : (target.albumName ?? null);
    for (let start = 0; start < items.length; start += batch) {
      const chunk = items.slice(start, start + batch);
      const prepared = await mapLimit(chunk, PARALLEL, async (item) => {
        if (item.hash) return { item, hash: item.hash, blob: null as Blob | null };
        const blob = await item.load();
        return { item, hash: await sha256(blob), blob };
      });
      const byId = new Map(prepared.map((p, i) => [String(start + i), p]));
      const res = await post<{ albumId: string | null; items: UploadItem[]; usage: Usage }>("/api/uploads", {
        collectionId,
        albumId,
        albumName,
        origin,
        files: prepared.map((p, i) => ({
          clientId: String(start + i),
          name: p.item.name,
          size: p.item.size,
          type: p.item.type,
          sha256: p.hash,
          externalRef: p.item.externalRef ?? null,
        })),
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

      let authError: unknown = null;
      const sent = await mapLimit(toSend, PARALLEL, async (it) => {
        const p = byId.get(it.clientId)!;
        try {
          const body = p.blob ?? (await p.item.load());
          const put = await fetch(it.upload!.url, { method: "PUT", headers: it.upload!.headers, body });
          return put.ok ? it.photoId! : null;
        } catch (err) {
          if (err instanceof DriveAuthError) authError = err;
          return null;
        } finally {
          bump({ done: 1 });
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
      if (authError) throw authError;
    }
  }

  function destinationTarget() {
    if (destination === "__new" && !newAlbum.trim()) {
      setError("Dê um nome ao novo álbum ou escolha outro destino.");
      return null;
    }
    return destination === "__new" ? { albumName: newAlbum.trim() } : { albumId: destination || null };
  }

  function finish() {
    setBusy(false);
    setPhase(null);
    if (filesRef.current) filesRef.current.value = "";
    if (folderRef.current) folderRef.current.value = "";
    setNewAlbum("");
    router.refresh();
  }

  async function start(list: FileList | File[] | null) {
    const all = Array.from(list ?? []);
    if (all.length === 0 || busy) return;
    const fallback = destinationTarget();
    if (!fallback) return;
    const valid = all.filter(acceptable);
    setError(null);
    setBusy(true);
    setTally({ ...empty, total: all.length, invalid: all.length - valid.length, done: all.length - valid.length });

    const groups = new Map<string, Item[]>();
    for (const f of valid) {
      const key = folderOf(f) ?? "";
      groups.set(key, [...(groups.get(key) ?? []), { name: f.name, size: f.size, type: f.type, load: async () => f }]);
    }
    try {
      for (const [folder, items] of groups) await sendGroup(items, folder ? { albumName: folder } : fallback);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar agora. Tente de novo.");
    } finally {
      finish();
    }
  }

  async function startDrive() {
    if (busy) return;
    const target = destinationTarget();
    if (!target) return;
    setError(null);
    setTally(null);
    setBusy(true);
    setPhase("Abrindo o Google Drive…");
    try {
      const { token, files } = await chooseFromDrive();
      if (files.length === 0) return;
      setPhase(`Lendo ${formatNumber(files.length)} ${files.length === 1 ? "arquivo escolhido" : "arquivos escolhidos"}…`);
      const meta = await mapLimit(files, 6, (f) => driveMetadata(token, f.id, f));
      const valid = meta.filter((m) => acceptable({ type: m.mimeType, size: m.size }));
      setPhase(null);
      setTally({ ...empty, total: meta.length, invalid: meta.length - valid.length, done: meta.length - valid.length });
      const items: Item[] = valid.map((m) => ({
        name: m.name,
        size: m.size,
        type: m.mimeType,
        externalRef: m.id,
        hash: m.sha256,
        load: () => driveDownload(token, m.id),
      }));
      // Lotes menores: as fotos do Drive passam pela memória do navegador até chegarem ao armazenamento.
      await sendGroup(items, target, "google_drive", 20);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível importar agora. Tente de novo.");
    } finally {
      finish();
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
          {driveConfigured && (
            <Button variant="secondary" icon={<HardDrive size={16} aria-hidden />} onClick={startDrive} disabled={busy || full}>
              Importar do Google Drive
            </Button>
          )}
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

      {phase && (
        <p className="mt-5 flex items-center gap-2 text-sm font-medium text-nf-text" aria-live="polite">
          <Loader2 size={16} className="animate-spin" aria-hidden /> {phase}
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
