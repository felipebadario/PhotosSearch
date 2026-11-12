import { AlertCircle, CheckCircle2, Loader2, ScanFace } from "lucide-react";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { retryFailedAction } from "@/lib/actions/photos";
import { formatNumber, plural } from "@/lib/format";
import { AutoRefresh } from "./AutoRefresh";

type Stats = { indexed: number; pending: number; failed: number; failures: { id: string; name: string | null; message: string | null }[] };

/** Andamento da leitura de rostos (indexação) das fotos do acervo, com o motivo de cada falha. */
export function IndexingStatus({ collectionId, stats, workerReady, canRetry }: { collectionId: string; stats: Stats; workerReady: boolean; canRetry: boolean }) {
  const total = stats.indexed + stats.pending + stats.failed;
  if (total === 0) return null;
  return (
    <section aria-labelledby="busca-status" className="rounded-nf-lg border border-nf-line bg-nf-surface p-5">
      <AutoRefresh active={stats.pending > 0 && workerReady} />
      <h2 id="busca-status" className="flex items-center gap-2 text-sm font-semibold text-nf-text">
        <ScanFace size={16} aria-hidden /> Busca por rosto
      </h2>
      {!workerReady && (
        <p className="mt-2 text-sm text-nf-muted">O serviço de rostos ainda não está ligado. As fotos ficam na fila e são lidas assim que ele for ativado.</p>
      )}
      <ul className="mt-2 space-y-1 text-sm">
        <li className="flex items-center gap-2 text-nf-text">
          <CheckCircle2 size={15} className="text-nf-success" aria-hidden />
          {formatNumber(stats.indexed)} de {formatNumber(total)} {total === 1 ? "foto pronta" : "fotos prontas"} para a busca
        </li>
        {stats.pending > 0 && (
          <li className="flex items-center gap-2 text-nf-muted">
            <Loader2 size={15} className={workerReady ? "animate-spin" : ""} aria-hidden />
            {plural(stats.pending, "foto na fila de leitura", "fotos na fila de leitura")}
          </li>
        )}
        {stats.failed > 0 && (
          <li className="flex items-center gap-2 text-nf-danger">
            <AlertCircle size={15} aria-hidden />
            {plural(stats.failed, "foto não pôde ser lida", "fotos não puderam ser lidas")}
          </li>
        )}
      </ul>
      {stats.failures.length > 0 && (
        <div className="mt-3 space-y-2">
          <ul className="space-y-1 text-sm text-nf-muted">
            {stats.failures.map((f) => (
              <li key={f.id}>
                <span className="font-medium text-nf-text">{f.name ?? "Foto"}</span>: {f.message ?? "erro ao ler a foto"}
              </li>
            ))}
          </ul>
          {canRetry && (
            <form action={retryFailedAction}>
              <input type="hidden" name="collectionId" value={collectionId} />
              <SubmitButton size="sm" variant="secondary" pendingLabel="Reenviando...">Tentar de novo</SubmitButton>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
