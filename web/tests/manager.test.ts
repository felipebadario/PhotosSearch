// Área da equipe: visão de todas as organizações e troca de plano.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, describe, it } from "node:test";
import { inArray } from "drizzle-orm";
import { db, sql } from "../lib/server/db/index.ts";
import { member, organization, user } from "../lib/server/db/schema/index.ts";
import { getPlanLimit } from "../lib/server/repos/photos.ts";
import { getOrganization, listOrganizations, listUsers, setOrganizationPlan } from "../lib/server/repos/manager.ts";
import { ValidationError } from "../lib/server/repos/collections.ts";

const run = randomUUID().slice(0, 8);
const orgId = `org-mgr-${run}`;
const userId = `user-mgr-${run}`;
const email = `dono-${run}@teste.nossafoto.app`;

after(async () => {
  await db.delete(organization).where(inArray(organization.id, [orgId]));
  await db.delete(user).where(inArray(user.id, [userId]));
  await sql.end();
});

describe("manager", () => {
  it("lista a organização com dono e plano de avaliação", async () => {
    await db.insert(user).values({ id: userId, name: "Dona", email });
    await db.insert(organization).values({ id: orgId, name: `Igreja ${run}`, slug: orgId, createdAt: new Date() });
    await db.insert(member).values({ id: randomUUID(), organizationId: orgId, userId, role: "owner", createdAt: new Date() });
    const [o] = await listOrganizations(db, { q: run });
    assert.equal(o.ownerEmail, email);
    assert.equal(o.planId, "trial");
    assert.equal(o.limit, 1000);
    assert.equal(o.used, 0);
    const [u] = await listUsers(db, { q: email });
    assert.deepEqual(u.organizations.map((x) => x.role), ["owner"]);
  });

  it("troca o plano e volta para a avaliação", async () => {
    const ctx = { organizationId: orgId, userId, role: "owner" as const };
    await setOrganizationPlan(db, userId, { organizationId: orgId, planId: "pro", status: "active" });
    assert.equal((await getPlanLimit(db, ctx)).limit, 20000);
    await setOrganizationPlan(db, userId, { organizationId: orgId, planId: "start", photoLimit: "7.500" });
    assert.equal((await getPlanLimit(db, ctx)).limit, 7500);
    await assert.rejects(setOrganizationPlan(db, userId, { organizationId: orgId, planId: "enterprise" }), ValidationError);
    await assert.rejects(setOrganizationPlan(db, userId, { organizationId: orgId, planId: "inexistente" }), ValidationError);
    await setOrganizationPlan(db, userId, { organizationId: orgId, planId: "trial" });
    assert.equal((await getPlanLimit(db, ctx)).limit, 1000);
    const d = await getOrganization(db, orgId);
    assert.equal(d?.members[0].email, email);
  });
});
