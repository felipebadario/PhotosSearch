import { createLocalStorage } from "./local.ts";
import { createR2Storage } from "./r2.ts";
import type { PhotoStorage } from "./types.ts";

export type { PhotoStorage } from "./types.ts";

let cached: PhotoStorage | null | undefined;

/**
 * R2 quando as quatro variáveis existem. Fora da Vercel, sem R2, cai no disco local
 * (desenvolvimento) ou no que STORAGE_DRIVER=local pedir. Na Vercel sem R2: null,
 * e o Admin avisa que o envio ainda não está configurado.
 */
export function getStorage(): PhotoStorage | null {
  if (cached !== undefined) return cached;
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, STORAGE_DRIVER, VERCEL, NODE_ENV } = process.env;
  if (R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET && STORAGE_DRIVER !== "local") {
    cached = createR2Storage({
      accountId: R2_ACCOUNT_ID,
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
      bucket: R2_BUCKET,
    });
  } else if (!VERCEL && (STORAGE_DRIVER === "local" || NODE_ENV !== "production")) {
    cached = createLocalStorage();
  } else {
    cached = null;
  }
  return cached;
}

/** Chave do original: por organização e por conteúdo, então o mesmo arquivo nunca é guardado duas vezes. */
export const photoKey = (organizationId: string, sha256Hex: string) => `org/${organizationId}/${sha256Hex}`;
