import { createHash, randomUUID } from "node:crypto";
import { json } from "@/lib/server/http";
import { can } from "@/lib/server/permissions";
import { getTenant } from "@/lib/server/session";
import { getStorage } from "@/lib/server/storage";

type Step = { etapa: string; ok: boolean; detalhe?: string };

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

/**
 * Autoteste do armazenamento, para donos e administradores: envia um arquivo de teste
 * pela mesma URL assinada que o navegador usa, confere que um conteúdo diferente do
 * hash declarado é recusado, lê de volta e apaga. Não toca em nenhuma foto.
 */
export async function GET(req: Request) {
  const ctx = await getTenant();
  if (!ctx) return json({ error: "Entre de novo para continuar." }, 401);
  if (!can(ctx.role, { organization: ["update"] })) return json({ error: "Só donos e administradores podem verificar o armazenamento." }, 403);
  const storage = getStorage();
  if (!storage) return json({ armazenamento: null, ok: false, erro: "As variáveis R2_* não chegaram a este deploy." }, 503);

  const origin = new URL(req.url).origin;
  const abs = (u: string) => (u.startsWith("/") ? origin + u : u);
  const id = randomUUID().replace(/-/g, "");
  const good = `org/${ctx.organizationId}/verificacao-${id}-a`;
  const bad = `org/${ctx.organizationId}/verificacao-${id}-b`;
  const content = `nossafoto verificacao ${id}`;
  const steps: Step[] = [];
  const step = async (etapa: string, fn: () => Promise<string | void>) => {
    try {
      steps.push({ etapa, ok: true, detalhe: (await fn()) || undefined });
    } catch (err) {
      steps.push({ etapa, ok: false, detalhe: err instanceof Error ? err.message : String(err) });
    }
  };

  await step("Enviar com URL assinada", async () => {
    const up = await storage.presignPut(good, { contentType: "image/jpeg", sha256Hex: sha(content) });
    const res = await fetch(abs(up.url), { method: "PUT", headers: up.headers, body: content });
    if (!res.ok) throw new Error(`resposta ${res.status}: ${(await res.text()).slice(0, 300)}`);
  });
  await step("Conferir que o arquivo chegou", async () => {
    const head = await storage.head(good);
    if (!head) throw new Error("o arquivo não foi encontrado");
    if (head.size !== Buffer.byteLength(content)) throw new Error(`tamanho ${head.size}, esperado ${Buffer.byteLength(content)}`);
  });
  await step("Recusar conteúdo que não bate com o hash", async () => {
    const up = await storage.presignPut(bad, { contentType: "image/jpeg", sha256Hex: sha(content) });
    const res = await fetch(abs(up.url), { method: "PUT", headers: up.headers, body: "conteudo trocado" });
    if (res.ok) throw new Error("o armazenamento aceitou um arquivo com conteúdo diferente do hash");
    return `recusado com resposta ${res.status}`;
  });
  await step("Ler com URL temporária", async () => {
    const res = await fetch(abs(await storage.presignGet(good)));
    if (!res.ok) throw new Error(`resposta ${res.status}`);
    if ((await res.text()) !== content) throw new Error("o conteúdo lido é diferente do enviado");
  });
  await step("Apagar", async () => {
    await storage.remove([good, bad]);
    if (await storage.head(good)) throw new Error("o arquivo continuou lá depois de apagado");
  });

  return json({ armazenamento: storage.name, ok: steps.every((s) => s.ok), etapas: steps });
}
