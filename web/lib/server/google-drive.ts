import "server-only";
import type { DriveFolderLink } from "@/lib/drive-link";

/**
 * Acesso de leitura a pastas públicas do Drive com a chave de API do NossaFoto.
 * Só funciona para pastas compartilhadas como "Qualquer pessoa com o link".
 */
const key = () => process.env.GOOGLE_API_KEY ?? "";

export const driveConfigured = () => Boolean(key());

export class DriveFolderError extends Error {}

const FOLDER = "application/vnd.google-apps.folder";

export async function checkPublicFolder(link: DriveFolderLink): Promise<{ name: string }> {
  const url = `${process.env.GOOGLE_DRIVE_API_URL ?? "https://www.googleapis.com/drive/v3/files"}/${encodeURIComponent(link.folderId)}?fields=id,name,mimeType&supportsAllDrives=true&key=${encodeURIComponent(key())}`;
  const headers: Record<string, string> = {};
  if (link.resourceKey) headers["X-Goog-Drive-Resource-Keys"] = `${link.folderId}/${link.resourceKey}`;
  let res: Response;
  try {
    res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000), cache: "no-store" });
  } catch {
    throw new DriveFolderError("Não foi possível falar com o Google Drive agora. Tente de novo em instantes.");
  }
  if (res.status === 404 || res.status === 403) {
    throw new DriveFolderError("Não conseguimos abrir essa pasta. No Drive, compartilhe a pasta como “Qualquer pessoa com o link” (Leitor) e cole o link de novo.");
  }
  if (!res.ok) {
    console.error("[drive] verificação respondeu", res.status, await res.text().catch(() => ""));
    throw new DriveFolderError("O Google Drive recusou a consulta. Tente de novo em instantes.");
  }
  const body = (await res.json()) as { name?: string; mimeType?: string };
  if (body.mimeType !== FOLDER) throw new DriveFolderError("Esse link é de um arquivo, não de uma pasta. Cole o link da pasta.");
  return { name: body.name ?? "Pasta do Drive" };
}
