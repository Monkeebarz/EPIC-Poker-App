import type { Express, Request, Response } from "express";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";
import { getSessionCookieOptions } from "./_core/cookies";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import * as db from "./db";
import { v4 as uuidv4 } from "uuid";

/**
 * Register Discord and Google OAuth routes
 */
export function registerOAuthProviderRoutes(app: Express) {
  // ============ DISCORD OAUTH ============

  // Step 1: Redirect user to Discord authorization
  app.get("/api/auth/discord", (req: Request, res: Response) => {
    const origin = req.query.origin as string || `${req.protocol}://${req.get("host")}`;
    const redirectUri = `${origin}/api/auth/discord/callback`;

    const params = new URLSearchParams({
      client_id: ENV.discordClientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "identify email",
      state: Buffer.from(JSON.stringify({ origin })).toString("base64"),
    });

    res.redirect(`https://discord.com/api/oauth2/authorize?${params.toString()}`);
  });

  // Step 2: Handle Discord callback
  app.get("/api/auth/discord/callback", async (req: Request, res: Response) => {
    const code = req.query.code as string;
    const stateParam = req.query.state as string;

    if (!code) {
      res.redirect("/login?error=discord_no_code");
      return;
    }

    try {
      let origin = `${req.protocol}://${req.get("host")}`;
      if (stateParam) {
        try {
          const stateData = JSON.parse(Buffer.from(stateParam, "base64").toString());
          if (stateData.origin) origin = stateData.origin;
        } catch {}
      }

      const redirectUri = `${origin}/api/auth/discord/callback`;

      // Exchange code for token
      const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: ENV.discordClientId,
          client_secret: ENV.discordClientSecret,
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        console.error("[Discord OAuth] Token exchange failed:", errText);
        res.redirect("/login?error=discord_token_failed");
        return;
      }

      const tokenData = await tokenRes.json() as { access_token: string };

      // Get user info from Discord
      const userRes = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      if (!userRes.ok) {
        res.redirect("/login?error=discord_user_failed");
        return;
      }

      const discordUser = await userRes.json() as {
        id: string;
        username: string;
        global_name?: string;
        email?: string;
        avatar?: string;
      };

      const avatarUrl = discordUser.avatar
        ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
        : null;

      // Check if OAuth account already exists
      let oauthAccount = await db.getOAuthAccount("discord", discordUser.id);
      let user;

      if (oauthAccount) {
        user = await db.getUserById(oauthAccount.userId);
      } else {
        // Check if user exists by email
        if (discordUser.email) {
          user = await db.getUserByEmail(discordUser.email);
        }

        if (!user) {
          // Create new user
          const openId = `discord_${uuidv4()}`;
          await db.upsertUser({
            openId,
            email: discordUser.email || null,
            name: discordUser.global_name || discordUser.username,
            displayName: discordUser.global_name || discordUser.username,
            avatarUrl,
            loginMethod: "discord",
            subscriptionTier: "elite", // Beta: all new users get Elite
            lastSignedIn: new Date(),
          });
          user = await db.getUserByOpenId(openId);
        }

        if (user) {
          await db.createOAuthAccount({
            userId: user.id,
            provider: "discord",
            providerAccountId: discordUser.id,
          });
        }
      }

      if (!user) {
        res.redirect("/login?error=discord_user_create_failed");
        return;
      }

      // Update last sign in
      await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });

      // Create session
      const sessionToken = await sdk.createSessionToken(user.openId, {
        name: user.displayName || user.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect("/dashboard");
    } catch (error) {
      console.error("[Discord OAuth] Error:", error);
      res.redirect("/login?error=discord_failed");
    }
  });

  // ============ GOOGLE OAUTH ============

  // Step 1: Redirect user to Google authorization
  app.get("/api/auth/google", (req: Request, res: Response) => {
    const origin = req.query.origin as string || `${req.protocol}://${req.get("host")}`;
    const redirectUri = `${origin}/api/auth/google/callback`;

    const params = new URLSearchParams({
      client_id: ENV.googleClientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      state: Buffer.from(JSON.stringify({ origin })).toString("base64"),
    });

    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  });

  // Step 2: Handle Google callback
  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    const code = req.query.code as string;
    const stateParam = req.query.state as string;

    if (!code) {
      res.redirect("/login?error=google_no_code");
      return;
    }

    try {
      let origin = `${req.protocol}://${req.get("host")}`;
      if (stateParam) {
        try {
          const stateData = JSON.parse(Buffer.from(stateParam, "base64").toString());
          if (stateData.origin) origin = stateData.origin;
        } catch {}
      }

      const redirectUri = `${origin}/api/auth/google/callback`;

      // Exchange code for token
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: ENV.googleClientId,
          client_secret: ENV.googleClientSecret,
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        console.error("[Google OAuth] Token exchange failed:", errText);
        res.redirect("/login?error=google_token_failed");
        return;
      }

      const tokenData = await tokenRes.json() as { access_token: string; id_token?: string };

      // Get user info from Google
      const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      if (!userRes.ok) {
        res.redirect("/login?error=google_user_failed");
        return;
      }

      const googleUser = await userRes.json() as {
        id: string;
        email: string;
        name: string;
        picture?: string;
      };

      // Check if OAuth account already exists
      let oauthAccount = await db.getOAuthAccount("google", googleUser.id);
      let user;

      if (oauthAccount) {
        user = await db.getUserById(oauthAccount.userId);
      } else {
        // Check if user exists by email
        if (googleUser.email) {
          user = await db.getUserByEmail(googleUser.email);
        }

        if (!user) {
          // Create new user
          const openId = `google_${uuidv4()}`;
          await db.upsertUser({
            openId,
            email: googleUser.email,
            name: googleUser.name,
            displayName: googleUser.name,
            avatarUrl: googleUser.picture || null,
            loginMethod: "google",
            subscriptionTier: "elite", // Beta: all new users get Elite
            lastSignedIn: new Date(),
          });
          user = await db.getUserByOpenId(openId);
        }

        if (user) {
          await db.createOAuthAccount({
            userId: user.id,
            provider: "google",
            providerAccountId: googleUser.id,
          });
        }
      }

      if (!user) {
        res.redirect("/login?error=google_user_create_failed");
        return;
      }

      // Update last sign in
      await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });

      // Create session
      const sessionToken = await sdk.createSessionToken(user.openId, {
        name: user.displayName || user.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect("/dashboard");
    } catch (error) {
      console.error("[Google OAuth] Error:", error);
      res.redirect("/login?error=google_failed");
    }
  });
}
