import type { Album, DashboardStats, Organization, Photo, Subscription } from "./types";

/** Placeholder determinístico (mesmo seed = mesma imagem) — sem depender de fotos reais. */
function photoUrl(seed: string, width = 800, height = 600) {
  return `https://picsum.photos/seed/${seed}/${width}/${height}`;
}

export const mockOrganization: Organization = {
  id: "org_1",
  name: "Comunidade Vida Nova",
  slug: "comunidade-vida-nova",
  logoUrl: null,
};

export const mockSubscriptions: Subscription[] = [
  { id: "sub_1", productSlug: "descomplica-fotos", status: "active", plan: "standard" },
];

export const mockAlbums: Album[] = [
  {
    id: "alb_1",
    organizationId: mockOrganization.id,
    name: "Conferência 2026",
    slug: "conferencia-2026",
    description: "Três dias de louvor, palavra e comunhão.",
    eventDate: "2026-09-06",
    coverPhotoUrl: photoUrl("conferencia-2026-cover"),
    status: "published",
    isPublic: true,
    matchThreshold: 0.45,
    photoCount: 1106,
    faceCount: 5144,
    searchCount: 342,
    createdAt: "2026-09-01T10:00:00.000Z",
    processingProgress: null,
  },
  {
    id: "alb_2",
    organizationId: mockOrganization.id,
    name: "Batismo — Setembro",
    slug: "batismo-setembro",
    description: null,
    eventDate: "2026-09-14",
    coverPhotoUrl: photoUrl("batismo-setembro-cover"),
    status: "processing",
    isPublic: false,
    matchThreshold: 0.45,
    photoCount: 214,
    faceCount: 0,
    searchCount: 0,
    createdAt: "2026-09-14T18:30:00.000Z",
    processingProgress: 62,
  },
  {
    id: "alb_3",
    organizationId: mockOrganization.id,
    name: "Culto de Jovens",
    slug: "culto-de-jovens",
    description: "Encontro mensal da juventude.",
    eventDate: null,
    coverPhotoUrl: null,
    status: "draft",
    isPublic: false,
    matchThreshold: 0.45,
    photoCount: 0,
    faceCount: 0,
    searchCount: 0,
    createdAt: "2026-09-15T09:00:00.000Z",
    processingProgress: null,
  },
  {
    id: "alb_4",
    organizationId: mockOrganization.id,
    name: "Retiro de Casais",
    slug: "retiro-de-casais",
    description: "Final de semana em família.",
    eventDate: "2026-08-22",
    coverPhotoUrl: photoUrl("retiro-de-casais-cover"),
    status: "error",
    isPublic: false,
    matchThreshold: 0.45,
    photoCount: 89,
    faceCount: 0,
    searchCount: 0,
    createdAt: "2026-08-20T14:00:00.000Z",
    processingProgress: null,
  },
];

export function mockPhotosForAlbum(albumId: string, count = 24): Photo[] {
  return Array.from({ length: count }, (_, i) => {
    const seed = `${albumId}-${i}`;
    return {
      id: `pho_${albumId}_${i}`,
      albumId,
      url: photoUrl(seed, 1200, 900),
      thumbnailUrl: photoUrl(seed, 400, 300),
      status: "ready" as const,
      source: i % 5 === 0 ? ("google_drive" as const) : ("upload" as const),
      errorMessage: null,
      createdAt: new Date(Date.now() - i * 60_000).toISOString(),
    };
  });
}

export const mockDashboardStats: DashboardStats = {
  photosThisMonth: 8420,
  activeAlbums: mockAlbums.filter((a) => a.status !== "draft").length,
  searchesPerformed: 2184,
  storageUsedBytes: 18 * 1024 ** 3,
  storageLimitBytes: 50 * 1024 ** 3,
};

export function findAlbumBySlugs(organizationSlug: string, albumSlug: string): Album | undefined {
  if (organizationSlug !== mockOrganization.slug) return undefined;
  return mockAlbums.find((a) => a.slug === albumSlug);
}
