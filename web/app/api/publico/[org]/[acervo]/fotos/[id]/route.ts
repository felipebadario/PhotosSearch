import { db } from "@/lib/server/db";
import { getPublicCollection, getPublicPhoto } from "@/lib/server/repos/public";
import { getStorage } from "@/lib/server/storage";

const gone = () => new Response(null, { status: 404, headers: { "cache-control": "no-store" } });

/**
 * Foto de um acervo compartilhado por link, sem login. Confere a cada pedido que o
 * acervo está aberto e que a foto é dele, e então redireciona para uma URL temporária.
 */
export async function GET(req: Request, route: RouteContext<"/api/publico/[org]/[acervo]/fotos/[id]">) {
  const { org, acervo, id } = await route.params;
  const storage = getStorage();
  if (!storage) return gone();
  const collection = await getPublicCollection(db, org, acervo);
  if (!collection) return gone();
  const photo = await getPublicPhoto(db, collection, id);
  if (!photo?.storageKey) return gone();
  const download = new URL(req.url).searchParams.has("baixar") && collection.allowDownload;
  const url = await storage.presignGet(photo.storageKey, download ? { downloadName: photo.name ?? "foto.jpg" } : undefined);
  return new Response(null, { status: 302, headers: { location: url, "cache-control": "private, max-age=300" } });
}
