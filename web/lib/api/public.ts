import { findPublicAlbum, mockAccount } from "@/lib/mock-data";
import type { PublicAlbum } from "@/lib/types";
import { delay } from "./delay";

/** GET /api/public/:handle/:albumSlug */
export async function getPublicAlbum(
  handle: string,
  albumSlug: string,
): Promise<PublicAlbum | undefined> {
  await delay(120);
  const album = findPublicAlbum(handle, albumSlug);
  if (!album) return undefined;
  return {
    accountName: mockAccount.name,
    accountAvatarUrl: mockAccount.avatarUrl,
    accountHandle: mockAccount.handle,
    albumName: album.name,
    albumSlug: album.slug,
    coverPhotoUrl: album.coverPhotoUrl,
    photoCount: album.photoCount,
  };
}
