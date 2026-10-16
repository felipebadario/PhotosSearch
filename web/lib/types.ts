/**
 * Tipos do domínio, espelhando docs/data-model.md. Nesta fase essas entidades
 * vivem só em lib/mock-data.ts; quando o backend real existir, o formato de
 * retorno das funções em lib/api/*.ts não muda, só a implementação delas.
 *
 * A unidade de isolamento é a Account (o espaço de um assinante): todo dado
 * de acervo carrega accountId, e toda busca é feita dentro de uma conta.
 */

export type AlbumStatus = "draft" | "processing" | "ready" | "published" | "error";
export type PhotoStatus = "uploading" | "queued" | "processing" | "ready" | "error";
export type PhotoSource = "upload" | "device" | "google_drive";
export type ImportStatus = "uploading" | "preparing" | "done" | "error";

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Account {
  id: string;
  ownerUserId: string;
  name: string;
  /** Usado no endereço público dos álbuns compartilhados: nossafoto.app/{handle}/{album}. */
  handle: string;
  avatarUrl: string | null;
}

export interface Plan {
  id: string;
  name: string;
  photoLimit: number;
  storageLimitBytes: number;
  monthlySearchLimit: number;
}

export interface Subscription {
  id: string;
  accountId: string;
  planId: Plan["id"];
  status: "preview" | "trialing" | "active" | "past_due" | "canceled";
}

export interface Album {
  id: string;
  accountId: string;
  name: string;
  slug: string;
  description: string | null;
  eventDate: string | null; // ISO date
  coverPhotoUrl: string | null;
  status: AlbumStatus;
  isPublic: boolean;
  matchThreshold: number;
  photoCount: number;
  searchCount: number;
  createdAt: string; // ISO datetime
  processingProgress: number | null; // 0-100, só quando status === 'processing'
}

export interface Photo {
  id: string;
  accountId: string;
  albumId: string | null;
  url: string;
  thumbnailUrl: string;
  status: PhotoStatus;
  source: PhotoSource;
  takenAt: string | null; // ISO datetime
  errorMessage: string | null;
  createdAt: string;
}

/** Uma foto pronta para exibir em galeria, já com o nome do álbum resolvido. */
export interface LibraryPhoto extends Photo {
  albumName: string | null;
}

export interface ImportJob {
  id: string;
  accountId: string;
  albumId: string | null;
  source: PhotoSource;
  totalFiles: number;
  succeededFiles: number;
  failedFiles: number;
  status: ImportStatus;
  createdAt: string;
}

export interface LibrarySummary {
  photoCount: number;
  albumCount: number;
  connectedSources: number;
}

export interface Usage {
  photoCount: number;
  photoLimit: number;
  storageUsedBytes: number;
  storageLimitBytes: number;
  searchesThisMonth: number;
  monthlySearchLimit: number;
}

export interface PublicAlbum {
  accountName: string;
  accountAvatarUrl: string | null;
  accountHandle: string;
  albumName: string;
  albumSlug: string;
  coverPhotoUrl: string | null;
  photoCount: number;
}

export interface SearchResultPhoto {
  id: string;
  url: string;
  thumbnailUrl: string;
  albumName: string | null;
  source: PhotoSource;
  takenAt: string | null;
  similarity: number; // 0-1, uso interno; não exibido
}

/** Escopo de uma busca: todo o acervo da conta ou um álbum específico. */
export type SearchScope = { kind: "library" } | { kind: "album"; albumId: string };

/** O mínimo que a galeria precisa para exibir uma foto (acervo ou resultado de busca). */
export interface GalleryPhoto {
  id: string;
  url: string;
  thumbnailUrl: string;
  albumName: string | null;
  source: PhotoSource;
  takenAt: string | null;
}
