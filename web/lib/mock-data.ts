/**
 * Dados de demonstração em memória. Não são persistentes: vivem só enquanto a
 * instância do servidor estiver de pé (na Vercel, podem sumir a qualquer
 * momento). Só lib/api/* e lib/actions/* leem ou alteram este arquivo; a
 * interface nunca importa daqui diretamente.
 */
import type {
  Account,
  Album,
  ImportJob,
  Photo,
  PhotoSource,
  Plan,
  Subscription,
  User,
} from "./types";

/** Placeholder determinístico (mesmo seed = mesma imagem), sem depender de fotos reais. */
function photoUrl(seed: string, width = 800, height = 600) {
  return `https://picsum.photos/seed/nf-${seed}/${width}/${height}`;
}

export const mockUser: User = {
  id: "usr_1",
  name: "Felipe",
  email: "felipe@exemplo.com",
};

export const mockAccount: Account = {
  id: "acc_1",
  ownerUserId: mockUser.id,
  name: "Felipe",
  handle: "felipe",
  avatarUrl: null,
};

export const mockPlan: Plan = {
  id: "plan_preview",
  name: "Prévia",
  photoLimit: 20_000,
  storageLimitBytes: 50 * 1024 ** 3,
  monthlySearchLimit: 500,
};

export const mockSubscription: Subscription = {
  id: "sub_1",
  accountId: mockAccount.id,
  planId: mockPlan.id,
  status: "preview",
};

function album(
  partial: Pick<Album, "id" | "name" | "slug" | "status" | "photoCount" | "createdAt"> &
    Partial<Album>,
): Album {
  return {
    accountId: mockAccount.id,
    description: null,
    eventDate: null,
    coverPhotoUrl: photoUrl(`${partial.slug}-cover`),
    isPublic: false,
    matchThreshold: 0.45,
    searchCount: 0,
    processingProgress: null,
    ...partial,
  };
}

export const mockAlbums: Album[] = [
  album({
    id: "alb_1",
    name: "Viagem ao Rio",
    slug: "viagem-ao-rio",
    description: "Uma semana entre praia, trilha e Santa Teresa.",
    eventDate: "2026-07-12",
    status: "ready",
    photoCount: 642,
    createdAt: "2026-07-20T10:00:00.000Z",
  }),
  album({
    id: "alb_2",
    name: "Família",
    slug: "familia",
    description: "Os momentos de casa, de todos os anos.",
    status: "ready",
    photoCount: 3480,
    createdAt: "2026-03-02T09:00:00.000Z",
  }),
  album({
    id: "alb_3",
    name: "Aniversário da Ana",
    slug: "aniversario-da-ana",
    description: "Os 30 anos da Ana, com a turma toda.",
    eventDate: "2026-05-03",
    status: "published",
    isPublic: true,
    photoCount: 214,
    searchCount: 37,
    createdAt: "2026-05-04T18:30:00.000Z",
  }),
  album({
    id: "alb_4",
    name: "Formatura da Júlia",
    slug: "formatura-da-julia",
    eventDate: "2025-12-14",
    status: "processing",
    photoCount: 389,
    processingProgress: 62,
    createdAt: "2026-10-15T21:00:00.000Z",
  }),
  album({
    id: "alb_5",
    name: "Casamento Pedro e Lu",
    slug: "casamento-pedro-e-lu",
    eventDate: "2026-02-21",
    status: "ready",
    photoCount: 1120,
    createdAt: "2026-02-28T14:00:00.000Z",
  }),
  album({
    id: "alb_6",
    name: "Fim de semana na serra",
    slug: "fim-de-semana-na-serra",
    status: "draft",
    photoCount: 0,
    coverPhotoUrl: null,
    createdAt: "2026-10-10T09:00:00.000Z",
  }),
  album({
    id: "alb_7",
    name: "Fotos antigas digitalizadas",
    slug: "fotos-antigas-digitalizadas",
    status: "error",
    photoCount: 89,
    createdAt: "2026-08-20T14:00:00.000Z",
  }),
  album({
    id: "alb_8",
    name: "Shows e eventos",
    slug: "shows-e-eventos",
    status: "ready",
    photoCount: 2160,
    createdAt: "2026-06-01T12:00:00.000Z",
  }),
];

/** Contadores do acervo que não pertencem a um álbum (mutáveis pelas actions). */
export const mockLibrary = {
  loosePhotoCount: 4746,
};

/** Álbuns de exemplo com fotos geradas. Álbuns criados durante o uso da
 *  prévia não ganham fotos: os arquivos enviados não são armazenados. */
const seededAlbumIds = new Set(mockAlbums.map((a) => a.id));

const SOURCES: PhotoSource[] = ["upload", "upload", "device", "google_drive", "device"];

function seededPhoto(key: string, i: number, albumId: string | null, baseDate: string): Photo {
  const seed = `${key}-${i}`;
  const taken = new Date(new Date(baseDate).getTime() - i * 37 * 60_000).toISOString();
  return {
    id: `pho_${key}_${i}`,
    accountId: mockAccount.id,
    albumId,
    url: photoUrl(seed, 1600, 1200),
    thumbnailUrl: photoUrl(seed, 480, 480),
    status: "ready",
    source: SOURCES[i % SOURCES.length],
    takenAt: taken,
    errorMessage: null,
    createdAt: taken,
  };
}

export function mockPhotosForAlbum(albumId: string, count = 24): Photo[] {
  const album = mockAlbums.find((a) => a.id === albumId);
  if (!album || !seededAlbumIds.has(albumId)) return [];
  const base = album.eventDate ? `${album.eventDate}T18:00:00.000Z` : album.createdAt;
  return Array.from({ length: Math.min(count, album.photoCount) }, (_, i) =>
    seededPhoto(albumId, i, albumId, base),
  );
}

export function mockLoosePhotos(count = 12): Photo[] {
  return Array.from({ length: count }, (_, i) =>
    seededPhoto("acervo", i, null, "2026-10-01T15:00:00.000Z"),
  );
}

export const mockImports: ImportJob[] = [
  {
    id: "imp_3",
    accountId: mockAccount.id,
    albumId: "alb_4",
    source: "upload",
    totalFiles: 389,
    succeededFiles: 389,
    failedFiles: 0,
    status: "preparing",
    createdAt: "2026-10-15T21:00:00.000Z",
  },
  {
    id: "imp_2",
    accountId: mockAccount.id,
    albumId: "alb_7",
    source: "upload",
    totalFiles: 96,
    succeededFiles: 89,
    failedFiles: 7,
    status: "error",
    createdAt: "2026-08-20T14:00:00.000Z",
  },
  {
    id: "imp_1",
    accountId: mockAccount.id,
    albumId: "alb_1",
    source: "device",
    totalFiles: 642,
    succeededFiles: 642,
    failedFiles: 0,
    status: "done",
    createdAt: "2026-07-20T10:00:00.000Z",
  },
];

export const mockUsage = {
  storageUsedBytes: Math.round(18.4 * 1024 ** 3),
  searchesThisMonth: 126,
};

export function findPublicAlbum(handle: string, albumSlug: string): Album | undefined {
  if (handle !== mockAccount.handle) return undefined;
  return mockAlbums.find((a) => a.slug === albumSlug && a.isPublic);
}
