import type { Metadata } from "next";
import { listAlbums } from "@/lib/api/albums";
import { FaceSearch } from "@/components/search/FaceSearch";

export const metadata: Metadata = { title: "Buscar por rosto" };

export default async function FaceSearchPage({ searchParams }: PageProps<"/buscar/rosto">) {
  const { album } = await searchParams;
  const albums = (await listAlbums()).filter((a) => a.photoCount > 0 && a.status !== "processing");
  const initialAlbumId = typeof album === "string" && albums.some((a) => a.id === album) ? album : undefined;

  return (
    <FaceSearch
      albums={albums.map((a) => ({ id: a.id, name: a.name }))}
      initialAlbumId={initialAlbumId}
    />
  );
}
