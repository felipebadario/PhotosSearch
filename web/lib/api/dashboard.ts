import { mockAlbums, mockDashboardStats } from "@/lib/mock-data";
import type { Album, DashboardStats } from "@/lib/types";
import { delay } from "./delay";

/** GET /api/dashboard — ver docs/api-routes.md */
export async function getDashboardStats(): Promise<DashboardStats> {
  await delay(150);
  return mockDashboardStats;
}

export async function getRecentAlbums(limit = 5): Promise<Album[]> {
  await delay(150);
  return [...mockAlbums]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, limit);
}
