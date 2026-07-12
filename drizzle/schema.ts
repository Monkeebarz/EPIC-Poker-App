import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json } from "drizzle-orm/mysql-core";

/**
 * Users table - core auth and profile data
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  displayName: varchar("displayName", { length: 100 }),
  email: varchar("email", { length: 320 }),
  passwordHash: text("passwordHash"),
  avatarUrl: text("avatarUrl"),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  subscriptionTier: mysqlEnum("subscriptionTier", ["free", "pro", "club", "elite"]).default("elite").notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  epicChips: int("epicChips").default(10000).notNull(),
  gamesPlayed: int("gamesPlayed").default(0).notNull(),
  tournamentsWon: int("tournamentsWon").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * OAuth accounts - links external OAuth providers to users
 */
export const oauthAccounts = mysqlTable("oauth_accounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  provider: varchar("provider", { length: 64 }).notNull(),
  providerAccountId: varchar("providerAccountId", { length: 255 }).notNull(),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OAuthAccount = typeof oauthAccounts.$inferSelect;
export type InsertOAuthAccount = typeof oauthAccounts.$inferInsert;

/**
 * Tournaments table - tournament configuration and state
 */
export const tournaments = mysqlTable("tournaments", {
  id: int("id").autoincrement().primaryKey(),
  publicId: varchar("publicId", { length: 36 }).notNull().unique(),
  slug: varchar("slug", { length: 200 }).unique(),
  creatorId: int("creatorId").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  gameType: mysqlEnum("gameType", ["nlh", "plo", "plo5", "mixed"]).default("nlh").notNull(),
  tableSize: mysqlEnum("tableSize", ["2", "3", "4", "5", "6", "7", "8", "9", "10"]).default("8").notNull(),
  startingChips: int("startingChips").default(1000).notNull(),
  lateRegistration: boolean("lateRegistration").default(true).notNull(),
  lateRegLevels: int("lateRegLevels").default(6),
  reEntry: boolean("reEntry").default(false).notNull(),
  maxReEntries: int("maxReEntries"),
  rebuyValues: json("rebuyValues"), // array of rebuy amounts e.g. [500, 1000, 2000]
  provablyFair: boolean("provablyFair").default(true).notNull(),
  useCentsValues: boolean("useCentsValues").default(false).notNull(),
  antesEnabled: boolean("antesEnabled").default(false).notNull(),
  requireCheckIn: boolean("requireCheckIn").default(false).notNull(),
  rabbitHunting: boolean("rabbitHunting").default(false).notNull(),
  decisionTime: int("decisionTime").default(30).notNull(), // seconds per player turn
  inactiveKickMinutes: int("inactiveKickMinutes").default(0).notNull(), // 0 = disabled
  managers: json("managers"), // array of emails or user IDs
  status: mysqlEnum("status", ["draft", "scheduled", "registering", "running", "paused", "completed", "cancelled"]).default("registering").notNull(),
  maxPlayers: int("maxPlayers").default(100).notNull(),
  scheduledStart: timestamp("scheduledStart"),
  actualStart: timestamp("actualStart"),
  endedAt: timestamp("endedAt"),
  currentLevel: int("currentLevel").default(0).notNull(),
  isPrivate: boolean("isPrivate").default(true).notNull(), // true = invite-only, false = public listing
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Tournament = typeof tournaments.$inferSelect;
export type InsertTournament = typeof tournaments.$inferInsert;

/**
 * Blind levels - defines the blind structure for each tournament
 */
export const blindLevels = mysqlTable("blind_levels", {
  id: int("id").autoincrement().primaryKey(),
  tournamentId: int("tournamentId").notNull(),
  levelOrder: int("levelOrder").notNull(),
  isBreak: boolean("isBreak").default(false).notNull(),
  smallBlind: int("smallBlind").default(0).notNull(),
  bigBlind: int("bigBlind").default(0).notNull(),
  ante: int("ante").default(0).notNull(),
  duration: int("duration").default(15).notNull(), // minutes, 0 = infinity (last level)
  breakName: varchar("breakName", { length: 100 }),
});

export type BlindLevel = typeof blindLevels.$inferSelect;
export type InsertBlindLevel = typeof blindLevels.$inferInsert;

/**
 * Tournament participants - tracks who joined which tournament
 */
export const tournamentParticipants = mysqlTable("tournament_participants", {
  id: int("id").autoincrement().primaryKey(),
  tournamentId: int("tournamentId").notNull(),
  userId: int("userId").notNull(),
  status: mysqlEnum("status", ["pending", "registered", "playing", "eliminated", "winner"]).default("pending").notNull(),
  seatNumber: int("seatNumber"),
  tableNumber: int("tableNumber"),
  chipCount: int("chipCount").default(0).notNull(),
  finishPosition: int("finishPosition"),
  reEntryCount: int("reEntryCount").default(0).notNull(),
  registeredAt: timestamp("registeredAt").defaultNow().notNull(),
  eliminatedAt: timestamp("eliminatedAt"),
});

export type TournamentParticipant = typeof tournamentParticipants.$inferSelect;
export type InsertTournamentParticipant = typeof tournamentParticipants.$inferInsert;

/**
 * Game audit log - tracks all key player and host actions
 */
export const gameAuditLog = mysqlTable("game_audit_log", {
  id: int("id").autoincrement().primaryKey(),
  tournamentId: int("tournamentId").notNull(),
  userId: int("userId"),
  userName: varchar("userName", { length: 100 }),
  action: varchar("action", { length: 200 }).notNull(),
  details: text("details"),
  handNumber: int("handNumber"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GameAuditLog = typeof gameAuditLog.$inferSelect;
export type InsertGameAuditLog = typeof gameAuditLog.$inferInsert;

/**
 * Saved tournament structures - reusable tournament settings templates
 */
export const savedStructures = mysqlTable("saved_structures", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  settings: json("settings").notNull(), // full tournament settings JSON
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SavedStructure = typeof savedStructures.$inferSelect;
export type InsertSavedStructure = typeof savedStructures.$inferInsert;
