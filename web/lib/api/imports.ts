import { mockAlbums, mockImports } from "@/lib/mock-data";
import type { ImportJob } from "@/lib/types";
import { delay } from "./delay";

export interface ImportWithAlbum extends ImportJob {
  albumName: string | null;
}

/** GET /api/imports */
export async function listImports(): Promise<ImportWithAlbum[]> {
  await delay(120);
  return [...mockImports]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .map((imp) => ({
      ...imp,
      albumName: mockAlbums.find((a) => a.id === imp.albumId)?.name ?? null,
    }));
}
