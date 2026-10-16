"use server";

/**
 * Buscas. A busca por rosto já existe como motor (face-search-service/), mas
 * ainda não está ligada a este app: as funções abaixo devolvem resultados de
 * DEMONSTRAÇÃO, e a interface os rotula assim. A selfie nunca é enviada nesta
 * prévia. Em produção: os bytes da selfie vão para o Face Search Service com
 * (account_id, escopo), voltam os photo_id mais parecidos, e a selfie e o
 * embedding são descartados na hora, nunca persistidos.
 */

import { mockAlbums, mockAccount, mockLoosePhotos, mockPhotosForAlbum, findPublicAlbum } from "@/lib/mock-data";
import type { Photo, SearchResultPhoto, SearchScope } from "@/lib/types";

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function toResult(photo: Photo, i: number): SearchResultPhoto {
  return {
    id: photo.id,
    url: photo.url,
    thumbnailUrl: photo.thumbnailUrl,
    albumName: mockAlbums.find((a) => a.id === photo.albumId)?.name ?? null,
    source: photo.source,
    takenAt: photo.takenAt,
    similarity: 0.92 - i * 0.02,
  };
}

/** POST /api/search/face — demonstração. */
export async function searchByFaceAction(scope: SearchScope): Promise<SearchResultPhoto[]> {
  await wait(1600);
  const pool: Photo[] =
    scope.kind === "album"
      ? mockPhotosForAlbum(scope.albumId, 30)
      : [
          ...mockAlbums.filter((a) => a.accountId === mockAccount.id).flatMap((a) => mockPhotosForAlbum(a.id, 4)),
          ...mockLoosePhotos(6),
        ];
  return pool.filter((_, i) => i % 3 !== 0).slice(0, 18).map(toResult);
}

/** POST /api/public/:handle/:album/search — demonstração. */
export async function searchPublicAlbumAction(
  handle: string,
  albumSlug: string,
): Promise<SearchResultPhoto[]> {
  await wait(1600);
  const album = findPublicAlbum(handle, albumSlug);
  if (!album) return [];
  return mockPhotosForAlbum(album.id, 30)
    .filter((_, i) => i % 3 !== 0)
    .map(toResult);
}
