import type { Metadata } from "next";
import { listAlbums } from "@/lib/api/albums";
import { ImportFlow } from "@/components/import/ImportFlow";

export const metadata: Metadata = { title: "Importar fotos" };

export default async function ImportPage({ searchParams }: PageProps<"/acervo/importar">) {
  const { album, origem } = await searchParams;
  const albums = (await listAlbums()).filter((a) => a.status !== "processing");
  const initialAlbumId = typeof album === "string" && albums.some((a) => a.id === album) ? album : undefined;
  const initialSource = origem === "dispositivo" ? "device" : origem === "upload" ? "upload" : undefined;

  return (
    <div className="max-w-3xl">
      <ImportFlow
        albums={albums.map((a) => ({ id: a.id, name: a.name }))}
        initialAlbumId={initialAlbumId}
        initialSource={initialSource}
      />
    </div>
  );
}
