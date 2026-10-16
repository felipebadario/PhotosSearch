import { mockAlbums, mockLibrary, mockLoosePhotos, mockPhotosForAlbum } from "@/lib/mock-data";
import type { LibraryPhoto, LibrarySummary, Photo, PhotoSource } from "@/lib/types";
import { delay } from "./delay";

/** Upload direto e Dispositivo estão sempre disponíveis; o Google Drive ainda não. */
const ACTIVE_SOURCES = 2;

/** GET /api/library/summary */
export async function getLibrarySummary(): Promise<LibrarySummary> {
  await delay(80);
  const inAlbums = mockAlbums.reduce((sum, a) => sum + a.photoCount, 0);
  return {
    photoCount: inAlbums + mockLibrary.loosePhotoCount,
    albumCount: mockAlbums.length,
    connectedSources: ACTIVE_SOURCES,
  };
}

export type PeriodFilter = "all" | "30d" | "year";

export interface LibraryFilters {
  albumId?: string;
  source?: PhotoSource;
  period?: PeriodFilter;
}

function withAlbumName(photo: Photo): LibraryPhoto {
  const album = photo.albumId ? mockAlbums.find((a) => a.id === photo.albumId) : undefined;
  return { ...photo, albumName: album?.name ?? null };
}

/**
 * GET /api/library/photos — uma amostra do acervo para a galeria. Em produção
 * isso é paginado no banco; aqui juntamos as amostras dos álbuns de exemplo.
 */
export async function listLibraryPhotos(filters: LibraryFilters = {}): Promise<LibraryPhoto[]> {
  await delay(200);
  const albums = filters.albumId
    ? mockAlbums.filter((a) => a.id === filters.albumId)
    : mockAlbums;
  const pool: Photo[] = [
    ...albums.flatMap((a) => mockPhotosForAlbum(a.id, 8)),
    ...(filters.albumId ? [] : mockLoosePhotos(12)),
  ];

  const now = new Date("2026-10-16T12:00:00.000Z").getTime();
  const minTime =
    filters.period === "30d"
      ? now - 30 * 24 * 3600_000
      : filters.period === "year"
        ? new Date("2026-01-01T00:00:00.000Z").getTime()
        : -Infinity;

  return pool
    .filter((p) => !filters.source || p.source === filters.source)
    .filter((p) => (p.takenAt ? new Date(p.takenAt).getTime() >= minTime : true))
    .sort((a, b) => ((a.takenAt ?? "") < (b.takenAt ?? "") ? 1 : -1))
    .map(withAlbumName);
}
