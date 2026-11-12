// Critérios de aceite da P0.2: deduplicação por conteúdo, franquia e isolamento das fotos.
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { inArray } from "drizzle-orm";
import { db, sql } from "../lib/server/db/index.ts";
import { member, organization, subscriptions, user } from "../lib/server/db/schema/index.ts";
import { createCollection } from "../lib/server/repos/collections.ts";
import {
  completeUploads,
  countUsedPhotos,
  createAlbum,
  getPhoto,
  listCollectionPhotos,
  removePhotosFromCollection,
  requestUploads,
  type UploadFile,
} from "../lib/server/repos/photos.ts";
import { ForbiddenError, NotFoundError, type TenantContext } from "../lib/server/tenant-types.ts";

const run = randomUUID().slice(0, 8);
const orgIds: string[] = [];
const userIds: string[] = [];

async function tenant(label: string, role: TenantContext["role"] = "owner", photoLimit?: number): Promise<TenantContext> {
  const organizationId = `org-${label}-${run}`;
  const userId = `user-${label}-${run}`;
  const now = new Date();
  await db.insert(user).values({ id: userId, name: label, email: `${label}-${run}@teste.nossafoto.app` });
  await db.insert(organization).values({ id: organizationId, name: `Org ${label}`, slug: `org-${label}-${run}`, createdAt: now });
  await db.insert(member).values({ id: randomUUID(), organizationId, userId, role, createdAt: now });
  if (photoLimit != null) await db.insert(subscriptions).values({ organizationId, planId: "start", status: "active", photoLimit });
  orgIds.push(organizationId);
  userIds.push(userId);
  return { organizationId, userId, role };
}

async function member2(owner: TenantContext, label: string, role: TenantContext["role"]): Promise<TenantContext> {
  const userId = `user-${label}-${run}`;
  await db.insert(user).values({ id: userId, name: label, email: `${label}-${run}@teste.nossafoto.app` });
  await db.insert(member).values({ id: randomUUID(), organizationId: owner.organizationId, userId, role, createdAt: new Date() });
  userIds.push(userId);
  return { organizationId: owner.organizationId, userId, role };
}

const hash = (n: number) => createHash("sha256").update(`foto-${run}-${n}`).digest("hex");
const file = (n: number, i = n): UploadFile => ({ clientId: String(i), name: `IMG_${n}.jpg`, size: 1000 + n, type: "image/jpeg", sha256: hash(n) });
const key = (ctx: TenantContext) => (sha: string) => `org/${ctx.organizationId}/${sha}`;

/** Armazenamento de mentira: o arquivo "chegou" se a chave estiver no conjunto. */
function fakeStore() {
  const objects = new Map<string, number>();
  return { objects, head: async (k: string) => (objects.has(k) ? { size: objects.get(k)! } : null) };
}

/** Envia um lote inteiro como o navegador faria, em blocos de 100. */
async function sendAll(ctx: TenantContext, collectionId: string, files: UploadFile[], store: ReturnType<typeof fakeStore>) {
  const statuses: string[] = [];
  for (let i = 0; i < files.length; i += 100) {
    const chunk = files.slice(i, i + 100);
    const res = await requestUploads(db, ctx, { collectionId, files: chunk }, key(ctx));
    const ids: string[] = [];
    for (const it of res.items) {
      statuses.push(it.status);
      if (it.status === "upload") {
        const f = chunk.find((c) => c.clientId === it.clientId)!;
        store.objects.set(it.key, f.size);
        ids.push(it.photoId);
      }
    }
    await completeUploads(db, ctx, { collectionId, photoIds: ids }, store.head);
  }
  return statuses;
}

after(async () => {
  await db.delete(organization).where(inArray(organization.id, orgIds));
  await db.delete(user).where(inArray(user.id, userIds));
  await sql.end();
});

describe("deduplicação e franquia", () => {
  let a: TenantContext;
  let acervo: string;
  const store = fakeStore();

  before(async () => {
    a = await tenant("dedup");
    acervo = (await createCollection(db, a, { kind: "permanent", name: "Acervo" })).id;
  });

  it("500 fotos com 50 repetidas contam 450", async () => {
    const files = Array.from({ length: 500 }, (_, i) => file(i < 450 ? i : i - 450, i));
    const statuses = await sendAll(a, acervo, files, store);
    assert.equal(statuses.filter((s) => s === "upload").length, 450);
    assert.equal(await countUsedPhotos(db, a), 450);
    assert.equal((await listCollectionPhotos(db, a, acervo, { limit: 1000 })).length, 450);
  });

  it("reenviar o mesmo lote não gasta franquia nem duplica", async () => {
    const statuses = await sendAll(a, acervo, Array.from({ length: 20 }, (_, i) => file(i)), store);
    assert.ok(statuses.every((s) => s === "already_here"));
    assert.equal(await countUsedPhotos(db, a), 450);
  });

  it("a mesma foto em outro acervo entra sem novo envio e sem gastar franquia", async () => {
    const outro = (await createCollection(db, a, { kind: "permanent", name: "Outro" })).id;
    const statuses = await sendAll(a, outro, Array.from({ length: 10 }, (_, i) => file(i)), store);
    assert.ok(statuses.every((s) => s === "added"));
    assert.equal(await countUsedPhotos(db, a), 450);
    assert.equal((await listCollectionPhotos(db, a, outro)).length, 10);
  });

  it("excluir 10 fotos que só estão neste acervo libera 10", async () => {
    const fotos = await listCollectionPhotos(db, a, acervo, { limit: 1000 });
    // As mais recentes vieram do último bloco (conteúdos 400 a 449), que não estão no outro acervo.
    const soAqui = fotos.slice(0, 10);
    const res = await removePhotosFromCollection(db, a, acervo, soAqui.map((f) => f.id));
    assert.equal(res.removed, 10);
    assert.equal(res.deletedKeys.length, 10);
    assert.equal(await countUsedPhotos(db, a), 440);
  });

  it("tirar de um acervo uma foto que está em outro não libera franquia nem apaga o arquivo", async () => {
    const fotos = await listCollectionPhotos(db, a, acervo, { limit: 1000 });
    const compartilhadas = [];
    for (const f of fotos) if ((await getPhoto(db, a, f.id)).contentHash === hash(0)) compartilhadas.push(f.id);
    const res = await removePhotosFromCollection(db, a, acervo, compartilhadas);
    assert.equal(res.removed, 1);
    assert.equal(res.deletedKeys.length, 0);
    assert.equal(await countUsedPhotos(db, a), 440);
  });

  it("uma foto só entra no acervo depois que o arquivo chega", async () => {
    const res = await requestUploads(db, a, { collectionId: acervo, files: [file(9000)] }, key(a));
    const item = res.items[0];
    assert.equal(item.status, "upload");
    const done = await completeUploads(db, a, { collectionId: acervo, photoIds: [item.photoId] }, store.head);
    assert.deepEqual(done.missing, [item.photoId]);
    assert.equal((await getPhoto(db, a, item.photoId)).status, "uploading");
  });

  it("recusa formatos e tamanhos fora do aceito", async () => {
    const res = await requestUploads(
      db,
      a,
      {
        collectionId: acervo,
        files: [
          { ...file(9001), type: "image/heic" },
          { ...file(9002), size: 31 * 1024 * 1024 },
          { ...file(9003), sha256: "nao-e-hash" },
        ],
      },
      key(a),
    );
    assert.ok(res.items.every((i) => i.status === "invalid"));
  });
});

describe("limite do plano", () => {
  it("passar do limite bloqueia o que sobra, com aviso", async () => {
    const c = await tenant("limite", "owner", 30);
    const acervo = (await createCollection(db, c, { kind: "permanent", name: "Acervo" })).id;
    const store = fakeStore();
    const statuses = await sendAll(c, acervo, Array.from({ length: 40 }, (_, i) => file(10_000 + i)), store);
    assert.equal(statuses.filter((s) => s === "upload").length, 30);
    assert.equal(statuses.filter((s) => s === "quota_exceeded").length, 10);
    assert.equal(await countUsedPhotos(db, c), 30);
    const again = await requestUploads(db, c, { collectionId: acervo, files: [file(20_000)] }, key(c));
    assert.equal(again.items[0].status, "quota_exceeded");
  });
});

describe("isolamento das fotos", () => {
  let a: TenantContext;
  let b: TenantContext;
  let acervoA: string;
  let acervoB: string;
  let fotoB: string;

  before(async () => {
    a = await tenant("iso-a");
    b = await tenant("iso-b");
    acervoA = (await createCollection(db, a, { kind: "permanent", name: "Acervo A" })).id;
    acervoB = (await createCollection(db, b, { kind: "permanent", name: "Acervo B" })).id;
    const store = fakeStore();
    await sendAll(b, acervoB, [file(30_000)], store);
    fotoB = (await listCollectionPhotos(db, b, acervoB))[0].id;
  });

  it("A não lê a foto de B nem a lista", async () => {
    await assert.rejects(getPhoto(db, a, fotoB), NotFoundError);
    assert.equal((await listCollectionPhotos(db, a, acervoB)).length, 0);
  });

  it("a mesma foto enviada por A e por B são registros separados", async () => {
    const res = await requestUploads(db, a, { collectionId: acervoA, files: [file(30_000)] }, key(a));
    assert.equal(res.items[0].status, "upload");
  });

  it("A não envia para o acervo de B nem cria álbum nele", async () => {
    await assert.rejects(requestUploads(db, a, { collectionId: acervoB, files: [file(1)] }, key(a)), NotFoundError);
    await assert.rejects(createAlbum(db, a, acervoB, "Invasão"), NotFoundError);
  });

  it("A não confirma nem exclui fotos de B", async () => {
    const r = await completeUploads(db, a, { collectionId: acervoA, photoIds: [fotoB] }, async () => ({ size: 1 }));
    assert.deepEqual(r.done, []);
    const del = await removePhotosFromCollection(db, a, acervoA, [fotoB]);
    assert.equal(del.removed, 0);
    await assert.rejects(removePhotosFromCollection(db, a, acervoB, [fotoB]), NotFoundError);
    assert.equal((await getPhoto(db, b, fotoB)).id, fotoB);
  });

  it("álbum de B não serve de destino para A", async () => {
    const albumB = await createAlbum(db, b, acervoB, "Álbum B");
    await assert.rejects(requestUploads(db, a, { collectionId: acervoA, albumId: albumB.id, files: [file(2)] }, key(a)), NotFoundError);
  });
});

describe("papéis", () => {
  it("quem não tem permissão de envio é barrado", async () => {
    const owner = await tenant("papel");
    const acervo = (await createCollection(db, owner, { kind: "permanent", name: "Acervo" })).id;
    const editor = await member2(owner, "papel-editor", "member");
    const res = await requestUploads(db, editor, { collectionId: acervo, files: [file(40_000)] }, key(editor));
    assert.equal(res.items[0].status, "upload");
    const forjado = { ...editor, role: "visitante" as TenantContext["role"] };
    await assert.rejects(requestUploads(db, forjado, { collectionId: acervo, files: [file(40_001)] }, key(forjado)), ForbiddenError);
  });
});
