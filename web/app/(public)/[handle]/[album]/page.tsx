import { getCover } from "@/lib/server/repos/covers";
import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarX2, ImageOff, Lock, ScanFace } from "lucide-react";
import { LogoMark } from "@/components/brand/Logo";
import { FaceSearch } from "@/components/public/FaceSearch";
import { Avatar } from "@/components/ui/Avatar";
import { plural } from "@/lib/format";
import { db } from "@/lib/server/db";
import { countPublicPhotos, getPublicCollection, searchReadiness } from "@/lib/server/repos/public";
import { workerConfigured } from "@/lib/server/worker";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[handle]/[album]">): Promise<Metadata> {
  const { handle, album } = await params;
  const c = await getPublicCollection(db, handle, album);
  // Páginas de acervo não entram em buscadores: só chega quem tem o link ou o QR Code.
  if (!c) return { title: "Página não encontrada", robots: { index: false, follow: false } };
  return { title: c.name, description: `Fotos de ${c.name}, por ${c.organizationName}.`, robots: { index: false, follow: false } };
}

export default async function PublicCollectionPage({ params }: PageProps<"/[handle]/[album]">) {
  const { handle, album } = await params;
  const c = await getPublicCollection(db, handle, album);
  if (!c) notFound();

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

  // Quem abre o link não vê a galeria: só as fotos que a própria selfie encontrar.
  const [total, readiness] = await Promise.all([countPublicPhotos(db, c), searchReadiness(db, c)]);
  const canSearch = workerConfigured() && readiness.searchable + readiness.pending > 0;

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 pb-10 pt-8 sm:px-6">
      {header}
      <main className="mt-8 flex-1">
        {total > 0 && (
          <p className="mx-auto mb-4 max-w-md text-balance text-center text-sm text-nf-muted">
            <Lock size={14} className="mr-1.5 inline-block align-[-2px]" aria-hidden />{plural(total, "foto", "fotos")} neste {c.kind === "event" ? "evento" : "acervo"}. Cada pessoa vê só as fotos em que aparece.
          </p>
        )}
        {total === 0 ? (
          <Notice icon={<ImageOff size={22} aria-hidden />} title="As fotos ainda não chegaram" text="Volte daqui a pouco: a busca abre assim que as fotos forem enviadas." />
        ) : canSearch ? (
          <FaceSearch orgSlug={c.organizationSlug} collectionSlug={c.slug} allowDownload={c.allowDownload} />
        ) : (
          <Notice icon={<ScanFace size={22} aria-hidden />} title="A busca por selfie ainda não está pronta" text="Estamos preparando as fotos. Volte daqui a pouco para se encontrar." />
        )}
      </main>
      {footer}
    </div>
  );
}

function Notice({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-nf-sunken text-nf-muted">{icon}</span>
      <h2 className="mt-4 text-lg font-semibold text-nf-text">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-nf-muted">{text}</p>
    </div>
  );
}
