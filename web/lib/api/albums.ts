import { mockAlbums, mockPhotosForAlbum } from "@/lib/mock-data";
import type { Album, AlbumStatus, Photo } from "@/lib/types";
import { delay } from "./delay";

const DIACRITICS_REGEX = new RegExp("[̀-ͯ]", "g");

export function slugify(name: string) {
  return name
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** GET /api/albums */
export async function listAlbums(): Promise<Album[]> {
  await delay(200);
  return [...mockAlbums].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/** GET /api/albums/:id */
export async function getAlbum(id: string): Promise<Album | undefined> {
  await delay(150);
  return mockAlbums.find((a) => a.id === id);
}

/** GET /api/albums/:id/photos */
export async function listAlbumPhotos(id: string): Promise<Photo[]> {
  await delay(250);
  const album = mockAlbums.find((a) => a.id === id);
  if (!album || album.photoCount === 0) return [];
  return mockPhotosForAlbum(id, Math.min(album.photoCount, 30));
}

export function statusLabel(status: AlbumStatus): string {
  return {
    draft: "Rascunho",
    processing: "Processando",
    published: "Publicado",
    error: "Erro",
  }[status];
}
