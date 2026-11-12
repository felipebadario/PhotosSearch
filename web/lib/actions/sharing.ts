"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/server/db";
import { setCollectionSharing } from "@/lib/server/repos/public";
import { requireAdmin } from "@/lib/server/session";

export async function setSharingAction(form: FormData) {
  const ctx = await requireAdmin();
  const collectionId = String(form.get("collectionId") ?? "");
  await setCollectionSharing(db, ctx, collectionId, form.get("shared") === "1");
  revalidatePath(`/acervos/${collectionId}`);
}
