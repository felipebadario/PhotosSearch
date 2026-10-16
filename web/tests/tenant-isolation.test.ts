// Prova do critério de aceite da P0.1: a organização A não lê nem altera
// nada da organização B. Roda contra o banco de DATABASE_URL (local ou de teste).
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { inArray } from "drizzle-orm";
import { db, sql } from "../lib/server/db/index.ts";
import { member, organization, user } from "../lib/server/db/schema/index.ts";
import {
  createCollection,
  deleteCollection,
  getCollection,
  listCollections,
  updateCollection,
} from "../lib/server/repos/collections.ts";
import { ForbiddenError, NotFoundError, type TenantContext } from "../lib/server/tenant-types.ts";

const run = randomUUID().slice(0, 8);
const orgIds: string[] = [];
const userIds: string[] = [];

async function tenant(label: string, role: TenantContext["role"] = "owner"): Promise<TenantContext> {
  const organizationId = `org-${label}-${run}`;
  const userId = `user-${label}-${run}`;
  const now = new Date();
  await db.insert(user).values({ id: userId, name: label, email: `${label}-${run}@teste.nossafoto.app` });
  await db.insert(organization).values({ id: organizationId, name: `Org ${label}`, slug: `org-${label}-${run}`, createdAt: now });
  await db.insert(member).values({ id: randomUUID(), organizationId, userId, role, createdAt: now });
  orgIds.push(organizationId);
  userIds.push(userId);
  return { organizationId, userId, role };
}

after(async () => {
  await db.delete(organization).where(inArray(organization.id, orgIds));
  await db.delete(user).where(inArray(user.id, userIds));
  await sql.end();
});

describe("isolamento entre organizações", () => {
  let a: TenantContext;
  let b: TenantContext;
  let acervoB: string;

  before(async () => {
    a = await tenant("a");
    b = await tenant("b");
    acervoB = (await createCollection(db, b, { kind: "permanent", name: "Fotos da B" })).id;
    await createCollection(db, a, {
      kind: "event",
      name: "Congresso da A",
      startsAt: new Date("2026-11-01"),
      endsAt: new Date("2026-11-03"),
    });
  });

  it("a listagem de A só mostra os acervos de A", async () => {
    const lista = await listCollections(db, a);
    assert.equal(lista.length, 1);
    assert.equal(lista[0].name, "Congresso da A");
    assert.ok(lista.every((c) => c.organizationId === a.organizationId));
  });

  it("A não lê um acervo de B pelo id", async () => {
    await assert.rejects(getCollection(db, a, acervoB), NotFoundError);
  });

  it("A não altera um acervo de B", async () => {
    await assert.rejects(updateCollection(db, a, acervoB, { kind: "permanent", name: "Invadido" }), NotFoundError);
    assert.equal((await getCollection(db, b, acervoB)).name, "Fotos da B");
  });

  it("A não exclui um acervo de B", async () => {
    await assert.rejects(deleteCollection(db, a, acervoB), NotFoundError);
    assert.ok(await getCollection(db, b, acervoB));
  });

  it("um contexto forjado com o id de B e papel inexistente não escreve", async () => {
    const forjado = { ...a, organizationId: b.organizationId, role: "visitante" as never };
    await assert.rejects(createCollection(db, forjado, { kind: "permanent", name: "x" }), ForbiddenError);
  });
});

describe("validação de acervos", () => {
  let c: TenantContext;
  before(async () => {
    c = await tenant("c");
  });

  it("evento exige início e fim, com fim depois do início", async () => {
    await assert.rejects(createCollection(db, c, { kind: "event", name: "Sem datas" }), /início e o fim/);
    await assert.rejects(
      createCollection(db, c, { kind: "event", name: "Invertido", startsAt: new Date("2026-05-02"), endsAt: new Date("2026-05-01") }),
      /depois do início/,
    );
  });

  it("nomes repetidos ganham endereços diferentes dentro da organização", async () => {
    const x = await createCollection(db, c, { kind: "permanent", name: "Culto de domingo" });
    const y = await createCollection(db, c, { kind: "permanent", name: "Culto de Domingo" });
    assert.equal(x.slug, "culto-de-domingo");
    assert.equal(y.slug, "culto-de-domingo-2");
  });

  it("acervo permanente ignora datas de evento", async () => {
    const p = await createCollection(db, c, { kind: "permanent", name: "Arquivo", startsAt: new Date(), endsAt: new Date() });
    assert.equal(p.startsAt, null);
    assert.equal(p.publicUntil, null);
  });
});
