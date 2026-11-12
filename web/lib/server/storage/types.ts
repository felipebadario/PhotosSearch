/** Onde ficam os originais das fotos. O navegador envia direto para cá, sem passar pelo servidor. */
export type PresignedUpload = { url: string; headers: Record<string, string> };

export interface PhotoStorage {
  readonly name: "r2" | "local";
  /** URL de envio válida por poucos minutos, presa ao tipo e ao SHA-256 do arquivo. */
  presignPut(key: string, file: { contentType: string; sha256Hex: string }): Promise<PresignedUpload>;
  /** URL de leitura temporária. */
  presignGet(key: string): Promise<string>;
  /** Tamanho do objeto, ou null se ele não existe. */
  head(key: string): Promise<{ size: number } | null>;
  remove(keys: string[]): Promise<void>;
}

export const UPLOAD_URL_TTL_SECONDS = 15 * 60;
export const READ_URL_TTL_SECONDS = 10 * 60;

export function hexToBase64(hex: string) {
  return Buffer.from(hex, "hex").toString("base64");
}
