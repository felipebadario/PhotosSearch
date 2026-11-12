import "server-only";
import { ValidationError } from "./repos/collections.ts";
import { ForbiddenError, NotFoundError } from "./tenant-types.ts";

export const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

/** Traduz os erros do domínio em respostas com mensagem em português. */
export function errorResponse(err: unknown) {
  if (err instanceof ValidationError) return json({ error: err.message, field: err.field }, 400);
  if (err instanceof ForbiddenError) return json({ error: err.message }, 403);
  if (err instanceof NotFoundError) return json({ error: err.message }, 404);
  console.error(err);
  return json({ error: "Algo deu errado. Tente de novo." }, 500);
}

/** Pedidos que mudam dados só valem vindos do próprio site. */
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
