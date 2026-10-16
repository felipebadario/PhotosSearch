"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/server/db";
import {
  createCollection,
  deleteCollection,
  updateCollection,
  ValidationError,
  type CollectionInput,
} from "@/lib/server/repos/collections";
import { requireAdmin } from "@/lib/server/session";
import { ForbiddenError, NotFoundError } from "@/lib/server/tenant-types";

export type CollectionFormState = { error?: string; values?: Record<string, string> };

// O produto atende o Brasil; datas de evento são dias no fuso de Brasília
// (sem horário de verão desde 2019). O fim vale até 23:59 do dia.
const startOfDay = (d: string) => (d ? new Date(`${d}T00:00:00-03:00`) : null);
const endOfDay = (d: string) => (d ? new Date(`${d}T23:59:59-03:00`) : null);

function readForm(form: FormData) {
  const values = Object.fromEntries(
    ["kind", "name", "description", "startsAt", "endsAt", "publicUntil", "retentionDays"].map((k) => [k, String(form.get(k) ?? "").trim()]),
  );
  values.allowDownload = form.get("allowDownload") ? "on" : "";
  const input: CollectionInput = {
    kind: values.kind === "event" ? "event" : "permanent",
    name: values.name,
    description: values.description,
    startsAt: startOfDay(values.startsAt),
    endsAt: endOfDay(values.endsAt),
    publicUntil: endOfDay(values.publicUntil),
    retentionDays: values.retentionDays ? Number(values.retentionDays) : null,
    allowDownload: values.allowDownload === "on",
  };
  return { values, input };
}

function explain(err: unknown) {
  if (err instanceof ValidationError || err instanceof ForbiddenError || err instanceof NotFoundError) return err.message;
  console.error(err);
  return "Não foi possível salvar agora. Tente de novo em instantes.";
}

export async function createCollectionAction(_prev: CollectionFormState, form: FormData): Promise<CollectionFormState> {
  const ctx = await requireAdmin();
  const { values, input } = readForm(form);
  let id: string;
  try {
    id = (await createCollection(db, ctx, input)).id;
  } catch (err) {
    return { error: explain(err), values };
  }
  revalidatePath("/acervos");
  revalidatePath("/painel");
  redirect(`/acervos/${id}`);
}

export async function updateCollectionAction(_prev: CollectionFormState, form: FormData): Promise<CollectionFormState> {
  const ctx = await requireAdmin();
  const id = String(form.get("id") ?? "");
  const { values, input } = readForm(form);
  try {
    await updateCollection(db, ctx, id, input);
  } catch (err) {
    return { error: explain(err), values };
  }
  revalidatePath("/acervos", "layout");
  redirect(`/acervos/${id}?salvo=1`);
}

export async function deleteCollectionAction(form: FormData) {
  const ctx = await requireAdmin();
  await deleteCollection(db, ctx, String(form.get("id") ?? ""));
  revalidatePath("/acervos");
  revalidatePath("/painel");
  redirect("/acervos");
}
