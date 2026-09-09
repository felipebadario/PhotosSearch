import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAlbum } from "@/lib/api/albums";
import { StatusBadge } from "@/components/ui/Badge";
import { AlbumTabs } from "@/components/albums/AlbumTabs";

export default async function AlbumDetailLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const album = await getAlbum(id);
  if (!album) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/albums" className="text-sm font-medium text-df-muted hover:text-df-ink">
          ← Álbuns
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-bold text-df-ink">{album.name}</h1>
          <StatusBadge status={album.status} />
        </div>
      </div>
      <AlbumTabs albumId={album.id} />
      {children}
    </div>
  );
}
