import { type Express, type Request, type Response, type NextFunction } from "express";
import { getTournamentBySlug, getParticipantCount } from "./db";

const OG_IMAGE_URL = "/manus-storage/epic_poker_og_square_299b16cb.png";

// Bot User-Agent patterns for link preview crawlers
const BOT_UA_PATTERNS = [
  "Discordbot",
  "Twitterbot",
  "facebookexternalhit",
  "LinkedInBot",
  "Slackbot",
  "TelegramBot",
  "WhatsApp",
  "Applebot",
  "iMessageLinkPreview",
  "Googlebot",
  "bingbot",
];

function isBot(ua: string): boolean {
  const lower = ua.toLowerCase();
  return BOT_UA_PATTERNS.some((p) => lower.includes(p.toLowerCase()));
}

function getGameTypeName(gameType: string): string {
  switch (gameType) {
    case "nlh": return "No Limit Texas Hold'em";
    case "plo": return "Pot Limit Omaha";
    case "plo5": return "PLO-5";
    case "mixed": return "Mixed Game";
    default: return "Texas Hold'em";
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "draft": return "Draft";
    case "scheduled": return "Scheduled";
    case "registering": return "Open";
    case "running": return "Live";
    case "paused": return "Paused";
    case "completed": return "Completed";
    case "cancelled": return "Cancelled";
    default: return status;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function registerOgTagsMiddleware(app: Express) {
  // Intercept /t/:slug requests from bot crawlers
  app.get("/t/:slug", async (req: Request, res: Response, next: NextFunction) => {
    const ua = req.headers["user-agent"] || "";

    // Only serve OG HTML to bots; normal users get the SPA
    if (!isBot(ua)) {
      return next();
    }

    try {
      const slug = req.params.slug;
      const tournament = await getTournamentBySlug(slug);

      if (!tournament) {
        return next(); // Let SPA handle 404
      }

      const participantCount = await getParticipantCount(tournament.id);
      const gameType = getGameTypeName(tournament.gameType);
      const tableSize = `${tournament.tableSize}-max`;
      const chips = tournament.startingChips.toLocaleString();
      const status = getStatusLabel(tournament.status);
      const title = `${escapeHtml(tournament.name)} [${status}]`;

      // Build description lines
      const descParts: string[] = [
        `${gameType} · ${tableSize}`,
        `${chips} chips · ${participantCount}/${tournament.maxPlayers} players`,
      ];
      if (tournament.provablyFair) {
        descParts.push("✓ Provably Fair");
      }
      if (tournament.scheduledStart) {
        const startDate = new Date(tournament.scheduledStart);
        descParts.push(`Starts: ${startDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · ${startDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`);
      }
      const description = descParts.join("\n");

      // Build the full absolute URL for og:image
      const protocol = req.headers["x-forwarded-proto"] || "https";
      const host = req.headers["x-forwarded-host"] || req.headers.host || "epicpoker-7kppv6qq.manus.space";
      const baseUrl = `${protocol}://${host}`;
      const imageUrl = `${baseUrl}${OG_IMAGE_URL}`;
      const pageUrl = `${baseUrl}/t/${slug}`;

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} - EPIC Poker</title>
  
  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="EPIC Poker" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:image:width" content="512" />
  <meta property="og:image:height" content="512" />
  <meta property="og:url" content="${pageUrl}" />
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${imageUrl}" />
  
  <!-- Discord/Theme -->
  <meta name="theme-color" content="#d4af37" />
</head>
<body>
  <h1>${title}</h1>
  <p>${escapeHtml(description)}</p>
  <p><a href="${pageUrl}">View Tournament on EPIC Poker</a></p>
</body>
</html>`;

      res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).end(html);
    } catch (err) {
      console.error("[OG Tags] Error generating meta tags:", err);
      next(); // Fall through to SPA on error
    }
  });
}
