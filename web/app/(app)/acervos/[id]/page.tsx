import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, ImageUp, Plus } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { CollectionForm } from "@/components/collections/CollectionForm";
import { AdminPhotoGrid } from "@/components/admin-photos/AdminPhotoGrid";
import { IndexingStatus } from "@/components/admin-photos/IndexingStatus";
import { ShareCard } from "@/components/admin-photos/ShareCard";
import { DriveSources } from "@/components/admin-photos/DriveSources";
import { NewAlbumForm, RenameAlbumForm } from "@/components/admin-photos/AlbumForms";
import { Uploader } from "@/components/admin-photos/Uploader";
import { deleteCollectionAction, updateCollectionAction } from "@/lib/actions/collections";
import { deleteAlbumAction } from "@/lib/actions/photos";
import { collectionStatus } from "@/lib/collection-status";
import { formatDay, formatNumber, plural, toDateInput } from "@/lib/format";
import { cn } from "@/lib/cn";
import { collectionKindLabel } from "@/lib/labels";
import { db } from "@/lib/server/db";
import { can } from "@/lib/server/permissions";
import { getCollection } from "@/lib/server/repos/collections";
import { countCollectionPhotos, getIndexingStats, getUsage, listAlbums, listCollectionPhotos } from "@/lib/server/repos/photos";
import { workerConfigured } from "@/lib/server/worker";
import { driveConfigured } from "@/lib/server/google-drive";
import { listDriveSources } from "@/lib/server/repos/drive";
import { getStorage } from "@/lib/server/storage";
import { requireAdmin } from "@/lib/server/session";
import { NotFoundError } from "@/lib/server/tenant-types";

export const metadata: Metadata = { title: "Acervo" };

export default async function AcervoPage({ params, searchParams }: PageProps<"/acervos/[id]">) {
  const ctx = await requireAdmin();
  const { id } = await params;
  const { salvo, album, mostrar } = await searchParams;
  const c = await getCollection(db, ctx, id).catch((err) => {
    if (err instanceof NotFoundError) notFound();
    throw err;
  });
  const status = collectionStatus(c);
  const canEdit = can(ctx.role, { collection: ["update"] });
  const canDelete = can(ctx.role, { collection: ["delete"] });
  const canUpload = can(ctx.role, { photo: ["upload"] });
  const canRemovePhotos = can(ctx.role, { photo: ["delete"] });
  const storageReady = getStorage() !== null;

  const albums = await listAlbums(db, ctx, c.id);
  const albumParam = typeof album === "string" ? album : null;
  const currentAlbum = albums.find((a) => a.id === albumParam) ?? null;
  const filter = albumParam === "sem" ? "none" : currentAlbum?.id ?? null;
  const shown = Math.min(Math.max(Number(mostrar) || 120, 120), 2000);
  const showDrive = canUpload && driveConfigured();
  const [photos, total, usage, indexing, drives] = await Promise.all([
    listCollectionPhotos(db, ctx, c.id, { albumId: filter, limit: shown + 1 }),
    countCollectionPhotos(db, ctx, c.id),
    getUsage(db, ctx),
    getIndexingStats(db, ctx, c.id),
    showDrive ? listDriveSources(db, ctx, c.id) : Promise.resolve([]),
  ]);
  const hasMore = photos.length > shown;
  const base = `/acervos/${c.id}`;
  const albumHref = (id: string | null) => (id ? `${base}?album=${id}` : base);
  const chips = [
    { id: null, label: `Todas · ${formatNumber(total)}` },
    ...albums.map((a) => ({ id: a.id, label: `${a.name} · ${formatNumber(a.photoCount)}` })),
    ...(albums.length ? [{ id: "sem", label: "Sem álbum" }] : []),
  ];

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

      {canUpload &&
        (storageReady ? (
          <Uploader
            collectionId={c.id}
            albums={albums.map((a) => ({ id: a.id, name: a.name }))}
            initialAlbumId={currentAlbum?.id ?? null}
            usage={{ used: usage.used, limit: usage.limit }}
          />
        ) : (
          <EmptyState
            icon={<ImageUp size={22} aria-hidden />}
            title="O envio de fotos ainda não está ativo"
            description="Ele começa a funcionar assim que o armazenamento de fotos for configurado."
          />
        ))}

      {showDrive && <DriveSources collectionId={c.id} sources={drives} workerReady={workerConfigured()} />}

      <ShareCard
        collectionId={c.id}
        collectionSlug={c.slug}
        orgSlug={ctx.organization.slug}
        shared={c.visibility === "link"}
        closed={c.kind === "event" && c.publicUntil != null && c.publicUntil < new Date()}
        canEdit={canEdit}
      />

      <IndexingStatus collectionId={c.id} stats={indexing} workerReady={workerConfigured()} canRetry={canUpload} />

      <section aria-labelledby="fotos" className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="fotos" className="text-lg font-semibold text-nf-text">Fotos</h2>
          <p className="text-sm text-nf-muted">
            {plural(total, "foto", "fotos")} · {plural(albums.length, "álbum", "álbuns")}
          </p>
        </div>

        <nav aria-label="Álbuns" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {chips.map((chip) => {
            const active = (chip.id ?? null) === (currentAlbum?.id ?? (albumParam === "sem" ? "sem" : null));
            return (
              <Link
                key={chip.id ?? "todas"}
                href={albumHref(chip.id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center rounded-full border px-3.5 text-sm transition-colors",
                  active ? "border-nf-ink bg-nf-ink text-white" : "border-nf-line bg-nf-surface text-nf-text hover:border-nf-line-strong",
                )}
              >
                {chip.label}
              </Link>
            );
          })}
        </nav>

        {canEdit && (
          <div className="flex flex-wrap gap-3">
            <details className="group w-full max-w-sm rounded-nf border border-nf-line bg-nf-surface p-4 open:shadow-sm sm:w-auto">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-nf-text">
                <Plus size={16} aria-hidden /> Novo álbum
              </summary>
              <div className="mt-3">
                <NewAlbumForm collectionId={c.id} />
              </div>
            </details>
            {currentAlbum && (
              <details className="w-full max-w-sm rounded-nf border border-nf-line bg-nf-surface p-4 open:shadow-sm sm:w-auto">
                <summary className="cursor-pointer list-none text-sm font-medium text-nf-text">Editar álbum “{currentAlbum.name}”</summary>
                <div className="mt-3 space-y-4">
                  <RenameAlbumForm collectionId={c.id} albumId={currentAlbum.id} name={currentAlbum.name} />
                  <form action={deleteAlbumAction} className="border-t border-nf-line pt-4">
                    <input type="hidden" name="collectionId" value={c.id} />
                    <input type="hidden" name="albumId" value={currentAlbum.id} />
                    <p className="mb-3 text-sm text-nf-muted">Apagar o álbum mantém as fotos no acervo, sem álbum.</p>
                    <SubmitButton size="sm" variant="danger" pendingLabel="Apagando...">Apagar álbum</SubmitButton>
                  </form>
                </div>
              </details>
            )}
          </div>
        )}

        {photos.length === 0 ? (
          <EmptyState
            icon={<ImageUp size={22} aria-hidden />}
            title={total === 0 ? "Nenhuma foto ainda" : "Nenhuma foto aqui"}
            description={total === 0 ? "Envie as primeiras fotos acima. Elas aparecem aqui assim que chegam." : "Escolha outro álbum ou envie fotos para este."}
          />
        ) : (
          <>
            <AdminPhotoGrid collectionId={c.id} photos={photos.slice(0, shown)} canDelete={canRemovePhotos} />
            {hasMore && (
              <div className="flex justify-center">
                <Link
                  href={`${albumHref(albumParam)}${albumParam ? "&" : "?"}mostrar=${shown + 120}`}
                  scroll={false}
                  className="inline-flex h-11 items-center rounded-nf border border-nf-line bg-nf-surface px-4.5 text-sm font-medium text-nf-text hover:border-nf-line-strong"
                >
                  Mostrar mais fotos
                </Link>
              </div>
            )}
          </>
        )}
      </section>

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
          <p className="mt-1 text-sm text-nf-muted">Remove o acervo e os álbuns dele. Fotos que não estão em outro acervo são apagadas e liberam espaço no plano. Não dá para desfazer.</p>
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
