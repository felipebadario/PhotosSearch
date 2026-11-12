import { revalidatePath } from "next/cache";
import { db } from "@/lib/server/db";
import { errorResponse, json, sameOrigin } from "@/lib/server/http";
import { completeUploads } from "@/lib/server/repos/photos";
import { getTenant } from "@/lib/server/session";
import { getStorage } from "@/lib/server/storage";

/** Etapa 2 do envio: confirma que os arquivos chegaram e coloca as fotos no acervo. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Origem não permitida." }, 403);
  const ctx = await getTenant();
  if (!ctx) return json({ error: "Entre de novo para continuar." }, 401);
  const storage = getStorage();
  if (!storage) return json({ error: "O armazenamento de fotos ainda não foi configurado." }, 503);

  try {
    const body = (await req.json()) as { collectionId?: string; albumId?: string | null; photoIds?: string[] };
    const collectionId = String(body.collectionId ?? "");
    const result = await completeUploads(
      db,
      ctx,
      {
        collectionId,
        albumId: body.albumId ? String(body.albumId) : null,
        photoIds: (Array.isArray(body.photoIds) ? body.photoIds : []).map(String),
      },
      (key) => storage.head(key),
    );
    revalidatePath(`/acervos/${collectionId}`);
    revalidatePath("/painel");
    return json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
