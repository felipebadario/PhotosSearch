"use server";

/**
 * Mutações de álbum como Server Actions. Hoje mutam lib/mock-data.ts em
 * memória (não persistem); a próxima fase troca o corpo destas funções por
 * chamadas reais ao banco sem mudar a assinatura nem os call sites.
 * Ver docs/api-routes.md.
 */

import { revalidatePath } from "next/cache";
import { mockAlbums } from "@/lib/mock-data";
import type { Album } from "@/lib/types";

function requireAlbum(id: string): Album {
  const album = mockAlbums.find((a) => a.id === id);
  if (!album) throw new Error("Álbum não encontrado.");
  return album;
}

function touch(id: string) {
  revalidatePath("/");
  revalidatePath("/acervo", "layout");
  revalidatePath(`/acervo/albuns/${id}`, "layout");
}

/** POST /api/albums/:id/share */
export async function publishAlbumAction(id: string): Promise<Album> {
  const album = requireAlbum(id);
  album.status = "published";
  album.isPublic = true;
  touch(id);
  return album;
}

/** DELETE /api/albums/:id/share */
export async function unpublishAlbumAction(id: string): Promise<Album> {
  const album = requireAlbum(id);
  album.isPublic = false;
  album.status = album.photoCount > 0 ? "ready" : "draft";
  touch(id);
  return album;
}

export interface UpdateAlbumInput {
  name?: string;
  description?: string | null;
  eventDate?: string | null;
  matchThreshold?: number;
}

/** PATCH /api/albums/:id */
export async function updateAlbumAction(id: string, input: UpdateAlbumInput): Promise<Album> {
  const album = requireAlbum(id);
  Object.assign(album, input);
  touch(id);
  return album;
}
