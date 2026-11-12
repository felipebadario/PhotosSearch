import type { AlbumStatus, ImportStatus, PhotoSource } from "./types";

export function statusLabel(status: AlbumStatus): string {
  return {
    draft: "Vazio",
    processing: "Preparando",
    ready: "Pronto",
    published: "Compartilhado",
    error: "Precisa de atenção",
  }[status];
}

export function sourceLabel(source: PhotoSource): string {
  return { upload: "Upload direto", device: "Dispositivo", google_drive: "Google Drive" }[source];
}

export function importStatusLabel(status: ImportStatus): string {
  return {
    uploading: "Enviando",
    preparing: "Preparando",
    done: "Concluída",
    error: "Com erros",
  }[status];
}

export function roleLabel(role: string): string {
  return ({ owner: "Dono", admin: "Administrador", member: "Editor" } as Record<string, string>)[role] ?? role;
}

export function collectionKindLabel(kind: "permanent" | "event"): string {
  return kind === "permanent" ? "Acervo permanente" : "Evento";
}
