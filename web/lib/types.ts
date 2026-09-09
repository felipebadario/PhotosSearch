/**
 * Tipos do domínio, espelhando docs/data-model.md. Em v0.1 essas entidades
 * vivem só em lib/mock-data.ts; quando o backend real existir, o formato de
 * retorno das funções em lib/api/*.ts não muda — só a implementação delas.
 */

export type AlbumStatus = "draft" | "processing" | "published" | "error";
export type PhotoStatus = "uploading" | "queued" | "processing" | "ready" | "error";
export type PhotoSource = "upload" | "google_drive";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
}

export interface Product {
  id: string;
  slug: "descomplica-fotos" | "descomplica-church";
  name: string;
}

export interface Subscription {
  id: string;
  productSlug: Product["slug"];
  status: "trialing" | "active" | "past_due" | "canceled";
  plan: string;
}

export interface Album {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description: string | null;
  eventDate: string | null; // ISO date
  coverPhotoUrl: string | null;
  status: AlbumStatus;
  isPublic: boolean;
  matchThreshold: number;
  photoCount: number;
  faceCount: number;
  searchCount: number;
  createdAt: string; // ISO datetime
  processingProgress: number | null; // 0-100, só quando status === 'processing'
}

export interface Photo {
  id: string;
  albumId: string;
  url: string;
  thumbnailUrl: string;
  status: PhotoStatus;
  source: PhotoSource;
  errorMessage: string | null;
  createdAt: string;
}

export interface DashboardStats {
  photosThisMonth: number;
  activeAlbums: number;
  searchesPerformed: number;
  storageUsedBytes: number;
  storageLimitBytes: number;
}

export interface PublicAlbum {
  organizationName: string;
  organizationLogoUrl: string | null;
  albumName: string;
  albumSlug: string;
  organizationSlug: string;
  coverPhotoUrl: string | null;
  photoCount: number;
}

export interface SearchResultPhoto {
  id: string;
  url: string;
  thumbnailUrl: string;
  similarity: number; // 0-1, uso interno; não exibido ao visitante
}
