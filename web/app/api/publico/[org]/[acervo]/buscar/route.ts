import { db } from "@/lib/server/db";
import { json, sameOrigin } from "@/lib/server/http";
import { getPublicCollection, getPublicPhotosByIds, logSearch, recentSearchCount, searchReadiness } from "@/lib/server/repos/public";
import { createPhotoToken } from "@/lib/server/public-photo-token";
import { SelfieError, searchSelfie, workerConfigured } from "@/lib/server/worker";

const MAX_SELFIE_BYTES = 4 * 1024 * 1024; // o navegador reduz a selfie antes de enviar
const PER_COLLECTION_PER_MINUTE = 120;
const PER_IP_PER_MINUTE = 10;

// Limite por IP em memória: protege cada instância; o limite por acervo (no banco) vale para todas.
const hits = new Map<string, number[]>();
function ipLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (v.every((t) => now - t >= 60_000)) hits.delete(k);
  return recent.length > PER_IP_PER_MINUTE;
}

/**
 * Busca por selfie dentro de UM acervo compartilhado por link. A selfie vive só na memória
 * desta requisição e do serviço de rostos: não é gravada, nem o vetor dela. O log guarda só a contagem.
 */
export async function POST(req: Request, route: RouteContext<"/api/publico/[org]/[acervo]/buscar">) {
  if (!sameOrigin(req)) return json({ error: "Origem não permitida." }, 403);
  if (!workerConfigured()) return json({ error: "A busca por selfie ainda não está disponível." }, 503);
  const { org, acervo } = await route.params;
  const collection = await getPublicCollection(db, org, acervo);
  if (!collection || collection.state !== "open") return json({ error: "Página não encontrada." }, 404);

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "desconhecido";
  if (ipLimited(ip) || (await recentSearchCount(db, collection, 60)) >= PER_COLLECTION_PER_MINUTE) {
    return json({ error: "Muitas buscas em pouco tempo. Aguarde um minuto e tente de novo." }, 429);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: "Não foi possível ler a selfie. Tente de novo." }, 400);
  }
  if (form.get("consent") !== "1") return json({ error: "Confirme que concorda em usar sua selfie só para esta busca." }, 400);
  const selfie = form.get("selfie");
  if (!(selfie instanceof Blob) || selfie.size === 0) return json({ error: "Envie uma selfie." }, 400);
  if (selfie.size > MAX_SELFIE_BYTES) return json({ error: "A selfie é grande demais. Tente outra." }, 413);

  try {
    const matches = await searchSelfie(selfie, collection.organizationId, collection.id, collection.matchThreshold);
    const rows = await getPublicPhotosByIds(db, collection, matches.map((m) => m.photo_id));
    const byId = new Map(rows.map((r) => [r.id, r]));
    const photos = matches.flatMap((m) => {
      const r = byId.get(m.photo_id);
      return r ? [{ id: r.id, token: createPhotoToken(collection.id, r.id), albumName: r.albumName, takenAt: r.takenAt ? r.takenAt.toISOString() : null }] : [];
    });
    await logSearch(db, collection, photos.length);
    const ready = await searchReadiness(db, collection);
    return json({ photos, pending: ready.pending, searchable: ready.searchable });
  } catch (err) {
    if (err instanceof SelfieError) return json({ error: err.message, code: err.code }, 422);
    const cause = err instanceof Error && err.cause instanceof Error ? ` (${(err.cause as Error & { code?: string }).code ?? ""} ${err.cause.message})` : "";
    let host = "";
    try {
      host = new URL(process.env.WORKER_URL ?? "").host;
    } catch {
      host = "WORKER_URL inválida";
    }
    console.error("[busca] falha", err instanceof Error ? err.message : err, cause, `worker=${host}`);
    return json({ error: "A busca não respondeu agora. Tente de novo em instantes." }, 502);
  }
}
