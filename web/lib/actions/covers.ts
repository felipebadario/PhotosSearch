"use server";

import sharp from "sharp";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/server/db";
import { saveCover } from "@/lib/server/repos/covers";
import { requireAdmin } from "@/lib/server/session";
import { ForbiddenError, NotFoundError } from "@/lib/server/tenant-types";

export async function updateCoverAction(collectionId: string | null, _prev: { message: string }, form: FormData) {
  const ctx = await requireAdmin();
  let image: string | null = null;
  if (form.get("intent") !== "remove") {
    const file = form.get("image");
    if (!(file instanceof File) || !file.size || file.size > 4 * 1024 * 1024) {
      return { message: "Escolha uma imagem de até 4 MB." };
    }
    try {
      const original = sharp(await file.arrayBuffer(), { limitInputPixels: 50_000_000 });
      const { format } = await original.metadata();
      if (!["jpeg", "png", "webp"].includes(format)) return { message: "Use uma imagem JPG, PNG ou WebP." };
      const jpeg = await original.rotate().resize(1440, 480, { fit: "cover" }).flatten({ background: "#fff" }).jpeg({ quality: 82 }).toBuffer();
      image = "data:image/jpeg;base64," + jpeg.toString("base64");
    } catch {
      return { message: "Não foi possível ler a imagem. Escolha outra foto." };
    }
  }
  try {
    await saveCover(db, ctx, collectionId, image);
  } catch (err) {
    if (err instanceof ForbiddenError || err instanceof NotFoundError) return { message: err.message };
    throw err;
  }
  revalidatePath(collectionId === null ? "/configuracoes" : `/acervos/${collectionId}`);
  return { message: image ? "Capa atualizada." : "Capa removida." };
}
