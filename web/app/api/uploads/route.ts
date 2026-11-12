import { db } from "@/lib/server/db";
import { errorResponse, json, sameOrigin } from "@/lib/server/http";
import { createAlbum, requestUploads, type UploadFile } from "@/lib/server/repos/photos";
import { getTenant } from "@/lib/server/session";
import { getStorage, photoKey } from "@/lib/server/storage";

/** Etapa 1 do envio: deduplica pelo SHA-256, checa a franquia e devolve URLs assinadas. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Origem não permitida." }, 403);
  const ctx = await getTenant();
  if (!ctx) return json({ error: "Entre de novo para continuar." }, 401);
  const storage = getStorage();
  if (!storage) return json({ error: "O armazenamento de fotos ainda não foi configurado." }, 503);

  try {
    const body = (await req.json()) as {
      collectionId?: string;
      albumId?: string | null;
      albumName?: string | null;
      files?: UploadFile[];
    };
    const collectionId = String(body.collectionId ?? "");
    const files = (Array.isArray(body.files) ? body.files : []).map((f) => ({
      clientId: String(f.clientId ?? ""),
      name: String(f.name ?? ""),
      size: Number(f.size),
      type: String(f.type ?? ""),
      sha256: String(f.sha256 ?? "").toLowerCase(),
    }));
    let albumId = body.albumId ? String(body.albumId) : null;
    if (!albumId && body.albumName) albumId = (await createAlbum(db, ctx, collectionId, String(body.albumName))).id;

    const result = await requestUploads(db, ctx, { collectionId, albumId, files }, (sha) => photoKey(ctx.organizationId, sha));
    const items = await Promise.all(
      result.items.map(async (item) => {
        if (item.status !== "upload") return item;
        const upload = await storage.presignPut(item.key, { contentType: item.type, sha256Hex: item.sha256 });
        return { clientId: item.clientId, status: item.status, photoId: item.photoId, upload };
      }),
    );
    return json({ albumId, items, usage: result.usage });
  } catch (err) {
    return errorResponse(err);
  }
}
