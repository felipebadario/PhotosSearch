import { notFound } from "next/navigation";
import { getPublicAlbum } from "@/lib/api/public";
import { SelfieSearch } from "@/components/public/SelfieSearch";

export default async function PublicAlbumPage({
  params,
}: {
  params: Promise<{ org: string; album: string }>;
}) {
  const { org, album } = await params;
  const publicAlbum = await getPublicAlbum(org, album);
  if (!publicAlbum) notFound();

  return <SelfieSearch album={publicAlbum} />;
}
