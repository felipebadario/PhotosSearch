// O link público só abre as fotos que a busca por selfie liberou.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createPhotoToken, PHOTO_TOKEN_TTL_SECONDS, verifyPhotoToken } from "../lib/server/public-photo-token.ts";

describe("passe de foto do link público", () => {
  it("abre só a foto e o acervo para os quais foi emitido", () => {
    const t = createPhotoToken("acervo-1", "foto-1");
    assert.equal(verifyPhotoToken(t, "acervo-1", "foto-1"), true);
    assert.equal(verifyPhotoToken(t, "acervo-1", "foto-2"), false);
    assert.equal(verifyPhotoToken(t, "acervo-2", "foto-1"), false);
  });

  it("recusa sem passe, passe adulterado ou vencido", () => {
    assert.equal(verifyPhotoToken(null, "acervo-1", "foto-1"), false);
    assert.equal(verifyPhotoToken("123.abc", "acervo-1", "foto-1"), false);
    const t = createPhotoToken("acervo-1", "foto-1");
    const [exp, sig] = t.split(".");
    assert.equal(verifyPhotoToken(`${Number(exp) + 999}.${sig}`, "acervo-1", "foto-1"), false);
    const later = Date.now() + (PHOTO_TOKEN_TTL_SECONDS + 60) * 1000;
    assert.equal(verifyPhotoToken(t, "acervo-1", "foto-1", later), false);
  });
});
