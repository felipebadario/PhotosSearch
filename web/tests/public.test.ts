// Página pública por link e QR Code: só abre o que o Admin compartilhou, e só as fotos daquele acervo.
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { inArray } from "drizzle-orm";
import { db, sql } from "../lib/server/db/index.ts";
import { member, organization, user } from "../lib/server/db/schema/index.ts";
import { getCover, saveCover } from "../lib/server/repos/covers.ts";
import { createCollection } from "../lib/server/repos/collections.ts";
import { completeUploads, createAlbum, listCollectionPhotos, requestUploads } from "../lib/server/repos/photos.ts";
import { countPublicPhotos, getPublicCollection, getPublicPhoto, listPublicAlbums, listPublicPhotos, setCollectionSharing } from "../lib/server/repos/public.ts";
import { ForbiddenError, NotFoundError, type TenantContext } from "../lib/server/tenant-types.ts";

const run = randomUUID().slice(0, 8);
const orgIds: string[] = [];
const userIds: string[] = [];

async function tenant(label: string): Promise<TenantContext & { slug: string }> {
  const organizationId = `org-${label}-${run}`;
  const userId = `user-${label}-${run}`;
  const slug = `pub-${label}-${run}`;
  await db.insert(user).values({ id: userId, name: label, email: `${label}-${run}@teste.nossafoto.app` });
  await db.insert(organization).values({ id: organizationId, name: `Org ${label}`, slug, createdAt: new Date() });
  await db.insert(member).values({ id: randomUUID(), organizationId, userId, role: "owner", createdAt: new Date() });
  orgIds.push(organizationId);
  userIds.push(userId);
  return { organizationId, userId, role: "owner", slug };
}

after(async () => {
  await db.delete(organization).where(inArray(organization.id, orgIds));
  await db.delete(user).where(inArray(user.id, userIds));
  await sql.end();
});

describe("acervo compartilhado por link", () => {
  let a: TenantContext & { slug: string };
  let b: TenantContext & { slug: string };
  let aberto: { id: string; slug: string };
  let privado: { id: string; slug: string };
  let fotoPrivada: string;

  before(async () => {
    a = await tenant("a");
    b = await tenant("b");
    aberto = await createCollection(db, a, { kind: "permanent", name: "Culto aberto" });
    privado = await createCollection(db, a, { kind: "permanent", name: "Bastidores" });
    const album = await createAlbum(db, a, aberto.id, "Louvor");
    // completeUploads confere o tamanho: uma foto por chamada mantém o teste simples.
    for (const i of [1, 2]) await sendOne(a, aberto.id, i, album.id);
    await sendOne(a, aberto.id, 3);
    await sendOne(a, privado.id, 4);
    fotoPrivada = (await listCollectionPhotos(db, a, privado.id))[0].id;
    await setCollectionSharing(db, a, aberto.id, true);
  });

  async function sendOne(ctx: TenantContext, collectionId: string, i: number, albumId?: string) {
    const f = { clientId: "0", name: `IMG_${i}.jpg`, size: 100 + i, type: "image/jpeg", sha256: createHash("sha256").update(`pub-${run}-${i}`).digest("hex") };
    const res = await requestUploads(db, ctx, { collectionId, albumId, files: [f] }, (sha) => `org/${ctx.organizationId}/${sha}`);
    const item = res.items[0];
    if (item.status === "upload") await completeUploads(db, ctx, { collectionId, albumId, photoIds: [item.photoId] }, async () => ({ size: f.size }));
  }

  it("capas de evento e organização são independentes e respeitam o tenant e o papel", async () => {
    const event = await createCollection(db, a, { kind: "event", name: "Encontro", startsAt: new Date(0), endsAt: new Date(1) });
    const editor = { ...a, role: "member" as const };
    await saveCover(db, a, null, "capa inicial");
    await saveCover(db, a, null, "capa da organização");
    await saveCover(db, editor, event.id, "capa do evento");
    assert.equal(await getCover(db, a.organizationId, null), "capa da organização");
    assert.equal(await getCover(db, a.organizationId, event.id), "capa do evento");
    await assert.rejects(saveCover(db, editor, null, null), ForbiddenError);
    await assert.rejects(saveCover(db, b, event.id, null), NotFoundError);
    assert.equal(await getCover(db, b.organizationId, event.id), null);
    await saveCover(db, editor, event.id, null);
    assert.equal(await getCover(db, a.organizationId, event.id), null);
    assert.equal(await getCover(db, a.organizationId, null), "capa da organização");
  });

  it("acervo privado não existe para o público", async () => {
    assert.equal(await getPublicCollection(db, a.slug, privado.slug), null);
  });

  it("acervo aberto mostra só as fotos e os álbuns dele", async () => {
    const c = await getPublicCollection(db, a.slug, aberto.slug);
    assert.ok(c);
    assert.equal(c.state, "open");
    assert.equal(await countPublicPhotos(db, c), 3);
    assert.equal((await listPublicPhotos(db, c)).length, 3);
    const albums = await listPublicAlbums(db, c);
    assert.deepEqual(albums.map((x) => [x.name, x.photoCount]), [["Louvor", 2]]);
    assert.equal((await listPublicPhotos(db, c, { albumId: albums[0].id })).length, 2);
  });

  it("foto de outro acervo não sai pelo link do acervo aberto", async () => {
    const c = (await getPublicCollection(db, a.slug, aberto.slug))!;
    assert.equal(await getPublicPhoto(db, c, fotoPrivada), null);
    const propria = (await listPublicPhotos(db, c))[0].id;
    assert.equal((await getPublicPhoto(db, c, propria))?.id, propria);
  });

  it("o slug do acervo não abre pela organização errada", async () => {
    assert.equal(await getPublicCollection(db, b.slug, aberto.slug), null);
  });

  it("tornar privado fecha o link na hora", async () => {
    await setCollectionSharing(db, a, aberto.id, false);
    assert.equal(await getPublicCollection(db, a.slug, aberto.slug), null);
    await setCollectionSharing(db, a, aberto.id, true);
    assert.ok(await getPublicCollection(db, a.slug, aberto.slug));
  });

  it("outra organização não abre nem fecha o link, e papel sem permissão é barrado", async () => {
    await assert.rejects(setCollectionSharing(db, b, privado.id, true), NotFoundError);
    assert.equal(await getPublicCollection(db, a.slug, privado.slug), null);
    await assert.rejects(setCollectionSharing(db, { ...a, role: "visitante" as TenantContext["role"] }, privado.id, true), ForbiddenError);
  });

  it("evento vencido mostra encerrado e não entrega fotos", async () => {
    const evento = await createCollection(db, a, {
      kind: "event",
      name: "Congresso passado",
      startsAt: new Date("2026-01-10T12:00:00Z"),
      endsAt: new Date("2026-01-12T12:00:00Z"),
      publicUntil: new Date("2026-02-12T12:00:00Z"),
    });
    await sendOne(a, evento.id, 5);
    await setCollectionSharing(db, a, evento.id, true);
    const fotoId = (await listCollectionPhotos(db, a, evento.id))[0].id;
    const durante = (await getPublicCollection(db, a.slug, evento.slug, new Date("2026-02-01T00:00:00Z")))!;
    assert.equal(durante.state, "open");
    assert.equal((await getPublicPhoto(db, durante, fotoId))?.id, fotoId);
    const depois = (await getPublicCollection(db, a.slug, evento.slug, new Date("2026-03-01T00:00:00Z")))!;
    assert.equal(depois.state, "closed");
    assert.equal((await listPublicPhotos(db, depois)).length, 0);
    assert.equal(await countPublicPhotos(db, depois), 0);
    assert.equal(await getPublicPhoto(db, depois, fotoId), null);
  });
});
