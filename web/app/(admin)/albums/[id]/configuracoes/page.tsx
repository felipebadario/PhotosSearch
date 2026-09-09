import { notFound } from "next/navigation";
import { getAlbum } from "@/lib/api/albums";
import { AlbumSettingsForm } from "@/components/albums/AlbumSettingsForm";

export default async function AlbumSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const album = await getAlbum(id);
  if (!album) notFound();

  return <AlbumSettingsForm album={album} />;
}
