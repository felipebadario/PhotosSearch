// Aplica as migrações de ./drizzle no banco de DATABASE_URL.
// Roda antes do `next build`; sem DATABASE_URL (build local ou CI sem banco), não faz nada.
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("[migrate] DATABASE_URL ausente: migrações não aplicadas.");
  process.exit(0);
}

const sql = postgres(url, { max: 1, onnotice: () => {} });
try {
  await migrate(drizzle({ client: sql }), { migrationsFolder: new URL("../drizzle", import.meta.url).pathname });
  console.log("[migrate] Banco atualizado.");
} finally {
  await sql.end();
}
