import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  listSubscriptionTiers: vi.fn(),
  createSubscriptionTier: vi.fn(),
  updateSubscriptionTier: vi.fn(),
  deleteSubscriptionTier: vi.fn(),
}));

vi.mock("./db", () => dbMocks);

import { appRouter } from "./routers";

function createContext(cookie = "") {
  const headers: Record<string, string> = {};
  if (cookie) headers.cookie = cookie;
  const responseHeaders: Record<string, string> = {};
  const ctx: TrpcContext = {
    user: null,
    req: { protocol: "https", headers } as TrpcContext["req"],
    res: {
      setHeader: (name: string, value: string) => { responseHeaders[name] = value; },
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
  return { ctx, responseHeaders };
}

const sampleTier = {
  id: 1,
  name: "Free",
  price: "0.00",
  description: "Start here",
  perks: [],
  badgeColor: "#8b7bb8",
  featured: false,
  sortOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const tierInput = {
  name: "EPIC",
  price: "29.69",
  description: "The inner circle",
  perks: ["Private tables"],
  badgeColor: "#D4AF37",
  featured: true,
  sortOrder: 3,
};

describe("subscription procedures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.listSubscriptionTiers.mockResolvedValue([sampleTier]);
    dbMocks.createSubscriptionTier.mockResolvedValue({ ...sampleTier, ...tierInput, id: 4 });
    dbMocks.updateSubscriptionTier.mockResolvedValue({ ...sampleTier, ...tierInput });
    dbMocks.deleteSubscriptionTier.mockResolvedValue({ success: true });
  });

  it("returns tiers through the public list procedure", async () => {
    const { ctx } = createContext();
    const result = await appRouter.createCaller(ctx).subscriptions.list();
    expect(result).toEqual([sampleTier]);
    expect(dbMocks.listSubscriptionTiers).toHaveBeenCalledOnce();
  });

  it("logs in with the configured password and exposes an authenticated status", async () => {
    const login = createContext();
    await appRouter.createCaller(login.ctx).admin.login({ password: "epic2024" });
    const cookie = login.responseHeaders["Set-Cookie"];
    expect(cookie).toContain("epic_admin_session=");

    const status = await appRouter.createCaller(createContext(cookie).ctx).admin.status();
    expect(status).toEqual({ authenticated: true });
  });

  it("rejects CRUD access without an admin session", async () => {
    await expect(appRouter.createCaller(createContext().ctx).admin.tiers()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("supports create, update, and delete for an authenticated admin", async () => {
    const login = createContext();
    await appRouter.createCaller(login.ctx).admin.login({ password: "epic2024" });
    const cookie = login.responseHeaders["Set-Cookie"];
    const caller = appRouter.createCaller(createContext(cookie).ctx);

    await caller.admin.createTier(tierInput);
    await caller.admin.updateTier({ id: 1, data: tierInput });
    await caller.admin.deleteTier({ id: 1 });

    expect(dbMocks.createSubscriptionTier).toHaveBeenCalledWith(tierInput);
    expect(dbMocks.updateSubscriptionTier).toHaveBeenCalledWith(1, tierInput);
    expect(dbMocks.deleteSubscriptionTier).toHaveBeenCalledWith(1);
  });
});
