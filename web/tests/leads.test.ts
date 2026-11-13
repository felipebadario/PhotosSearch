// Pedidos de assinatura: validação, deduplicação por e-mail e acesso da equipe.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, describe, it } from "node:test";
import { inArray } from "drizzle-orm";
import { db, sql } from "../lib/server/db/index.ts";
import { leads } from "../lib/server/db/schema/index.ts";
import { countLeadsByStatus, createLead, isTeamEmail, listLeads, normalizeLead, updateLead } from "../lib/server/repos/leads.ts";
import { ValidationError } from "../lib/server/repos/collections.ts";

const run = randomUUID().slice(0, 8);
const emails: string[] = [];
const email = (n: string) => {
  const e = `${n}-${run}@teste.nossafoto.app`;
  emails.push(e);
  return e;
};

after(async () => {
  await db.delete(leads).where(inArray(leads.email, emails));
  await sql.end();
});

describe("pedidos de assinatura", () => {
  it("valida nome, e-mail e WhatsApp", () => {
    assert.throws(() => normalizeLead({ name: "", email: "a@b.co" }), ValidationError);
    assert.throws(() => normalizeLead({ name: "Ana", email: "sem-arroba" }), ValidationError);
    assert.throws(() => normalizeLead({ name: "Ana", email: "a@b.co", phone: "123" }), ValidationError);
    const ok = normalizeLead({ name: "  Ana   Paula ", email: "ANA@B.CO", phone: "(11) 91234-5678", plan: "hackeado", source: "outro" });
    assert.equal(ok.name, "Ana Paula");
    assert.equal(ok.email, "ana@b.co");
    assert.equal(ok.plan, null);
    assert.equal(ok.source, "site");
  });

  it("grava o pedido e não duplica o mesmo e-mail no mesmo dia", async () => {
    const e = email("igreja");
    const first = await createLead(db, { name: "Pr. João", email: e, plan: "pro", source: "planos" });
    assert.equal(first.status, "new");
    const again = await createLead(db, { name: "Pr. João", email: e.toUpperCase(), plan: "business", source: "limite" });
    assert.equal(again.id, first.id);
    assert.equal(again.plan, "business");
    const mine = (await listLeads(db)).filter((l) => l.email === e);
    assert.equal(mine.length, 1);
  });

  it("a equipe muda status e anotações", async () => {
    const l = await createLead(db, { name: "Escola X", email: email("escola") });
    const up = await updateLead(db, l.id, { status: "contacted", notes: "Ligar segunda" });
    assert.equal(up?.status, "contacted");
    assert.equal(up?.notes, "Ligar segunda");
    await assert.rejects(updateLead(db, l.id, { status: "pago" }), ValidationError);
    const counts = await countLeadsByStatus(db);
    assert.ok(counts.contacted >= 1);
  });

  it("só e-mails da equipe veem os pedidos", () => {
    assert.equal(isTeamEmail("dono@x.com", undefined), false);
    assert.equal(isTeamEmail("dono@x.com", ""), false);
    assert.equal(isTeamEmail("Dono@X.com", "outra@y.com, dono@x.com"), true);
    assert.equal(isTeamEmail("intruso@x.com", "dono@x.com"), false);
  });
});
