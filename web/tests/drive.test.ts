// Pastas do Google Drive por link: leitura do link e isolamento entre organizações.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, describe, it } from "node:test";
import { inArray } from "drizzle-orm";
import { parseDriveFolderLink } from "../lib/drive-link.ts";
import { db, sql } from "../lib/server/db/index.ts";
import { member, organization, user } from "../lib/server/db/schema/index.ts";
import { createCollection } from "../lib/server/repos/collections.ts";
import { addDriveSource, listDriveSources, removeDriveSource, requestDriveSync } from "../lib/server/repos/drive.ts";
import { ForbiddenError, NotFoundError, type TenantContext } from "../lib/server/tenant-types.ts";

const run = randomUUID().slice(0, 8);
const orgIds: string[] = [];
const userIds: string[] = [];
const FOLDER = "1AbCdEfGhIjKlMnOpQrStUvWxYz012345";

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

describe("link da pasta", () => {
  it("aceita os formatos do botão Compartilhar", () => {
    assert.deepEqual(parseDriveFolderLink(`https://drive.google.com/drive/folders/${FOLDER}?usp=sharing`), { folderId: FOLDER, resourceKey: null });
    assert.deepEqual(parseDriveFolderLink(`https://drive.google.com/drive/u/1/folders/${FOLDER}`), { folderId: FOLDER, resourceKey: null });
    assert.deepEqual(parseDriveFolderLink(`drive.google.com/drive/folders/${FOLDER}?resourcekey=0-abcdefghijkl`), {
      folderId: FOLDER,
      resourceKey: "0-abcdefghijkl",
    });
    assert.deepEqual(parseDriveFolderLink(`https://drive.google.com/open?id=${FOLDER}`), { folderId: FOLDER, resourceKey: null });
  });

  it("recusa o que não é pasta do Drive", () => {
    assert.equal(parseDriveFolderLink("https://example.com/drive/folders/" + FOLDER), null);
    assert.equal(parseDriveFolderLink(`https://drive.google.com/file/d/${FOLDER}/view`), null);
    assert.equal(parseDriveFolderLink("qualquer coisa"), null);
    assert.equal(parseDriveFolderLink(""), null);
  });
});

describe("pastas ligadas ao acervo", () => {
  it("são isoladas por organização e não se repetem", async () => {
    const a = await tenant("drv-a");
    const b = await tenant("drv-b");
    const acervo = (await createCollection(db, a, { kind: "permanent", name: "Acervo Drive" })).id;
    const s = await addDriveSource(db, a, { collectionId: acervo, folderId: FOLDER, resourceKey: null, folderName: "Fotos" });
    assert.equal((await listDriveSources(db, a, acervo)).length, 1);
    assert.equal((await listDriveSources(db, b, acervo)).length, 0);
    await assert.rejects(addDriveSource(db, a, { collectionId: acervo, folderId: FOLDER, resourceKey: null, folderName: "Fotos" }), /já está ligada/);
    await assert.rejects(addDriveSource(db, b, { collectionId: acervo, folderId: "outra-pasta-123", resourceKey: null, folderName: "X" }), NotFoundError);
    await assert.rejects(requestDriveSync(db, b, acervo, s.id), NotFoundError);
    await assert.rejects(removeDriveSource(db, b, acervo, s.id), NotFoundError);
    await requestDriveSync(db, a, acervo, s.id);
    await removeDriveSource(db, a, acervo, s.id);
    assert.equal((await listDriveSources(db, a, acervo)).length, 0);
  });

  it("exige permissão de envio", async () => {
    const owner = await tenant("drv-o");
    const acervo = (await createCollection(db, owner, { kind: "permanent", name: "Acervo Drive 2" })).id;
    const viewer: TenantContext = { ...owner, role: "viewer" as TenantContext["role"] };
    await assert.rejects(addDriveSource(db, viewer, { collectionId: acervo, folderId: FOLDER, resourceKey: null, folderName: "F" }), ForbiddenError);
  });
});
