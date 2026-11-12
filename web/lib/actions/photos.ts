"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/server/db";
import { ValidationError } from "@/lib/server/repos/collections";
import { createAlbum, deleteAlbum, removePhotosFromCollection, renameAlbum, retryFailedPhotos } from "@/lib/server/repos/photos";
import { requireAdmin } from "@/lib/server/session";
import { getStorage } from "@/lib/server/storage";
import { ForbiddenError, NotFoundError } from "@/lib/server/tenant-types";
import { wakeWorker } from "@/lib/server/worker";

export type AlbumFormState = { error?: string };

function explain(err: unknown) {
  if (err instanceof ValidationError || err instanceof ForbiddenError || err instanceof NotFoundError) return err.message;
  console.error(err);
  return "Algo deu errado. Tente de novo.";
}

export async function createAlbumAction(_: AlbumFormState, form: FormData): Promise<AlbumFormState> {
  const ctx = await requireAdmin();
  const collectionId = String(form.get("collectionId") ?? "");
  let albumId: string;
  try {
    albumId = (await createAlbum(db, ctx, collectionId, String(form.get("name") ?? ""))).id;
  } catch (err) {
    return { error: explain(err) };
  }
  revalidatePath(`/acervos/${collectionId}`);
  redirect(`/acervos/${collectionId}?album=${albumId}`);
}

export async function renameAlbumAction(_: AlbumFormState, form: FormData): Promise<AlbumFormState> {
  const ctx = await requireAdmin();
  const collectionId = String(form.get("collectionId") ?? "");
  const albumId = String(form.get("albumId") ?? "");
  try {
    await renameAlbum(db, ctx, collectionId, albumId, String(form.get("name") ?? ""));
  } catch (err) {
    return { error: explain(err) };
  }
  revalidatePath(`/acervos/${collectionId}`);
  return {};
}

export async function deleteAlbumAction(form: FormData) {
  const ctx = await requireAdmin();
  const collectionId = String(form.get("collectionId") ?? "");
  await deleteAlbum(db, ctx, collectionId, String(form.get("albumId") ?? ""));
  revalidatePath(`/acervos/${collectionId}`);
  redirect(`/acervos/${collectionId}`);
}

/** Tira fotos do acervo; as que não estão em outro acervo são apagadas de vez. */
export async function removePhotosAction(collectionId: string, photoIds: string[]): Promise<{ error?: string; removed?: number }> {
  const ctx = await requireAdmin();
  try {
    const { removed, deletedKeys } = await removePhotosFromCollection(db, ctx, collectionId, photoIds.slice(0, 500));
    await getStorage()?.remove(deletedKeys).catch((err) => console.error("[storage] falha ao apagar originais", err));
    revalidatePath(`/acervos/${collectionId}`);
    revalidatePath("/painel");
    revalidatePath("/assinatura");
    return { removed };
  } catch (err) {
    return { error: explain(err) };
  }
}

export async function retryFailedAction(form: FormData) {
  const ctx = await requireAdmin();
  const collectionId = String(form.get("collectionId") ?? "");
  const n = await retryFailedPhotos(db, ctx, collectionId);
  if (n > 0) await wakeWorker();
  revalidatePath(`/acervos/${collectionId}`);
}
