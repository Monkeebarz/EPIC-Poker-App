import { describe, expect, it } from "vitest";
import { isAdminPasswordValid } from "./adminAuth";

describe("admin password configuration", () => {
  it("accepts the configured admin password", () => {
    expect(isAdminPasswordValid("epic2024")).toBe(true);
  });

  it("rejects an incorrect password", () => {
    expect(isAdminPasswordValid("not-the-admin-password")).toBe(false);
  });
});
