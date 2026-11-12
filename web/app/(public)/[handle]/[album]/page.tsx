import { getCover } from "@/lib/server/repos/covers";
import Image from "next/image";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarX2, ImageOff } from "lucide-react";
import { LogoMark } from "@/components/brand/Logo";
import { PhotoGrid } from "@/components/photos/PhotoGrid";
import { FaceSearch } from "@/components/public/FaceSearch";
import { Avatar } from "@/components/ui/Avatar";
import { plural } from "@/lib/format";
import { cn } from "@/lib/cn";
import { db } from "@/lib/server/db";
import { countPublicPhotos, getPublicCollection, listPublicAlbums, listPublicPhotos, searchReadiness } from "@/lib/server/repos/public";
import { workerConfigured } from "@/lib/server/worker";
import type { GalleryPhoto } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[handle]/[album]">): Promise<Metadata> {
  const { handle, album } = await params;
  const c = await getPublicCollection(db, handle, album);
  // Páginas de acervo não entram em buscadores: só chega quem tem o link ou o QR Code.
  if (!c) return { title: "Página não encontrada", robots: { index: false, follow: false } };
  return { title: c.name, description: `Fotos de ${c.name}, por ${c.organizationName}.`, robots: { index: false, follow: false } };
}

export default async function PublicCollectionPage({ params, searchParams }: PageProps<"/[handle]/[album]">) {
  const { handle, album } = await params;
  const { album: albumParam, mostrar } = await searchParams;
  const c = await getPublicCollection(db, handle, album);
  if (!c) notFound();

  const base = `/${c.organizationSlug}/${c.slug}`;
  const eventCover = c.state === "open" && c.kind === "event" ? await getCover(db, c.organizationId, c.id) : null;
  const cover = c.state === "open" ? eventCover ?? await getCover(db, c.organizationId, null) : null;
  const header = (
    <header className="flex flex-col items-center text-center">
      {cover && <Image unoptimized src={cover} alt="" width={1440} height={480} className="mb-5 w-full rounded-nf" />}
      <Avatar name={c.organizationName} size={44} />
      <p className="mt-3 text-sm text-nf-muted">{c.organizationName}</p>
      <h1 className="mt-1 text-2xl font-semibold text-nf-text sm:text-3xl">{c.name}</h1>
      {c.description && <p className="mt-2 max-w-xl text-[15px] text-nf-muted">{c.description}</p>}
    </header>
  );
  const footer = (
    <footer className="mt-12 flex items-center justify-center gap-2 text-xs text-nf-subtle">
      <LogoMark size={18} /> Fotos organizadas com NossaFoto
    </footer>
  );

  if (c.state === "closed") {
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-5 pb-10 pt-8">
        {header}
        <main className="flex flex-1 flex-col items-center justify-center py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-nf-sunken text-nf-muted">
            <CalendarX2 size={22} aria-hidden />
          </span>
          <h2 className="mt-4 text-lg font-semibold text-nf-text">Este evento foi encerrado</h2>
          <p className="mt-1 max-w-sm text-sm text-nf-muted">As fotos não estão mais disponíveis por este link. Fale com {c.organizationName} se precisar delas.</p>
        </main>
        {footer}
      </div>
    );
  }

  const albums = await listPublicAlbums(db, c);
  const selected = typeof albumParam === "string" ? albums.find((a) => a.id === albumParam) ?? null : null;
  const shown = Math.min(Math.max(Number(mostrar) || 120, 120), 2000);
  const [rows, total, readiness] = await Promise.all([
    listPublicPhotos(db, c, { albumId: selected?.id ?? null, limit: shown + 1 }),
    countPublicPhotos(db, c),
    searchReadiness(db, c),
  ]);
  const canSearch = workerConfigured() && readiness.searchable + readiness.pending > 0;
  const hasMore = rows.length > shown;
  const photoUrl = (id: string) => `/api/publico/${c.organizationSlug}/${c.slug}/fotos/${id}`;
  const photos: GalleryPhoto[] = rows.slice(0, shown).map((r) => ({
    id: r.id,
    url: photoUrl(r.id),
    thumbnailUrl: photoUrl(r.id),
    downloadUrl: `${photoUrl(r.id)}?baixar=1`,
    albumName: r.albumName,
    source: "upload",
    takenAt: r.takenAt ? r.takenAt.toISOString() : null,
  }));
  const chips = [{ id: null as string | null, label: `Todas · ${total}` }, ...albums.map((a) => ({ id: a.id as string | null, label: `${a.name} · ${a.photoCount}` }))];

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 pb-10 pt-8 sm:px-6">
      {header}
      <main className="mt-8 flex-1">
        {canSearch && <FaceSearch orgSlug={c.organizationSlug} collectionSlug={c.slug} allowDownload={c.allowDownload} />}
        {albums.length > 0 && (
          <nav aria-label="Álbuns" className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1">
            {chips.map((chip) => {
              const active = chip.id === (selected?.id ?? null);
              return (
                <Link
                  key={chip.id ?? "todas"}
                  href={chip.id ? `${base}?album=${chip.id}` : base}
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
        )}

        {photos.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-nf-sunken text-nf-muted">
              <ImageOff size={22} aria-hidden />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-nf-text">As fotos ainda não chegaram</h2>
            <p className="mt-1 max-w-sm text-sm text-nf-muted">Volte daqui a pouco: elas aparecem aqui assim que forem enviadas.</p>
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm text-nf-muted">{plural(selected ? selected.photoCount : total, "foto", "fotos")}. Toque numa foto para ampliar{c.allowDownload ? " ou baixar" : ""}.</p>
            <PhotoGrid photos={photos} allowDownload={c.allowDownload} dense />
            {hasMore && (
              <div className="mt-6 flex justify-center">
                <Link
                  href={`${base}?${selected ? `album=${selected.id}&` : ""}mostrar=${shown + 120}`}
                  scroll={false}
                  className="inline-flex h-11 items-center rounded-nf border border-nf-line bg-nf-surface px-4.5 text-sm font-medium text-nf-text hover:border-nf-line-strong"
                >
                  Mostrar mais fotos
                </Link>
              </div>
            )}
          </>
        )}
      </main>
      {footer}
    </div>
  );
}
