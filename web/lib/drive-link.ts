/**
 * Lê o link de uma pasta do Google Drive. Aceita os formatos que o botão
 * "Compartilhar" do Drive gera, inclusive com resourcekey (pastas antigas).
 */
export type DriveFolderLink = { folderId: string; resourceKey: string | null };

const ID = /^[A-Za-z0-9_-]{10,200}$/;

export function parseDriveFolderLink(input: string): DriveFolderLink | null {
  const raw = input.trim();
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (url.hostname !== "drive.google.com") return null;
  const resourceKey = url.searchParams.get("resourcekey");
  const m = url.pathname.match(/\/folders\/([^/?#]+)/);
  const folderId = m?.[1] ?? (url.pathname === "/open" ? url.searchParams.get("id") : null);
  if (!folderId || !ID.test(folderId)) return null;
  return { folderId, resourceKey: resourceKey && ID.test(resourceKey) ? resourceKey : null };
}
