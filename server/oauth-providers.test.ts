import { describe, it, expect } from "vitest";

describe("OAuth Provider Secrets", () => {
  it("DISCORD_CLIENT_ID is set and non-empty", () => {
    const val = process.env.DISCORD_CLIENT_ID;
    expect(val).toBeDefined();
    expect(val!.length).toBeGreaterThan(0);
  });

  it("DISCORD_CLIENT_SECRET is set and non-empty", () => {
    const val = process.env.DISCORD_CLIENT_SECRET;
    expect(val).toBeDefined();
    expect(val!.length).toBeGreaterThan(0);
  });

  it("GOOGLE_CLIENT_ID is set and non-empty", () => {
    const val = process.env.GOOGLE_CLIENT_ID;
    expect(val).toBeDefined();
    expect(val!.length).toBeGreaterThan(0);
  });

  it("GOOGLE_CLIENT_SECRET is set and non-empty", () => {
    const val = process.env.GOOGLE_CLIENT_SECRET;
    expect(val).toBeDefined();
    expect(val!.length).toBeGreaterThan(0);
  });
});
