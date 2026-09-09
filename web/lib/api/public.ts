import { findAlbumBySlugs, mockOrganization, mockPhotosForAlbum } from "@/lib/mock-data";
import type { PublicAlbum, SearchResultPhoto } from "@/lib/types";
import { delay } from "./delay";

/** GET /api/public/:orgSlug/:albumSlug */
export async function getPublicAlbum(
  organizationSlug: string,
  albumSlug: string,
): Promise<PublicAlbum | undefined> {
  await delay(150);
  const album = findAlbumBySlugs(organizationSlug, albumSlug);
  if (!album || !album.isPublic) return undefined;
  return {
    organizationName: mockOrganization.name,
    organizationLogoUrl: mockOrganization.logoUrl,
    albumName: album.name,
    albumSlug: album.slug,
    organizationSlug: mockOrganization.slug,
    coverPhotoUrl: album.coverPhotoUrl,
    photoCount: album.photoCount,
  };
}

/**
 * POST /api/public/:orgSlug/:albumSlug/search
 *
 * Em produção: recebe os bytes da selfie, chama o Face Search Service com
 * (organization_id, album_id, selfie_bytes), recebe os photo_id com maior
 * similaridade, resolve para URLs assinadas e DESCARTA a selfie e o
 * embedding imediatamente — nunca persiste nenhum dos dois. O mock abaixo
 * não recebe uma selfie de verdade; só simula o formato da resposta.
 */
export async function searchAlbumBySelfie(
  organizationSlug: string,
  albumSlug: string,
): Promise<SearchResultPhoto[]> {
  await delay(1400); // a inferência real (detecção + embedding) leva um tempo perceptível
  const album = findAlbumBySlugs(organizationSlug, albumSlug);
  if (!album) return [];
  const pool = mockPhotosForAlbum(album.id, 30);
  // Subconjunto determinístico, simulando "encontramos você em N fotos".
  return pool
    .filter((_, i) => i % 3 !== 0)
    .map((photo) => ({
      id: photo.id,
      url: photo.url,
      thumbnailUrl: photo.thumbnailUrl,
      similarity: 0.5 + Math.random() * 0.45,
    }))
    .sort((a, b) => b.similarity - a.similarity);
}
