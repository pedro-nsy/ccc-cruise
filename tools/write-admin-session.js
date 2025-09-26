const fs = require("fs");
const path = require("path");

const FILE = path.join("src","lib","adminSession.ts");
const DIR  = path.dirname(FILE);
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
if (fs.existsSync(FILE) && !fs.existsSync(FILE + ".bak-8.2")) {
  fs.copyFileSync(FILE, FILE + ".bak-8.2");
}

const content = `import { cookies } from "next/headers";
import crypto from "crypto";

export const ADMIN_COOKIE_NAME = "admin_session";
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

type SameSite = "lax" | "strict" | "none";
export const ADMIN_COOKIE_FLAGS = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as SameSite,
  path: "/",
  maxAge: ADMIN_COOKIE_MAX_AGE,
} as const;

/** Read secret (throws if missing in server context). */
function getSecret(): string {
  const s = process.env.ADMIN_COOKIE_SECRET;
  if (!s) throw new Error("ADMIN_COOKIE_SECRET is not set");
  return s;
}

/** Generate a random session id (base64url). */
export function newSessionId(): string {
  return crypto.randomBytes(18).toString("base64url");
}

/** Sign a value with HMAC-SHA256 -> base64url signature. */
export function sign(value: string): string {
  const h = crypto.createHmac("sha256", getSecret());
  h.update(value, "utf8");
  return h.digest("base64url");
}

/** Pack value+sig as "value.sig". */
export function pack(value: string): string {
  return value + "." + sign(value);
}

/** Verify "value.sig" and return value or "" if invalid. */
export function verify(packed: string | undefined | null): string {
  if (!packed) return "";
  const dot = packed.lastIndexOf(".");
  if (dot <= 0) return "";
  const value = packed.slice(0, dot);
  const sig   = packed.slice(dot + 1);
  try {
    const expected = sign(value);
    // constant-time compare
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return "";
    if (!crypto.timingSafeEqual(a, b)) return "";
    return value;
  } catch {
    return "";
  }
}

/** Server-only: set the admin cookie with a signed session id. */
export function setAdminSession(sessionId: string) {
  cookies().set(ADMIN_COOKIE_NAME, pack(sessionId), ADMIN_COOKIE_FLAGS as any);
}

/** Server-only: read and verify; returns sessionId "" if absent/invalid. */
export function getAdminSession(): string {
  const c = cookies().get(ADMIN_COOKIE_NAME)?.value;
  return verify(c || "");
}

/** Server-only: clear cookie. */
export function clearAdminSession() {
  cookies().delete(ADMIN_COOKIE_NAME);
}
`;
fs.writeFileSync(FILE, content, "utf8");
console.log("✓ wrote", FILE, "backup:", fs.existsSync(FILE + ".bak-8.2") ? FILE + ".bak-8.2" : "(none)");
