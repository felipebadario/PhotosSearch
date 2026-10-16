"use server";

/**
 * Importação de fotos. Nesta prévia os arquivos NÃO saem do navegador: o
 * cliente só informa quantos arquivos foram escolhidos e o resultado de cada
 * um. Em produção, cada arquivo vira um upload para o storage + um Photo + um
 * ProcessingJob, e o worker atualiza o progresso de preparação.
 */

import { revalidatePath } from "next/cache";
import { mockAccount, mockAlbums, mockImports, mockLibrary } from "@/lib/mock-data";
import { slugify } from "@/lib/api/albums";
import type { Album, ImportJob, PhotoSource } from "@/lib/types";

export type ImportDestination =
  | { kind: "library" }
  | { kind: "existing"; albumId: string }
  | { kind: "new"; name: string; eventDate: string | null };

function newId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function touch() {
  revalidatePath("/");
  revalidatePath("/acervo", "layout");
}

/** POST /api/imports */
export async function startImportAction(input: {
  destination: ImportDestination;
  source: PhotoSource;
  totalFiles: number;
}): Promise<{ importId: string; albumId: string | null }> {
  let albumId: string | null = null;

  if (input.destination.kind === "new") {
    const album: Album = {
      id: newId("alb"),
      accountId: mockAccount.id,
      name: input.destination.name,
      slug: slugify(input.destination.name),
      description: null,
      eventDate: input.destination.eventDate,
      coverPhotoUrl: null,
      status: "processing",
      isPublic: false,
      matchThreshold: 0.45,
      photoCount: 0,
      searchCount: 0,
      createdAt: new Date().toISOString(),
      processingProgress: 0,
    };
    mockAlbums.unshift(album);
    albumId = album.id;
  } else if (input.destination.kind === "existing") {
    const { albumId: targetId } = input.destination;
    const album = mockAlbums.find((a) => a.id === targetId);
    if (!album) throw new Error("Álbum não encontrado.");
    album.status = "processing";
    album.processingProgress = 0;
    albumId = album.id;
  }

  const job: ImportJob = {
    id: newId("imp"),
    accountId: mockAccount.id,
    albumId,
    source: input.source,
    totalFiles: input.totalFiles,
    succeededFiles: 0,
    failedFiles: 0,
    status: "uploading",
    createdAt: new Date().toISOString(),
  };
  mockImports.unshift(job);
  touch();
  return { importId: job.id, albumId };
}

/** POST /api/imports/:id/complete */
export async function completeImportAction(
  importId: string,
  result: { succeeded: number; failed: number },
): Promise<ImportJob> {
  const job = mockImports.find((j) => j.id === importId);
  if (!job) throw new Error("Importação não encontrada.");
  job.succeededFiles = result.succeeded;
  job.failedFiles = result.failed;
  job.status = result.succeeded === 0 ? "error" : "done";

  const album = job.albumId ? mockAlbums.find((a) => a.id === job.albumId) : undefined;
  if (album) {
    album.photoCount += result.succeeded;
    album.processingProgress = null;
    album.status = album.isPublic ? "published" : album.photoCount > 0 ? "ready" : "draft";
  } else if (!job.albumId) {
    mockLibrary.loosePhotoCount += result.succeeded;
  }
  touch();
  return job;
}
