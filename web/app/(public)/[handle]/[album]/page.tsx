import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicAlbum } from "@/lib/api/public";
import { PublicSelfieSearch } from "@/components/public/PublicSelfieSearch";

export async function generateMetadata({ params }: PageProps<"/[handle]/[album]">): Promise<Metadata> {
  const { handle, album } = await params;
  const publicAlbum = await getPublicAlbum(handle, album);
  if (!publicAlbum) return { title: "Álbum não encontrado" };
  return {
    title: publicAlbum.albumName,
    description: `Encontre suas fotos de ${publicAlbum.albumName} com uma selfie.`,
  };
}

export default async function PublicAlbumPage({ params }: PageProps<"/[handle]/[album]">) {
  const { handle, album } = await params;
  const publicAlbum = await getPublicAlbum(handle, album);
  if (!publicAlbum) notFound();
  return <PublicSelfieSearch album={publicAlbum} />;
}
