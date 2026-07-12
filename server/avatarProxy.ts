import { Express } from "express";
import { Buffer } from "buffer";

const avatarCache = new Map<string, { data: Buffer; contentType: string; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export function registerAvatarProxy(app: Express) {
  app.get("/api/avatar-proxy", async (req, res) => {
    const { url } = req.query;

    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "Missing or invalid url parameter" });
    }

    // Validate it's a Discord CDN URL to prevent open proxy abuse
    if (!url.includes("cdn.discordapp.com")) {
      return res.status(403).json({ error: "Only Discord CDN URLs are allowed" });
    }

    // Check cache
    const cached = avatarCache.get(url);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      res.set("Content-Type", cached.contentType);
      res.set("Cache-Control", "public, max-age=86400");
      return res.send(cached.data);
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch avatar" });
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const contentType = response.headers.get("content-type") || "image/png";

      // Cache the result
      avatarCache.set(url, {
        data: buffer,
        contentType,
        timestamp: Date.now(),
      });

      res.set("Content-Type", contentType);
      res.set("Cache-Control", "public, max-age=86400");
      res.send(buffer);
    } catch (error) {
      console.error("Avatar proxy error:", error);
      res.status(500).json({ error: "Failed to proxy avatar" });
    }
  });
}
