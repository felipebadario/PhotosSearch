import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { READ_URL_TTL_SECONDS, safeFileName, UPLOAD_URL_TTL_SECONDS, type PhotoStorage } from "./types.ts";

/**
 * Armazenamento em disco para desenvolvimento e testes, com o mesmo contrato do R2:
 * URLs assinadas com validade e o SHA-256 conferido no envio. Nunca usado na Vercel.
 */
export const LOCAL_ROUTE = "/api/storage/local";

function secret() {
  return process.env.BETTER_AUTH_SECRET || "nossafoto-dev-local-storage";
}

export function localDir() {
  return process.env.LOCAL_STORAGE_DIR || path.join(/* turbopackIgnore: true */ process.cwd(), ".storage");
}

function filePath(key: string) {
  if (!/^[a-zA-Z0-9/_-]+$/.test(key) || key.includes("..")) throw new Error("Chave inválida.");
  return path.join(/* turbopackIgnore: true */ localDir(), key);
}

export function signLocal(op: "put" | "get", key: string, exp: number, sha = "") {
  return createHmac("sha256", secret()).update(`${op}:${key}:${exp}:${sha}`).digest("hex");
}

export function verifyLocal(op: "put" | "get", key: string, exp: number, sha: string, sig: string) {
  if (!Number.isFinite(exp) || exp < Date.now() / 1000) return false;
  const expected = Buffer.from(signLocal(op, key, exp, sha));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export async function writeLocal(key: string, body: Buffer, sha256Hex: string) {
  const actual = createHash("sha256").update(body).digest("hex");
  if (actual !== sha256Hex) return false;
  const file = filePath(key);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, body);
  return true;
}

export const readLocal = (key: string) => readFile(filePath(key));

export function createLocalStorage(): PhotoStorage {
  const url = (op: "put" | "get", key: string, ttl: number, sha = "") => {
    const exp = Math.floor(Date.now() / 1000) + ttl;
    const q = new URLSearchParams({ exp: String(exp), sig: signLocal(op, key, exp, sha) });
    if (sha) q.set("sha", sha);
    return `${LOCAL_ROUTE}/${key}?${q}`;
  };
  return {
    name: "local",
    async presignPut(key, file) {
      return { url: url("put", key, UPLOAD_URL_TTL_SECONDS, file.sha256Hex), headers: { "content-type": file.contentType } };
    },
    presignGet: async (key, opts) =>
      url("get", key, READ_URL_TTL_SECONDS) + (opts?.downloadName ? `&dl=${encodeURIComponent(safeFileName(opts.downloadName))}` : ""),
    async head(key) {
      try {
        return { size: (await stat(filePath(key))).size };
      } catch {
        return null;
      }
    },
    async remove(keys) {
      for (const key of keys) await rm(filePath(key), { force: true });
    },
  };
}
