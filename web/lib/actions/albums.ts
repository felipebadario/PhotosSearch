"use server";

/**
 * Mutações de álbum como Server Actions. Hoje mutam lib/mock-data.ts em
 * memória (só sobrevive enquanto o servidor Next.js estiver de pé); a v0.2
 * troca o corpo destas funções por chamadas reais (INSERT/UPDATE no Postgres,
 * enfileirar ProcessingJob) sem mudar a assinatura nem os call sites no
 * client. Ver docs/api-routes.md.
 */

import { revalidatePath } from "next/cache";
import { mockAlbums } from "@/lib/mock-data";
import type { Album } from "@/lib/types";
import { slugify } from "@/lib/api/albums";

function requireAlbum(id: string): Album {
  const album = mockAlbums.find((a) => a.id === id);
  if (!album) throw new Error("Álbum não encontrado.");
  return album;
}

function touch() {
  revalidatePath("/dashboard");
  revalidatePath("/albums");
}

export interface CreateAlbumInput {
  name: string;
  eventDate: string | null;
  description: string | null;
}

/** POST /api/albums */
export async function createAlbumAction(input: CreateAlbumInput): Promise<Album> {
  const album: Album = {
    id: `alb_${Math.random().toString(36).slice(2, 9)}`,
    organizationId: "org_1",
    name: input.name,
    slug: slugify(input.name),
    description: input.description,
    eventDate: input.eventDate,
    coverPhotoUrl: null,
    status: "draft",
    isPublic: false,
    matchThreshold: 0.45,
    photoCount: 0,
    faceCount: 0,
    searchCount: 0,
    createdAt: new Date().toISOString(),
    processingProgress: null,
  };
  mockAlbums.unshift(album);
  touch();
  return album;
}

/** Marca o álbum como em processamento assim que o envio começa — persistido
 *  de verdade no mock, diferente da barra de progresso do wizard (que é só
 *  uma animação no client). Por isso um álbum cujo envio foi iniciado e a
 *  aba foi fechada continua aparecendo como "Processando" na lista. */
export async function startProcessingAction(albumId: string): Promise<void> {
  const album = requireAlbum(albumId);
  album.status = "processing";
  album.processingProgress = 0;
  touch();
  revalidatePath(`/albums/${albumId}`);
}

/**
 * Registra o resultado do upload+processamento de fotos. Em produção isso
 * não é uma chamada única: cada foto vira um Photo + ProcessingJob, e o
 * worker vai atualizando o progresso conforme processa (ver
 * docs/architecture.md). O mock recebe o total já pronto porque a animação
 * de progresso do wizard roda no client, sem round-trip por foto.
 */
export async function commitAlbumPhotosAction(
  albumId: string,
  photoCount: number,
): Promise<Album> {
  const album = requireAlbum(albumId);
  album.photoCount = photoCount;
  album.faceCount = Math.round(photoCount * 4.2);
  album.processingProgress = null;
  album.status = "draft"; // pronto para publicar
  touch();
  revalidatePath(`/albums/${albumId}`);
  return album;
}

/** POST /api/albums/:id/publish */
export async function publishAlbumAction(id: string): Promise<Album> {
  const album = requireAlbum(id);
  album.status = "published";
  album.isPublic = true;
  touch();
  revalidatePath(`/albums/${id}`);
  return album;
}

export interface UpdateAlbumInput {
  name?: string;
  description?: string | null;
  eventDate?: string | null;
  matchThreshold?: number;
}

/** PATCH /api/albums/:id */
export async function updateAlbumAction(
  id: string,
  input: UpdateAlbumInput,
): Promise<Album> {
  const album = requireAlbum(id);
  Object.assign(album, input);
  touch();
  revalidatePath(`/albums/${id}`);
  return album;
}
