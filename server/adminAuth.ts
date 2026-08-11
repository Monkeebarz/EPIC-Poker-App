import { createHmac, timingSafeEqual } from "node:crypto";
import { parse } from "cookie";
import type { Request, Response } from "express";

export const ADMIN_COOKIE_NAME = "epic_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function configuredPassword() {
  return process.env.ADMIN_PASSWORD || "epic2024";
}

function sessionSecret() {
  return process.env.JWT_SECRET || configuredPassword();
}

export function isAdminPasswordValid(password: string) {
  const expected = Buffer.from(configuredPassword());
  const received = Buffer.from(password);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

function signature(payload: string) {
  return createHmac("sha256", sessionSecret()).update(payload).digest("hex");
}

function createSessionValue() {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = String(expiresAt);
  return `${payload}.${signature(payload)}`;
}

export function setAdminSession(res: Response) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${ADMIN_COOKIE_NAME}=${createSessionValue()}; Max-Age=${SESSION_TTL_SECONDS}; Path=/; HttpOnly; SameSite=Lax${secure}`,
  );
}

export function clearAdminSession(res: Response) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${ADMIN_COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${secure}`,
  );
}

export function hasAdminSession(req: Request) {
  const value = parse(req.headers.cookie || "")[ADMIN_COOKIE_NAME];
  if (!value) return false;

  const [expiresAt, providedSignature] = value.split(".");
  if (!expiresAt || !providedSignature || Number.isNaN(Number(expiresAt))) return false;
  if (Number(expiresAt) < Math.floor(Date.now() / 1000)) return false;

  const expectedSignature = signature(expiresAt);
  const expected = Buffer.from(expectedSignature);
  const received = Buffer.from(providedSignature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
