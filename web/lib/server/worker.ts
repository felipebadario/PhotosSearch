import "server-only";

/**
 * Cliente do serviço de rostos (Fly.io). Só o servidor do Next fala com ele,
 * com um segredo compartilhado; o navegador nunca vê o endereço nem o segredo.
 */
const url = () => (process.env.WORKER_URL ?? "").replace(/\/+$/, "");
const secret = () => process.env.WORKER_SECRET ?? "";

export const workerConfigured = () => Boolean(url() && secret());

export class SelfieError extends Error {
  code: "no_face" | "invalid_image" | "too_large";
  constructor(code: SelfieError["code"], message: string) {
    super(message);
    this.code = code;
    this.name = "SelfieError";
  }
}

/** Avisa o serviço que há fotos novas na fila. Se falhar, ele acha sozinho no próximo ciclo. */
export async function wakeWorker() {
  if (!workerConfigured()) return;
  try {
    await fetch(`${url()}/wake`, { method: "POST", headers: { authorization: `Bearer ${secret()}` }, signal: AbortSignal.timeout(3000) });
  } catch {
    // sem problema: o serviço consulta a fila a cada poucos segundos
  }
}

export type WorkerMatch = { photo_id: string; similarity: number };

/** Procura a selfie dentro de um acervo. A selfie passa só em memória e não é gravada. */
export async function searchSelfie(selfie: Blob, organizationId: string, collectionId: string, threshold: number): Promise<WorkerMatch[]> {
  const form = new FormData();
  form.set("selfie", selfie, "selfie.jpg");
  form.set("organization_id", organizationId);
  form.set("collection_id", collectionId);
  form.set("threshold", String(threshold));
  const res = await fetch(`${url()}/search`, {
    method: "POST",
    headers: { authorization: `Bearer ${secret()}` },
    body: form,
    signal: AbortSignal.timeout(25_000),
  });
  if (res.status === 413) throw new SelfieError("too_large", "A selfie é grande demais. Tente outra.");
  if (res.status === 422) {
    const body = (await res.json().catch(() => ({}))) as { detail?: { code?: string; message?: string } };
    const code = body.detail?.code === "no_face" ? "no_face" : "invalid_image";
    throw new SelfieError(code, body.detail?.message ?? "Não foi possível usar esta selfie.");
  }
  if (!res.ok) throw new Error(`Serviço de rostos respondeu ${res.status}`);
  return ((await res.json()) as { matches: WorkerMatch[] }).matches;
}

export async function workerStatus() {
  const res = await fetch(`${url()}/status`, { headers: { authorization: `Bearer ${secret()}` }, signal: AbortSignal.timeout(5000), cache: "no-store" });
  if (!res.ok) throw new Error(`status ${res.status}`);
  return res.json();
}
