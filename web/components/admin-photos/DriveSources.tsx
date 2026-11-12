import { AlertCircle, CheckCircle2, ExternalLink, HardDrive, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { removeDriveSourceAction, syncDriveSourceAction } from "@/lib/actions/drive";
import { formatNumber } from "@/lib/format";
import type { DriveSource } from "@/lib/server/db/schema";
import { AutoRefresh } from "./AutoRefresh";
import { DriveForm } from "./DriveForm";

const when = (d: Date | null) =>
  d ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(d) : null;

function folderUrl(s: DriveSource) {
  const base = `https://drive.google.com/drive/folders/${encodeURIComponent(s.folderId)}`;
  return s.resourceKey ? `${base}?resourcekey=${encodeURIComponent(s.resourceKey)}` : base;
}

function StatusLine({ s }: { s: DriveSource }) {
  if (s.status === "error")
    return (
      <p className="flex items-start gap-2 text-sm text-nf-danger">
        <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden /> {s.lastError ?? "Não foi possível ler a pasta."}
      </p>
    );
  if (s.status === "pending" || s.status === "syncing")
    return (
      <p className="flex items-center gap-2 text-sm text-nf-muted">
        <Loader2 size={15} className="animate-spin" aria-hidden /> {s.status === "syncing" ? "Copiando fotos da pasta…" : "Na fila para ler a pasta…"}
      </p>
    );
  return (
    <p className="flex items-center gap-2 text-sm text-nf-muted">
      <CheckCircle2 size={15} className="text-nf-success" aria-hidden /> Em dia{s.lastSyncedAt ? ` · conferida em ${when(s.lastSyncedAt)}` : ""}
    </p>
  );
}

/** Pastas do Google Drive ligadas ao acervo. O serviço de rostos confere cada uma de tempos em tempos e copia as fotos novas. */
export function DriveSources({ collectionId, sources, workerReady }: { collectionId: string; sources: DriveSource[]; workerReady: boolean }) {
  const busy = sources.some((s) => s.status === "pending" || s.status === "syncing");
  return (
    <section aria-labelledby="drive-pastas" className="rounded-nf-lg border border-nf-line bg-nf-surface p-5">
      <AutoRefresh active={busy && workerReady} />
      <h2 id="drive-pastas" className="flex items-center gap-2 text-sm font-semibold text-nf-text">
        <HardDrive size={16} aria-hidden /> Pastas do Google Drive
      </h2>
      <p className="mt-1 text-sm text-nf-muted">
        Compartilhe a pasta no Drive como “Qualquer pessoa com o link” e cole o link aqui. Cada subpasta vira um álbum, e as fotos novas que entrarem na pasta chegam sozinhas.
      </p>
      {!workerReady && <p className="mt-2 text-sm text-nf-muted">O serviço que copia as fotos ainda não está ligado. As pastas ficam na fila até ele ser ativado.</p>}

      {sources.length > 0 && (
        <ul className="mt-4 divide-y divide-nf-line rounded-nf border border-nf-line">
          {sources.map((s) => (
            <li key={s.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-1">
                <a href={folderUrl(s)} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1.5 font-medium text-nf-text hover:underline">
                  <span className="truncate">{s.folderName ?? "Pasta do Drive"}</span>
                  <ExternalLink size={14} className="shrink-0 text-nf-subtle" aria-label="abre no Google Drive" />
                </a>
                <StatusLine s={s} />
                <p className="text-xs text-nf-subtle">
                  {formatNumber(s.filesImported)} {s.filesImported === 1 ? "foto copiada" : "fotos copiadas"} · {formatNumber(s.filesSeen)} na pasta
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <form action={syncDriveSourceAction}>
                  <input type="hidden" name="collectionId" value={collectionId} />
                  <input type="hidden" name="sourceId" value={s.id} />
                  <SubmitButton size="sm" variant="secondary" pendingLabel="Pedindo..." icon={<RefreshCw size={14} aria-hidden />}>
                    Conferir agora
                  </SubmitButton>
                </form>
                <form action={removeDriveSourceAction}>
                  <input type="hidden" name="collectionId" value={collectionId} />
                  <input type="hidden" name="sourceId" value={s.id} />
                  <SubmitButton size="sm" variant="ghost" pendingLabel="Desligando..." icon={<Trash2 size={14} aria-hidden />} aria-label={`Desligar a pasta ${s.folderName ?? ""}`}>
                    Desligar
                  </SubmitButton>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 max-w-xl">
        <DriveForm collectionId={collectionId} />
      </div>
      {sources.length > 0 && <p className="mt-3 text-xs text-nf-subtle">Desligar a pasta para de copiar fotos novas. As que já vieram continuam no acervo.</p>}
    </section>
  );
}
