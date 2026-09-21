import { describe, expect, it } from "vitest";

const optionalOAuthCredentials = [
  "DISCORD_CLIENT_ID",
  "DISCORD_CLIENT_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
] as const;

describe("OAuth Provider Configuration", () => {
  for (const credential of optionalOAuthCredentials) {
    it(`${credential} is non-empty when configured`, () => {
      const value = process.env[credential];
      // Local/test environments may deliberately omit third-party OAuth.
      // Production configuration remains invalid if a key is supplied as whitespace.
      if (value !== undefined) expect(value.trim().length).toBeGreaterThan(0);
    });
  }
});
