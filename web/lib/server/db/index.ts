import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.ts";

/**
 * postgres.js só abre conexão na primeira consulta, então o build não precisa
 * do banco. Em runtime, sem DATABASE_URL, a primeira consulta falha com a
 * mensagem abaixo.
 */
const url = process.env.DATABASE_URL;
if (!url && process.env.NEXT_PHASE !== "phase-production-build") {
  console.error("DATABASE_URL não configurada: conecte o Neon ao projeto na Vercel ou defina a variável em web/.env.local.");
}

const globalForDb = globalThis as unknown as { pg?: postgres.Sql };
const sql = (globalForDb.pg ??= postgres(url ?? "postgres://database-url-not-configured.invalid/db", {
  max: 5,
  prepare: false, // compatível com o pooler do Neon
}));

export const db = drizzle({ client: sql, schema });
export type Db = typeof db;
export { sql };
