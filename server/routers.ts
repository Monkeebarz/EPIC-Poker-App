import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { sdk } from "./_core/sdk";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { getOrCreateRoom, getRoom, getRoomByTournament } from "./poker/gameRoom";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80) + "-" + uuidv4().slice(0, 8);
}

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    register: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(6),
        displayName: z.string().min(2).max(50),
      }))
      .mutation(async ({ input, ctx }) => {
        const existing = await db.getUserByEmail(input.email);
        if (existing) {
          throw new Error("An account with this email already exists");
        }

        const passwordHash = await bcrypt.hash(input.password, 12);
        const openId = `email_${uuidv4()}`;

        await db.upsertUser({
          openId,
          email: input.email,
          name: input.displayName,
          displayName: input.displayName,
          passwordHash,
          loginMethod: "email",
          subscriptionTier: "elite", // Beta: all new users get Elite
          lastSignedIn: new Date(),
        });

        const sessionToken = await sdk.createSessionToken(openId, {
          name: input.displayName,
          expiresInMs: ONE_YEAR_MS,
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        return { success: true };
      }),

    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const user = await db.getUserByEmail(input.email);
        if (!user || !user.passwordHash) {
          throw new Error("Invalid email or password");
        }

        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid) {
          throw new Error("Invalid email or password");
        }

        await db.upsertUser({
          openId: user.openId,
          lastSignedIn: new Date(),
        });

        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.displayName || user.name || "",
          expiresInMs: ONE_YEAR_MS,
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        return { success: true };
      }),

    // OAuth login - creates/links account from OAuth provider data
    oauthLogin: publicProcedure
      .input(z.object({
        provider: z.enum(["google", "facebook", "discord", "twitter"]),
        providerAccountId: z.string(),
        email: z.string().email().optional(),
        name: z.string().optional(),
        avatarUrl: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        let oauthAccount = await db.getOAuthAccount(input.provider, input.providerAccountId);

        let user;
        if (oauthAccount) {
          user = await db.getUserById(oauthAccount.userId);
        } else {
          if (input.email) {
            user = await db.getUserByEmail(input.email);
          }

          if (!user) {
            const openId = `${input.provider}_${uuidv4()}`;
            await db.upsertUser({
              openId,
              email: input.email || null,
              name: input.name || null,
              displayName: input.name || null,
              avatarUrl: input.avatarUrl || null,
              loginMethod: input.provider,
              subscriptionTier: "elite", // Beta: all new users get Elite
              lastSignedIn: new Date(),
            });
            user = await db.getUserByOpenId(openId);
          }

          if (user) {
            await db.createOAuthAccount({
              userId: user.id,
              provider: input.provider,
              providerAccountId: input.providerAccountId,
            });
          }
        }

        if (!user) {
          throw new Error("Failed to create or find user");
        }

        await db.upsertUser({
          openId: user.openId,
          lastSignedIn: new Date(),
        });

        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.displayName || user.name || "",
          expiresInMs: ONE_YEAR_MS,
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        return { success: true };
      }),
  }),

  profile: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return ctx.user;
    }),

    update: protectedProcedure
      .input(z.object({
        displayName: z.string().min(2).max(50).optional(),
        avatarUrl: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.updateUserProfile(ctx.user.id, input);
        return { success: true };
      }),
  }),

  tournament: router({
    // Get available tournaments for lobby
    list: publicProcedure.query(async () => {
      return db.getAvailableTournaments();
    }),

    // Get all tournaments
    listAll: publicProcedure.query(async () => {
      return db.getAllTournaments();
    }),

    // Get tournament by public ID or slug
    get: publicProcedure
      .input(z.object({ publicId: z.string() }))
      .query(async ({ input }) => {
        // Try slug first, then publicId
        let tournament = await db.getTournamentBySlug(input.publicId);
        if (!tournament) {
          tournament = await db.getTournamentByPublicId(input.publicId);
        }
        if (!tournament) throw new Error("Tournament not found");
        return tournament;
      }),

    // Get tournaments created by current user
    myTournaments: protectedProcedure.query(async ({ ctx }) => {
      return db.getTournamentsByCreator(ctx.user.id);
    }),

    // Get tournaments user has joined
    myParticipations: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserParticipations(ctx.user.id);
    }),

    // Create tournament with expanded settings
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(3).max(200),
        description: z.string().optional(),
        gameType: z.enum(["nlh", "plo", "plo5", "mixed"]).default("nlh"),
        tableSize: z.enum(["2", "3", "4", "5", "6", "7", "8", "9", "10"]).default("8"),
        startingChips: z.number().min(100).max(10000000).default(1000),
        lateRegistration: z.boolean().default(true),
        lateRegLevels: z.number().min(0).max(50).default(6),
        reEntry: z.boolean().default(false),
        maxReEntries: z.number().min(0).max(99).optional(),
        rebuyValues: z.array(z.number()).optional(),
        provablyFair: z.boolean().default(true),
        useCentsValues: z.boolean().default(false),
        antesEnabled: z.boolean().default(false),
        requireCheckIn: z.boolean().default(false),
        rabbitHunting: z.boolean().default(false),
        decisionTime: z.number().min(5).max(300).default(30),
        inactiveKickMinutes: z.number().min(0).max(60).default(0),
        managers: z.array(z.string()).optional(),
        maxPlayers: z.number().min(2).max(10000).default(100),
        scheduledStart: z.string().optional(),
        blindLevels: z.array(z.object({
          levelOrder: z.number(),
          isBreak: z.boolean().default(false),
          smallBlind: z.number().min(0).default(0),
          bigBlind: z.number().min(0).default(0),
          ante: z.number().min(0).default(0),
          duration: z.number().min(0).max(999).default(15), // 0 = infinity
          breakName: z.string().optional(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        const publicId = uuidv4();
        const slug = generateSlug(input.name);
        const { blindLevels: levels, scheduledStart, ...tournamentData } = input;

        const tournamentId = await db.createTournament({
          ...tournamentData,
          publicId,
          slug,
          creatorId: ctx.user.id,
          scheduledStart: scheduledStart ? new Date(scheduledStart) : null,
          status: "registering",
          isPrivate: true, // All new tournaments are private (invite-only) by default
        });

        if (tournamentId && levels.length > 0) {
          await db.setBlindLevels(tournamentId, levels);
        }

        return { publicId, slug };
      }),

    // Update tournament
    update: protectedProcedure
      .input(z.object({
        publicId: z.string(),
        name: z.string().min(3).max(200).optional(),
        description: z.string().optional(),
        gameType: z.enum(["nlh", "plo", "plo5", "mixed"]).optional(),
        tableSize: z.enum(["2", "3", "4", "5", "6", "7", "8", "9", "10"]).optional(),
        startingChips: z.number().min(100).max(10000000).optional(),
        lateRegistration: z.boolean().optional(),
        lateRegLevels: z.number().min(0).max(50).optional(),
        reEntry: z.boolean().optional(),
        maxReEntries: z.number().min(0).max(99).optional(),
        rebuyValues: z.array(z.number()).optional(),
        provablyFair: z.boolean().optional(),
        useCentsValues: z.boolean().optional(),
        antesEnabled: z.boolean().optional(),
        requireCheckIn: z.boolean().optional(),
        rabbitHunting: z.boolean().optional(),
        decisionTime: z.number().min(5).max(300).optional(),
        inactiveKickMinutes: z.number().min(0).max(60).optional(),
        managers: z.array(z.string()).optional(),
        maxPlayers: z.number().min(2).max(10000).optional(),
        status: z.enum(["draft", "scheduled", "registering", "running", "paused", "completed", "cancelled"]).optional(),
        blindLevels: z.array(z.object({
          levelOrder: z.number(),
          isBreak: z.boolean().default(false),
          smallBlind: z.number().min(0).default(0),
          bigBlind: z.number().min(0).default(0),
          ante: z.number().min(0).default(0),
          duration: z.number().min(0).max(999).default(15),
          breakName: z.string().optional(),
        })).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const tournament = await db.getTournamentByPublicId(input.publicId);
        if (!tournament) throw new Error("Tournament not found");
        if (tournament.creatorId !== ctx.user.id) throw new Error("Not authorized");

        const { publicId, blindLevels: levels, ...updateData } = input;
        await db.updateTournament(tournament.id, updateData as any);

        if (levels) {
          await db.setBlindLevels(tournament.id, levels);
        }

        return { success: true };
      }),

    // Get blind levels for a tournament
    blindLevels: publicProcedure
      .input(z.object({ publicId: z.string() }))
      .query(async ({ input }) => {
        let tournament = await db.getTournamentBySlug(input.publicId);
        if (!tournament) tournament = await db.getTournamentByPublicId(input.publicId);
        if (!tournament) throw new Error("Tournament not found");
        return db.getBlindLevels(tournament.id);
      }),

    // Get participants for a tournament
    participants: publicProcedure
      .input(z.object({ publicId: z.string() }))
      .query(async ({ input }) => {
        let tournament = await db.getTournamentBySlug(input.publicId);
        if (!tournament) tournament = await db.getTournamentByPublicId(input.publicId);
        if (!tournament) throw new Error("Tournament not found");
        return db.getTournamentParticipants(tournament.id);
      }),

    // Request participation (creates pending entry)
    register: protectedProcedure
      .input(z.object({ publicId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        let tournament = await db.getTournamentBySlug(input.publicId);
        if (!tournament) tournament = await db.getTournamentByPublicId(input.publicId);
        if (!tournament) throw new Error("Tournament not found");

        const alreadyRegistered = await db.isUserRegistered(tournament.id, ctx.user.id);
        if (alreadyRegistered) throw new Error("Already requested");

        const count = await db.getParticipantCount(tournament.id);
        if (count >= tournament.maxPlayers) throw new Error("Tournament is full");

        await db.registerForTournament(tournament.id, ctx.user.id);
        await db.addAuditLog({
          tournamentId: tournament.id,
          userId: ctx.user.id,
          userName: ctx.user.displayName || ctx.user.name || "Unknown",
          action: "Requested participation",
        });
        return { success: true };
      }),

    // Cancel request or participation
    unregister: protectedProcedure
      .input(z.object({ publicId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        let tournament = await db.getTournamentBySlug(input.publicId);
        if (!tournament) tournament = await db.getTournamentByPublicId(input.publicId);
        if (!tournament) throw new Error("Tournament not found");
        await db.unregisterFromTournament(tournament.id, ctx.user.id);
        await db.addAuditLog({
          tournamentId: tournament.id,
          userId: ctx.user.id,
          userName: ctx.user.displayName || ctx.user.name || "Unknown",
          action: "Cancelled participation",
        });
        return { success: true };
      }),

    // Host accepts a pending request
    acceptPlayer: protectedProcedure
      .input(z.object({ publicId: z.string(), userId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        let tournament = await db.getTournamentBySlug(input.publicId);
        if (!tournament) tournament = await db.getTournamentByPublicId(input.publicId);
        if (!tournament) throw new Error("Tournament not found");
        if (tournament.creatorId !== ctx.user.id) throw new Error("Only the host can accept players");
        await db.updateParticipantStatus(tournament.id, input.userId, "registered");
        await db.addAuditLog({
          tournamentId: tournament.id,
          userId: ctx.user.id,
          userName: ctx.user.displayName || ctx.user.name || "Host",
          action: `Accepted player (userId: ${input.userId})`,
        });
        return { success: true };
      }),

    // Host denies a pending request
    denyPlayer: protectedProcedure
      .input(z.object({ publicId: z.string(), userId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        let tournament = await db.getTournamentBySlug(input.publicId);
        if (!tournament) tournament = await db.getTournamentByPublicId(input.publicId);
        if (!tournament) throw new Error("Tournament not found");
        if (tournament.creatorId !== ctx.user.id) throw new Error("Only the host can deny players");
        await db.unregisterFromTournament(tournament.id, input.userId);
        await db.addAuditLog({
          tournamentId: tournament.id,
          userId: ctx.user.id,
          userName: ctx.user.displayName || ctx.user.name || "Host",
          action: `Denied player request (userId: ${input.userId})`,
        });
        return { success: true };
      }),

    // Host removes an accepted player
    removePlayer: protectedProcedure
      .input(z.object({ publicId: z.string(), userId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        let tournament = await db.getTournamentBySlug(input.publicId);
        if (!tournament) tournament = await db.getTournamentByPublicId(input.publicId);
        if (!tournament) throw new Error("Tournament not found");
        if (tournament.creatorId !== ctx.user.id) throw new Error("Only the host can remove players");
        await db.unregisterFromTournament(tournament.id, input.userId);
        await db.addAuditLog({
          tournamentId: tournament.id,
          userId: ctx.user.id,
          userName: ctx.user.displayName || ctx.user.name || "Host",
          action: `Removed player (userId: ${input.userId})`,
        });
        return { success: true };
      }),

    // Get my registration status for a tournament
    myStatus: protectedProcedure
      .input(z.object({ publicId: z.string() }))
      .query(async ({ input, ctx }) => {
        let tournament = await db.getTournamentBySlug(input.publicId);
        if (!tournament) tournament = await db.getTournamentByPublicId(input.publicId);
        if (!tournament) return null;
        const p = await db.getParticipantStatus(tournament.id, ctx.user.id);
        return p ? p.status : null;
      }),

    // Get participant count
    participantCount: publicProcedure
      .input(z.object({ publicId: z.string() }))
      .query(async ({ input }) => {
        let tournament = await db.getTournamentBySlug(input.publicId);
        if (!tournament) tournament = await db.getTournamentByPublicId(input.publicId);
        if (!tournament) return 0;
        return db.getParticipantCount(tournament.id);
      }),

    // Check if current user is registered (any status)
    isRegistered: protectedProcedure
      .input(z.object({ publicId: z.string() }))
      .query(async ({ input, ctx }) => {
        let tournament = await db.getTournamentBySlug(input.publicId);
        if (!tournament) tournament = await db.getTournamentByPublicId(input.publicId);
        if (!tournament) return false;
        return db.isUserRegistered(tournament.id, ctx.user.id);
      }),

    // Get audit log for a tournament
    auditLog: protectedProcedure
      .input(z.object({ publicId: z.string() }))
      .query(async ({ input }) => {
        let tournament = await db.getTournamentBySlug(input.publicId);
        if (!tournament) tournament = await db.getTournamentByPublicId(input.publicId);
        if (!tournament) return [];
        return db.getAuditLogs(tournament.id);
      }),

    // Start tournament (creates game room)
    startGame: protectedProcedure
      .input(z.object({ publicId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        let tournament = await db.getTournamentBySlug(input.publicId);
        if (!tournament) tournament = await db.getTournamentByPublicId(input.publicId);
        if (!tournament) throw new Error("Tournament not found");
        if (tournament.creatorId !== ctx.user.id) throw new Error("Only the host can start the game");

        // Get blind levels
        const blindLevels = await db.getBlindLevels(tournament.id);
        const firstLevel = blindLevels.find(l => !l.isBreak) || { smallBlind: 5, bigBlind: 10, ante: 0 };

        const tableId = `table_${tournament.publicId}`;
        const room = getOrCreateRoom(
          tournament.id,
          tableId,
          ctx.user.id,
          { smallBlind: firstLevel.smallBlind, bigBlind: firstLevel.bigBlind, ante: firstLevel.ante },
          tournament.startingChips,
          tournament.decisionTime,
          tournament.inactiveKickMinutes
        );

        // Update tournament status
        await db.updateTournament(tournament.id, { status: "running" });

        // Get participants and set their chips
        const participants = await db.getTournamentParticipants(tournament.id);
        for (const p of participants) {
          const userId = p.participant.userId;
          const displayName = p.user?.displayName || p.user?.name || `Player ${userId}`;
          const avatarUrl = p.user?.avatarUrl || null;
          const existing = room.players.find(rp => rp.oduserId === userId);
          if (!existing) {
            room.players.push({
              oduserId: userId,
              odisplayName: displayName,
              avatarUrl,
              seatIndex: room.players.length,
              chips: tournament.startingChips,
              socketId: null,
            });
          }
        }

        return { tableId, playerCount: room.players.length };
      }),

    // Get table info for a tournament (lazily creates room for running tournaments)
    getTableInfo: protectedProcedure
      .input(z.object({ publicId: z.string() }))
      .query(async ({ input, ctx }) => {
        let tournament = await db.getTournamentBySlug(input.publicId);
        if (!tournament) tournament = await db.getTournamentByPublicId(input.publicId);
        if (!tournament) return null;

        const tableId = `table_${tournament.publicId}`;
        let room = getRoom(tableId);

        // If no room exists but tournament is running, recreate it on-demand
        if (!room && tournament.status === "running") {
          const blindLevels = await db.getBlindLevels(tournament.id);
          const firstLevel = blindLevels.find(l => !l.isBreak) || { smallBlind: 5, bigBlind: 10, ante: 0 };
          room = getOrCreateRoom(
            tournament.id,
            tableId,
            tournament.creatorId,
            { smallBlind: firstLevel.smallBlind, bigBlind: firstLevel.bigBlind, ante: firstLevel.ante },
            tournament.startingChips,
            tournament.decisionTime,
            tournament.inactiveKickMinutes
          );
          // Seed players from participants
          const participants = await db.getTournamentParticipants(tournament.id);
          for (const p of participants) {
            const userId = p.participant.userId;
            const displayName = p.user?.displayName || p.user?.name || `Player ${userId}`;
            const avatarUrl = p.user?.avatarUrl || null;
            const existing = room.players.find(rp => rp.oduserId === userId);
            if (!existing) {
              room.players.push({
                oduserId: userId,
                odisplayName: displayName,
                avatarUrl,
                seatIndex: room.players.length,
                chips: tournament.startingChips,
                socketId: null,
              });
            }
          }
        }

        if (!room) return null;

        return {
          tableId: room.tableId,
          isStarted: room.isStarted,
          playerCount: room.players.length,
          hostUserId: room.hostUserId,
          players: room.players.map(p => ({
            userId: p.oduserId,
            displayName: p.odisplayName,
            avatarUrl: p.avatarUrl,
            seatIndex: p.seatIndex,
            chips: p.chips,
          })),
        };
      }),

    // Delete tournament (creator only)
    delete: protectedProcedure
      .input(z.object({ publicId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const tournament = await db.getTournamentByPublicId(input.publicId);
        if (!tournament) {
          // Also try slug
          const t2 = await db.getTournamentBySlug(input.publicId);
          if (!t2) throw new Error("Tournament not found");
          if (t2.creatorId !== ctx.user.id) throw new Error("Only the creator can delete this tournament");
          await db.deleteTournament(t2.id);
          return { success: true };
        }
        if (tournament.creatorId !== ctx.user.id) throw new Error("Only the creator can delete this tournament");
        await db.deleteTournament(tournament.id);
        return { success: true };
      }),
  }),

  structures: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserStructures(ctx.user.id);
    }),

    save: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(200),
        settings: z.record(z.string(), z.any()),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.saveStructure(ctx.user.id, input.name, input.settings);
        return { id };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteStructure(input.id, ctx.user.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
