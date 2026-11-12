import { AwsClient } from "aws4fetch";
import { hexToBase64, READ_URL_TTL_SECONDS, UPLOAD_URL_TTL_SECONDS, type PhotoStorage } from "./types.ts";

type R2Config = { accountId: string; accessKeyId: string; secretAccessKey: string; bucket: string };

/** Cloudflare R2 pela API compatível com S3. O bucket é privado: toda leitura usa URL assinada. */
export function createR2Storage(cfg: R2Config): PhotoStorage {
  const client = new AwsClient({
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    service: "s3",
    region: "auto",
  });
  const base = `https://${cfg.accountId}.r2.cloudflarestorage.com/${cfg.bucket}`;
  const objectUrl = (key: string) => `${base}/${key.split("/").map(encodeURIComponent).join("/")}`;

  async function presign(method: string, key: string, ttl: number, headers: Record<string, string> = {}) {
    const url = new URL(objectUrl(key));
    url.searchParams.set("X-Amz-Expires", String(ttl));
    const signed = await client.sign(new Request(url, { method, headers }), { aws: { signQuery: true } });
    return signed.url;
  }

  return {
    name: "r2",
    async presignPut(key, file) {
      // O checksum entra na assinatura: o R2 recusa um arquivo cujo conteúdo não bate com o hash declarado.
      const headers = { "content-type": file.contentType, "x-amz-checksum-sha256": hexToBase64(file.sha256Hex) };
      return { url: await presign("PUT", key, UPLOAD_URL_TTL_SECONDS, headers), headers };
    },
    presignGet: (key) => presign("GET", key, READ_URL_TTL_SECONDS),
    async head(key) {
      const res = await client.fetch(objectUrl(key), { method: "HEAD" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`R2 HEAD respondeu ${res.status}`);
      return { size: Number(res.headers.get("content-length") ?? 0) };
    },
    async remove(keys) {
      for (const key of keys) {
        const res = await client.fetch(objectUrl(key), { method: "DELETE" });
        if (!res.ok && res.status !== 404) throw new Error(`R2 DELETE respondeu ${res.status}`);
      }
    },
  };
}
