import { mockAccount, mockPlan, mockSubscription, mockUsage, mockUser } from "@/lib/mock-data";
import type { Account, Plan, Subscription, Usage, User } from "@/lib/types";
import { getLibrarySummary } from "./library";
import { delay } from "./delay";

/** GET /api/me — sem autenticação nesta fase: sempre o usuário de demonstração. */
export async function getCurrentUser(): Promise<User> {
  await delay(50);
  return mockUser;
}

/** GET /api/account */
export async function getAccount(): Promise<Account> {
  await delay(50);
  return mockAccount;
}

/** GET /api/account/subscription */
export async function getSubscription(): Promise<{ subscription: Subscription; plan: Plan }> {
  await delay(80);
  return { subscription: mockSubscription, plan: mockPlan };
}

/** GET /api/account/usage */
export async function getUsage(): Promise<Usage> {
  const summary = await getLibrarySummary();
  return {
    photoCount: summary.photoCount,
    photoLimit: mockPlan.photoLimit,
    storageUsedBytes: mockUsage.storageUsedBytes,
    storageLimitBytes: mockPlan.storageLimitBytes,
    searchesThisMonth: mockUsage.searchesThisMonth,
    monthlySearchLimit: mockPlan.monthlySearchLimit,
  };
}
