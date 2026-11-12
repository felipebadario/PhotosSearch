// Lado do Next da busca facial: só o acervo aberto, contagem sem selfie e fila de indexação por organização.
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { eq, inArray } from "drizzle-orm";
import { db, sql } from "../lib/server/db/index.ts";
import { member, organization, photos, searchLogs, user } from "../lib/server/db/schema/index.ts";
import { createCollection } from "../lib/server/repos/collections.ts";
import { completeUploads, getIndexingStats, listCollectionPhotos, requestUploads, retryFailedPhotos } from "../lib/server/repos/photos.ts";
import { getPublicCollection, getPublicPhotosByIds, logSearch, recentSearchCount, searchReadiness, setCollectionSharing } from "../lib/server/repos/public.ts";
import { ForbiddenError, NotFoundError, type TenantContext } from "../lib/server/tenant-types.ts";

const run = randomUUID().slice(0, 8);
const orgIds: string[] = [];
const userIds: string[] = [];

async function tenant(label: string): Promise<TenantContext & { slug: string }> {
  const organizationId = `org-${label}-${run}`;
  const userId = `user-${label}-${run}`;
  const slug = `srch-${label}-${run}`;
  await db.insert(user).values({ id: userId, name: label, email: `${label}-${run}@teste.nossafoto.app` });
  await db.insert(organization).values({ id: organizationId, name: `Org ${label}`, slug, createdAt: new Date() });
  await db.insert(member).values({ id: randomUUID(), organizationId, userId, role: "owner", createdAt: new Date() });
  orgIds.push(organizationId);
  userIds.push(userId);
  return { organizationId, userId, role: "owner", slug };
}

async function sendOne(ctx: TenantContext, collectionId: string, i: number) {
  const f = { clientId: "0", name: `IMG_${i}.jpg`, size: 100 + i, type: "image/jpeg", sha256: createHash("sha256").update(`srch-${run}-${i}`).digest("hex") };
  const res = await requestUploads(db, ctx, { collectionId, files: [f] }, (sha) => `org/${ctx.organizationId}/${sha}`);
  const item = res.items[0];
  if (item.status === "upload") await completeUploads(db, ctx, { collectionId, photoIds: [item.photoId] }, async () => ({ size: f.size }));
}

after(async () => {
  await db.delete(organization).where(inArray(organization.id, orgIds));
  await db.delete(user).where(inArray(user.id, userIds));
  await sql.end();
});

describe("busca facial: lado do app", () => {
  let a: TenantContext & { slug: string };
  let b: TenantContext & { slug: string };
  let acervo: { id: string; slug: string };
  let outro: { id: string; slug: string };

  before(async () => {
    a = await tenant("a");
    b = await tenant("b");
    acervo = await createCollection(db, a, { kind: "permanent", name: "Aberto" });
    outro = await createCollection(db, a, { kind: "permanent", name: "Outro" });
    for (const i of [1, 2, 3]) await sendOne(a, acervo.id, i);
    await sendOne(a, outro.id, 4);
    await setCollectionSharing(db, a, acervo.id, true);
  });

  it("ids de fora do acervo aberto são ignorados, mesmo que o serviço os devolvesse", async () => {
    const c = (await getPublicCollection(db, a.slug, acervo.slug))!;
    const meus = (await listCollectionPhotos(db, a, acervo.id)).map((p) => p.id);
    const dele = (await listCollectionPhotos(db, a, outro.id))[0].id;
    const got = await getPublicPhotosByIds(db, c, [...meus, dele, "nao-existe"]);
    assert.deepEqual(got.map((g) => g.id).sort(), [...meus].sort());
  });

  it("acervo privado ou encerrado não devolve nada", async () => {
    const meus = (await listCollectionPhotos(db, a, acervo.id)).map((p) => p.id);
    const c = (await getPublicCollection(db, a.slug, acervo.slug))!;
    assert.equal((await getPublicPhotosByIds(db, { ...c, state: "closed" }, meus)).length, 0);
  });

  it("mostra quantas fotos já dá para buscar e quantas estão na fila", async () => {
    const c = (await getPublicCollection(db, a.slug, acervo.slug))!;
    assert.deepEqual(await searchReadiness(db, c), { searchable: 0, pending: 3 });
    const [first] = await listCollectionPhotos(db, a, acervo.id);
    await db.update(photos).set({ status: "indexed" }).where(eq(photos.id, first.id));
    assert.deepEqual(await searchReadiness(db, c), { searchable: 1, pending: 2 });
  });

  it("o registro da busca guarda só a contagem", async () => {
    const c = (await getPublicCollection(db, a.slug, acervo.slug))!;
    const before = await recentSearchCount(db, c, 60);
    await logSearch(db, c, 2);
    assert.equal(await recentSearchCount(db, c, 60), before + 1);
    const rows = await db.select().from(searchLogs).where(eq(searchLogs.collectionId, acervo.id));
    assert.deepEqual(Object.keys(rows[0]).sort(), ["collectionId", "createdAt", "id", "matchCount", "organizationId"]);
  });

  it("o Admin vê o andamento e o motivo das falhas, e pode tentar de novo", async () => {
    const fotos = await listCollectionPhotos(db, a, acervo.id);
    await db.update(photos).set({ status: "error", errorMessage: "Não foi possível ler a imagem." }).where(eq(photos.id, fotos[1].id));
    const stats = await getIndexingStats(db, a, acervo.id);
    assert.equal(stats.failed, 1);
    assert.equal(stats.failures[0].message, "Não foi possível ler a imagem.");
    assert.equal(await retryFailedPhotos(db, a, acervo.id), 1);
    const [again] = await db.select().from(photos).where(eq(photos.id, fotos[1].id));
    assert.equal(again.status, "queued");
    assert.equal(again.errorMessage, null);
  });

  it("outra organização não vê o andamento nem reenvia fotos que falharam", async () => {
    await assert.rejects(retryFailedPhotos(db, b, acervo.id), NotFoundError);
    assert.deepEqual(await getIndexingStats(db, b, acervo.id), { indexed: 0, pending: 0, failed: 0, failures: [] });
    await assert.rejects(retryFailedPhotos(db, { ...a, role: "visitante" as TenantContext["role"] }, acervo.id), ForbiddenError);
  });
});
