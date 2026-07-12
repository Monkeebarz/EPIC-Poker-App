import { eq, and, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  InsertTournament, tournaments,
  InsertBlindLevel, blindLevels,
  InsertTournamentParticipant, tournamentParticipants,
  InsertOAuthAccount, oauthAccounts,
  InsertGameAuditLog, gameAuditLog,
  savedStructures,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ USER QUERIES ============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "displayName", "avatarUrl", "passwordHash"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      (values as any)[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }
    if (user.subscriptionTier !== undefined) {
      values.subscriptionTier = user.subscriptionTier;
      updateSet.subscriptionTier = user.subscriptionTier;
    }
    if (user.stripeCustomerId !== undefined) {
      values.stripeCustomerId = user.stripeCustomerId;
      updateSet.stripeCustomerId = user.stripeCustomerId;
    }
    if (user.stripeSubscriptionId !== undefined) {
      values.stripeSubscriptionId = user.stripeSubscriptionId;
      updateSet.stripeSubscriptionId = user.stripeSubscriptionId;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserProfile(userId: number, data: { displayName?: string; avatarUrl?: string }) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(data).where(eq(users.id, userId));
}

// ============ OAUTH ACCOUNT QUERIES ============

export async function getOAuthAccount(provider: string, providerAccountId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(oauthAccounts)
    .where(and(eq(oauthAccounts.provider, provider), eq(oauthAccounts.providerAccountId, providerAccountId)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createOAuthAccount(data: InsertOAuthAccount) {
  const db = await getDb();
  if (!db) return;
  await db.insert(oauthAccounts).values(data);
}

// ============ TOURNAMENT QUERIES ============

export async function createTournament(data: InsertTournament) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(tournaments).values(data);
  return result[0].insertId;
}

export async function getTournamentByPublicId(publicId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tournaments).where(eq(tournaments.publicId, publicId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getTournamentBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  // Try slug first, then publicId as fallback
  let result = await db.select().from(tournaments).where(eq(tournaments.slug, slug)).limit(1);
  if (result.length === 0) {
    result = await db.select().from(tournaments).where(eq(tournaments.publicId, slug)).limit(1);
  }
  return result.length > 0 ? result[0] : undefined;
}

export async function getTournamentsByCreator(creatorId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tournaments).where(eq(tournaments.creatorId, creatorId)).orderBy(desc(tournaments.createdAt));
}

export async function getAvailableTournaments() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tournaments)
    .where(sql`${tournaments.status} IN ('scheduled', 'registering', 'running') AND ${tournaments.isPrivate} = false`)
    .orderBy(desc(tournaments.createdAt));
}

export async function getAllTournaments() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tournaments)
    .where(eq(tournaments.isPrivate, false))
    .orderBy(desc(tournaments.createdAt));
}

export async function updateTournament(id: number, data: Partial<InsertTournament>) {
  const db = await getDb();
  if (!db) return;
  await db.update(tournaments).set(data).where(eq(tournaments.id, id));
}

// ============ BLIND LEVEL QUERIES ============

export async function getBlindLevels(tournamentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(blindLevels)
    .where(eq(blindLevels.tournamentId, tournamentId))
    .orderBy(blindLevels.levelOrder);
}

export async function setBlindLevels(tournamentId: number, levels: Omit<InsertBlindLevel, "tournamentId">[]) {
  const db = await getDb();
  if (!db) return;
  // Delete existing levels
  await db.delete(blindLevels).where(eq(blindLevels.tournamentId, tournamentId));
  // Insert new levels
  if (levels.length > 0) {
    const rows = levels.map(l => ({ ...l, tournamentId }));
    await db.insert(blindLevels).values(rows);
  }
}

// ============ TOURNAMENT PARTICIPANT QUERIES ============

export async function registerForTournament(tournamentId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.insert(tournamentParticipants).values({ tournamentId, userId, chipCount: 0 });
}

export async function getTournamentParticipants(tournamentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    participant: tournamentParticipants,
    user: {
      id: users.id,
      displayName: users.displayName,
      name: users.name,
      avatarUrl: users.avatarUrl,
    }
  }).from(tournamentParticipants)
    .innerJoin(users, eq(tournamentParticipants.userId, users.id))
    .where(eq(tournamentParticipants.tournamentId, tournamentId));
}

export async function getUserParticipations(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    participant: tournamentParticipants,
    tournament: tournaments,
  }).from(tournamentParticipants)
    .innerJoin(tournaments, eq(tournamentParticipants.tournamentId, tournaments.id))
    .where(eq(tournamentParticipants.userId, userId))
    .orderBy(desc(tournamentParticipants.registeredAt));
}

export async function isUserRegistered(tournamentId: number, userId: number) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(tournamentParticipants)
    .where(and(eq(tournamentParticipants.tournamentId, tournamentId), eq(tournamentParticipants.userId, userId)))
    .limit(1);
  return result.length > 0;
}

export async function getParticipantCount(tournamentId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`COUNT(*)` })
    .from(tournamentParticipants)
    .where(eq(tournamentParticipants.tournamentId, tournamentId));
  return result[0]?.count ?? 0;
}

export async function unregisterFromTournament(tournamentId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(tournamentParticipants)
    .where(and(eq(tournamentParticipants.tournamentId, tournamentId), eq(tournamentParticipants.userId, userId)));
}

export async function updateParticipantStatus(tournamentId: number, userId: number, status: "pending" | "registered" | "playing" | "eliminated" | "winner") {
  const db = await getDb();
  if (!db) return;
  await db.update(tournamentParticipants)
    .set({ status })
    .where(and(eq(tournamentParticipants.tournamentId, tournamentId), eq(tournamentParticipants.userId, userId)));
}

export async function getParticipantStatus(tournamentId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tournamentParticipants)
    .where(and(eq(tournamentParticipants.tournamentId, tournamentId), eq(tournamentParticipants.userId, userId)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ AUDIT LOG QUERIES ============

export async function addAuditLog(data: InsertGameAuditLog) {
  const db = await getDb();
  if (!db) return;
  await db.insert(gameAuditLog).values(data);
}

export async function getAuditLogs(tournamentId: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(gameAuditLog)
    .where(eq(gameAuditLog.tournamentId, tournamentId))
    .orderBy(desc(gameAuditLog.createdAt))
    .limit(limit);
}

// ===== Saved Tournament Structures =====

export async function saveStructure(userId: number, name: string, settings: Record<string, any>) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(savedStructures).values({ userId, name, settings });
  return result[0].insertId;
}

export async function getUserStructures(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(savedStructures)
    .where(eq(savedStructures.userId, userId))
    .orderBy(desc(savedStructures.createdAt));
}

export async function deleteStructure(id: number, userId: number) {
  const db = await getDb();
  if (!db) return false;
  await db.delete(savedStructures).where(and(eq(savedStructures.id, id), eq(savedStructures.userId, userId)));
  return true;
}

export async function deleteTournament(tournamentId: number) {
  const db = await getDb();
  if (!db) return false;
  // Cascade: delete related records first
  await db.delete(gameAuditLog).where(eq(gameAuditLog.tournamentId, tournamentId));
  await db.delete(tournamentParticipants).where(eq(tournamentParticipants.tournamentId, tournamentId));
  await db.delete(blindLevels).where(eq(blindLevels.tournamentId, tournamentId));
  await db.delete(tournaments).where(eq(tournaments.id, tournamentId));
  return true;
}
