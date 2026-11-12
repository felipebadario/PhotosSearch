"use server";

import { revalidatePath } from "next/cache";
import { parseDriveFolderLink } from "@/lib/drive-link";
import { db } from "@/lib/server/db";
import { checkPublicFolder, driveConfigured, DriveFolderError } from "@/lib/server/google-drive";
import { ValidationError } from "@/lib/server/repos/collections";
import { addDriveSource, removeDriveSource, requestDriveSync } from "@/lib/server/repos/drive";
import { requireAdmin } from "@/lib/server/session";
import { ForbiddenError, NotFoundError } from "@/lib/server/tenant-types";
import { wakeWorker } from "@/lib/server/worker";

export type DriveFormState = { error?: string; ok?: string };

function explain(err: unknown) {
  if (err instanceof ValidationError || err instanceof ForbiddenError || err instanceof NotFoundError || err instanceof DriveFolderError) return err.message;
  console.error(err);
  return "Algo deu errado. Tente de novo.";
}

export async function addDriveSourceAction(_: DriveFormState, form: FormData): Promise<DriveFormState> {
  const ctx = await requireAdmin();
  const collectionId = String(form.get("collectionId") ?? "");
  if (!driveConfigured()) return { error: "A importação do Google Drive ainda não está ativa." };
  const link = parseDriveFolderLink(String(form.get("link") ?? ""));
  if (!link) return { error: "Cole o link de uma pasta do Google Drive, como https://drive.google.com/drive/folders/…" };
  try {
    const { name } = await checkPublicFolder(link);
    await addDriveSource(db, ctx, { collectionId, ...link, folderName: name });
  } catch (err) {
    return { error: explain(err) };
  }
  await wakeWorker();
  revalidatePath(`/acervos/${collectionId}`);
  return { ok: "Pasta ligada. As fotos começam a chegar em instantes." };
}

export async function syncDriveSourceAction(form: FormData) {
  const ctx = await requireAdmin();
  const collectionId = String(form.get("collectionId") ?? "");
  await requestDriveSync(db, ctx, collectionId, String(form.get("sourceId") ?? ""));
  await wakeWorker();
  revalidatePath(`/acervos/${collectionId}`);
}

export async function removeDriveSourceAction(form: FormData) {
  const ctx = await requireAdmin();
  const collectionId = String(form.get("collectionId") ?? "");
  await removeDriveSource(db, ctx, collectionId, String(form.get("sourceId") ?? ""));
  revalidatePath(`/acervos/${collectionId}`);
}
