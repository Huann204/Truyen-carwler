import crypto from "node:crypto";
import type { NextRequest } from "next/server";

export const ADMIN_COOKIE_NAME = "truyen_admin_session";

export function getAdminSecret(): string {
  return process.env.ADMIN_SECRET?.trim() || "";
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const hashA = crypto.createHash("sha256").update(a).digest();
  const hashB = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

export function createSessionToken(secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update("truyen-admin-session-v1")
    .digest("hex");
}

export function verifyAdminPassword(password: string): boolean {
  const secret = getAdminSecret();
  if (!secret) return true;
  if (!password) return false;
  return timingSafeEqualStr(password.trim(), secret);
}

export function isAdminAuthenticated(req: NextRequest): boolean {
  const secret = getAdminSecret();
  if (!secret) return true;
  const cookieVal = req.cookies.get(ADMIN_COOKIE_NAME)?.value || "";
  if (!cookieVal) return false;
  const expected = createSessionToken(secret);
  return timingSafeEqualStr(cookieVal, expected);
}
