import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createMockContext(user?: Partial<AuthenticatedUser>): TrpcContext {
  const clearedCookies: any[] = [];
  const setCookies: any[] = [];

  const fullUser: AuthenticatedUser | null = user ? {
    id: user.id ?? 1,
    openId: user.openId ?? "test-user-123",
    email: user.email ?? "test@example.com",
    name: user.name ?? "Test User",
    displayName: (user as any).displayName ?? "Test User",
    loginMethod: user.loginMethod ?? "email",
    role: user.role ?? "user",
    createdAt: user.createdAt ?? new Date(),
    updatedAt: user.updatedAt ?? new Date(),
    lastSignedIn: user.lastSignedIn ?? new Date(),
    passwordHash: null,
    avatarUrl: null,
    subscriptionTier: "free",
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    epicChips: 10000,
    gamesPlayed: 0,
    tournamentsWon: 0,
  } as AuthenticatedUser : null;

  return {
    user: fullUser,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
      cookie: (name: string, value: string, options: Record<string, unknown>) => {
        setCookies.push({ name, value, options });
      },
    } as TrpcContext["res"],
  };
}

describe("auth.me", () => {
  it("returns null when no user is authenticated", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns user data when authenticated", async () => {
    const ctx = createMockContext({ id: 1, name: "Test User", email: "test@example.com" });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.name).toBe("Test User");
    expect(result?.email).toBe("test@example.com");
  });
});

describe("profile.get", () => {
  it("returns the current user profile when authenticated", async () => {
    const ctx = createMockContext({ id: 1, name: "Test User" });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.profile.get();
    expect(result).not.toBeNull();
    expect(result.name).toBe("Test User");
    expect(result.id).toBe(1);
  });

  it("throws when not authenticated", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.profile.get()).rejects.toThrow();
  });
});

describe("tournament.list", () => {
  it("returns an array (public procedure)", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.tournament.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("tournament.create input validation", () => {
  it("rejects tournament name shorter than 3 characters", async () => {
    const ctx = createMockContext({ id: 1, name: "Test" });
    const caller = appRouter.createCaller(ctx);
    await expect(caller.tournament.create({
      name: "ab",
      gameType: "nlh",
      tableSize: "9",
      startingChips: 10000,
      lateRegistration: true,
      lateRegLevels: 6,
      reEntry: false,
      maxReEntries: 1,
      provablyFair: true,
      maxPlayers: 100,
      blindLevels: [
        { levelOrder: 1, isBreak: false, smallBlind: 25, bigBlind: 50, ante: 0, duration: 15 },
      ],
    })).rejects.toThrow();
  });

  it("rejects invalid game type", async () => {
    const ctx = createMockContext({ id: 1, name: "Test" });
    const caller = appRouter.createCaller(ctx);
    await expect(caller.tournament.create({
      name: "Valid Name",
      gameType: "invalid" as any,
      tableSize: "9",
      startingChips: 10000,
      lateRegistration: true,
      lateRegLevels: 6,
      reEntry: false,
      maxReEntries: 1,
      provablyFair: true,
      maxPlayers: 100,
      blindLevels: [
        { levelOrder: 1, isBreak: false, smallBlind: 25, bigBlind: 50, ante: 0, duration: 15 },
      ],
    })).rejects.toThrow();
  });

  it("rejects invalid table size", async () => {
    const ctx = createMockContext({ id: 1, name: "Test" });
    const caller = appRouter.createCaller(ctx);
    await expect(caller.tournament.create({
      name: "Valid Name",
      gameType: "nlh",
      tableSize: "12" as any,
      startingChips: 10000,
      lateRegistration: true,
      lateRegLevels: 6,
      reEntry: false,
      maxReEntries: 1,
      provablyFair: true,
      maxPlayers: 100,
      blindLevels: [
        { levelOrder: 1, isBreak: false, smallBlind: 25, bigBlind: 50, ante: 0, duration: 15 },
      ],
    })).rejects.toThrow();
  });

  it("rejects starting chips below minimum", async () => {
    const ctx = createMockContext({ id: 1, name: "Test" });
    const caller = appRouter.createCaller(ctx);
    await expect(caller.tournament.create({
      name: "Valid Name",
      gameType: "nlh",
      tableSize: "9",
      startingChips: 10,
      lateRegistration: true,
      lateRegLevels: 6,
      reEntry: false,
      maxReEntries: 1,
      provablyFair: true,
      maxPlayers: 100,
      blindLevels: [
        { levelOrder: 1, isBreak: false, smallBlind: 25, bigBlind: 50, ante: 0, duration: 15 },
      ],
    })).rejects.toThrow();
  });
});

describe("tournament.myTournaments", () => {
  it("requires authentication", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.tournament.myTournaments()).rejects.toThrow();
  });

  it("returns array when authenticated", async () => {
    const ctx = createMockContext({ id: 1, name: "Test" });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.tournament.myTournaments();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("tournament.myParticipations", () => {
  it("requires authentication", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.tournament.myParticipations()).rejects.toThrow();
  });

  it("returns array when authenticated", async () => {
    const ctx = createMockContext({ id: 1, name: "Test" });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.tournament.myParticipations();
    expect(Array.isArray(result)).toBe(true);
  });
});
