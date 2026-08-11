import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { clearAdminSession, hasAdminSession, isAdminPasswordValid, setAdminSession } from "./adminAuth";
import { createSubscriptionTier, deleteSubscriptionTier, listSubscriptionTiers, updateSubscriptionTier } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

const tierInput = z.object({
  name: z.string().trim().min(1).max(100),
  price: z.string().regex(/^\d{1,6}(\.\d{1,2})?$/, "Price must be a valid amount with up to two decimals"),
  description: z.string().trim().max(1000).nullable().optional(),
  perks: z.array(z.string().trim().min(1).max(160)).max(30),
  badgeColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  featured: z.boolean(),
  sortOrder: z.number().int().min(0).max(999),
});

function requireAdminSession(req: Parameters<typeof hasAdminSession>[0]) {
  if (!hasAdminSession(req)) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Admin session required" });
  }
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
  }),
  subscriptions: router({
    list: publicProcedure.query(() => listSubscriptionTiers()),
  }),
  admin: router({
    login: publicProcedure.input(z.object({ password: z.string() })).mutation(({ input, ctx }) => {
      if (!isAdminPasswordValid(input.password)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Incorrect admin password" });
      }
      setAdminSession(ctx.res);
      return { success: true } as const;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      clearAdminSession(ctx.res);
      return { success: true } as const;
    }),
    status: publicProcedure.query(({ ctx }) => ({ authenticated: hasAdminSession(ctx.req) })),
    tiers: publicProcedure.query(({ ctx }) => {
      requireAdminSession(ctx.req);
      return listSubscriptionTiers();
    }),
    createTier: publicProcedure.input(tierInput).mutation(({ input, ctx }) => {
      requireAdminSession(ctx.req);
      return createSubscriptionTier({ ...input, description: input.description || null, perks: input.perks });
    }),
    updateTier: publicProcedure
      .input(z.object({ id: z.number().int().positive(), data: tierInput }))
      .mutation(({ input, ctx }) => {
        requireAdminSession(ctx.req);
        return updateSubscriptionTier(input.id, {
          ...input.data,
          description: input.data.description || null,
          perks: input.data.perks,
        });
      }),
    deleteTier: publicProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input, ctx }) => {
      requireAdminSession(ctx.req);
      return deleteSubscriptionTier(input.id);
    }),
  }),
});

export type AppRouter = typeof appRouter;
