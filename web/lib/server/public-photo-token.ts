import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Passe para ver UMA foto de um acervo público. Só a busca por selfie emite passes,
 * e só para as fotos em que a pessoa aparece: sem passe, a foto não abre, mesmo
 * para quem tem o link do acervo. O passe vence sozinho.
 */
export const PHOTO_TOKEN_TTL_SECONDS = 6 * 60 * 60;

function secret() {
  const s = process.env.BETTER_AUTH_SECRET;
  if (!s && process.env.NODE_ENV === "production") throw new Error("BETTER_AUTH_SECRET não configurada.");
  return s || "nossafoto-dev-photo-token";
}

function sign(collectionId: string, photoId: string, exp: number) {
  return createHmac("sha256", secret()).update(`foto:${collectionId}:${photoId}:${exp}`).digest("base64url");
}

export function createPhotoToken(collectionId: string, photoId: string, now = Date.now()) {
  const exp = Math.floor(now / 1000) + PHOTO_TOKEN_TTL_SECONDS;
  return `${exp}.${sign(collectionId, photoId, exp)}`;
}

export function verifyPhotoToken(token: string | null, collectionId: string, photoId: string, now = Date.now()) {
  if (!token) return false;
  const [expRaw, sig] = token.split(".");
  const exp = Number(expRaw);
  if (!Number.isInteger(exp) || !sig || exp < now / 1000) return false;
  const expected = Buffer.from(sign(collectionId, photoId, exp));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
