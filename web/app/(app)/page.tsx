import Link from "next/link";
import { ArrowRight, ScanFace, UploadCloud } from "lucide-react";
import { getCurrentUser } from "@/lib/api/account";
import { getLibrarySummary } from "@/lib/api/library";
import { listRecentAlbums } from "@/lib/api/albums";
import { SearchBar } from "@/components/search/SearchBar";
import { Button } from "@/components/ui/Button";
import { AlbumCard } from "@/components/photos/AlbumCard";
import { DemoNotice } from "@/components/ui/DemoNotice";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatNumber } from "@/lib/format";

export default async function HomePage() {
  const [user, summary, albums] = await Promise.all([
    getCurrentUser(),
    getLibrarySummary(),
    listRecentAlbums(4),
  ]);

  const stats = [
    { value: formatNumber(summary.photoCount), label: summary.photoCount === 1 ? "fotografia" : "fotografias", href: "/acervo" },
    { value: formatNumber(summary.albumCount), label: summary.albumCount === 1 ? "álbum" : "álbuns", href: "/acervo/albuns" },
    { value: formatNumber(summary.connectedSources), label: summary.connectedSources === 1 ? "fonte ativa" : "fontes ativas", href: "/fontes" },
  ];

  return (
    <div className="space-y-12">
      <section className="mx-auto max-w-2xl pt-2 text-center sm:pt-10">
        <p className="text-[15px] text-nf-muted">Olá, {user.name}.</p>
        <h1 className="mt-2 text-[28px] font-semibold leading-tight text-nf-text sm:text-4xl">
          Qual foto vamos encontrar hoje?
        </h1>
        <div className="mt-7">
          <SearchBar />
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button href="/buscar/rosto" variant="secondary" icon={<ScanFace size={17} aria-hidden />}>
            Buscar por rosto
          </Button>
          <Button href="/acervo/importar" variant="secondary" icon={<UploadCloud size={17} aria-hidden />}>
            Importar fotos
          </Button>
        </div>
      </section>

      <section aria-labelledby="seu-acervo">
        <h2 id="seu-acervo" className="text-xs font-medium uppercase tracking-[0.08em] text-nf-subtle">
          Seu acervo
        </h2>
        <ul className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
          {stats.map((stat) => (
            <li key={stat.label}>
              <Link
                href={stat.href}
                className="block rounded-nf-lg border border-nf-line bg-nf-surface px-4 py-4 transition-colors hover:border-nf-line-strong sm:px-5"
              >
                <span className="block text-xl font-semibold tabular-nums text-nf-text sm:text-2xl">
                  {stat.value}
                </span>
                <span className="block text-[13px] text-nf-muted">{stat.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="albuns-recentes">
        <div className="flex items-center justify-between">
          <h2 id="albuns-recentes" className="text-xs font-medium uppercase tracking-[0.08em] text-nf-subtle">
            Álbuns recentes
          </h2>
          <Link
            href="/acervo/albuns"
            className="inline-flex items-center gap-1 text-sm font-medium text-nf-muted hover:text-nf-text"
          >
            Ver todos <ArrowRight size={15} aria-hidden />
          </Link>
        </div>
        {albums.length === 0 ? (
          <EmptyState
            className="mt-3"
            title="Seu acervo está vazio"
            description="Importe suas fotos para começar a encontrar qualquer uma delas em segundos."
            action={<Button href="/acervo/importar">Importar fotos</Button>}
          />
        ) : (
          <div className="-mx-4 mt-3 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0">
            {albums.map((album) => (
              <div key={album.id} className="w-[62%] shrink-0 snap-start sm:w-auto">
                <AlbumCard album={album} compact />
              </div>
            ))}
          </div>
        )}
      </section>

      <DemoNotice />
    </div>
  );
}
