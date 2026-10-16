import { mockAlbums, mockPhotosForAlbum } from "@/lib/mock-data";
import type { Album, LibraryPhoto } from "@/lib/types";
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
  await delay(150);
  return [...mockAlbums].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function listRecentAlbums(limit = 6): Promise<Album[]> {
  const albums = await listAlbums();
  // Na página inicial mostramos álbuns que já dá para abrir e buscar.
  return albums
    .filter((a) => a.photoCount > 0 && (a.status === "ready" || a.status === "published"))
    .slice(0, limit);
}

/** GET /api/albums/:id */
export async function getAlbum(id: string): Promise<Album | undefined> {
  await delay(100);
  return mockAlbums.find((a) => a.id === id);
}

/** GET /api/albums/:id/photos */
export async function listAlbumPhotos(id: string): Promise<LibraryPhoto[]> {
  await delay(200);
  const album = mockAlbums.find((a) => a.id === id);
  if (!album) return [];
  return mockPhotosForAlbum(id, 30).map((p) => ({ ...p, albumName: album.name }));
}
