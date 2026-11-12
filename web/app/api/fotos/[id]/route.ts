import { db } from "@/lib/server/db";
import { errorResponse, json } from "@/lib/server/http";
import { getPhoto } from "@/lib/server/repos/photos";
import { getTenant } from "@/lib/server/session";
import { getStorage } from "@/lib/server/storage";

/** Mostra a foto a um membro da organização: redireciona para uma URL de leitura temporária. */
export async function GET(_: Request, route: RouteContext<"/api/fotos/[id]">) {
  const ctx = await getTenant();
  if (!ctx) return json({ error: "Entre de novo para continuar." }, 401);
  const storage = getStorage();
  if (!storage) return json({ error: "O armazenamento de fotos ainda não foi configurado." }, 503);
  try {
    const { id } = await route.params;
    const photo = await getPhoto(db, ctx, id);
    if (!photo.storageKey) return json({ error: "Foto sem arquivo." }, 404);
    const url = await storage.presignGet(photo.storageKey);
    return new Response(null, { status: 302, headers: { location: url, "cache-control": "private, max-age=300" } });
  } catch (err) {
    return errorResponse(err);
  }
}
