import { readLocal, verifyLocal, writeLocal } from "@/lib/server/storage/local";
import { getStorage } from "@/lib/server/storage";

/** Só existe quando o armazenamento local está ativo (desenvolvimento e testes). */
function enabled() {
  return getStorage()?.name === "local";
}

function parse(req: Request, key: string[]) {
  const q = new URL(req.url).searchParams;
  return { key: key.join("/"), exp: Number(q.get("exp")), sha: q.get("sha") ?? "", sig: q.get("sig") ?? "" };
}

export async function PUT(req: Request, route: RouteContext<"/api/storage/local/[...key]">) {
  if (!enabled()) return new Response(null, { status: 404 });
  const p = parse(req, (await route.params).key);
  if (!verifyLocal("put", p.key, p.exp, p.sha, p.sig)) return new Response("Assinatura inválida.", { status: 403 });
  const body = Buffer.from(await req.arrayBuffer());
  if (!(await writeLocal(p.key, body, p.sha))) return new Response("Conteúdo não confere.", { status: 400 });
  return new Response(null, { status: 200 });
}

export async function GET(req: Request, route: RouteContext<"/api/storage/local/[...key]">) {
  if (!enabled()) return new Response(null, { status: 404 });
  const p = parse(req, (await route.params).key);
  if (!verifyLocal("get", p.key, p.exp, "", p.sig)) return new Response("Assinatura inválida.", { status: 403 });
  try {
    const data = await readLocal(p.key);
    const dl = new URL(req.url).searchParams.get("dl");
    const headers: Record<string, string> = { "content-type": "image/jpeg", "cache-control": "private, max-age=300" };
    if (dl) headers["content-disposition"] = `attachment; filename="${dl.replace(/[^\x20-\x7e]|"/g, "")}"`;
    return new Response(new Uint8Array(data), { headers });
  } catch {
    return new Response(null, { status: 404 });
  }
}
