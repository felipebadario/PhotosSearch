import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, ImageUp } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { CollectionForm } from "@/components/collections/CollectionForm";
import { deleteCollectionAction, updateCollectionAction } from "@/lib/actions/collections";
import { collectionStatus } from "@/lib/collection-status";
import { formatDay, toDateInput } from "@/lib/format";
import { collectionKindLabel } from "@/lib/labels";
import { db } from "@/lib/server/db";
import { can } from "@/lib/server/permissions";
import { getCollection } from "@/lib/server/repos/collections";
import { requireAdmin } from "@/lib/server/session";
import { NotFoundError } from "@/lib/server/tenant-types";

export const metadata: Metadata = { title: "Acervo" };

export default async function AcervoPage({ params, searchParams }: PageProps<"/acervos/[id]">) {
  const ctx = await requireAdmin();
  const { id } = await params;
  const { salvo } = await searchParams;
  const c = await getCollection(db, ctx, id).catch((err) => {
    if (err instanceof NotFoundError) notFound();
    throw err;
  });
  const status = collectionStatus(c);
  const canEdit = can(ctx.role, { collection: ["update"] });
  const canDelete = can(ctx.role, { collection: ["delete"] });

  return (
    <div className="space-y-10">
      <div>
        <Link href="/acervos" className="inline-flex items-center gap-1.5 text-sm text-nf-muted hover:text-nf-text">
          <ArrowLeft size={15} aria-hidden /> Acervos e eventos
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-nf-text sm:text-[28px]">{c.name}</h1>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
        <p className="mt-1 text-[15px] text-nf-muted">
          {collectionKindLabel(c.kind)}
          {c.kind === "event" && ` · ${formatDay(c.startsAt)} a ${formatDay(c.endsAt)} · aberto até ${formatDay(c.publicUntil)}`}
        </p>
        {salvo && (
          <p role="status" className="mt-4 inline-flex items-center gap-2 rounded-nf bg-nf-success-soft px-3 py-2 text-sm text-nf-success">
            <CheckCircle2 size={16} aria-hidden /> Alterações salvas.
          </p>
        )}
      </div>

      <EmptyState
        icon={<ImageUp size={22} aria-hidden />}
        title="O envio de fotos chega na próxima etapa"
        description="Aqui você vai enviar fotos em lote, acompanhar o processamento e gerar o link e o QR Code para os participantes."
      />

      {canEdit && (
        <section aria-labelledby="ajustes" className="max-w-2xl">
          <h2 id="ajustes" className="mb-4 text-lg font-semibold text-nf-text">Ajustes</h2>
          <CollectionForm
            action={updateCollectionAction}
            submitLabel="Salvar alterações"
            initial={{
              id: c.id,
              kind: c.kind,
              name: c.name,
              description: c.description ?? "",
              startsAt: toDateInput(c.startsAt),
              endsAt: toDateInput(c.endsAt),
              publicUntil: toDateInput(c.publicUntil),
              retentionDays: c.retentionDays ? String(c.retentionDays) : "",
              allowDownload: c.allowDownload,
            }}
          />
        </section>
      )}

      {canDelete && (
        <Card className="max-w-2xl border-nf-danger/30 p-5">
          <h2 className="font-semibold text-nf-text">Excluir {c.kind === "event" ? "evento" : "acervo"}</h2>
          <p className="mt-1 text-sm text-nf-muted">Remove o acervo e os álbuns dele. Não dá para desfazer.</p>
          <form action={deleteCollectionAction} className="mt-4">
            <input type="hidden" name="id" value={c.id} />
            <label className="mb-4 flex items-center gap-3 text-sm text-nf-text">
              <input type="checkbox" name="confirm" required className="h-5 w-5 accent-[var(--color-nf-danger)]" />
              Entendo que esta exclusão é definitiva
            </label>
            <SubmitButton variant="danger" pendingLabel="Excluindo...">
              Excluir definitivamente
            </SubmitButton>
          </form>
        </Card>
      )}
    </div>
  );
}
